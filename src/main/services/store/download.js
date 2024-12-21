const { app } = require('electron');
const Store = require('electron-store');
const path = require('path');

class DownloadStore {
  constructor() {
    this.store = new Store({
      name: 'downloads',
      cwd: process.env.APPDATA || (process.platform == 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + "/.local/share"),
      defaults: {
        records: []
      }
    });
  }

  // 添加下载记录
  addDownload(record) {
    const records = this.store.get('records');
    records.unshift({
      ...record,
      id: Date.now(),
      startTime: new Date().toISOString(),
      status: 'downloading', // downloading, completed, error
      progress: 0
    });
    this.store.set('records', records);
    this._notifyUpdate();
    return records[0];
  }

  // 更新下载进度
  updateProgress(id, progress) {
    const records = this.store.get('records');
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index].progress = progress;
      if (progress === 100) {
        records[index].status = 'completed';
        records[index].completedTime = new Date().toISOString();
      }
      this.store.set('records', records);
      this._notifyUpdate();
    }
  }

  // 设置下载错误
  setError(id, error) {
    const records = this.store.get('records');
    const index = records.findIndex(r => r.id === id);
    if (index !== -1) {
      records[index].status = 'error';
      records[index].error = error;
      this.store.set('records', records);
      this._notifyUpdate();
    }
  }

  // 获取所有下载记录
  getRecords() {
    return this.store.get('records');
  }

  // 清除下载记录
  clearRecords() {
    this.store.set('records', []);
    this._notifyUpdate();
  }

  // 通知渲染进程更新
  _notifyUpdate() {
    const windows = require('electron').BrowserWindow.getAllWindows();
    windows.forEach(win => {
      if (!win.isDestroyed()) {
        win.webContents.send('download-updated');
      }
    });
  }
}

// 使用 CommonJS 导出
module.exports = new DownloadStore(); 