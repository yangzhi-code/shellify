// 主题管理：适配 Electron + 浏览器，同步系统主题
class ThemeManager {
  constructor() {
    // 优先从本地存储读取上次的主题（持久化）
    this.currentTheme = localStorage.getItem('app-theme') || 'system';
    // 系统主题缓存
    this.systemTheme = 'light';
    // 事件监听器集合
    this.listeners = new Set();

    // 初始化
    this.init();
  }

  async init() {
    // 获取初始系统主题状态
    await this.updateSystemTheme();
    // 监听系统主题变化
    this.initSystemListeners();
    // 初始化主题
    this.applyTheme(this.currentTheme);
  }

  // 获取系统主题（异步）
  async updateSystemTheme() {
    try {
      if (window.electronAPI?.nativeTheme) {
        const state = await window.electronAPI.ipcRenderer.invoke('dark-mode:get');
        this.systemTheme = state.shouldUseDarkColors ? 'dark' : 'light';
      } else {
        this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
    } catch (e) {
      // fallback 到浏览器 API
      this.systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      console.warn('获取系统主题失败，使用浏览器 API:', e);
    }
  }

  // 获取实际要应用的主题（system → light/dark）
  getTargetTheme(theme = this.currentTheme) {
    return theme === 'system' ? this.systemTheme : theme;
  }

  // 应用主题（只处理页面主题）
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

    // 触发主题变化事件
    this.notifyListeners('theme-changed', { theme, targetTheme });
  }

  // 监听系统主题变化（双重监听：浏览器 + Electron）
  initSystemListeners() {
    // 浏览器端监听
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', async () => {
      await this.updateSystemTheme();
      if (this.currentTheme === 'system') {
        this.applyTheme('system');
      }
    });

    // Electron 端监听
    if (window.electronAPI?.onThemeChange) {
      window.electronAPI.onThemeChange(async () => {
        await this.updateSystemTheme();
        if (this.currentTheme === 'system') {
          this.applyTheme('system');
        }
      });
    }
  }

  // 切换主题（统一入口：同时处理窗口和页面主题）
  async switchTheme(theme) {
    if (!['light', 'dark', 'system'].includes(theme)) return;

    // 先调用主进程切换窗口主题
    if (window.electronAPI) {
      try {
        await window.electronAPI.ipcRenderer.invoke('dark-mode:set', theme);
      } catch (e) {
        console.warn('主进程主题切换失败:', e);
      }
    }

    // 再应用页面主题
    await this.applyTheme(theme);
    }

  // 事件系统
  addListener(callback) {
    this.listeners.add(callback);
  }

  removeListener(callback) {
    this.listeners.delete(callback);
  }

  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (e) {
        console.error('主题监听器错误:', e);
      }
    });
  }

  getCurrentTheme() {
    return this.currentTheme;
  }

  getSystemTheme() {
    return this.systemTheme;
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
}

export const themeManager = new ThemeManager();