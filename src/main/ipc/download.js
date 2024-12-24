import { ipcMain } from 'electron';
import DownloadManager from '../services/SQLite/DownloadManager';
import FileManager from '../services/ssh/FileManager';
/**
 * 设置下载记录相关的 IPC 处理器
 */
export function setupDownloadHandlers() {
  // 获取下载记录
  ipcMain.handle('store:get-downloads', () => {
    return DownloadManager.getAllDownloads();
  });

  // 删除指定id的下载记录
  ipcMain.handle('store:delete-download', (event, downloadId) => {
    return DownloadManager.deleteDownload(downloadId);
  });
  // 删除所有下载记录
  ipcMain.handle('store:delete-all-downloads', () => {
    return DownloadManager.deleteAllDownloads();
  });
  // 重试下载
  ipcMain.handle('download-retry', (event, record) => {
    return FileManager.retryDownload(record);
  });
} 