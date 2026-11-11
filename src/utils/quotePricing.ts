import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { GeneralDiscount, LineCalc, LineState, PriceContext, ProductInfo, QuoteTotals } from '@/interfaces/quoteTypes'

export const r2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

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

/** IVA de cada linha sobre a base já sem a parte do desconto geral */
export function applyGeneralVat(calcs: LineCalc[], generalPct: number): LineCalc[] {
  return calcs.map((c) => (c.ok ? { ...c, vat: r2((c.base * (1 - generalPct / 100) * c.vatPct) / 100) } : c))
}

export function calcTotals(calcs: LineCalc[], general: { amount: number; pct: number }, adjustment: number, depositExempt: boolean): QuoteTotals {
  const valid = calcs.filter((c) => c.ok)
  const sum = (f: (c: LineCalc) => number) => valid.reduce((a, c) => a + f(c), 0)
  const base = sum((c) => c.base)
  const vat = r2(sum((c) => c.vat))
  return {
    gross: r2(sum((c) => c.gross)),
    lineDiscounts: r2(sum((c) => c.discount)),
    base: r2(base),
    generalDiscount: general.amount,
    generalPct: general.pct,
    vat,
    adjustment,
    grand: r2(base - general.amount + vat + adjustment),
    deposit: depositExempt ? 0 : r2(sum((c) => c.deposit)),
  }
}

export const fmtEur = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 }).format(n)
