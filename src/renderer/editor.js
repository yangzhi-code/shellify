import { createApp } from 'vue'
import Editor from './EditorViews/Editor.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'

// 从 URL 参数中获取所有参数
const urlParams = new URLSearchParams(window.location.search)
const props = Object.fromEntries(urlParams.entries())

if (!props.connectionId) {
  console.error('No connection ID provided')
} else {
  const app = createApp(Editor, {
    ...props // 传递所有参数给组件
  })
  app.use(ElementPlus)
  app.mount('#app')
} 