/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ZohoInterface } from '@/interfaces/zohoInterface'
import type { Lookup, PriceContext, ProductInfo } from '@/interfaces/quoteTypes'
import { quoteConfig as cfg } from '@/config/quoteConfig'
import { useWidgetConfigStore } from '@/stores/widgetConfig'
import { invokeCrmFunction } from '@/utils/zohoFunctions'

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
  const res = await ZOHO.CRM.FUNCTIONS.execute(cfg.calcFunction, {
    auth_type: 'apikey',
    zapikey: useWidgetConfigStore().apiKey,
    arguments: JSON.stringify({ quoteId: id }),
  })
  if (res?.code !== 'success') throw res
}

export async function openQuote(id: string): Promise<void> {
  await ZOHO.CRM.UI.Record.open({ Entity: 'Quotes', RecordID: id, target: '_blank' })
}
