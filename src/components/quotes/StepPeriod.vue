<template>
  <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
    <DatePicker
      id="start"
      v-model="s.period.start"
      label="Data de início do aluguer"
      required
      :error="s.fieldErrors.start"
      @update:model-value="s.clearError('start')"
    />
    <DatePicker
      id="end"
      v-model="s.period.end"
      label="Data de fim do aluguer"
      required
      :min="s.period.start || undefined"
      :error="s.fieldErrors.end"
      @update:model-value="s.clearError('end')"
    />
    <Input id="transport" v-model="s.period.transportCost" type="number" min="0" step="0.01" label="Custo de transporte (€)" />
    <Select
      id="delivery"
      v-model="s.period.deliveryType"
      label="Tipo de entrega"
      required
      placeholder="-None-"
      :options="deliveryOptions"
      :error="s.fieldErrors.deliveryType"
      @update:model-value="s.clearError('deliveryType')"
    />
  </div>
</template>

<script setup lang="ts">
import Input from '@/components/form/Input.vue'
import Select from '@/components/form/Select.vue'
import DatePicker from '@/components/form/DatePicker.vue'
import { quoteConfig } from '@/config/quoteConfig'
import { useQuoteWizardStore } from '@/stores/quoteWizard'

const s = useQuoteWizardStore()
const deliveryOptions = [quoteConfig.deliveryToCustomer, quoteConfig.warehousePickup].map((o) => ({ label: o, value: o }))
</script>
