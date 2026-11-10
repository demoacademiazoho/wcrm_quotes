<template>
  <div :class="['rounded-xl border bg-white p-4 shadow-sm', calc.ok || !line.info ? 'border-line' : 'border-red-300']">
    <div class="mb-3 flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-wider text-muted">Linha {{ index + 1 }}</span>
      <button type="button" class="text-xs font-medium text-red-600 hover:underline" @click="s.removeLine(line)">Remover</button>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
      <div class="md:col-span-4">
        <LookupInput
          :model-value="line.product"
          label="Produto"
          required
          placeholder="Pesquisar produto..."
          :search="(q) => searchLookup('Products', q)"
          @update:model-value="(v) => s.pickProduct(line, v)"
        />
      </div>
      <div class="md:col-span-3"><DatePicker v-model="line.start" label="Data início" required /></div>
      <div class="md:col-span-3"><DatePicker v-model="line.end" label="Data fim" required :min="line.start || undefined" /></div>
      <div class="md:col-span-2"><Input v-model="line.qty" type="number" min="1" step="1" label="Quantidade" required /></div>
      <div class="md:col-span-3"><Input v-model="line.discount" type="number" min="0" step="0.01" label="Desconto da linha (€)" /></div>
    </div>

    <p v-if="line.loading" class="mt-3 text-xs text-muted">A carregar produto...</p>

    <template v-if="line.info">
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Preço/dia: <strong>{{ fmtEur(calc.unitPriceDay) }}</strong> ({{ calc.origin }})</span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Mín.: <strong>{{ calc.minDays }} dias</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Fator mês: <strong>{{ fmtNum(calc.monthFactor) }}</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Fator semana: <strong>{{ fmtNum(calc.weekFactor) }}</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">IVA: <strong>{{ fmtNum(calc.vatPct) }}%</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Caução/un.: <strong>{{ fmtEur(calc.depositUnit) }}</strong></span>
      </div>

      <p v-if="!calc.ok" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ calc.error }}</p>

      <div v-else class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <div class="rounded-lg border border-line bg-surface px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Total meses</p>
          <p class="text-sm font-semibold text-navy">{{ fmtEur(calc.monthValue) }}</p>
          <p class="text-[11px] text-muted">{{ calc.months }} × {{ fmtNum(calc.monthFactor) }} × dia</p>
        </div>
        <div class="rounded-lg border border-line bg-surface px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Total semanas</p>
          <p class="text-sm font-semibold text-navy">{{ fmtEur(calc.weekValue) }}</p>
          <p class="text-[11px] text-muted">{{ calc.weeks }} × {{ fmtNum(calc.weekFactor) }} × dia</p>
        </div>
        <div class="rounded-lg border border-line bg-surface px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Total dias</p>
          <p class="text-sm font-semibold text-navy">{{ fmtEur(calc.dayValue) }}</p>
          <p class="text-[11px] text-muted">{{ calc.looseDays }} × dia</p>
        </div>
        <div class="rounded-lg border border-line bg-surface px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Por unidade ({{ calc.days }} dias)</p>
          <p class="text-sm font-semibold text-navy">{{ fmtEur(calc.unitTotal) }}</p>
          <p class="text-[11px] text-muted">× {{ line.qty || 0 }} un.</p>
        </div>
        <div class="rounded-lg border border-accent-500/40 bg-orange-50 px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Total da linha</p>
          <p class="text-sm font-bold text-accent-600">{{ fmtEur(calc.base) }}</p>
          <p v-if="calc.discount" class="text-[11px] text-muted">desc. {{ fmtEur(calc.discount) }}</p>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Input from '@/components/form/Input.vue'
import DatePicker from '@/components/form/DatePicker.vue'
import LookupInput from './LookupInput.vue'
import type { LineCalc, LineState } from '@/interfaces/quoteTypes'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { searchLookup } from '@/utils/zohoQuotes'
import { fmtEur, fmtNum } from '@/utils/quotePricing'

const props = defineProps<{ line: LineState; index: number }>()
const s = useQuoteWizardStore()
const calc = computed(() => s.calcs[props.index] as LineCalc)
</script>
