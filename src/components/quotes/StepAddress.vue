<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-4">
      <p class="text-sm text-muted">
        <template v-if="required">Com entrega ao cliente, a morada de envio é obrigatória.</template>
        <template v-else>Tipo de entrega: {{ s.period.deliveryType }}. A morada de envio é opcional.</template>
      </p>
      <Button variant="secondary" size="sm" @click="s.copyBillingToShipping">Copiar endereço</Button>
    </div>

    <div class="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <fieldset class="rounded-xl border border-line p-4">
        <legend class="px-2 text-sm font-semibold text-navy">Endereço de faturação</legend>
        <div class="flex flex-col gap-3">
          <Input id="b-country" v-model="s.billing.country" label="País / Região" />
          <Input id="b-street" v-model="s.billing.street" label="Rua / Endereço" />
          <Input id="b-city" v-model="s.billing.city" label="Cidade" />
          <div class="grid grid-cols-2 gap-3">
            <Input id="b-state" v-model="s.billing.state" label="Estado / Distrito" />
            <Input id="b-code" v-model="s.billing.code" label="Código postal" />
          </div>
        </div>
      </fieldset>

      <fieldset class="rounded-xl border border-line p-4">
        <legend class="px-2 text-sm font-semibold text-navy">Endereço de envio</legend>
        <div class="flex flex-col gap-3">
          <Input id="s-country" v-model="s.shipping.country" label="País / Região" :required="required" :error="s.fieldErrors['s.country']" @update:model-value="s.clearError('s.country')" />
          <Input id="s-street" v-model="s.shipping.street" label="Rua / Endereço" :required="required" :error="s.fieldErrors['s.street']" @update:model-value="s.clearError('s.street')" />
          <Input id="s-city" v-model="s.shipping.city" label="Cidade" :required="required" :error="s.fieldErrors['s.city']" @update:model-value="s.clearError('s.city')" />
          <div class="grid grid-cols-2 gap-3">
            <Input id="s-state" v-model="s.shipping.state" label="Estado / Distrito" />
            <Input id="s-code" v-model="s.shipping.code" label="Código postal" :required="required" :error="s.fieldErrors['s.code']" @update:model-value="s.clearError('s.code')" />
          </div>
        </div>
      </fieldset>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Input from '@/components/form/Input.vue'
import Button from '@/components/buttons/Button.vue'
import { quoteConfig } from '@/config/quoteConfig'
import { useQuoteWizardStore } from '@/stores/quoteWizard'

const s = useQuoteWizardStore()
const required = computed(() => s.period.deliveryType === quoteConfig.deliveryToCustomer)
</script>
