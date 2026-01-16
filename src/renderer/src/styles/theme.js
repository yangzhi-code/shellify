// 主题管理：现在依赖于 SCSS 生成的 CSS 变量。
// 该文件仅负责运行时的主题切换（切换 class 并监听系统主题）。

class ThemeManager {
  constructor() {
    this.currentTheme = 'system'
  }

  // 按需加载 Element Plus 的深色 css-vars（用于组件级别的深色变量）
  async loadElementDarkCss() {
    if (!window.__element_dark_css_loaded) {
      try {
        // eslint-disable-next-line no-undef
        await import('element-plus/theme-chalk/dark/css-vars.css')
        window.__element_dark_css_loaded = true
      } catch (e) {
        console.warn('加载 Element Plus 深色 css-vars 失败:', e)
      }
    }
  }

  // 通过切换页面类来应用主题；SCSS 在 :root / .dark 中定义变量。
  async applyTheme(theme) {
    let targetTheme = theme
    if (theme === 'system') {
      targetTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }

    if (targetTheme === 'dark') {
      // 确保 Element 的深色变量被加载（补充）
      await this.loadElementDarkCss()
    }

    // 仅在 <html> 上切换类（Element Plus 建议使用 html.dark）
    document.documentElement.classList.toggle('dark', targetTheme === 'dark')
    document.documentElement.classList.toggle('light', targetTheme === 'light')

    this.currentTheme = theme
  }

  watchSystemTheme() {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system')
      }
    })
  }

  getCurrentTheme() {
    return this.currentTheme
  }
}

export const themeManager = new ThemeManager()