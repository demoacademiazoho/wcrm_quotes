import { quoteConfig as cfg } from '@/config/quoteConfig'
import type { AddressState, LineCalc, LineState, PeriodState, QuoteInfoState, QuoteTotals } from '@/interfaces/quoteTypes'
import { toNumber } from '@/utils/quotePricing'

interface PayloadInput {
  info: QuoteInfoState
  period: PeriodState
  billing: AddressState
  shipping: AddressState
  lines: LineState[]
  calcs: LineCalc[]
  totals: QuoteTotals
  adjustment: number
  promoCode: string
}

/** Orçamento no formato da API v8 do CRM (linhas em Quoted_Items) */
export function buildQuotePayload(i: PayloadInput): Record<string, unknown> {
  const o: Record<string, unknown> = {
    Subject: i.info.subject,
    Quote_Stage: 'Rascunho',
    Valid_Till: i.info.validTill,
    Rental_Start_Date: i.period.start,
    Rental_End_Date: i.period.end,
    Delivery_Type: i.period.deliveryType,
    Billing_Country: i.billing.country, Billing_Street: i.billing.street, Billing_City: i.billing.city,
    Billing_State: i.billing.state, Billing_Code: i.billing.code,
    Shipping_Country: i.shipping.country, Shipping_Street: i.shipping.street, Shipping_City: i.shipping.city,
    Shipping_State: i.shipping.state, Shipping_Code: i.shipping.code,
    Adjustment: i.adjustment,
    Total_Deposit: i.totals.deposit,
    Quoted_Items: i.lines.map((l, k) => {
      const c = i.calcs[k]
      if (!c) return {}
      const row: Record<string, unknown> = {
        Product_Name: { id: l.product?.id },
        Quantity: toNumber(l.qty),
        List_Price: c.unitTotal,
        Line_Start_Date: l.start,
        Line_End_Date: l.end,
      }
      if (c.discount) row.Discount = c.discount
      return row
    }),
  }
  if (i.info.contact) o.Contact_Name = { id: i.info.contact.id }
  if (i.info.account) {
    o.Account_Name = { id: i.info.account.id }
  }
  // Desconto geral em euros (por defeito o contratual da Empresa; o utilizador pode alterá-lo)
  if (i.totals.generalDiscount > 0) o.Discount = i.totals.generalDiscount
  if (i.info.deal) o.Deal_Name = { id: i.info.deal.id }
  if (i.info.requestOrigin) o.Request_Origin = i.info.requestOrigin
  if (toNumber(i.period.transportCost)) o.Transport_Cost = toNumber(i.period.transportCost)
  if (i.promoCode) o.Promo_Code = i.promoCode
  // campos vazios não vão para o CRM
  for (const k of Object.keys(o)) if (o[k] === '' || o[k] === undefined) delete o[k]
  return o
}

export const isPickup = (deliveryType: string): boolean => deliveryType === cfg.warehousePickup
