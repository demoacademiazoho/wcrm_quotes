<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { zohoInit } from './utils/zohoFunctions'
import QuoteWizard from '@/components/quotes/QuoteWizard.vue'
import ToastContainer from '@/components/main/ToastContainer.vue'
import Loader from '@/components/main/Loader.vue'

const loading = ref(true)
onMounted(async () => {
  await zohoInit()
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
