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
  /** categorias de Equipamento Catálogo que não se podem orçamentar (iguais ao filtro do campo no CRM) */
  excludedProductCategories: ['Serviços de fatura'],
  /** campo da tabela de preços no Contacto (hoje não existe em Contactos) */
  contactPriceBookField: 'Price_Book',
  /** isenção de caução (só existe em Empresas) */
  depositExemptField: 'Deposit_Exempt',
  /** endereço do CRM (centro de dados EU), usado para abrir formulários de criação noutro separador */
  crmBaseUrl: 'https://crm.zoho.eu/crm',
  /** funções Deluge no CRM */
  createFunction: 'fn_Quotes_createFromWizard',
  updateFunction: 'fn_Quotes_updateFromWizard',
  calcFunction: 'fn_Quotes_calcLines',
  /** fases em que o orçamento pode ser revisto no widget (BP02): só Revisão e em Rascunho*/
  reviewStages: ['Rascunho', 'Revisão'],
  deliveryToCustomer: 'Entrega ao cliente',
  warehousePickup: 'Levantamento em armazém',
  /** campo do CRM com o tipo de recolha (lista com os 2 valores abaixo) */
  pickupField: 'Pickup_Type',
  pickupToCustomer: 'Recolha no cliente',
  warehouseReturn: 'Devolução em armazém',
  /** o custo de transporte já inclui IVA a esta taxa (%): entra no quadro de IVA e no IVA total */
  transportVatPct: 23,
  /** o Ajuste (arredondamento do Total Geral) inclui IVA a esta taxa (%), a validar com o contabilista */
  adjustmentVatPct: 23,
  requestOrigins: ['Portal', 'Backoffice', 'Telefone', 'Email'],
} as const
