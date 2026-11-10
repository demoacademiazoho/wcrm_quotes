import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { installZohoMock } from './utils/zohoMock'

if (import.meta.env.VITE_MOCK === 'true') installZohoMock()

const app = createApp(App)
app.use(createPinia())
app.mount('#app')
