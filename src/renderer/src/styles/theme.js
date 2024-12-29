// 定义主题变量
export const themes = {
  light: {
    // 基础颜色
    '--el-bg-color': '#ffffff',              // 主要背景色，用于主体内容区域
    '--el-bg-color-page': '#f2f3f5',         // 页面背景色，用于整体页面背景
    '--el-bg-color-overlay': '#ffffff',       // 浮层背景色，用于下拉菜单、弹窗等
    '--el-text-color-primary': '#303133',     // 主要文字颜色，用于标题、重要文本
    '--el-text-color-regular': '#606266',     // 常规文字颜色，用于正文内容
    '--el-border-color': '#dcdfe6',           // 主要边框颜色
    '--el-border-color-light': '#e4e7ed',     // 浅色边框，用于分割线
    '--el-border-color-lighter': '#ebeef5',   // 更浅的边框，用于内部分割
    '--el-fill-color-light': '#f5f7fa',       // 填充色，用于禁用状态背景
    '--el-color-primary-light-9': '#ecf5ff',  // 主色浅色变体，用于hover效果
    
    // 终端相关
    '--terminal-bg': '#f6f6f6',               // 终端背景色
    '--terminal-text': '#333333',             // 终端文字颜色
    '--terminal-cursor': '#333333',           // 终端光标颜色
    '--terminal-selection': '#b2d7fd',        // 终端选中文本背景色
    
    // 分割线颜色
    '--split-line-color': '#e4e7ed',          // 分隔线颜色，用于面板分割
    
    // 侧边栏相关
    '--sidebar-bg': '#f2f3f5',                // 侧边栏背景色
    '--sidebar-text': '#303133',              // 侧边栏文字颜色
    '--sidebar-border': '#e4e7ed',            // 侧边栏边框颜色
    '--sidebar-item-hover': '#e6e8eb',        // 侧边栏项目悬停背景色
    '--sidebar-item-active': '#e2e5e9',       // 侧边栏项目激活背景色
    '--sidebar-header-bg': '#ffffff',         // 侧边栏头部背景色
    '--sidebar-header-border': '#e4e7ed',     // 侧边栏头部边框颜色
    
    // 文件列表相关
    '--file-list-bg': '#ffffff',              // 文件列表背景色
    '--file-list-header-bg': '#f5f7fa',       // 文件列表头部背景色
    '--file-list-border': '#ebeef5',          // 文件列表边框颜色
    '--file-item-hover': '#f5f7fa',           // 文件项悬停背景色
    '--file-item-active': '#ecf5ff',          // 文件项选中背景色
    '--file-item-text': '#606266',            // 文件项文字颜色
    '--file-item-icon': '#909399',            // 文件项图标颜色
    
    // 状态栏相关
    '--status-bar-bg': '#f0f0f0',             // 状态栏背景色
    '--status-bar-text': '#606266',           // 状态栏文字颜色
    '--status-bar-border': '#dcdfe6',         // 状态栏边框颜色
    '--status-bar-item-hover': '#e4e7ed',     // 状态栏项目悬停背景色

    // 标签栏相关
    '--tab-bar-bg': '#ffffff',                // 标签栏背景色
    '--tab-bar-border': '#dcdfe6',            // 标签栏边框颜色
    '--tab-item-bg': '#f5f7fa',               // 标签项背景色
    '--tab-item-text': '#606266',             // 标签项文字颜色
    '--tab-item-active-bg': '#ffffff',        // 激活标签背景色
    '--tab-item-active-text': '#409eff',      // 激活标签文字颜色
    '--tab-item-hover-bg': '#ecf5ff',         // 标签项悬停背景色

    // 工具栏相关
    '--toolbar-bg': '#f5f7fa',                // 工具栏背景色
    '--toolbar-border': '#e4e7ed',            // 工具栏边框颜色
    '--toolbar-button-hover': '#ecf5ff',      // 工具栏按钮悬停背景色
    '--toolbar-button-active': '#409eff',     // 工具栏按钮激活背景色
    '--toolbar-text': '#606266',              // 工具栏文字颜色
    '--toolbar-icon': '#909399',              // 工具栏图标颜色

    // 设置面板相关
    '--settings-input-bg': '#ffffff',         // 设置输入框背景色
    '--settings-input-text': '#606266',       // 设置输入框文字颜色
    '--settings-input-border': '#dcdfe6',     // 设置输入框边框颜色
    '--settings-input-hover-border': '#c0c4cc', // 设置输入框悬停边框颜色
    '--settings-input-focus-border': '#409eff', // 设置输入框焦点边框颜色
    '--settings-label-text': '#606266',       // 设置标签文字颜色
  },
  
  dark: {
    // 基础颜色
    '--el-bg-color': '#1e1e1e',              // 深色主题主背景色，VSCode风格
    '--el-bg-color-page': '#141414',         // 深色页面背景，比主背景更暗
    '--el-bg-color-overlay': '#1d1e1f',      // 深色浮层背景，用于弹出层
    '--el-text-color-primary': '#ffffff',     // 深色主要文字，纯白色
    '--el-text-color-regular': '#d0d0d0',     // 深色常规文字，浅灰色
    '--el-border-color': '#4c4c4c',           // 深色主边框，中灰色
    '--el-border-color-light': '#363636',     // 深色次要边框，深灰色
    '--el-border-color-lighter': '#2c2c2c',   // 深色最浅边框，最深灰色
    '--el-fill-color-light': '#262727',       // 深色填充色，用于表格等
    '--el-color-primary-light-9': '#1c1c1c',  // 深色主题下的hover背景色
    
    // 终端相关
    '--terminal-bg': '#1e1e1e',               // 终端背景色，与VSCode终端一致
    '--terminal-text': '#d4d4d4',             // 终端文字颜色，浅灰色易读
    '--terminal-cursor': '#ffffff',           // 终端光标颜色，醒目的白色
    '--terminal-selection': '#264f78',        // 终端选中背景，深蓝色
    
    // 分割线颜色
    '--split-line-color': '#2d2d2d',          // 深色分隔线，较深的灰色
    
    // 侧边栏相关
    '--sidebar-bg': '#252526',                // 侧边栏背景，比主背景略深
    '--sidebar-text': '#cccccc',              // 侧边栏文字，浅灰色
    '--sidebar-border': '#2d2d2d',            // 侧边栏边框，深灰色
    '--sidebar-item-hover': '#2a2d2e',        // 侧边栏项目悬停，稍亮的灰色
    '--sidebar-item-active': '#37373d',       // 侧边栏项目激活，更亮的灰色
    '--sidebar-header-bg': '#252526',         // 侧边栏头部背景，与侧边栏同色
    '--sidebar-header-border': '#2d2d2d',     // 侧边栏头部边框，深灰色
    
    // 文件列表相关
    '--file-list-bg': '#1e1e1e',              // 文件列表背景，主背景色
    '--file-list-header-bg': '#252526',       // 文件列表头部，略深色
    '--file-list-border': '#2d2d2d',          // 文件列表边框，深灰色
    '--file-item-hover': '#2a2d2e',           // 文件项悬停，中灰色
    '--file-item-active': '#37373d',          // 文件项选中，亮灰色
    '--file-item-text': '#cccccc',            // 文件项文字，浅灰色
    '--file-item-icon': '#858585',            // 文件项图标，中灰色
    
    // 状态栏相关
    '--status-bar-bg': '#1a1a1a',             // 状态栏背景，最深色
    '--status-bar-text': '#cccccc',           // 状态栏文字，浅灰色
    '--status-bar-border': '#2d2d2d',         // 状态栏边框，深灰色
    '--status-bar-item-hover': '#2a2d2e',     // 状态栏项目悬停，中灰色

    // 标签栏相关
    '--tab-bar-bg': '#1e1e1e',                // 标签栏背景，主背景色
    '--tab-bar-border': '#2d2d2d',            // 标签栏边框，深灰色
    '--tab-item-bg': '#252526',               // 标签项背景，略深色
    '--tab-item-text': '#cccccc',             // 标签项文字，浅灰色
    '--tab-item-active-bg': '#1e1e1e',        // 激活标签背景，主背景色
    '--tab-item-active-text': '#409eff',      // 激活标签文字，主题蓝色
    '--tab-item-hover-bg': '#2a2d2e',         // 标签项悬停，中灰色

    // 工具栏相关
    '--toolbar-bg': '#252526',                // 工具栏背景，略深色
    '--toolbar-border': '#2d2d2d',            // 工具栏边框，深灰色
    '--toolbar-button-hover': '#2a2d2e',      // 工具栏按钮悬停，中灰色
    '--toolbar-button-active': '#094771',     // 工具栏按钮激活，深蓝色
    '--toolbar-text': '#cccccc',              // 工具栏文字，浅灰色
    '--toolbar-icon': '#858585',              // 工具栏图标，中灰色

    // 设置面板相关
    '--settings-input-bg': '#1d1d1d',         // 设置输入框背景，深色
    '--settings-input-text': '#cccccc',       // 设置输入框文字，浅灰色
    '--settings-input-border': '#2d2d2d',     // 设置输入框边框，深灰色
    '--settings-input-hover-border': '#4c4c4c', // 输入框悬停边框，中灰色
    '--settings-input-focus-border': '#409eff', // 输入框焦点边框，主题蓝色
    '--settings-label-text': '#cccccc',       // 设置标签文字，浅灰色
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