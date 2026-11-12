<template>
  <div :class="['rounded-xl border bg-white p-4 shadow-sm', calc.ok || !line.info ? 'border-line' : 'border-red-300']">
    <div class="mb-3 flex items-center justify-between">
      <span class="text-xs font-bold uppercase tracking-wider text-muted">Linha {{ index + 1 }}</span>
      <button type="button" class="text-xs font-medium text-red-600 hover:underline" :aria-label="`Remover linha ${index + 1}`" @click="s.removeLine(line)">Remover</button>
    </div>

    <div class="grid grid-cols-1 gap-3 md:grid-cols-12">
      <div class="md:col-span-12">
        <LookupInput
          :model-value="line.product"
          label="Equipamento"
          required
          placeholder="Pesquisar equipamento..."
          :search="(q) => searchLookup('Products', q)"
          :suggest="() => suggestLookup('Products')"
          create-label="Novo(a) Equipamento Catálogo"
          @create="openCreate('Products')"
          @update:model-value="(v) => s.pickProduct(line, v)"
        />
      </div>
      <div class="md:col-span-3"><DatePicker v-model="line.start" label="Data início" required /></div>
      <div class="md:col-span-3"><DatePicker v-model="line.end" label="Data fim" required :min="line.start || undefined" /></div>
      <div class="md:col-span-2"><Input v-model="line.qty" type="number" min="1" step="1" label="Quantidade" required /></div>
      <div class="md:col-span-3">
        <DiscountInput
          :id="`discount-${line.uid}`"
          label="Desconto da linha"
          :mode="line.discountMode"
          :value="line.discount"
          :amount="calc.discount"
          :gross="calc.gross"
          @apply="(m, v) => { line.discountMode = m; line.discount = v }"
        />
      </div>
    </div>

    <p v-if="line.loading" class="mt-3 text-xs text-muted" role="status">A carregar equipamento...</p>

    <template v-if="line.info">
      <div class="mt-3 flex flex-wrap gap-2 text-xs">
        <span v-if="calc.days" class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Total de dias: <strong>{{ calc.days }}</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Preço/dia: <strong>{{ fmtEur(calc.unitPriceDay) }}</strong> ({{ calc.origin }})</span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Mín.: <strong>{{ calc.minDays }} dias</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Fator mês: <strong>{{ fmtNum(calc.monthFactor) }}</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Fator semana: <strong>{{ fmtNum(calc.weekFactor) }}</strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">IVA: <strong>{{ fmtNum(calc.vatPct) }}%<template v-if="calc.ok"> = {{ fmtEur(calc.vat) }}</template></strong></span>
        <span class="rounded-full bg-primary-100 px-2.5 py-1 text-navy">Caução: <strong>{{ fmtEur(calc.depositUnit) }}<template v-if="calc.ok"> × {{ fmtNum(Number(line.qty) || 0) }} = {{ fmtEur(calc.deposit) }}</template></strong></span>
      </div>

      <p v-if="!calc.ok" class="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{{ calc.error }}</p>

      <div v-else-if="showBreakdown" class="mt-3 grid grid-cols-2 gap-2 md:grid-cols-5">
        <!-- TEMPORÁRIO: cards do detalhe do cálculo ocultos a pedido (repor com showBreakdown = true) -->
        <template v-if="showBreakdown">
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
        </template>
        <div class="rounded-lg border border-primary-500/40 bg-primary-100 px-3 py-2">
          <p class="text-[11px] uppercase text-muted">Total da linha</p>
          <p class="text-sm font-bold text-navy">{{ fmtEur(calc.base) }}</p>
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
import DiscountInput from './DiscountInput.vue'
import type { LineCalc, LineState } from '@/interfaces/quoteTypes'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { openCreate, searchLookup, suggestLookup } from '@/utils/zohoQuotes'
import { fmtEur, fmtNum } from '@/utils/quotePricing'

const props = defineProps<{ line: LineState; index: number }>()
const s = useQuoteWizardStore()
/** TEMPORÁRIO: false oculta todos os cards de totais da linha (meses, semanas, dias, por unidade e total da linha) */
const showBreakdown = false
const calc = computed(() => s.calcs[props.index] as LineCalc)
</script>
