<template>
  <aside class="rounded-xl bg-navy p-5 text-white shadow-md">
    <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-200">Resumo</h3>
    <dl class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><dt class="text-primary-200">Subtotal (s/ IVA)</dt><dd>{{ fmtEur(t.base) }}</dd></div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-primary-200">Desconto geral</dt>
        <dd>
          <DiscountInput
            id="general-discount"
            inline
            label="Desconto geral"
            :mode="s.generalDiscount.mode"
            :value="s.generalDiscount.value"
            :amount="t.generalDiscount"
            :gross="t.base"
            @apply="s.setGeneralDiscount"
          />
        </dd>
      </div>
      <p v-if="s.ctx.contractPct > 0 && !s.generalTouched" class="-mt-1 text-[11px] leading-snug text-primary-200">
        Desconto contratual da Empresa ({{ fmtNum(s.ctx.contractPct) }} %) aplicado automaticamente.
      </p>
      <div v-if="hasTransport(s.period.deliveryType, s.period.pickupType)" class="flex justify-between">
        <dt class="text-primary-200">Transporte (s/ IVA)</dt><dd>{{ fmtEur(t.transportNet) }}</dd>
      </div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-primary-200">Ajuste (€, IVA incl.)</dt>
        <dd><input v-model="s.adjustment" type="number" step="0.01" class="w-24 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-right text-white outline-none focus:border-primary-300" aria-label="Ajuste em euros" /></dd>
      </div>
      <p v-if="t.adjustmentNet" class="-mt-1 text-right text-[11px] text-primary-200">Ajuste s/ IVA: {{ fmtEur(t.adjustmentNet) }}</p>
      <div class="flex justify-between border-t border-white/10 pt-2"><dt class="text-primary-200">Total sem IVA</dt><dd>{{ fmtEur(t.exclVat) }}</dd></div>
      <div class="flex justify-between"><dt class="text-primary-200">IVA</dt><dd>{{ fmtEur(t.vat) }}</dd></div>
      <table v-if="t.vatTable.length" class="-mt-1 w-full text-[11px] leading-snug text-primary-200" aria-label="IVA por taxa">
        <thead>
          <tr class="text-left uppercase tracking-wider">
            <th class="py-0.5 font-medium">Taxa</th>
            <th class="py-0.5 text-right font-medium">Base</th>
            <th class="py-0.5 text-right font-medium">IVA</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in t.vatTable" :key="r.rate" class="border-t border-white/10">
            <td class="py-0.5">{{ fmtNum(r.rate) }} %</td>
            <td class="py-0.5 text-right">{{ fmtEur(r.base) }}</td>
            <td class="py-0.5 text-right">{{ fmtEur(r.vat) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="mt-1 flex items-baseline justify-between border-t border-white/20 pt-3">
        <dt class="font-semibold">Total Geral</dt><dd class="text-xl font-bold text-primary-300">{{ fmtEur(t.grand) }}</dd>
      </div>
      <div class="flex justify-between border-t border-white/10 pt-2">
        <dt class="text-primary-200">Caução total</dt>
        <dd>{{ s.ctx.depositExempt ? 'Isento' : fmtEur(t.deposit) }}</dd>
      </div>
    </dl>
    <p class="mt-3 text-[11px] leading-snug text-primary-200">
      Preços: {{ s.ctx.origin }}<template v-if="s.ctx.note"> · {{ s.ctx.note }}</template>
      <template v-if="s.ctxLoading"> · a atualizar...</template>
    </p>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import DiscountInput from './DiscountInput.vue'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { fmtEur, fmtNum, hasTransport } from '@/utils/quotePricing'

const s = useQuoteWizardStore()
const t = computed(() => s.totals)
</script>
