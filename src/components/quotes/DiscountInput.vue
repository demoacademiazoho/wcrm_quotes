<template>
  <div ref="root" class="relative flex flex-col gap-1.5">
    <Label v-if="!inline" :html-for="id">{{ label }}</Label>

    <button
      :id="id"
      type="button"
      aria-haspopup="dialog"
      :aria-expanded="open"
      :aria-label="inline ? label : undefined"
      :class="[
        'whitespace-nowrap text-sm outline-none transition-all duration-150',
        inline
          ? 'rounded-md border border-white/20 bg-white/10 px-2 py-1 text-right text-white hover:border-primary-300 focus:border-primary-300'
          : 'w-full rounded-lg border border-zinc-300 bg-white px-3.5 py-2.5 text-left hover:border-zinc-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-100',
      ]"
      @click="toggle"
    >
      <span v-if="amount > 0" :class="inline ? 'text-white' : 'text-zinc-900'">
        {{ inline ? '- ' : '' }}{{ fmtEur(amount) }}<span v-if="mode === 'pct'" :class="inline ? 'text-primary-200' : 'text-muted'"> ({{ fmtNum(toNumber(value)) }} %)</span>
      </span>
      <span v-else :class="inline ? 'text-primary-200' : 'text-zinc-400'">Sem desconto</span>
    </button>

    <div
      v-if="open"
      role="dialog"
      aria-label="Definir desconto"
      class="absolute top-full z-30 mt-1 w-72 rounded-xl border border-zinc-200 bg-white p-4 text-left text-zinc-800 shadow-xl"
      :class="inline ? 'right-0' : 'left-0'"
      @keydown.esc="open = false"
    >
      <p class="mb-3 text-sm font-semibold text-navy">Definir desconto</p>

      <label class="mb-2 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
        <input v-model="dMode" type="radio" value="pct" class="size-4 accent-primary-500" /> Percentagem
      </label>
      <label class="mb-3 flex cursor-pointer items-center gap-2 text-sm text-zinc-800">
        <input v-model="dMode" type="radio" value="amount" class="size-4 accent-primary-500" /> Redução directa do preço
      </label>

      <div class="relative">
        <input
          ref="field"
          v-model="dValue"
          type="number"
          min="0"
          :max="dMode === 'pct' ? 100 : undefined"
          :step="dMode === 'pct' ? 0.0001 : 0.01"
          :aria-label="dMode === 'pct' ? 'Percentagem de desconto' : 'Desconto em euros'"
          class="w-full rounded-lg border border-zinc-300 px-3 py-2 pr-9 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          @keydown.enter.prevent="apply"
        />
        <span class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">{{ dMode === 'pct' ? '%' : '€' }}</span>
      </div>
      <p class="mt-2 text-xs text-muted">
        <template v-if="dMode === 'pct'">Sobre {{ fmtEur(gross) }} = <strong class="text-navy">{{ fmtEur(draftAmount) }}</strong></template>
        <template v-else>Sobre {{ fmtEur(gross) }} = <strong class="text-navy">{{ fmtNum(draftPct) }} %</strong></template>
      </p>

      <div class="mt-4 flex gap-2">
        <Button variant="accent" size="sm" @click="apply">Concluído</Button>
        <Button variant="secondary" size="sm" @click="open = false">Cancelar</Button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Label from '@/components/form/Label.vue'
import Button from '@/components/buttons/Button.vue'
import { fmtEur, fmtNum, r2, toNumber } from '@/utils/quotePricing'

/**
 * Desconto da linha como no CRM: ao clicar abre "Definir desconto" (Percentagem ou Redução directa do preço)
 * e o valor fica mostrado em euros. A percentagem incide sobre o montante da linha (quantidade x preço do período).
 */
const props = defineProps<{
  id?: string
  label: string
  /** variante compacta para o Resumo (fundo escuro): sem etiqueta por cima */
  inline?: boolean
  mode: 'pct' | 'amount'
  value: string
  /** desconto efetivo da linha em euros */
  amount: number
  /** montante da linha antes do desconto */
  gross: number
}>()
const emit = defineEmits<{ apply: [mode: 'pct' | 'amount', value: string] }>()

const root = ref<HTMLElement | null>(null)
const field = ref<HTMLInputElement | null>(null)
const open = ref(false)
const dMode = ref<'pct' | 'amount'>(props.mode)
const dValue = ref(props.value)

const draftAmount = computed(() => (dMode.value === 'pct' ? r2((props.gross * toNumber(dValue.value)) / 100) : toNumber(dValue.value)))
const draftPct = computed(() => (props.gross > 0 ? Math.round((toNumber(dValue.value) / props.gross) * 1e6) / 1e4 : 0))

async function toggle() {
  if (open.value) { open.value = false; return }
  dMode.value = props.mode
  dValue.value = props.value
  open.value = true
  await nextTick()
  field.value?.select()
}
function apply() {
  emit('apply', dMode.value, dValue.value)
  open.value = false
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => document.removeEventListener('mousedown', onDocClick))
</script>
