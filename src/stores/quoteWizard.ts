import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { AddressState, DealPrefill, GeneralDiscount, LineState, Lookup, PeriodState, PriceContext, QuoteInfoState } from '@/interfaces/quoteTypes'
import { applyGeneralVat, calcLine, calcTotals, generalDiscountOf, toNumber } from '@/utils/quotePricing'
import { buildQuotePayload } from '@/utils/quotePayload'
import { createQuote, loadDealPrefill, loadPriceContext, loadProduct, loadQuotePrefill, recalcQuote, updateQuote } from '@/utils/zohoQuotes'

export const STEPS = ['Informação do Orçamento', 'Período de Aluguer', 'Morada', 'Itens do Orçamento'] as const

const todayPlus = (days: number): string => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const emptyAddress = (): AddressState => ({ country: 'Portugal', street: '', city: '', state: '', code: '' })
const noContext = (): PriceContext => ({ origin: 'Produto', prices: {}, contractPct: 0, depositExempt: false, note: '' })

export const useQuoteWizardStore = defineStore('quoteWizard', () => {
  const step = ref(0)
  const info = reactive<QuoteInfoState>({ subject: '', account: null, contact: null, deal: null, validTill: todayPlus(cfg.validDays), requestOrigin: '' })
  const period = reactive<PeriodState>({ start: '', end: '', transportCost: '', deliveryType: '' })
  const billing = reactive<AddressState>(emptyAddress())
  const shipping = reactive<AddressState>(emptyAddress())
  const lines = ref<LineState[]>([])
  const adjustment = ref('')
  /** desconto geral do orçamento; por defeito o desconto contratual da Empresa (enquanto o utilizador não o alterar) */
  const generalDiscount = reactive<GeneralDiscount>({ mode: 'pct', value: '' })
  const generalTouched = ref(false)
  const promoCode = ref('')
  const ctx = ref<PriceContext>(noContext())
  const ctxLoading = ref(false)
  const saving = ref(false)
  const stepErrors = ref<string[]>([])
  const fieldErrors = reactive<Record<string, string>>({})
  const result = ref<{ id: string; warning: string } | null>(null)
  /** Oportunidade de origem (widget aberto pelo botão da Oportunidade); null = abertura livre */
  const source = ref<DealPrefill | null>(null)
  const fromDeal = computed(() => !!source.value)
  /** revisão de um orçamento existente (widget aberto pelo botão do orçamento) */
  const reviewId = ref('')
  const reviewStage = ref('')
  const isReview = computed(() => !!reviewId.value)
  /** motivo pelo qual o orçamento não pode ser revisto (fase diferente de Revisão ou não encontrado); vazio = pode */
  const blockedReason = ref('')
  /** Empresa e Contacto vindos da Oportunidade ficam bloqueados; se a Oportunidade não os tem, ficam editáveis */
  const accountLocked = computed(() => isReview.value || !!source.value?.account)
  const contactLocked = computed(() => isReview.value || !!source.value?.contact)
  /** abertura livre (Pedidos de Orçamento > Novo): nem Oportunidade nem revisão */
  const isFree = computed(() => !isReview.value && !fromDeal.value)
  const dealLocked = computed(() => isReview.value || fromDeal.value)
  let pendingProducts: Lookup[] = []
  let uid = 0

  // ── contexto de preços (Empresa > Contacto > Produto) ───────────────────────
  let ctxToken = 0
  async function refreshContext() {
    const token = ++ctxToken
    ctxLoading.value = true
    const c = await loadPriceContext(info.account, info.contact)
    if (token === ctxToken) {
      ctx.value = c
      ctxLoading.value = false
      if (!generalTouched.value) Object.assign(generalDiscount, { mode: 'pct', value: c.contractPct > 0 ? String(c.contractPct) : '' })
    }
  }
  watch(() => [info.account?.id, info.contact?.id], refreshContext)

  // ── cálculo ────────────────────────────────────────────────────────────────
  const rawCalcs = computed(() => lines.value.map((l) => calcLine(l, ctx.value)))
  const general = computed(() => generalDiscountOf(rawCalcs.value.filter((c) => c.ok).reduce((a, c) => a + c.base, 0), generalDiscount))
  const calcs = computed(() => applyGeneralVat(rawCalcs.value, general.value.pct))
  const totals = computed(() => calcTotals(calcs.value, general.value, toNumber(adjustment.value), ctx.value.depositExempt))
  function setGeneralDiscount(mode: 'pct' | 'amount', value: string) {
    Object.assign(generalDiscount, { mode, value })
    generalTouched.value = true
  }

  // ── origem: Oportunidade ───────────────────────────────────────────────────
  /** Pré-preenche o assistente com os dados da Oportunidade. Devolve false se não foi possível ler. */
  async function initFromDeal(dealId: string): Promise<boolean> {
    const d = await loadDealPrefill(dealId)
    if (!d) return false
    source.value = d
    Object.assign(info, { subject: d.subject, account: d.account, contact: d.contact, deal: d.deal })
    Object.assign(period, { start: d.start, end: d.end })
    pendingProducts = [...d.products]
    return true
  }

  // ── abertura livre: ao escolher uma Oportunidade, completa o que estiver vazio ──
  let dealToken = 0
  watch(() => info.deal?.id, async (id) => {
    if (!id || fromDeal.value || isReview.value) return
    const token = ++dealToken
    const d = await loadDealPrefill(id)
    if (!d || token !== dealToken || info.deal?.id !== id) return
    if (!info.account && d.account) info.account = d.account
    if (!info.contact && d.contact) info.contact = d.contact
    if (!info.subject.trim()) info.subject = d.subject
    if (!period.start) period.start = d.start
    if (!period.end) period.end = d.end
    if (!lines.value.length) pendingProducts = [...d.products]
    if (d.account || d.contact) { clearError('account'); clearError('contact') }
  })

  // ── origem: orçamento existente (revisão) ──────────────────────────────────
  /** Carrega o orçamento e as linhas. Devolve false se não foi possível ler; fases não editáveis ficam em blockedReason. */
  async function initFromQuote(quoteId: string): Promise<boolean> {
    const q = await loadQuotePrefill(quoteId)
    if (!q) return false
    reviewId.value = q.id
    reviewStage.value = q.stage
    if (!(cfg.reviewStages as readonly string[]).includes(q.stage)) {
      blockedReason.value = `O orçamento está na fase "${q.stage}". Só se pode rever em ${cfg.reviewStages.join(' ou ')}.`
      return true
    }
    // com desconto geral já gravado, não se volta a sugerir o contratual da Empresa
    if (q.discount > 0) {
      Object.assign(generalDiscount, { mode: 'amount', value: String(q.discount) })
      generalTouched.value = true
    }
    Object.assign(info, q.info)
    Object.assign(period, q.period)
    Object.assign(billing, q.billing)
    Object.assign(shipping, q.shipping)
    adjustment.value = q.adjustment
    promoCode.value = q.promoCode
    for (const r of q.lines) {
      lines.value.push({ uid: ++uid, product: r.product, info: null, start: r.start || q.period.start, end: r.end || q.period.end, qty: r.qty,
        discount: r.discount > 0 ? String(r.discount) : '', discountMode: 'amount', loading: true })
    }
    // carrega os dados dos equipamentos (preço, fatores, IVA) e o contexto de preços antes de mostrar o assistente
    await Promise.all([
      refreshContext(),
      ...lines.value.map(async (l) => {
        l.info = l.product ? await loadProduct(l.product.id) : null
        l.loading = false
      }),
    ])
    // a revisão abre direto nos itens; os restantes passos ficam acessíveis pelo menu de passos
    step.value = STEPS.length - 1
    return true
  }

  /** Revisão: depois de guardar, recarrega o orçamento (já atualizado) e volta aos itens para continuar a rever */
  const reloading = ref(false)
  async function reopenReview(): Promise<void> {
    const id = reviewId.value
    if (!id) return
    reloading.value = true
    try {
      reset()
      if (!(await initFromQuote(id))) stepErrors.value = ['Não foi possível voltar a ler o orçamento.']
    } finally {
      reloading.value = false
    }
  }

  // ── linhas ─────────────────────────────────────────────────────────────────
  function addLine() {
    lines.value.push({ uid: ++uid, product: null, info: null, start: period.start, end: period.end, qty: '1', discount: '', discountMode: 'pct', loading: false })
  }
  function removeLine(line: LineState) {
    lines.value = lines.value.filter((l) => l !== line)
  }
  async function pickProduct(line: LineState, product: Lookup | null) {
    line.product = product
    line.info = null
    if (!product) return
    line.loading = true
    line.info = await loadProduct(product.id)
    // equipamentos vindos da Oportunidade podem não trazer o nome
    if (line.info && !product.name) line.product = { id: product.id, name: line.info.name + (line.info.code ? ` (${line.info.code})` : '') }
    line.loading = false
  }
  /** Entrada no passo 4: uma linha por equipamento pretendido da Oportunidade, ou uma linha vazia */
  function seedLines() {
    const products = pendingProducts
    pendingProducts = []
    if (!products.length) { addLine(); return }
    for (const p of products) {
      addLine()
      const l = lines.value[lines.value.length - 1]
      if (l) void pickProduct(l, p)
    }
  }

  // ── validação ──────────────────────────────────────────────────────────────
  function clearError(key: string) { delete fieldErrors[key] }
  function validate(n: number): string[] {
    const errs: string[] = []
    const fail = (key: string, msg: string) => { fieldErrors[key] = msg; errs.push(msg) }
    Object.keys(fieldErrors).forEach(clearError)
    if (n === 0) {
      if (!info.subject.trim()) fail('subject', 'Indique o assunto.')
      if (!info.account && !info.contact) {
        fail('account', 'Indique a Empresa ou o Contacto (pelo menos um).')
        fail('contact', 'Indique a Empresa ou o Contacto (pelo menos um).')
      }
      if (!info.validTill) fail('validTill', 'Indique a validade do orçamento.')
    } else if (n === 1) {
      if (!period.start) fail('start', 'Indique a data de início do aluguer.')
      if (!period.end) fail('end', 'Indique a data de fim do aluguer.')
      if (period.start && period.end && period.end < period.start) fail('end', 'A data de fim do aluguer é anterior à data de início.')
      if (!period.deliveryType) fail('deliveryType', 'Indique o tipo de entrega.')
    } else if (n === 2 && period.deliveryType === cfg.deliveryToCustomer) {
      if (!shipping.country) fail('s.country', 'País obrigatório.')
      if (!shipping.street) fail('s.street', 'Rua obrigatória.')
      if (!shipping.city) fail('s.city', 'Cidade obrigatória.')
      if (!shipping.code) fail('s.code', 'Código postal obrigatório.')
      if (errs.length) errs.unshift('Com entrega ao cliente, a morada de envio é obrigatória.')
    } else if (n === 3) {
      if (!lines.value.length) errs.push('Adicione pelo menos uma linha.')
      calcs.value.forEach((c, i) => { if (!c.ok) errs.push(`Linha ${i + 1}: ${c.error}`) })
      if (general.value.error) errs.push(general.value.error)
    }
    return errs
  }

  function next() {
    stepErrors.value = validate(step.value)
    if (stepErrors.value.length) return false
    step.value++
    if (step.value === 3 && !lines.value.length) seedLines()
    return true
  }
  function back() { stepErrors.value = []; if (step.value > 0) step.value-- }
  function goTo(n: number) { if (n < step.value || (isReview.value && n !== step.value)) { stepErrors.value = []; step.value = n } }
  function copyBillingToShipping() { Object.assign(shipping, billing) }

  // ── gravação ───────────────────────────────────────────────────────────────
  async function save() {
    stepErrors.value = validate(3)
    if (stepErrors.value.length) return
    saving.value = true
    try {
      const payload = buildQuotePayload({
        info, period, billing, shipping, lines: lines.value, calcs: calcs.value,
        totals: totals.value, adjustment: toNumber(adjustment.value), promoCode: promoCode.value, review: isReview.value,
      })
      const id = isReview.value ? await updateQuote(reviewId.value, payload) : await createQuote(payload)
      let warning = ''
      try { await recalcQuote(id) } catch (e) { warning = `Orçamento ${isReview.value ? 'atualizado' : 'criado'}, mas o cálculo automático falhou: ${JSON.stringify(e)}` }
      result.value = { id, warning }
    } catch (e) {
      stepErrors.value = [`Não foi possível gravar o orçamento: ${JSON.stringify(e)}`]
    } finally {
      saving.value = false
    }
  }

  function reset() {
    source.value = null
    reviewId.value = ''
    reviewStage.value = ''
    blockedReason.value = ''
    pendingProducts = []
    step.value = 0
    Object.assign(info, { subject: '', account: null, contact: null, deal: null, validTill: todayPlus(cfg.validDays), requestOrigin: '' })
    Object.assign(period, { start: '', end: '', transportCost: '', deliveryType: '' })
    Object.assign(billing, emptyAddress())
    Object.assign(shipping, emptyAddress())
    lines.value = []
    adjustment.value = ''
    Object.assign(generalDiscount, { mode: 'pct', value: '' })
    generalTouched.value = false
    promoCode.value = ''
    ctx.value = noContext()
    stepErrors.value = []
    Object.keys(fieldErrors).forEach(clearError)
    result.value = null
  }

  return {
    step, info, period, billing, shipping, lines, adjustment, generalDiscount, generalTouched, setGeneralDiscount, promoCode, ctx, ctxLoading, saving,
    stepErrors, fieldErrors, result, calcs, totals, source, fromDeal, accountLocked, contactLocked, dealLocked, isFree, reloading, reopenReview, initFromDeal, initFromQuote, isReview, reviewStage, blockedReason,
    addLine, removeLine, pickProduct, clearError, next, back, goTo, copyBillingToShipping, save, reset, refreshContext,
  }
})
