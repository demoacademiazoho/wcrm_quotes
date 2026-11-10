<template>
  <div class="flex flex-col gap-1.5">
    <Label v-if="label" :html-for="id" :required="required" :disabled="disabled">
      {{ label }}
    </Label>

    <div class="relative">
      <button
        :id="id"
        ref="triggerRef"
        type="button"
        :disabled="disabled"
        :class="[
          'flex w-full items-center gap-2 rounded-lg border bg-white py-2.5 pl-9 pr-3.5 text-left text-sm',
          'outline-none transition-all duration-150',
          'focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-zinc-300 focus:border-primary-500 focus:ring-primary-100',
          disabled
            ? 'cursor-not-allowed bg-zinc-50 text-zinc-400'
            : 'cursor-pointer hover:border-zinc-400',
          modelValue ? 'text-zinc-900' : 'text-zinc-400',
        ]"
        @click="toggle"
      >
        <span class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
          <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </span>
        {{ displayValue }}
      </button>

      <Teleport to="body">
        <Transition
          enter-active-class="transition-all duration-150 ease-out"
          leave-active-class="transition-all duration-100 ease-in"
          enter-from-class="opacity-0 scale-95 -translate-y-1"
          enter-to-class="opacity-100 scale-100 translate-y-0"
          leave-from-class="opacity-100 scale-100 translate-y-0"
          leave-to-class="opacity-0 scale-95 -translate-y-1"
        >
          <div
            v-if="open"
            ref="popoverRef"
            :style="{ position: 'fixed', top: `${popoverPos.top}px`, left: `${popoverPos.left}px` }"
            class="z-50 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-xl"
          >
            <!-- Month nav -->
            <div class="mb-2 flex items-center justify-between">
              <button
                type="button"
                class="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                @click="shiftMonth(-1)"
              >
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              <p class="text-sm font-semibold text-zinc-800">{{ monthLabel }}</p>

              <button
                type="button"
                class="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                @click="shiftMonth(1)"
              >
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>

            <!-- Weekday header -->
            <div class="grid grid-cols-7 gap-y-1 text-center text-[11px] font-semibold uppercase text-zinc-400">
              <span v-for="(d, wi) in weekdayLabels" :key="wi">{{ d }}</span>
            </div>

            <!-- Day grid -->
            <div class="mt-1 grid grid-cols-7 gap-y-1 text-center text-sm">
              <button
                v-for="cell in cells"
                :key="cell.key"
                type="button"
                :disabled="cell.disabled"
                :class="[
                  'mx-auto flex size-8 items-center justify-center rounded-full transition-colors duration-100',
                  !cell.inMonth ? 'text-zinc-300' : 'text-zinc-700',
                  cell.disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer hover:bg-zinc-100',
                  cell.isSelected ? 'bg-primary-500 text-white hover:bg-primary-500' : '',
                  cell.isToday && !cell.isSelected ? 'font-bold text-primary-600' : '',
                ]"
                @click="selectDay(cell)"
              >
                {{ cell.day }}
              </button>
            </div>

            <!-- Footer -->
            <div class="mt-3 flex items-center justify-between border-t border-zinc-100 pt-2.5">
              <button
                type="button"
                class="text-xs font-medium text-zinc-500 hover:text-zinc-700"
                @click="clear"
              >
                Limpar
              </button>
              <button
                type="button"
                class="text-xs font-medium text-primary-600 hover:text-primary-700"
                @click="selectToday"
              >
                Hoje
              </button>
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>

    <p v-if="error" class="flex items-center gap-1 text-xs text-red-600">
      <svg class="size-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clip-rule="evenodd" />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="hint" class="text-xs text-zinc-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Label from './Label.vue'

const props = defineProps<{
  modelValue?: string
  id?: string
  label?: string
  placeholder?: string
  min?: string
  max?: string
  disabled?: boolean
  required?: boolean
  error?: string
  hint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const weekdayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)
const popoverRef = ref<HTMLElement | null>(null)
const popoverPos = ref({ top: 0, left: 0 })

function parseDate(value?: string): Date | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function toDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const selectedDate = computed(() => parseDate(props.modelValue))
const minDate = computed(() => parseDate(props.min))
const maxDate = computed(() => parseDate(props.max))

const viewDate = ref(selectedDate.value ?? new Date())

watch(open, (isOpen) => {
  if (isOpen) viewDate.value = selectedDate.value ?? new Date()
})

const monthLabel = computed(() =>
  viewDate.value.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' }),
)

const displayValue = computed(() => {
  if (!selectedDate.value) return props.placeholder ?? 'Selecionar data'
  return selectedDate.value.toLocaleDateString('pt-PT', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
})

interface Cell {
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  isSelected: boolean
  disabled: boolean
  date: Date
}

const cells = computed<Cell[]>(() => {
  const year = viewDate.value.getFullYear()
  const month = viewDate.value.getMonth()
  const firstOfMonth = new Date(year, month, 1)
  const startOffset = firstOfMonth.getDay()
  const gridStart = new Date(year, month, 1 - startOffset)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Array.from({ length: 42 }, (_, i) => {
    const date = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
    const disabled =
      (minDate.value !== null && date < minDate.value) ||
      (maxDate.value !== null && date > maxDate.value)

    return {
      key: toDateString(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
      isToday: date.getTime() === today.getTime(),
      isSelected: !!selectedDate.value && date.getTime() === selectedDate.value.getTime(),
      disabled,
      date,
    }
  })
})

function shiftMonth(delta: number) {
  viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + delta, 1)
}

function selectDay(cell: Cell) {
  if (cell.disabled) return
  emit('update:modelValue', toDateString(cell.date))
  open.value = false
}

function selectToday() {
  const today = new Date()
  viewDate.value = today
  emit('update:modelValue', toDateString(today))
  open.value = false
}

function clear() {
  emit('update:modelValue', '')
  open.value = false
}

function updatePosition() {
  const rect = triggerRef.value?.getBoundingClientRect()
  if (!rect) return
  popoverPos.value = { top: rect.bottom + 6, left: rect.left }
}

function toggle() {
  if (props.disabled) return
  if (open.value) {
    open.value = false
    return
  }
  updatePosition()
  open.value = true
}

function onDocumentClick(event: MouseEvent) {
  const target = event.target as Node
  if (triggerRef.value?.contains(target) || popoverRef.value?.contains(target)) return
  open.value = false
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('mousedown', onDocumentClick)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
  } else {
    window.removeEventListener('mousedown', onDocumentClick)
    window.removeEventListener('keydown', onKeydown)
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', onDocumentClick)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('resize', updatePosition)
  window.removeEventListener('scroll', updatePosition, true)
})
</script>
