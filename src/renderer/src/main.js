import './assets/main.css'
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import './assets/fonts/iconfont.css'
import { createPinia } from 'pinia'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import { themeManager } from './styles/theme'

const app = createApp(App)
app.use(router)
app.use(ElementPlus, { locale: zhCn })
app.use(createPinia())

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
