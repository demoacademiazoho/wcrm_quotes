<template>
  <ol class="grid grid-cols-2 gap-2 lg:grid-cols-4">
    <li v-for="(label, i) in steps" :key="label">
      <button
        type="button"
        :disabled="i >= current"
        :class="[
          'flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors',
          i === current ? 'border-primary-500 bg-white font-semibold text-navy shadow-sm' : 'border-line bg-white/60 text-muted',
          i < current ? 'cursor-pointer hover:border-primary-400' : 'cursor-default',
        ]"
        @click="$emit('go', i)"
      >
        <span
          :class="[
            'flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold',
            i < current ? 'bg-emerald-600 text-white' : i === current ? 'bg-accent-500 text-white' : 'bg-surface text-muted border border-line',
          ]"
        >
          <svg v-if="i < current" class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
          <template v-else>{{ i + 1 }}</template>
        </span>
        <span class="leading-tight">{{ label }}</span>
      </button>
    </li>
  </ol>
</template>

<script setup lang="ts">
defineProps<{ steps: readonly string[]; current: number }>()
defineEmits<{ go: [index: number] }>()
</script>
