/* eslint-disable @typescript-eslint/no-unused-vars */
  import type { ZohoInterface } from '@/interfaces/zohoInterface';
  import { useParamsStore } from '@/stores/params'
import { useWidgetConfigStore } from '@/stores/widgetConfig';
  
  declare const ZOHO: ZohoInterface;
  export async function zohoInit() {
    const paramsStore = useParamsStore()
    return new Promise((resolve) => {

      ZOHO.embeddedApp.on('PageLoad', async (_params?: object) => {
        console.info('Hello world from ZOHO!', _params)
        paramsStore.updateParams(_params)
        if ((_params as any)?.ButtonPosition === 'DetailView') {
          try { await resizePopup("100%", "100%") } catch (_) { /* not available in all contexts */ }
        }
        resolve(_params)
      })
      ZOHO.embeddedApp.init()
    })
  }
  
  // ZOHO GENERIC FUNCTIONS
  // GET'S
  
  export async function getOrgInfo() {
    const response = await ZOHO.CRM.CONFIG.getOrgInfo();
    const orgInfo = response?.org[0] || undefined;
    if (!orgInfo) {
      throw response;
    }
    return orgInfo;
  }
  
  export async function getAllUsers(usersType: string) {
    // VARIABLES
    const allUsers = [];
    let page = 1;
    let moreRecords = true;
    // INVOKE
    while (moreRecords) {
      const response = await ZOHO.CRM.API.getAllUsers({
        Type: usersType,
        page: page,
        per_page: 200,
      });
      const users = response?.users || undefined;
      if (!users) {
        moreRecords = false;
        throw response;
      }
      moreRecords = response?.info?.more_records;
      page = page + 1;
      if (users.length > 0) {
        allUsers.push(...users);
      }
    }
    return allUsers;
  }
  
  export async function getCurrentUser() {
    const response = await ZOHO.CRM.CONFIG.getCurrentUser();
    const user = response?.users[0] || undefined;
    if (!user) {
      throw response;
    }
    return user;
  }
  
  export async function getUserById(userId: string) {
    const response = await ZOHO.CRM.API.getUser({ ID: userId });
    const user = response?.users[0] || undefined;
    if (!user) {
      throw response;
    }
    return user;
  }
  
  export async function getOrgVariable(variableName: string) {
    const response = await ZOHO.CRM.API.getOrgVariable(variableName);
    const variable = response?.Success?.Content || undefined;
    if (!variable) {
      throw response;
    }
    return variable;
  }
  
  export async function getFields(module: string) {
    const response = await ZOHO.CRM.META.getFields({ Entity: module });
    const fields = response?.fields || undefined;
    if (!fields) {
      throw response;
    }
    return fields;
  }
  
  // INVOKE's
  
  /** Pedido para ZOHO.CRM.FUNCTIONS.execute: só usa API key se estiver configurada (apiKey vazia faria falhar a chamada) */
  export function functionRequest(args?: object): Record<string, unknown> {
    const apiKey = useWidgetConfigStore().apiKey;
    const requestData: Record<string, unknown> = apiKey ? { auth_type: 'apikey', zapikey: apiKey } : {};
    if (args) Object.assign(requestData, args);
    return requestData;
  }

  export async function invokeCrmFunction(
    functionName: string,
    args: object,
    returnType: 'string' | 'array' | 'object',
  ) {
    const response = await ZOHO.CRM.FUNCTIONS.execute(functionName, functionRequest(args));
    let output = response?.details?.output;
    if (response?.code !== 'success' || !output) {
      throw response;
    }
    if (returnType === 'array') {
      output = JSON.parse(`[${output}]`);
    } else if (returnType === 'object') {
      output = JSON.parse(output);
    }
    return output;
  }
  
  export async function invokeCrmConnection(
    connectionName: string,
    requestData: object,
  ) {
    // VERIFICAR SE ESTE TIPO DE VALIDAÇÃO FUNCIONA
    const response = await ZOHO.CRM.CONNECTION.invoke(
      connectionName,
      requestData,
    );
    const output = response?.details?.statusMessage?.data || false;
    if (response?.code !== 'SUCCESS') {
      throw response;
    }
  
    // return output ?? false;
    return output;
  }
  
  // UI's
  
  export async function resizePopup(height: string, width: string) {
    const response = await ZOHO.CRM.UI.Resize({ height, width });
    return response;
  }
  
  export async function closePopup() {
    const response = await ZOHO.CRM.UI.Popup.close();
    return response;
  }
  
  export async function closeAndReloadPopup() {
    const response = await ZOHO.CRM.UI.Popup.closeReload();
    return response;
  }
  