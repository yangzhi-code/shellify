// 定义主题变量
export const themes = {
  light: {
    // 基础颜色
    '--el-bg-color': '#ffffff',
    '--el-bg-color-page': '#f2f3f5',
    '--el-text-color-primary': '#303133',
    '--el-text-color-regular': '#606266',
    '--el-border-color': '#dcdfe6',
    '--el-border-color-light': '#e4e7ed',
    
    // 终端相关
    '--terminal-bg': '#ffffff',
    '--terminal-text': '#333333',
    '--terminal-cursor': '#333333',
    '--terminal-selection': '#b2d7fd',
    
    // 编辑器相关
    '--editor-bg': '#ffffff',
    '--editor-text': '#333333',
    '--editor-line-number': '#999999',
    '--editor-selection': '#b2d7fd',
    '--editor-cursor': '#333333',
    
    // 文件管理器相关
    '--file-hover-bg': '#f5f7fa',
    '--file-active-bg': '#ecf5ff',
    
    // 其他自定义颜色
    '--app-border': '#dcdfe6',
    '--app-shadow': 'rgba(0, 0, 0, 0.1)'
  },
  
  dark: {
    // 基础颜色
    '--el-bg-color': '#1e1e1e',
    '--el-bg-color-page': '#141414',
    '--el-text-color-primary': '#ffffff',
    '--el-text-color-regular': '#d0d0d0',
    '--el-border-color': '#4c4c4c',
    '--el-border-color-light': '#363636',
    
    // 终端相关
    '--terminal-bg': '#1e1e1e',
    '--terminal-text': '#d4d4d4',
    '--terminal-cursor': '#ffffff',
    '--terminal-selection': '#264f78',
    
    // 编辑器相关
    '--editor-bg': '#1e1e1e',
    '--editor-text': '#d4d4d4',
    '--editor-line-number': '#858585',
    '--editor-selection': '#264f78',
    '--editor-cursor': '#ffffff',
    
    // 文件管理器相关
    '--file-hover-bg': '#2a2a2a',
    '--file-active-bg': '#094771',
    
    // 其他自定义颜色
    '--app-border': '#4c4c4c',
    '--app-shadow': 'rgba(0, 0, 0, 0.3)'
  }
}

// 主题管理类
class ThemeManager {
  constructor() {
    this.currentTheme = 'system'
  }

  // 应用主题
  applyTheme(theme) {
    let targetTheme = theme
    
    // 如果是跟随系统，则根据系统主题设置
    if (theme === 'system') {
      targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    
    // 应用主题变量
    const themeVars = themes[targetTheme]
    for (const [key, value] of Object.entries(themeVars)) {
      document.documentElement.style.setProperty(key, value)
    }
    
    // 保存当前主题
    this.currentTheme = theme
    
    // 设置 body 的主题类名
    document.body.className = targetTheme
  }

  // 监听系统主题变化
  watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system')
      }
    })
  }

  // 获取当前主题
  getCurrentTheme() {
    return this.currentTheme
  }
}

export const themeManager = new ThemeManager() 