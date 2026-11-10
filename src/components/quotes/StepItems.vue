<template>
  <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
    <div class="flex flex-col gap-4">
      <QuoteLineCard v-for="(l, i) in s.lines" :key="l.uid" :line="l" :index="i" />
      <div>
        <Button variant="secondary" @click="s.addLine">+ Adicionar linha</Button>
      </div>
    </div>
    <QuoteSummary class="xl:sticky xl:top-4 xl:self-start" />
  </div>
</template>

<script setup lang="ts">
import Button from '@/components/buttons/Button.vue'
import QuoteLineCard from './QuoteLineCard.vue'
import QuoteSummary from './QuoteSummary.vue'
import { useQuoteWizardStore } from '@/stores/quoteWizard'

const s = useQuoteWizardStore()
</script>
