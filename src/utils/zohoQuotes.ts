/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZohoInterface } from '@/interfaces/zohoInterface'
import type { AddressState, DealPrefill, Lookup, PriceContext, ProductInfo, QuotePrefill } from '@/interfaces/quoteTypes'
import { quoteConfig as cfg } from '@/config/quoteConfig'
import { functionRequest, getOrgInfo, invokeCrmFunction } from '@/utils/zohoFunctions'

declare const ZOHO: ZohoInterface

export type LookupEntity = 'Accounts' | 'Contacts' | 'Deals' | 'Products'

const nameOf: Record<LookupEntity, (r: any) => string> = {
  Accounts: (r) => r.Account_Name,
  Contacts: (r) => r.Full_Name || `${r.First_Name ?? ''} ${r.Last_Name ?? ''}`.trim(),
  Deals: (r) => r.Deal_Name,
  Products: (r) => r.Product_Name + (r.Product_Code ? ` (${r.Product_Code})` : ''),
}

/** Pesquisa por palavra num módulo (máx. 10 resultados) */
export async function searchLookup(entity: LookupEntity, query: string): Promise<Lookup[]> {
  try {
    const res = await ZOHO.CRM.API.searchRecord({ Entity: entity, Type: 'word', Query: query })
    return ((res?.data as any[]) ?? []).slice(0, 10).map((r) => ({ id: String(r.id), name: nameOf[entity](r) }))
  } catch {
    return []
  }
}

/** Primeiros registos do módulo, para sugerir ao abrir a caixa de pesquisa (equipamentos inativos ficam de fora) */
export async function suggestLookup(entity: LookupEntity, max = 8): Promise<Lookup[]> {
  try {
    const res = await ZOHO.CRM.API.getAllRecords({ Entity: entity, page: 1, per_page: 25 })
    return ((res?.data as any[]) ?? [])
      .filter((r) => r.Product_Active !== false)
      .slice(0, max)
      .map((r) => ({ id: String(r.id), name: nameOf[entity](r) }))
  } catch {
    return []
  }
}

/**
 * Abre o formulário de criação do módulo num novo separador SEM fechar o popup do widget.
 * HIPÓTESE: o ZOHO.CRM.UI.Record.create fecha o popup; por isso abre-se o endereço do CRM diretamente
 * (https://crm.zoho.eu/crm/org<zgid>/tab/<Módulo>/create). Se o browser bloquear ou faltar o id da organização,
 * recorre ao SDK (que pode fechar o popup).
 */
export async function openCreate(entity: LookupEntity): Promise<void> {
  try {
    const org = await getOrgInfo()
    if (org?.zgid) {
      const w = window.open(`${cfg.crmBaseUrl}/org${org.zgid}/tab/${entity}/create`, '_blank')
      if (w) { w.opener = null; return }
    }
  } catch { /* sem id da organização: usa o SDK */ }
  await ZOHO.CRM.UI.Record.create({ Entity: entity, Target: '_blank', target: '_blank' })
}

async function getRecord(entity: string, id: string): Promise<any | null> {
  try {
    const res = await ZOHO.CRM.API.getRecord({ Entity: entity, RecordID: id })
    return res?.data?.[0] ?? null
  } catch {
    return null
  }
}

/** "IVA - 23.0 %", {percentage} ou {value: "IVA - 23.0 %"} -> 23 */
function vatOf(tax: unknown): number {
  if (tax && typeof tax === 'object') {
    const t = tax as any
    if (t.percentage != null) return Number(t.percentage) || 0
    tax = t.value ?? t.name ?? ''
  }
  const parts = String(tax).split(' - ')
  return parts.length > 1 ? parseFloat((parts[1] ?? '').replace('%', '').trim()) || 0 : 0
}

export async function loadProduct(id: string): Promise<ProductInfo | null> {
  const p = await getRecord('Products', id)
  if (!p) return null
  const taxes: unknown[] = p.Taxable === false || !Array.isArray(p.Tax) ? [] : p.Tax
  return {
    id: String(p.id),
    name: p.Product_Name,
    code: p.Product_Code ?? '',
    unitPrice: Number(p.Unit_Price ?? 0),
    minDays: Number(p.Minimum_Period_Days ?? 1),
    monthFactor: Number(p.Monthly_Price_Factor ?? 0),
    weekFactor: Number(p.Weekly_Price_Factor ?? 0),
    deposit: Number(p.Deposit ?? 0),
    vatPct: taxes.reduce<number>((acc, t) => acc + vatOf(t), 0),
  }
}

