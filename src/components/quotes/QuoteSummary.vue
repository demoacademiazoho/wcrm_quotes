<template>
  <aside class="rounded-xl bg-navy p-5 text-white shadow-md">
    <h3 class="mb-3 text-sm font-semibold uppercase tracking-wider text-primary-200">Resumo</h3>
    <dl class="flex flex-col gap-2 text-sm">
      <div class="flex justify-between"><dt class="text-primary-200">Subtotal</dt><dd>{{ fmtEur(t.gross) }}</dd></div>
      <div v-if="t.lineDiscounts" class="flex justify-between"><dt class="text-primary-200">Descontos de linha</dt><dd>- {{ fmtEur(t.lineDiscounts) }}</dd></div>
      <div v-if="t.companyDiscount" class="flex justify-between">
        <dt class="text-primary-200">Desconto Empresa ({{ fmtNum(s.ctx.contractPct) }}%)</dt><dd>- {{ fmtEur(t.companyDiscount) }}</dd>
      </div>
      <div class="flex justify-between"><dt class="text-primary-200">IVA</dt><dd>{{ fmtEur(t.vat) }}</dd></div>
      <div class="flex items-center justify-between gap-3">
        <dt class="text-primary-200">Ajuste (€)</dt>
        <dd><input v-model="s.adjustment" type="number" step="0.01" class="w-24 rounded-md border border-white/20 bg-white/10 px-2 py-1 text-right text-white outline-none focus:border-accent-500" /></dd>
      </div>
      <div class="mt-1 flex items-baseline justify-between border-t border-white/20 pt-3">
        <dt class="font-semibold">Total Geral</dt><dd class="text-xl font-bold text-orange-300">{{ fmtEur(t.grand) }}</dd>
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
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { fmtEur, fmtNum } from '@/utils/quotePricing'

const s = useQuoteWizardStore()
const t = computed(() => s.totals)
</script>
