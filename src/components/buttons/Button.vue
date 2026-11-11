<template>
  <button
    :type="type ?? 'button'"
    :disabled="disabled || loading"
    :class="[
      'inline-flex items-center justify-center gap-2 rounded-lg font-semibold',
      'transition-all duration-150 outline-none',
      'focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      sizeClasses[size ?? 'md'],
      variantClasses[variant ?? 'primary'],
    ]"
  >
    <svg
      v-if="loading"
      class="size-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>

    <slot />
  </button>
</template>

<script setup lang="ts">
type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'outline-danger'
type Size = 'xs' | 'sm' | 'md' | 'lg'

defineProps<{
  variant?: Variant
  size?: Size
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  loading?: boolean
}>()

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-navy text-white hover:bg-primary-600 active:bg-primary-700 focus-visible:ring-primary-400 shadow-sm',
  accent:
    'bg-accent-500 text-white hover:bg-accent-600 active:bg-accent-600 focus-visible:ring-accent-400 shadow-sm',
  secondary:
    'bg-white text-navy border border-line hover:bg-primary-100 active:bg-primary-200 focus-visible:ring-primary-400 shadow-sm',
  ghost:
    'bg-transparent text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 focus-visible:ring-zinc-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500 shadow-sm',
  'outline-danger':
    'bg-white text-red-600 border border-red-300 hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-400 shadow-sm',
}

const sizeClasses: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
}
</script>
