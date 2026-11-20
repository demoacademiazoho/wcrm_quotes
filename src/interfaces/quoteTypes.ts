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

/** Dados da Oportunidade que pré-preenchem o orçamento */
export interface DealPrefill {
  deal: Lookup
  subject: string
  account: Lookup | null
  contact: Lookup | null
  start: string
  end: string
  /** texto livre do campo Delivery_Location da Oportunidade (só informativo) */
  deliveryLocation: string
  /** equipamentos pretendidos (Requested_Equipment) */
  products: Lookup[]
}

/** Orçamento existente carregado para revisão */
export interface QuotePrefill {
  id: string
  stage: string
  info: QuoteInfoState
  period: PeriodState
  billing: AddressState
  shipping: AddressState
  adjustment: string
  promoCode: string
  /** desconto geral em euros (campo Discount do orçamento) */
  discount: number
  lines: { product: Lookup; qty: string; start: string; end: string; discount: number }[]
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
  pickupType: string
}

export interface LineState {
  uid: number
  product: Lookup | null
  info: ProductInfo | null
  start: string
  end: string
  qty: string
  /** valor do desconto: percentagem ou euros, conforme discountMode (como o popup "Definir desconto" do CRM) */
  discount: string
  discountMode: 'pct' | 'amount'
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

/** Desconto geral do orçamento (como o popup "Definir desconto" do CRM): percentagem ou redução direta em euros */
export interface GeneralDiscount {
  mode: 'pct' | 'amount'
  value: string
}

export interface VatRow {
  rate: number
  base: number
  vat: number
}

export interface QuoteTotals {
  gross: number
  lineDiscounts: number
  base: number
  /** desconto geral em euros (por defeito o desconto contratual da Empresa) */
  generalDiscount: number
  /** desconto geral em % do total das linhas (usado no IVA) */
  generalPct: number
  vat: number
  /** quadro de IVA por taxa: base já sem o desconto geral, taxa e imposto (o IVA total é a soma destes impostos) */
  vatTable: VatRow[]
  adjustment: number
  /** custo de transporte, com IVA incluído (só com Entrega ao cliente ou Recolha no cliente); soma-se ao Total Geral */
  transport: number
  /** parte do transporte que é IVA (já contada em vat e no quadro de IVA) */
  transportVat: number
  /** transporte sem IVA */
  transportNet: number
  /** ajuste sem IVA (o ajuste introduzido inclui IVA) */
  adjustmentNet: number
  /** Total sem IVA = base - desconto geral + transporte e ajuste sem IVA */
  exclVat: number
  grand: number
  deposit: number
}
