import { computed, reactive, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { AddressState, LineState, Lookup, PeriodState, PriceContext, QuoteInfoState } from '@/interfaces/quoteTypes'
import { calcLine, calcTotals, toNumber } from '@/utils/quotePricing'
import { buildQuotePayload } from '@/utils/quotePayload'
import { createQuote, loadPriceContext, loadProduct, recalcQuote } from '@/utils/zohoQuotes'

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
  const promoCode = ref('')
  const ctx = ref<PriceContext>(noContext())
  const ctxLoading = ref(false)
  const saving = ref(false)
  const stepErrors = ref<string[]>([])
  const fieldErrors = reactive<Record<string, string>>({})
  const result = ref<{ id: string; warning: string } | null>(null)
  let uid = 0

  // ── contexto de preços (Empresa > Contacto > Produto) ───────────────────────
  let ctxToken = 0
  async function refreshContext() {
    const token = ++ctxToken
    ctxLoading.value = true
    const c = await loadPriceContext(info.account, info.contact)
    if (token === ctxToken) { ctx.value = c; ctxLoading.value = false }
  }
  watch(() => [info.account?.id, info.contact?.id], refreshContext)

  // ── cálculo ────────────────────────────────────────────────────────────────
  const calcs = computed(() => lines.value.map((l) => calcLine(l, ctx.value)))
  const totals = computed(() => calcTotals(calcs.value, ctx.value, !!info.account, toNumber(adjustment.value)))

  // ── linhas ─────────────────────────────────────────────────────────────────
  function addLine() {
    lines.value.push({ uid: ++uid, product: null, info: null, start: period.start, end: period.end, qty: '1', discount: '', loading: false })
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
    line.loading = false
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
    }
    return errs
  }

  function next() {
    stepErrors.value = validate(step.value)
    if (stepErrors.value.length) return false
    step.value++
    if (step.value === 3 && !lines.value.length) addLine()
    return true
  }
  function back() { stepErrors.value = []; if (step.value > 0) step.value-- }
  function goTo(n: number) { if (n < step.value) { stepErrors.value = []; step.value = n } }
  function copyBillingToShipping() { Object.assign(shipping, billing) }

  // ── gravação ───────────────────────────────────────────────────────────────
  async function save() {
    stepErrors.value = validate(3)
    if (stepErrors.value.length) return
    saving.value = true
    try {
      const payload = buildQuotePayload({
        info, period, billing, shipping, lines: lines.value, calcs: calcs.value,
        totals: totals.value, adjustment: toNumber(adjustment.value), promoCode: promoCode.value,
      })
      const id = await createQuote(payload)
      let warning = ''
      try { await recalcQuote(id) } catch (e) { warning = `Orçamento criado, mas o cálculo automático falhou: ${JSON.stringify(e)}` }
      result.value = { id, warning }
    } catch (e) {
      stepErrors.value = [`Não foi possível gravar o orçamento: ${JSON.stringify(e)}`]
    } finally {
      saving.value = false
    }
  }

  function reset() {
    step.value = 0
    Object.assign(info, { subject: '', account: null, contact: null, deal: null, validTill: todayPlus(cfg.validDays), requestOrigin: '' })
    Object.assign(period, { start: '', end: '', transportCost: '', deliveryType: '' })
    Object.assign(billing, emptyAddress())
    Object.assign(shipping, emptyAddress())
    lines.value = []
    adjustment.value = ''
    promoCode.value = ''
    ctx.value = noContext()
    stepErrors.value = []
    Object.keys(fieldErrors).forEach(clearError)
    result.value = null
  }

  return {
    step, info, period, billing, shipping, lines, adjustment, promoCode, ctx, ctxLoading, saving,
    stepErrors, fieldErrors, result, calcs, totals,
    addLine, removeLine, pickProduct, clearError, next, back, goTo, copyBillingToShipping, save, reset, refreshContext,
  }
})
