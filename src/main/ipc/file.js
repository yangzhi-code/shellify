import { ipcMain, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function setupFileHandlers() {
  // 打开文件 - 使用系统默认程序或系统的"打开方式"对话框
  ipcMain.handle('file:open', async (event, filePath) => {
    try {
      const result = await shell.openPath(filePath);
      // openPath 返回空字符串表示成功，否则返回错误信息
      if (result !== '') {
        const ext = path.extname(filePath).toLowerCase();
        return {
          success: false,
          error: `系统找不到可以打开${ext}文件的程序，请安装相应的应用程序`
        };
      }
      return { success: true };
    } catch (error) {
      console.error('打开文件失败:', error);
      return {
        success: false,
        error: '无法打开文件，可能是文件损坏或没有权限'
      };
    }
  });

  // 在文件管理器中显示文件
  ipcMain.handle('file:show-in-folder', async (event, filePath) => {
    try {
      await shell.showItemInFolder(filePath);
    } catch (error) {
      console.error('打开文件夹失败:', error);
      throw new Error(`无法打开文件夹: ${error.message}`);
    }
  });

  // 检查文件是否存在
  ipcMain.handle('file:exists', async (event, filePath) => {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  });
} 