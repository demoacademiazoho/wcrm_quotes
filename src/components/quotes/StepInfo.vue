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
      <Input id="stage" :model-value="s.isReview ? s.reviewStage : 'Rascunho'" label="Fase do Orçamento" disabled />

      <LookupInput
        id="account"
        v-model="s.info.account"
        label="Empresa"
        required
        placeholder="Pesquisar empresa..."
        :search="(q) => searchLookup('Accounts', q)"
        :suggest="free ? () => suggestLookup('Accounts') : undefined"
        :create-label="free ? 'Nova Empresa' : undefined"
        @create="openCreate('Accounts')"
        :disabled="s.accountLocked"
        :hint="s.accountLocked ? (s.isReview ? 'Não se altera na revisão.' : 'Definida pela oportunidade de origem.') : undefined"
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
        :suggest="free ? () => suggestLookup('Contacts') : undefined"
        :create-label="free ? 'Novo Contacto' : undefined"
        @create="openCreate('Contacts')"
        :disabled="s.contactLocked"
        :hint="s.contactLocked ? (s.isReview ? 'Não se altera na revisão.' : 'Definido pela oportunidade de origem.') : undefined"
        :error="s.fieldErrors.contact"
        @update:model-value="clearParty"
      />
      <LookupInput
        id="deal"
        v-model="s.info.deal"
        label="Oportunidade"
        placeholder="Pesquisar oportunidade..."
        :disabled="s.dealLocked"
        :hint="s.dealLocked ? (s.isReview ? 'Não se altera na revisão.' : 'Definida pela oportunidade de origem.') : undefined"
        :search="(q) => searchLookup('Deals', q)"
        :suggest="free ? () => suggestLookup('Deals') : undefined"
        :create-label="free ? 'Nova Oportunidade' : undefined"
        @create="openCreate('Deals')"
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
import { computed } from 'vue'
import { openCreate, searchLookup, suggestLookup } from '@/utils/zohoQuotes'

const s = useQuoteWizardStore()
/** abertura livre (a partir de Pedidos de Orçamento > Novo): Empresa, Contacto e Oportunidade pesquisáveis, com sugestões e link de criação como nos campos nativos */
const free = computed(() => !s.isReview && !s.fromDeal)
const origins = quoteConfig.requestOrigins.map((o) => ({ label: o, value: o }))
function clearParty() {
  s.clearError('account')
  s.clearError('contact')
}
</script>