/** Tabela de preços ATIVA -> { idProduto: preço por dia } */
async function loadPriceBook(pbId: string | undefined): Promise<{ prices: Record<string, number>; note: string }> {
  if (!pbId) return { prices: {}, note: 'Sem tabela de preços associada: usado o preço do equipamento.' }
  const pb = await getRecord('Price_Books', pbId)
  const pbName = pb?.Price_Book_Name ?? ''
  if (pb && pb.Active === false) {
    return { prices: {}, note: `A tabela de preços ${pbName} está inativa: usado o preço do equipamento.` }
  }
  const prices: Record<string, number> = {}
  try {
    const res = await ZOHO.CRM.API.getRelatedRecords({ Entity: 'Price_Books', RecordID: pbId, RelatedList: 'Products', page: 1, per_page: 200 })
    for (const p of (res?.data as any[]) ?? []) {
      if (p.list_price != null) prices[String(p.id)] = Number(p.list_price)
    }
  } catch { /* sem preços: usa o preço do equipamento */ }
  return { prices, note: `Preços da tabela ${pbName}`.trim() }
}

/**
 * Preço por dia: tabela da Empresa; sem Empresa, tabela do Contacto; senão preço do equipamento.
 * Desconto contratual e isenção de caução: só existem nas Empresas.
 */
export async function loadPriceContext(account: Lookup | null, contact: Lookup | null): Promise<PriceContext> {
  if (account) {
    const a = await getRecord('Accounts', account.id)
    const pb = await loadPriceBook(a?.Price_Book?.id)
    return {
      origin: 'Empresa',
      prices: pb.prices,
      contractPct: Math.min(Number(a?.Contract_Discount ?? 0), cfg.maxContractDiscountPct),
      depositExempt: a?.[cfg.depositExemptField] === true,
      note: pb.note,
    }
  }
  if (contact) {
    const c = await getRecord('Contacts', contact.id)
    const pb = await loadPriceBook(c?.[cfg.contactPriceBookField]?.id)
    return { origin: 'Contacto', prices: pb.prices, contractPct: 0, depositExempt: false, note: pb.note }
  }
  return { origin: 'Produto', prices: {}, contractPct: 0, depositExempt: false, note: '' }
}

const asLookup = (v: any, nameKey: string): Lookup | null =>
  v && v.id ? { id: String(v.id), name: String(v.name ?? v[nameKey] ?? '') } : null

/**
 * Equipamentos pretendidos da Oportunidade (multi-lookup Requested_Equipment).
 * HIPÓTESE: o SDK pode devolver [{id,name}] ou [{Requested_Equipment:{id,name}}]; aceitam-se os dois formatos.
 */
function equipmentOf(raw: unknown): Lookup[] {
  const out: Lookup[] = []
  for (const it of Array.isArray(raw) ? raw : []) {
    const l = asLookup((it as any)?.Requested_Equipment ?? (it as any)?.Product_Name ?? it, 'Product_Name')
    if (l && !out.some((o) => o.id === l.id)) out.push(l)
  }
  return out
}

/** Lê a Oportunidade e devolve o que pré-preenche o orçamento (Empresa, Contacto, datas pretendidas, equipamentos) */
export async function loadDealPrefill(dealId: string): Promise<DealPrefill | null> {
  const d = await getRecord('Deals', dealId)
  if (!d) return null
  return {
    deal: { id: String(d.id), name: String(d.Deal_Name ?? '') },
    subject: String(d.Deal_Name ?? ''),
    account: asLookup(d.Account_Name, 'Account_Name'),
    contact: asLookup(d.Contact_Name, 'Full_Name'),
    start: d.Desired_Start_Date ?? '',
    end: d.Desired_End_Date ?? '',
    deliveryLocation: String(d.Delivery_Location ?? ''),
    products: equipmentOf(d.Requested_Equipment),
  }
}

const addressOf = (q: any, p: 'Billing' | 'Shipping'): AddressState => ({
  country: String(q[`${p}_Country`] ?? ''), street: String(q[`${p}_Street`] ?? ''), city: String(q[`${p}_City`] ?? ''),
  state: String(q[`${p}_State`] ?? ''), code: String(q[`${p}_Code`] ?? ''),
})

