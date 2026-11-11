<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { zohoInit } from './utils/zohoFunctions'
import QuoteWizard from '@/components/quotes/QuoteWizard.vue'
import ToastContainer from '@/components/main/ToastContainer.vue'
import Loader from '@/components/main/Loader.vue'
import { useParamsStore } from '@/stores/params'
import { useQuoteWizardStore } from '@/stores/quoteWizard'
import { useToast } from '@/composables/useToast'

const loading = ref(true)
onMounted(async () => {
  await zohoInit()
  // Botão na Oportunidade: o CRM envia Entity = Deals e o id do registo
  const { module, id, ButtonPosition } = useParamsStore().params
  if (module === 'Deals' && id) {
    const ok = await useQuoteWizardStore().initFromDeal(String(id))
    if (!ok) useToast().error('Não foi possível ler a oportunidade. O orçamento abre em branco.')
  }
  // Botão no Pedido de Orçamento: Entity = Quotes -> revisão do orçamento (detalhe ou edição).
  // Em "Novo"/"Clonar" (CreateOrCloneView) abre em branco, mesmo que o CRM envie o id do registo clonado,
  // para nunca atualizar o orçamento original.
  if (module === 'Quotes' && id && ButtonPosition !== 'CreateOrCloneView') {
    const ok = await useQuoteWizardStore().initFromQuote(String(id))
    if (!ok) useToast().error('Não foi possível ler o orçamento.')
  }
  loading.value = false
})
</script>

<template>
  <Loader :visible="loading" />
  <ToastContainer />
  <main class="min-h-screen bg-surface p-4 md:p-6">
    <QuoteWizard v-if="!loading" />
  </main>
</template>
