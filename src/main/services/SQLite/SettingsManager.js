import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

class SettingsManager {
  constructor() {
    this.db = null;
    this.statements = {};
    this.init();
  }

  init() {
    try {
      const dbPath = process.env.NODE_ENV === 'development'
        ? path.join(process.cwd(), 'data', 'shellify.db')
        : path.join(app.getPath('userData'), 'shellify.db');

      console.log('[SettingsManager] 数据库路径:', dbPath);

      this.db = new Database(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // 预编译常用语句
      this.statements.getSetting = this.db.prepare('SELECT value FROM settings WHERE key = ?');
      this.statements.setSetting = this.db.prepare(`
        INSERT INTO settings (key, value, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = CURRENT_TIMESTAMP
      `);

      // 确保默认下载路径存在
      const defaultDownloadPath = this.getDownloadPath();
      //console.log('[SettingsManager] 当前下载路径:', defaultDownloadPath);

      if (!defaultDownloadPath) {
        const systemDownloads = app.getPath('downloads');
        //console.log('[SettingsManager] 设置系统下载路径:', systemDownloads);
        this.setDownloadPath(systemDownloads);
      }
    } catch (error) {
      console.error('[SettingsManager] 初始化失败:', error);
    }
  }

  getDownloadPath() {
    try {
      const result = this.statements.getSetting.get('download_path');
      //console.log('[SettingsManager] 获取下载路径结果:', result);
      return result ? result.value : null;
    } catch (error) {
      console.error('[SettingsManager] 获取下载路径失败:', error);
      return null;
    }
  }

  setDownloadPath(path) {
    try {
      //console.log('[SettingsManager] 正在设置下载路径:', path);
      this.statements.setSetting.run(path, path);
      //console.log('[SettingsManager] 下载路径设置成功');
      return true;
    } catch (error) {
      console.error('[SettingsManager] 设置下载路径失败:', error);
      return false;
    }
  }
}

export default new SettingsManager(); 