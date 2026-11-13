/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Simulação do SDK do Zoho para desenvolvimento local e demo (VITE_MOCK=true).
 * Dados fictícios: nada é gravado no CRM.
 */
const db: Record<string, any[]> = {
  Accounts: [
    { id: 'A1', Account_Name: 'Construções Atlântico, Lda', Price_Book: { id: 'PB1' }, Deposit_Exempt: false, Contract_Discount: 10 },
    { id: 'A2', Account_Name: 'Obras do Tejo, SA (isenta de caução)', Deposit_Exempt: true, Contract_Discount: 5 },
  ],
  Contacts: [
    { id: 'C1', Full_Name: 'Ruben Teste' },
    { id: 'C2', Full_Name: 'Rui Ferreira' },
    { id: 'C3', Full_Name: 'Maria Particular (tabela própria)', Price_Book: { id: 'PB2' } },
  ],
  Deals: [{
    id: 'D1', Deal_Name: 'Obra Cascais 2026', Account_Name: { id: 'A1', name: 'Construções Atlântico, Lda' }, Contact_Name: { id: 'C1', name: 'Ruben Teste' },
    Desired_Start_Date: '2026-11-16', Desired_End_Date: '2026-11-30', Delivery_Location: 'Obra em Cascais, junto à rotunda',
    Requested_Equipment: [{ id: 'P2', name: 'Gerador 20 kVA' }, { id: 'P3' }],
  }],
  Quotes: [{
    id: 'Q1', Subject: 'T07-017', Quote_Stage: 'Revisão', Valid_Till: '2026-11-20', Account_Name: { id: 'A1', name: 'Construções Atlântico, Lda' },
    Contact_Name: { id: 'C1', name: 'Ruben Teste' }, Deal_Name: { id: 'D1', name: 'Obra Cascais 2026' },
    Rental_Start_Date: '2026-11-16', Rental_End_Date: '2026-11-30', Delivery_Type: 'Entrega ao cliente', Request_Origin: 'Telefone',
    Shipping_Country: 'Portugal', Shipping_Street: 'Rua das Obras 1', Shipping_City: 'Cascais', Shipping_Code: '2750-001', Discount: 20,
    Product_Details: [{ id: 'L1', product: { id: 'P2', name: 'Gerador 20 kVA', Product_Code: 'GER-20' }, quantity: 1, Line_Start_Date: '2026-11-16', Line_End_Date: '2026-11-30', Discount: 0 }],
  }, { id: 'Q2', Subject: 'Já enviado', Quote_Stage: 'Enviado' }],
  Price_Books: [
    { id: 'PB1', Price_Book_Name: 'Tabela Construção 2026', Active: true },
    { id: 'PB2', Price_Book_Name: 'Tabela Particulares', Active: true },
  ],
  Products: [
    { id: 'P1', Product_Name: 'Betoneira elétrica 160 L', Product_Code: 'CON-BETON-160', Unit_Price: 25, Minimum_Period_Days: 10, Weekly_Price_Factor: 3.5, Monthly_Price_Factor: 10, Deposit: 150, Tax: ['IVA - 23.0 %'] },
    { id: 'P2', Product_Name: 'Gerador 20 kVA', Product_Code: 'GER-20', Unit_Price: 100, Minimum_Period_Days: 3, Weekly_Price_Factor: 3.5, Monthly_Price_Factor: 10, Deposit: 400, Tax: ['IVA - 23.0 %'] },
    { id: 'P3', Product_Name: 'Martelo demolidor 15 kg elétrico', Product_Code: 'CON-DEM-15KG', Unit_Price: 45, Minimum_Period_Days: 1, Weekly_Price_Factor: 3.5, Monthly_Price_Factor: 10, Deposit: 200, Tax: ['IVA - 23.0 %'] },
  ],
}
const priceBooks: Record<string, any[]> = {
  PB1: [{ id: 'P2', list_price: 85 }],
  PB2: [{ id: 'P3', list_price: 40 }],
}
const wait = <T>(v: T, ms = 120) => new Promise<T>((r) => setTimeout(() => r(v), ms))

export function installZohoMock() {
  ;(window as any).ZOHO = {
    embeddedApp: { on: (_e: string, cb: (p?: object) => void) => setTimeout(() => cb(import.meta.env.VITE_MOCK_QUOTE ? { Entity: 'Quotes', EntityId: [import.meta.env.VITE_MOCK_QUOTE], ButtonPosition: 'DetailView' } : import.meta.env.VITE_MOCK_DEAL === 'true' ? { Entity: 'Deals', EntityId: ['D1'], ButtonPosition: 'DetailView' } : {}), 0), init: () => Promise.resolve() },
    CRM: {
      API: {
        searchRecord: ({ Entity, Query }: any) => wait({ data: (db[Entity] ?? []).filter((r) => JSON.stringify(r).toLowerCase().includes(String(Query).toLowerCase())) }),
        getAllRecords: ({ Entity, per_page }: any) => wait({ data: (db[Entity] ?? []).slice(0, per_page ?? 10) }, 80),
        getRecord: ({ Entity, RecordID }: any) => wait({ data: [(db[Entity] ?? []).find((r) => r.id === RecordID)] }, 60),
        getRelatedRecords: ({ RecordID }: any) => wait({ data: priceBooks[RecordID] ?? [] }, 60),
      },
      FUNCTIONS: {
        execute: (name: string, data: any) => {
          console.info('[mock] função', name, data)
          if (name === 'fn_Quotes_createFromWizard') {
            return wait({ code: 'success', details: { output: JSON.stringify({ data: [{ code: 'SUCCESS', details: { id: '1027502000009999999' } }] }) } }, 700)
          }
          if (name === 'fn_Quotes_updateFromWizard') {
            return wait({ code: 'success', details: { output: JSON.stringify({ data: [{ code: 'SUCCESS', details: { id: 'Q1' } }] }) } }, 700)
          }
          return wait({ code: 'success', details: { output: '' } }, 400)
        },
      },
      UI: { Record: { create: (d: any) => { console.info('[mock] criar registo', d); return Promise.resolve() }, open: (d: any) => { console.info('[mock] abrir registo', d); return Promise.resolve() } }, Popup: { closeReload: () => { console.info('[mock] fechar e recarregar'); return Promise.resolve() } }, Resize: () => Promise.resolve() },
      CONFIG: { getOrgInfo: () => Promise.resolve({ org: [{ zgid: '20120437488' }] }) },
    },
  }
}
