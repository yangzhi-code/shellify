import { app } from 'electron';
import DownloadManager from './SQLite/DownloadManager';

class SystemEventHandler {
  constructor() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // 监听应用退出事件
    app.on('before-quit', this.handleBeforeQuit);

    // 监听窗口全部关闭事件
    app.on('window-all-closed', this.handleWindowAllClosed);

    // 监听应用激活事件 (macOS)
    app.on('activate', this.handleActivate);
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

  handleActivate = () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  }
}

export default new SystemEventHandler(); 