/** Lê um orçamento existente (e as linhas do subformulário Quoted_Items) para o rever no widget */
export async function loadQuotePrefill(quoteId: string): Promise<QuotePrefill | null> {
  const q = await getRecord('Quotes', quoteId)
  if (!q) return null
  // HIPÓTESE: o SDK do widget usa a API antiga, onde as linhas vêm em Product_Details (product, quantity); na v8 vêm em Quoted_Items (Product_Name, Quantity). Aceitam-se os dois formatos.
  const rows: any[] = Array.isArray(q.Product_Details) && q.Product_Details.length ? q.Product_Details : Array.isArray(q.Quoted_Items) ? q.Quoted_Items : []
  const lines: QuotePrefill['lines'] = []
  for (const r of rows) {
    const product = asLookup(r.product ?? r.Product_Name, 'Product_Name')
    if (!product) continue
    lines.push({
      product, qty: String(r.quantity ?? r.Quantity ?? 1), start: r.Line_Start_Date ?? '', end: r.Line_End_Date ?? '',
      discount: Number(r.Discount ?? 0),
    })
  }
  if (!lines.length) console.warn('[wcrm_quotes] Orçamento sem linhas lidas. Campos devolvidos pelo SDK:', Object.keys(q), rows)
  return {
    id: String(q.id),
    stage: String(q.Quote_Stage ?? ''),
    info: {
      subject: String(q.Subject ?? ''), account: asLookup(q.Account_Name, 'Account_Name'), contact: asLookup(q.Contact_Name, 'Full_Name'),
      deal: asLookup(q.Deal_Name, 'Deal_Name'), validTill: q.Valid_Till ?? '', requestOrigin: String(q.Request_Origin ?? ''),
    },
    period: { start: q.Rental_Start_Date ?? '', end: q.Rental_End_Date ?? '', transportCost: q.Transport_Cost ? String(q.Transport_Cost) : '', deliveryType: String(q.Delivery_Type ?? '') },
    billing: addressOf(q, 'Billing'),
    shipping: addressOf(q, 'Shipping'),
    adjustment: q.Adjustment ? String(q.Adjustment) : '',
    promoCode: String(q.Promo_Code ?? ''),
    discount: Number(q.Discount ?? 0),
    lines,
  }
}

/** Atualiza o orçamento pela função Deluge (substitui as linhas). Devolve o ID. */
export async function updateQuote(id: string, payload: Record<string, unknown>): Promise<string> {
  const out = await invokeCrmFunction(
    cfg.updateFunction,
    { arguments: JSON.stringify({ quoteId: id, payload: JSON.stringify(payload) }) },
    'object',
  )
  const item = out?.data?.[0]
  if (!item || item.code !== 'SUCCESS') throw out
  return String(item.details.id)
}

/** Cria o orçamento pela função Deluge (API v8, grava as colunas personalizadas das linhas). Devolve o ID. */
export async function createQuote(payload: Record<string, unknown>): Promise<string> {
  const out = await invokeCrmFunction(
    cfg.createFunction,
    { arguments: JSON.stringify({ payload: JSON.stringify(payload) }) },
    'object',
  )
  const item = out?.data?.[0]
  if (!item || item.code !== 'SUCCESS') throw out
  return String(item.details.id)
}

/** Corre a fn_Quotes_calcLines no orçamento criado (Daily_Price, Line_Tax, caução, IVA, desconto Empresa) */
export async function recalcQuote(id: string): Promise<void> {
  const res = await ZOHO.CRM.FUNCTIONS.execute(cfg.calcFunction, functionRequest({ arguments: JSON.stringify({ quoteId: id }) }))
  if (res?.code !== 'success') throw res
}

/**
 * Abre a lista de Pedidos de Orçamento na janela principal do CRM (o popup desaparece com a navegação).
 * HIPÓTESE: o iframe do widget pode não ter permissão para navegar a janela principal; nesse caso fecha só o popup.
 */
export async function goToQuotesList(): Promise<void> {
  try {
    const org = await getOrgInfo()
    const url = `${cfg.crmBaseUrl}/org${org.zgid}/tab/Quotes`
    try {
      window.top!.location.href = url
      return
    } catch { /* sem permissão para navegar a janela principal */ }
    if (window.open(url, '_top')) return
  } catch { /* sem id da organização */ }
  await ZOHO.CRM.UI.Popup.close()
}

export async function openQuote(id: string): Promise<void> {
  await ZOHO.CRM.UI.Record.open({ Entity: 'Quotes', RecordID: id, target: '_blank' })
}
