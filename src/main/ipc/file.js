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
} 