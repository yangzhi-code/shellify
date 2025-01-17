import { ipcMain, shell } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import FileManager from '../services/ssh/FileManager';

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

  // 创建文件夹
  ipcMain.handle('file:create-folder', async (event, { connectionId, path, folderName }) => {
    try {
      await FileManager.createFolder(connectionId, path, folderName);
      return { success: true };
    } catch (error) {
      console.error('创建文件夹失败:', error);
      throw error;
    }
  });

  // SSH 文件读取处理器
  ipcMain.handle('ssh:read-file', async (event, { connectionId, path }) => {
    try {
      console.log('[IPC] Reading file:', path)
      const content = await FileManager.readFile(connectionId, path)
      
      // 检查内容是否为空
      if (content === undefined || content === null) {
        throw new Error('文件内容为空')
      }
      
      console.log('[IPC] File read successfully, content length:', content.length)
      return content
    } catch (error) {
      console.error('[IPC] Error reading file:', error)
      // 确保返回一个有意义的错误消息
      throw new Error(error.message || '读取文件失败')
    }
  });

  // SSH 文件保存处理器
  ipcMain.handle('ssh:save-file', async (event, { connectionId, path, content }) => {
    try {

      await FileManager.writeFile(connectionId, path, content);
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  });

  // 删除文件或文件夹
  ipcMain.handle('ssh:delete-file', async (event, { connectionId, path, isDirectory }) => {
    try {
      await FileManager.deleteFile(connectionId, path, isDirectory)
      return true
    } catch (error) {
      console.error('删除文件失败:', error)
      throw new Error(`删除失败: ${error.message}`)
    }
  })
}
