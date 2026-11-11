<template>
  <div class="flex flex-col gap-5">
    <div v-if="!s.info.account && !s.info.contact" role="note" class="rounded-lg border border-primary-200 bg-primary-100/60 px-4 py-3 text-sm text-navy">
      Indique a <strong>Empresa</strong> ou o <strong>Contacto</strong> (pelo menos um). Com Empresa, é ela que define a
      tabela de preços, o desconto e a isenção de caução.
    </div>

    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Input
        id="subject"
        v-model="s.info.subject"
        label="Assunto"
        required
        placeholder="Ex.: T07-017"
        :error="s.fieldErrors.subject"
        @update:model-value="s.clearError('subject')"
      />
      <Input id="stage" model-value="Rascunho" label="Fase do Orçamento" disabled />

      <LookupInput
        id="account"
        v-model="s.info.account"
        label="Empresa"
        required
        placeholder="Pesquisar empresa..."
        :search="(q) => searchLookup('Accounts', q)"
        :disabled="s.accountLocked"
        :hint="s.accountLocked ? 'Definida pela oportunidade de origem.' : undefined"
        :error="s.fieldErrors.account"
        @update:model-value="clearParty"
      />
      <LookupInput
        id="contact"
        v-model="s.info.contact"
        label="Contacto"
        required
        placeholder="Pesquisar contacto..."
        :search="(q) => searchLookup('Contacts', q)"
        :disabled="s.contactLocked"
        :hint="s.contactLocked ? 'Definido pela oportunidade de origem.' : undefined"
        :error="s.fieldErrors.contact"
        @update:model-value="clearParty"
      />
      <LookupInput
        id="deal"
        v-model="s.info.deal"
        label="Oportunidade"
        placeholder="Pesquisar oportunidade..."
        :disabled="s.fromDeal"
        :hint="s.fromDeal ? 'Definida pela oportunidade de origem.' : undefined"
        :search="(q) => searchLookup('Deals', q)"
      />
      <DatePicker
        id="validTill"
        v-model="s.info.validTill"
        label="Válido até"
        required
        :error="s.fieldErrors.validTill"
        @update:model-value="s.clearError('validTill')"
      />
      <Select
        id="origin"
        v-model="s.info.requestOrigin"
        label="Origem do pedido"
        placeholder="-None-"
        :options="origins"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Input from '@/components/form/Input.vue'
import Select from '@/components/form/Select.vue'
import DatePicker from '@/components/form/DatePicker.vue'
import LookupInput from './LookupInput.vue'
import { quoteConfig } from '@/config/quoteConfig'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { searchLookup } from '@/utils/zohoQuotes'

const s = useQuoteWizardStore()
const origins = quoteConfig.requestOrigins.map((o) => ({ label: o, value: o }))
function clearParty() {
  s.clearError('account')
  s.clearError('contact')
}
</script>
