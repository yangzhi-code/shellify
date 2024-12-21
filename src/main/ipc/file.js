import { ipcMain } from 'electron';
import FileManager from '../services/ssh/FileManager';

export function setupFileHandlers() {
  // 获取文件列表
  ipcMain.handle('ssh:list-files', async (event, { connectionId, path }) => {
    try {
      return await FileManager.listFiles(connectionId, path);
    } catch (error) {
      console.error('Failed to list files:', error);
      throw error;
    }
  });
} 