<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-4">
      <QuoteLineCard v-for="(l, i) in s.lines" :key="l.uid" :line="l" :index="i" />
      <div>
        <Button variant="secondary" @click="s.addLine">+ Adicionar linha</Button>
      </div>

      <fieldset class="rounded-xl border border-line bg-white p-4 shadow-sm">
        <legend class="px-2 text-sm font-semibold text-navy">Totais</legend>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Input
            id="deposit"
            :model-value="s.ctx.depositExempt ? 'Isento' : fmtEur(s.totals.deposit)"
            label="Caução total (€)"
            disabled
            :hint="s.ctx.depositExempt ? 'Empresa isenta de caução.' : 'Soma da caução de cada equipamento × quantidade.'"
          />
          <Input id="promo" v-model="s.promoCode" label="Código promocional" />
        </div>
      </fieldset>
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/buttons/Button.vue'
import Input from '@/components/form/Input.vue'
import QuoteLineCard from './QuoteLineCard.vue'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { fmtEur } from '@/utils/quotePricing'

const s = useQuoteWizardStore()
</script>
