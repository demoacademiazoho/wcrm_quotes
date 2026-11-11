<template>
  <Transition name="fade">
    <div
      v-if="visible"
      role="status"
      aria-live="polite"
      class="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm"
    >
      <!-- Spinner -->
      <div class="relative flex items-center justify-center mb-5">
        <svg class="size-10 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="3" />
          <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      </div>

      <p class="text-xs font-semibold uppercase tracking-widest text-muted">
        A carregar
      </p>
    </div>
  </Transition>
</template>

<script setup lang="ts">
defineProps<{ visible: boolean }>()
</script>

<style scoped>
.fade-enter-active { transition: opacity 0.2s ease; }
.fade-leave-active { transition: opacity 0.4s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }
</style>
