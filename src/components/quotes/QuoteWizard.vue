<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-5">
    <header class="flex items-center gap-4">
      <img src="@/assets/equiply-logo.png" alt="Equiply" class="h-9 w-auto" />
      <div>
        <h1 class="text-lg font-bold text-navy">Novo Pedido de Orçamento</h1>
        <p class="text-xs text-muted">Aluguer de Equipamentos</p>
      </div>
    </header>

    <div v-if="s.result" class="rounded-xl border border-line bg-white p-8 text-center shadow-sm">
      <div class="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
        <svg class="size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 class="text-lg font-bold text-navy">Orçamento criado em Rascunho</h2>
      <p v-if="s.result.warning" class="mx-auto mt-2 max-w-xl rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{{ s.result.warning }}</p>
      <div class="mt-5 flex justify-center gap-3">
        <Button variant="accent" @click="openQuote(s.result.id)">Abrir orçamento</Button>
        <Button variant="secondary" @click="s.reset">Novo orçamento</Button>
      </div>
    </div>

    <template v-else>
      <StepperBar :steps="STEPS" :current="s.step" @go="s.goTo" />

      <section class="rounded-xl border border-line bg-white p-5 shadow-sm">
        <h2 class="mb-4 text-base font-semibold text-navy">{{ s.step + 1 }}. {{ STEPS[s.step] }}</h2>
        <StepInfo v-if="s.step === 0" />
        <StepPeriod v-else-if="s.step === 1" />
        <StepAddress v-else-if="s.step === 2" />
        <StepItems v-else />
      </section>

      <ul v-if="s.stepErrors.length" class="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <li v-for="e in s.stepErrors" :key="e">{{ e }}</li>
      </ul>

      <footer class="flex items-center justify-between">
        <Button variant="secondary" :disabled="s.step === 0 || s.saving" @click="s.back">Voltar</Button>
        <Button v-if="s.step < STEPS.length - 1" variant="accent" @click="s.next">Seguinte</Button>
        <Button v-else variant="accent" :loading="s.saving" @click="s.save">Guardar orçamento</Button>
      </footer>
    </template>
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/buttons/Button.vue'
import StepperBar from './StepperBar.vue'
import StepInfo from './StepInfo.vue'
import StepPeriod from './StepPeriod.vue'
import StepAddress from './StepAddress.vue'
import StepItems from './StepItems.vue'
import { STEPS, useQuoteWizardStore } from '@/stores/quoteWizard'
import { openQuote } from '@/utils/zohoQuotes'

const s = useQuoteWizardStore()
</script>
