import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { GeneralDiscount, LineCalc, LineState, PriceContext, ProductInfo, QuoteTotals, VatRow } from '@/interfaces/quoteTypes'

/** Arredondamento a 2 casas, half-up (3.º decimal >= 5 sobe), sem os erros de vírgula flutuante (1.005 -> 1.01) */
export const r2 = (n: number): number => {
  if (!Number.isFinite(n)) return 0
  const x = Math.abs(n)
  const r = Number(Math.round(Number(`${x}e2`)) + 'e-2')
  return Number.isFinite(r) ? (n < 0 ? -r : r) : Math.round((n + Number.EPSILON) * 100) / 100
}

export function toNumber(value: string | number | undefined | null): number {
  const n = typeof value === 'number' ? value : parseFloat(String(value ?? '').replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}

/** Dias entre duas datas "yyyy-mm-dd" (inclusivo ou não, conforme a configuração) */
export function daysBetween(start: string, end: string): number {
  const [ys = 0, ms = 1, ds = 1] = start.split('-').map(Number)
  const [ye = 0, me = 1, de = 1] = end.split('-').map(Number)
  const diff = Math.round((Date.UTC(ye, me - 1, de) - Date.UTC(ys, ms - 1, ds)) / 86400000)
  return cfg.inclusiveDays ? diff + 1 : diff
}

const emptyCalc = (error: string): LineCalc => ({
  ok: false, error, days: 0, minDays: 0, unitPriceDay: 0, origin: 'Produto', monthFactor: 0, weekFactor: 0,
  months: 0, weeks: 0, looseDays: 0, monthValue: 0, weekValue: 0, dayValue: 0, unitTotal: 0, gross: 0,
  discount: 0, base: 0, vatPct: 0, vat: 0, depositUnit: 0, deposit: 0,
})

/**
 * Cálculo de uma linha (igual à fn_Quotes_calcLines v1.4).
 * meses = dias div 30; semanas = (dias % 30) div 7; dias soltos = (dias % 30) % 7.
 * Total Mês = meses x Fator Mês x Preço/dia; Total Semana = semanas x Fator Semana x Preço/dia;
 * Total Dias = dias soltos x Preço/dia. Os fatores são "dias de preço" (ex.: um mês custa 10 dias).
 * Sem os dois fatores configurados cobra-se dias x preço.
 */
export function calcLine(line: LineState, ctx: PriceContext): LineCalc {
  const p: ProductInfo | null = line.info
  if (!line.product || !p) return emptyCalc('Escolha o equipamento.')
  if (!line.start || !line.end) return emptyCalc('Indique a data de início e a data de fim.')
  if (line.end < line.start) return emptyCalc('A data de fim é anterior à data de início.')

  const qty = toNumber(line.qty)
  const discountValue = toNumber(line.discount)
  const days = daysBetween(line.start, line.end)
  const price = ctx.prices[p.id]
  const unitPriceDay = price !== undefined ? price : p.unitPrice
  const origin = price !== undefined ? ctx.origin : 'Produto'

  let months = 0
  let weeks = 0
  let looseDays = days
  let monthValue = 0
  let weekValue = 0
  if (p.monthFactor > 0 && p.weekFactor > 0) {
    const rest = days % cfg.monthDays
    months = Math.floor(days / cfg.monthDays)
    looseDays = rest % cfg.weekDays
    weeks = (rest - looseDays) / cfg.weekDays
    monthValue = months * p.monthFactor * unitPriceDay
    weekValue = weeks * p.weekFactor * unitPriceDay
  }
  const dayValue = looseDays * unitPriceDay
  const unitTotal = r2(monthValue + weekValue + dayValue)
  const q = qty > 0 ? qty : 0
  const gross = r2(unitTotal * q)
  // percentagem sobre o montante da linha (quantidade x preço do período) ou redução direta em euros
  const discount = line.discountMode === 'pct' ? r2((gross * discountValue) / 100) : discountValue
  const base = r2(gross - discount)

  const calc: LineCalc = {
    ok: true, error: '', days, minDays: p.minDays, unitPriceDay, origin,
    monthFactor: p.monthFactor, weekFactor: p.weekFactor, months, weeks, looseDays,
    monthValue: r2(monthValue), weekValue: r2(weekValue), dayValue: r2(dayValue),
    unitTotal, gross, discount, base, vatPct: p.vatPct,
    // IVA sobre a base da linha; o desconto geral é aplicado a seguir (applyGeneralVat)
    vat: r2((base * p.vatPct) / 100),
    depositUnit: p.deposit, deposit: r2(p.deposit * q),
  }
  if (!(qty > 0)) { calc.ok = false; calc.error = 'A quantidade tem de ser superior a 0.' }
  else if (days < p.minDays) { calc.ok = false; calc.error = `O período do aluguer (${days} dias) é inferior ao mínimo do equipamento (${p.minDays} dias).` }
  else if (line.discountMode === 'pct' && (discountValue < 0 || discountValue > 100)) { calc.ok = false; calc.error = 'A percentagem de desconto tem de estar entre 0 e 100.' }
  else if (discount < 0 || discount > gross) { calc.ok = false; calc.error = `O desconto da linha tem de estar entre 0 e ${gross.toFixed(2)} €.` }
  return calc
}

/** Desconto geral em euros e em % do total das linhas. Devolve erro se estiver fora de 0 .. total. */
export function generalDiscountOf(base: number, g: GeneralDiscount): { amount: number; pct: number; error: string } {
  const v = toNumber(g.value)
  const amount = g.mode === 'pct' ? r2((base * v) / 100) : v
  const pct = base > 0 ? (amount / base) * 100 : 0
  let error = ''
  if (g.mode === 'pct' && (v < 0 || v > 100)) error = 'A percentagem do desconto geral tem de estar entre 0 e 100.'
  else if (amount < 0 || amount > base) error = `O desconto geral tem de estar entre 0 e ${base.toFixed(2)} €.`
  return { amount, pct, error }
}

/** IVA informativo de cada linha sobre a base já sem a parte do desconto geral (o IVA do orçamento é apurado por taxa em calcTotals) */
export function applyGeneralVat(calcs: LineCalc[], generalPct: number): LineCalc[] {
  return calcs.map((c) => (c.ok ? { ...c, vat: r2((c.base * (1 - generalPct / 100) * c.vatPct) / 100) } : c))
}

/** Há custo de transporte se a entrega for ao cliente, ou a recolha for no cliente, ou ambas. Só é 0 quando as duas são em armazém. */
export function hasTransport(deliveryType: string, pickupType: string): boolean {
  const same = (a: string, b: string) => a.trim().toLowerCase() === b.toLowerCase()
  return same(deliveryType, cfg.deliveryToCustomer) || same(pickupType, cfg.pickupToCustomer)
}

export function calcTotals(calcs: LineCalc[], general: { amount: number; pct: number }, adjustment: number, depositExempt: boolean, transport = 0): QuoteTotals {
  const valid = calcs.filter((c) => c.ok)
  const sum = (f: (c: LineCalc) => number) => valid.reduce((a, c) => a + f(c), 0)
  const base = sum((c) => c.base)
  // IVA "pelo total por taxa" (Guia Técnico de IVA, método recomendado): soma as bases de cada taxa,
  // aplica o desconto geral proporcionalmente e só depois calcula e arredonda o IVA de cada taxa
  const baseByRate = new Map<number, number>()
  for (const c of valid) baseByRate.set(c.vatPct, (baseByRate.get(c.vatPct) ?? 0) + c.base)
  // o transporte e o ajuste já incluem IVA: base e imposto entram na linha da sua taxa e não levam desconto geral
  const tRate = cfg.transportVatPct
  const aRate = cfg.adjustmentVatPct
  const transportNet = transport > 0 ? r2(transport / (1 + tRate / 100)) : 0
  const transportVat = transport > 0 ? r2(transport - transportNet) : 0
  const adjustmentNet = adjustment !== 0 ? r2(adjustment / (1 + aRate / 100)) : 0
  const adjustmentVat = adjustment !== 0 ? r2(adjustment - adjustmentNet) : 0
  const extras = new Map<number, { net: number; vat: number }>()
  const addExtra = (rate: number, net: number, vat: number) => {
    const e = extras.get(rate) ?? { net: 0, vat: 0 }
    extras.set(rate, { net: e.net + net, vat: e.vat + vat })
    if (!baseByRate.has(rate)) baseByRate.set(rate, 0)
  }
  if (transport > 0) addExtra(tRate, transportNet, transportVat)
  if (adjustment !== 0) addExtra(aRate, adjustmentNet, adjustmentVat)
  const vatTable: VatRow[] = [...baseByRate]
    .sort((x, y) => y[0] - x[0])
    .map(([rate, b]) => {
      const net = b * (1 - general.pct / 100)
      const e = extras.get(rate)
      return { rate, base: r2(net + (e?.net ?? 0)), vat: r2(r2((net * rate) / 100) + (e?.vat ?? 0)) }
    })
  const vat = r2(vatTable.reduce((acc, row) => acc + row.vat, 0))
  const exclVat = r2(base - general.amount + transportNet + adjustmentNet)
  return {
    gross: r2(sum((c) => c.gross)),
    lineDiscounts: r2(sum((c) => c.discount)),
    base: r2(base),
    generalDiscount: general.amount,
    generalPct: general.pct,
    vat,
    vatTable,
    adjustment,
    transport,
    transportVat,
    transportNet,
    adjustmentNet,
    exclVat,
    grand: r2(exclVat + vat),
    deposit: depositExempt ? 0 : r2(sum((c) => c.deposit)),
  }
}

export const fmtEur = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 }).format(n)
