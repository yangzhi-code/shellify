let Store;
import path from 'path';

(async () => {
  Store = (await import('electron-store')).default;
})();

// 设置信息存储
class SettingsStore {
  constructor() {
    this.store = null;
    this.key = 'settings'; // 存储的主键
  }

  async init() {
    // 动态加载 Store，避免 require 报错
    if (!Store) {
      Store = (await import('electron-store')).default;
    }
    this.store = new Store({
      name: 'settings',
      cwd: process.env.NODE_ENV === 'development'
        ? path.join(process.cwd(), 'data')  // 开发环境
        : undefined  // 生产环境使用默认路径
    });
  }

  // 获取所有设置
  async getAllSettings() {
    if (!this.store) await this.init();
    const settings = this.store.get(this.key, {});
    // 确保返回的是正确的数据结构
    return this.validateSettings(settings);
  }

  // 数据验证方法
  validateSettings(settings) {
    // 默认设置
    const defaultSettings = {
      theme: 'system',
      fontSize: 14,
      terminalFont: 'Menlo',
      terminalFontSize: 14,
      tabSize: 4,
      autoSave: true,
      shortcuts: {
        newTerminal: 'Ctrl + T',
        closeTerminal: 'Ctrl + W'
      }
    };

    // 如果没有设置，返回默认值
    if (!settings) return defaultSettings;

    // 合并用户设置和默认设置
    return {
      theme: settings.theme || defaultSettings.theme,
      fontSize: this.validateNumber(settings.fontSize, defaultSettings.fontSize, 12, 20),
      terminalFont: settings.terminalFont || defaultSettings.terminalFont,
      terminalFontSize: this.validateNumber(settings.terminalFontSize, defaultSettings.terminalFontSize, 8, 36),
      tabSize: this.validateNumber(settings.tabSize, defaultSettings.tabSize, 2, 8),
      autoSave: settings.autoSave ?? defaultSettings.autoSave,
      shortcuts: {
        newTerminal: settings.shortcuts?.newTerminal || defaultSettings.shortcuts.newTerminal,
        closeTerminal: settings.shortcuts?.closeTerminal || defaultSettings.shortcuts.closeTerminal
      }
    };
  }

  // 数字类型验证
  validateNumber(value, defaultValue, min, max) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  // 保存设置
  async saveSettings(settings) {
    if (!this.store) await this.init();
    // 确保保存前数据结构正确
    const validatedSettings = this.validateSettings(settings);
    this.store.set(this.key, validatedSettings);
    return validatedSettings;
  }

  // 更新部分设置
  async updateSettings(partialSettings) {
    if (!this.store) await this.init();
    const currentSettings = await this.getAllSettings();
    const newSettings = { ...currentSettings, ...partialSettings };
    return await this.saveSettings(newSettings);
  }

  // 重置设置
  async resetSettings() {
    if (!this.store) await this.init();
    const defaultSettings = this.validateSettings({});
    this.store.set(this.key, defaultSettings);
    return defaultSettings;
  }
}

// 导出单例对象
export default new SettingsStore(); 