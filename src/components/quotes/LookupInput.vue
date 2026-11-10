<template>
  <div ref="root" class="flex flex-col gap-1.5">
    <Label v-if="label" :html-for="id" :required="required">{{ label }}</Label>

    <div class="relative">
      <input
        :id="id"
        v-model="text"
        type="text"
        autocomplete="off"
        :placeholder="placeholder"
        :class="[
          'w-full rounded-lg border bg-white px-3.5 py-2.5 pr-9 text-sm text-zinc-900 outline-none transition-all duration-150',
          'placeholder:text-zinc-400 focus:ring-2 focus:ring-offset-0',
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
            : 'border-zinc-300 hover:border-zinc-400 focus:border-primary-500 focus:ring-primary-100',
        ]"
        @input="onInput"
        @focus="open = results.length > 0"
      />
      <span class="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
        <svg v-if="loading" class="size-4 animate-spin text-zinc-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <svg v-else-if="modelValue" class="size-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
        </svg>
        <svg v-else class="size-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
      </span>

      <ul
        v-if="open"
        class="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
      >
        <li v-if="!results.length" class="px-3.5 py-2 text-sm text-zinc-400">Sem resultados</li>
        <li
          v-for="r in results"
          :key="r.id"
          class="cursor-pointer px-3.5 py-2 text-sm text-zinc-800 hover:bg-primary-100"
          @mousedown.prevent="select(r)"
        >
          {{ r.name }}
        </li>
      </ul>
    </div>

    <p v-if="error" class="text-xs text-red-600">{{ error }}</p>
    <p v-else-if="hint" class="text-xs text-zinc-500">{{ hint }}</p>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Label from '@/components/form/Label.vue'
import type { Lookup } from '@/interfaces/quoteTypes'

const props = defineProps<{
  modelValue: Lookup | null
  search: (query: string) => Promise<Lookup[]>
  id?: string
  label?: string
  placeholder?: string
  required?: boolean
  error?: string
  hint?: string
}>()
const emit = defineEmits<{ 'update:modelValue': [value: Lookup | null] }>()

const root = ref<HTMLElement | null>(null)
const text = ref(props.modelValue?.name ?? '')
const results = ref<Lookup[]>([])
const open = ref(false)
const loading = ref(false)
let timer: ReturnType<typeof setTimeout>
let token = 0

// reposição externa (novo orçamento)
let typing = false
watch(() => props.modelValue, (v) => { if (v) text.value = v.name; else if (!typing) text.value = '' })

function onInput() {
  if (props.modelValue) { typing = true; emit('update:modelValue', null); setTimeout(() => { typing = false }) } // editar o texto anula a escolha
  clearTimeout(timer)
  const q = text.value.trim()
  if (q.length < 2) { results.value = []; open.value = false; return }
  timer = setTimeout(async () => {
    const t = ++token
    loading.value = true
    const r = await props.search(q)
    if (t !== token) return
    results.value = r
    open.value = true
    loading.value = false
  }, 250)
}

function select(item: Lookup) {
  text.value = item.name
  open.value = false
  emit('update:modelValue', item)
}

function onDocClick(e: MouseEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false
}
onMounted(() => document.addEventListener('mousedown', onDocClick))
onBeforeUnmount(() => { document.removeEventListener('mousedown', onDocClick); clearTimeout(timer) })
</script>
