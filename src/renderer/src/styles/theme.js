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
    '--app-shadow': 'rgba(0, 0, 0, 0.1)',
    
    // 状态栏相关
    '--status-bar-bg': '#f0f0f0',
    '--status-bar-text': '#606266',
    '--status-bar-border': '#dcdfe6',
    '--status-bar-item-hover': '#e4e7ed',

    // 标签栏相关
    '--tab-bar-bg': '#ffffff',
    '--tab-bar-border': '#dcdfe6',
    '--tab-item-bg': '#f5f7fa',
    '--tab-item-text': '#606266',
    '--tab-item-active-bg': '#ffffff',
    '--tab-item-active-text': '#409eff',
    '--tab-item-hover-bg': '#ecf5ff',

    // 工具栏相关
    '--toolbar-bg': '#f5f7fa',
    '--toolbar-border': '#e4e7ed',
    '--toolbar-button-hover': '#ecf5ff',
    '--toolbar-button-active': '#409eff',
    '--toolbar-text': '#606266',
    '--toolbar-icon': '#909399',

    // 设置面板相关
    '--settings-input-bg': '#ffffff',
    '--settings-input-text': '#606266',
    '--settings-input-border': '#dcdfe6',
    '--settings-input-hover-border': '#c0c4cc',
    '--settings-input-focus-border': '#409eff',
    '--settings-label-text': '#606266',
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
    '--app-shadow': 'rgba(0, 0, 0, 0.3)',
    
    // 状态栏相关
    '--status-bar-bg': '#1a1a1a',
    '--status-bar-text': '#cccccc',
    '--status-bar-border': '#2d2d2d',
    '--status-bar-item-hover': '#2a2d2e',

    // 标签栏相关
    '--tab-bar-bg': '#1e1e1e',
    '--tab-bar-border': '#2d2d2d',
    '--tab-item-bg': '#252526',
    '--tab-item-text': '#cccccc',
    '--tab-item-active-bg': '#1e1e1e',
    '--tab-item-active-text': '#409eff',
    '--tab-item-hover-bg': '#2a2d2e',

    // 工具栏相关
    '--toolbar-bg': '#252526',
    '--toolbar-border': '#2d2d2d',
    '--toolbar-button-hover': '#2a2d2e',
    '--toolbar-button-active': '#094771',
    '--toolbar-text': '#cccccc',
    '--toolbar-icon': '#858585',

    // 设置面板相关
    '--settings-input-bg': '#1d1d1d',
    '--settings-input-text': '#cccccc',
    '--settings-input-border': '#2d2d2d',
    '--settings-input-hover-border': '#4c4c4c',
    '--settings-input-focus-border': '#409eff',
    '--settings-label-text': '#cccccc',
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