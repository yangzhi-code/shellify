import { createApp } from 'vue'
import Editor from './EditorViews/Editor.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/fonts/iconfont.css'

const app = createApp(Editor)
app.use(ElementPlus)
app.mount('#app') 