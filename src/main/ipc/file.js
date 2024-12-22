import { ipcMain, shell } from 'electron';

export function setupFileHandlers() {
  // 打开文件
  ipcMain.handle('file:open', async (event, filePath) => {
    try {
      await shell.openPath(filePath);
    } catch (error) {
      console.error('打开文件失败:', error);
      throw error;
    }
  });

  // 在文件管理器中显示文件
  ipcMain.handle('file:show-in-folder', async (event, filePath) => {
    try {
      await shell.showItemInFolder(filePath);
    } catch (error) {
      console.error('打开文件夹失败:', error);
      throw error;
    }
  });
} 