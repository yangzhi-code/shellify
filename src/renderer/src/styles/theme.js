// 主题管理：适配 Electron + 浏览器，同步系统主题
class ThemeManager {
  constructor() {
    // 优先从本地存储读取上次的主题（持久化）
    this.currentTheme = localStorage.getItem('app-theme') || 'system';
    // 监听系统主题变化
    this.initThemeListener();
    // 初始化主题
    this.applyTheme(this.currentTheme);
  }

  // 按需加载 Element Plus 深色样式
  async loadElementDarkCss() {
    if (!window.__element_dark_css_loaded) {
      try {
        await import('element-plus/theme-chalk/dark/css-vars.css');
        window.__element_dark_css_loaded = true;
      } catch (e) {
        console.warn('加载 Element Plus 深色样式失败:', e);
      }
    }
  }

  // 获取实际要应用的主题（system → light/dark）
  getTargetTheme(theme) {
    if (theme === 'system') {
      // Electron 环境优先用 nativeTheme，否则用浏览器的 matchMedia
      if (window.electronAPI?.nativeTheme) {
        return window.electronAPI.nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return theme;
  }

  // 应用主题
  async applyTheme(theme) {
    const targetTheme = this.getTargetTheme(theme);

    // 深色主题加载 Element 样式
    if (targetTheme === 'dark') {
      await this.loadElementDarkCss();
    }

    // 切换 html 类名（核心：和 SCSS 中的 .light/.dark 对应）
    const html = document.documentElement;
    html.classList.remove('light', 'dark');
    html.classList.add(targetTheme);

    // 保存当前主题到本地存储
    this.currentTheme = theme;
    localStorage.setItem('app-theme', theme);
  }

  // 监听系统主题变化（浏览器 + Electron）
  initThemeListener() {
    // 浏览器端监听
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.currentTheme === 'system') {
        this.applyTheme('system');
      }
    });

    // Electron 端监听（需主进程暴露 nativeTheme 事件）
    if (window.electronAPI?.onThemeChange) {
      window.electronAPI.onThemeChange(() => {
        if (this.currentTheme === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  // 切换主题（外部调用：如按钮切换 light/dark/system）
  switchTheme(theme) {
    if (['light', 'dark', 'system'].includes(theme)) {
      this.applyTheme(theme);
    }
  }

  getCurrentTheme() {
    return this.currentTheme;
  }
}

export const themeManager = new ThemeManager();