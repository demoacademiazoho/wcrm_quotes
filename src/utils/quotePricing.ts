import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { LineCalc, LineState, PriceContext, ProductInfo, QuoteTotals } from '@/interfaces/quoteTypes'

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
  const discount = toNumber(line.discount)
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
  const base = r2(gross - discount)

  const calc: LineCalc = {
    ok: true, error: '', days, minDays: p.minDays, unitPriceDay, origin,
    monthFactor: p.monthFactor, weekFactor: p.weekFactor, months, weeks, looseDays,
    monthValue: r2(monthValue), weekValue: r2(weekValue), dayValue: r2(dayValue),
    unitTotal, gross, discount, base, vatPct: p.vatPct,
    // IVA sobre a base sem desconto da linha e sem desconto da Empresa
    vat: r2((base * (1 - ctx.contractPct / 100) * p.vatPct) / 100),
    depositUnit: p.deposit, deposit: r2(p.deposit * q),
  }
  if (!(qty > 0)) { calc.ok = false; calc.error = 'A quantidade tem de ser superior a 0.' }
  else if (days < p.minDays) { calc.ok = false; calc.error = `O período do aluguer (${days} dias) é inferior ao mínimo do equipamento (${p.minDays} dias).` }
  else if (discount < 0 || discount > gross) { calc.ok = false; calc.error = `O desconto da linha tem de estar entre 0 e ${gross.toFixed(2)} €.` }
  return calc
}

export function calcTotals(calcs: LineCalc[], ctx: PriceContext, hasAccount: boolean, adjustment: number): QuoteTotals {
  const valid = calcs.filter((c) => c.ok)
  const sum = (f: (c: LineCalc) => number) => valid.reduce((a, c) => a + f(c), 0)
  const base = sum((c) => c.base)
  // desconto da Empresa: sobre o total das linhas, só com Empresa
  const companyDiscount = hasAccount ? r2((base * ctx.contractPct) / 100) : 0
  const vat = r2(sum((c) => c.vat))
  return {
    gross: r2(sum((c) => c.gross)),
    lineDiscounts: r2(sum((c) => c.discount)),
    base: r2(base),
    companyDiscount,
    vat,
    adjustment,
    grand: r2(base - companyDiscount + vat + adjustment),
    deposit: ctx.depositExempt ? 0 : r2(sum((c) => c.deposit)),
  }
}

export const fmtEur = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(n)

export const fmtNum = (n: number): string =>
  new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 4 }).format(n)
