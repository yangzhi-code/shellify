// 定义主题变量
export const themes = {
  light: {
    // 基础颜色
    '--el-bg-color': '#ffffff',
    '--el-bg-color-page': '#f2f3f5',
    '--el-bg-color-overlay': '#ffffff',
    '--el-text-color-primary': '#303133',
    '--el-text-color-regular': '#606266',
    '--el-border-color': '#dcdfe6',
    '--el-border-color-light': '#e4e7ed',
    '--el-border-color-lighter': '#ebeef5',
    '--el-fill-color-light': '#f5f7fa',
    '--el-color-primary-light-9': '#ecf5ff',
    
    // 终端相关
    '--terminal-bg': '#f6f6f6',
    '--terminal-text': '#333333',
    '--terminal-cursor': '#333333',
    '--terminal-selection': '#b2d7fd',
    
    // 分割线颜色
    '--split-line-color': '#e4e7ed',
    
    // 侧边栏相关
    '--sidebar-bg': '#f2f3f5',
    '--sidebar-text': '#303133',
    '--sidebar-border': '#e4e7ed',
    '--sidebar-item-hover': '#e6e8eb',
    '--sidebar-item-active': '#e2e5e9',
    '--sidebar-header-bg': '#ffffff',
    '--sidebar-header-border': '#e4e7ed',
    
    // 文件列表相关
    '--file-list-bg': '#ffffff',
    '--file-list-header-bg': '#f5f7fa',
    '--file-list-border': '#ebeef5',
    '--file-item-hover': '#f5f7fa',
    '--file-item-active': '#ecf5ff',
    '--file-item-text': '#606266',
    '--file-item-icon': '#909399',
    
    // 其他自定义颜色
    '--app-border': '#dcdfe6',
    '--app-shadow': 'rgba(0, 0, 0, 0.1)'
  },
  
  dark: {
    // 基础颜色
    '--el-bg-color': '#1e1e1e',
    '--el-bg-color-page': '#141414',
    '--el-bg-color-overlay': '#1d1e1f',
    '--el-text-color-primary': '#ffffff',
    '--el-text-color-regular': '#d0d0d0',
    '--el-border-color': '#4c4c4c',
    '--el-border-color-light': '#363636',
    '--el-border-color-lighter': '#2c2c2c',
    '--el-fill-color-light': '#262727',
    '--el-color-primary-light-9': '#1c1c1c',
    
    // 终端相关
    '--terminal-bg': '#1e1e1e',
    '--terminal-text': '#d4d4d4',
    '--terminal-cursor': '#ffffff',
    '--terminal-selection': '#264f78',
    
    // 分割线颜色
    '--split-line-color': '#2d2d2d',
    
    // 侧边栏相关
    '--sidebar-bg': '#252526',
    '--sidebar-text': '#cccccc',
    '--sidebar-border': '#2d2d2d',
    '--sidebar-item-hover': '#2a2d2e',
    '--sidebar-item-active': '#37373d',
    '--sidebar-header-bg': '#252526',
    '--sidebar-header-border': '#2d2d2d',
    
    // 文件列表相关
    '--file-list-bg': '#1e1e1e',
    '--file-list-header-bg': '#252526',
    '--file-list-border': '#2d2d2d',
    '--file-item-hover': '#2a2d2e',
    '--file-item-active': '#37373d',
    '--file-item-text': '#cccccc',
    '--file-item-icon': '#858585',
    
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