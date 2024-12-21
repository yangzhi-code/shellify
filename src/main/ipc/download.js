const { ipcMain } = require('electron');
const downloadStore = require('../services/stores/download');

/**
 * 设置下载记录相关的 IPC 处理器
 */
exports.setupDownloadHandlers = function() {
  // 获取下载记录
  ipcMain.handle('store:get-downloads', () => {
    return downloadStore.getRecords();
  });

  // 清除下载记录
  ipcMain.handle('store:clear-downloads', () => {
    downloadStore.clearRecords();
  });
} 