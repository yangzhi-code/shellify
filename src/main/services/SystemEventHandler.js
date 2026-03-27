import { app, BrowserWindow } from 'electron';
import DownloadManager from './SQLite/DownloadManager';

class SystemEventHandler {
  constructor() {
    this.setupBaseEventListeners();
  }

  setupBaseEventListeners() {
    app.on('before-quit', this.handleBeforeQuit);
    app.on('window-all-closed', this.handleWindowAllClosed);
  }

  setupActivateListener(createWindow) {
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });
  }

  handleBeforeQuit = async (event) => {
    event.preventDefault(); // 阻止立即退出
    try {
      await DownloadManager.markAllDownloadsInterrupted();
    } catch (error) {
      console.error('标记下载中断失败:', error);
    } finally {
      app.exit(0); // 强制退出应用
    }
  }

  handleWindowAllClosed = () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }
}

export default new SystemEventHandler(); 