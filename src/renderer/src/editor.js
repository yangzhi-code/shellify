import { createApp } from 'vue'
import Editor from './EditorViews/Editor.vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/main.css'
import './assets/fonts/iconfont.css'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { themeManager } from './styles/theme'

const app = createApp(Editor)
app.use(ElementPlus, { locale: zhCn })

// 初始化主题
const initTheme = async () => {
  try {
    // 获取保存的设置
    const settings = await window.electron.ipcRenderer.invoke('settings:load')
    if (settings?.theme) {
      themeManager.applyTheme(settings.theme)
    } else {
      themeManager.applyTheme('system')
    }
    // 监听系统主题变化
    themeManager.watchSystemTheme()
  } catch (error) {
    console.error('初始化主题失败:', error)
    // 默认使用系统主题
    themeManager.applyTheme('system')
  }
}

initTheme()

app.mount('#app') 