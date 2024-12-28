import { createApp } from 'vue'
import Editor from './EditorViews/Editor.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'

// 创建应用时使用默认值
const app = createApp(Editor, {
  editableTab: {
    data: { id: null },
    filePath: '',
    fileName: '',
    fileType: 'text'
  }
})

app.use(ElementPlus)
app.mount('#app') 