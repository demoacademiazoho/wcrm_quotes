/**
 * Regras do Pedido de Orçamento.
 * Têm de ficar iguais às constantes da função Deluge fn_Quotes_calcLines (v1.4).
 */
export const quoteConfig = {
  /** true = conta o dia de início (09-11 a 11-11 = 3 dias), como o campo "Total de dias" do CRM */
  inclusiveDays: true,
  monthDays: 30,
  weekDays: 7,
  /** limite do desconto contratual da Empresa (%) */
  maxContractDiscountPct: 50,
  /** "Válido até" por defeito = hoje + N dias */
  validDays: 7,
  /** campo da tabela de preços no Contacto (hoje não existe em Contactos) */
  contactPriceBookField: 'Price_Book',
  /** isenção de caução (só existe em Empresas) */
  depositExemptField: 'Deposit_Exempt',
  /** endereço do CRM (centro de dados EU), usado para abrir formulários de criação noutro separador */
  crmBaseUrl: 'https://crm.zoho.eu/crm',
  /** funções Deluge no CRM */
  createFunction: 'fn_Quotes_createFromWizard',
  calcFunction: 'fn_Quotes_calcLines',
  deliveryToCustomer: 'Entrega ao cliente',
  warehousePickup: 'Levantamento em armazém',
  requestOrigins: ['Portal', 'Backoffice', 'Telefone', 'Email'],
} as const
