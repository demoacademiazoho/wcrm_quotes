export interface Lookup {
  id: string
  name: string
}

export interface ProductInfo {
  id: string
  name: string
  code: string
  unitPrice: number
  minDays: number
  monthFactor: number
  weekFactor: number
  deposit: number
  /** % de IVA do produto (soma dos impostos), 0 se não tributável */
  vatPct: number
}

export type PriceOrigin = 'Empresa' | 'Contacto' | 'Produto'

/** Contexto de preços e regras comerciais, dado pela Empresa (ou pelo Contacto, sem Empresa) */
export interface PriceContext {
  origin: PriceOrigin
  /** idProduto -> preço por dia, da tabela de preços ativa */
  prices: Record<string, number>
  contractPct: number
  depositExempt: boolean
  note: string
}

export interface AddressState {
  country: string
  street: string
  city: string
  state: string
  code: string
}

export interface QuoteInfoState {
  subject: string
  account: Lookup | null
  contact: Lookup | null
  deal: Lookup | null
  validTill: string
  requestOrigin: string
}

export interface PeriodState {
  start: string
  end: string
  transportCost: string
  deliveryType: string
}

export interface LineState {
  uid: number
  product: Lookup | null
  info: ProductInfo | null
  start: string
  end: string
  qty: string
  discount: string
  loading: boolean
}

export interface LineCalc {
  ok: boolean
  error: string
  days: number
  minDays: number
  unitPriceDay: number
  origin: PriceOrigin
  monthFactor: number
  weekFactor: number
  months: number
  weeks: number
  looseDays: number
  monthValue: number
  weekValue: number
  dayValue: number
  /** total do período por unidade (vai para List_Price) */
  unitTotal: number
  gross: number
  discount: number
  /** gross - desconto da linha */
  base: number
  vatPct: number
  vat: number
  depositUnit: number
  deposit: number
}

export interface QuoteTotals {
  gross: number
  lineDiscounts: number
  base: number
  companyDiscount: number
  vat: number
  adjustment: number
  grand: number
  deposit: number
}
