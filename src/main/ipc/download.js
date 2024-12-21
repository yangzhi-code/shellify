import { ipcMain } from 'electron';
import DownloadStore from '../services/stores/downloadStore';
/**
 * 设置下载记录相关的 IPC 处理器
 */
export function setupDownloadHandlers() {
  // 获取下载记录
  ipcMain.handle('store:get-downloads', () => {
    return DownloadStore.getAllDownloads();
  });

  // 清除下载记录
  ipcMain.handle('store:clear-downloads', () => {
    return DownloadStore.clearDownloads();
  });
} 