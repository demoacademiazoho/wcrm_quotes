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
    <Select
      id="pickup"
      v-model="s.period.pickupType"
      label="Tipo de recolha"
      required
      placeholder="-None-"
      :options="pickupOptions"
      :error="s.fieldErrors.pickupType"
      @update:model-value="s.clearError('pickupType')"
    />
    <Input
      v-if="hasTransport(s.period.deliveryType, s.period.pickupType)"
      id="transport"
      v-model="s.period.transportCost"
      type="number"
      min="0"
      step="0.01"
      label="Custo de transporte (€, IVA incl.)"
    />
  </div>
</template>

<script setup lang="ts">
import Input from '@/components/form/Input.vue'
import Select from '@/components/form/Select.vue'
import DatePicker from '@/components/form/DatePicker.vue'
import { quoteConfig } from '@/config/quoteConfig'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { hasTransport } from '@/utils/quotePricing'

const s = useQuoteWizardStore()
const deliveryOptions = [quoteConfig.deliveryToCustomer, quoteConfig.warehousePickup].map((o) => ({ label: o, value: o }))
const pickupOptions = [quoteConfig.pickupToCustomer, quoteConfig.warehouseReturn].map((o) => ({ label: o, value: o }))
</script>
