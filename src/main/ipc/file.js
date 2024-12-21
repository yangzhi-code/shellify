import { ipcMain } from 'electron';
import FileManager from '../services/ssh/FileManager';

export function setupFileHandlers() {
  // 获取文件列表
  ipcMain.handle('ssh:list-files', async (event, { connectionId, path }) => {
    try {
      console.log('收到文件列表请求:', { connectionId, path });
      return await FileManager.listFiles(connectionId, path);
    } catch (error) {
      console.error('文件列表处理失败:', error);
      throw error;
    }
  });

  // 文件搜索处理器
  ipcMain.handle('ssh:search-files', async (event, { connectionId, startPath, keyword, options }) => {
    try {
      console.log('收到搜索请求:', { connectionId, startPath, keyword, options });
      if (!startPath) {
        throw new Error('搜索路径不能为空');
      }
      return await FileManager.searchFiles(connectionId, startPath, keyword, options);
    } catch (error) {
      console.error('文件搜索失败:', error);
      throw error;
    }
  });

  // 文件下载处理器
  ipcMain.handle('ssh:download-file', async (event, { connectionId, remotePath, fileName }) => {
    try {
      return await FileManager.downloadFile(connectionId, remotePath, fileName);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw error;
    }
  });
} 