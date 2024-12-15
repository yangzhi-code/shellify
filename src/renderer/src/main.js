import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/fonts/iconfont.css'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(ElementPlus)
app.use(createPinia())
app.mount('#app')
