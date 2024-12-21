import { ipcMain, clipboard } from 'electron';

/**
 * 设置剪贴板相关的 IPC 处理器
 * 用于终端中的复制粘贴功能
 */
export function setupClipboardHandlers() {
  /**
   * 写入文本到系统剪贴板
   * @param {string} text - 要复制的文本
   */
  ipcMain.handle('clipboard-write', (event, text) => {
    clipboard.writeText(text);
  });

  /**
   * 从系统剪贴板读取文本
   * @returns {string} 剪贴板中的文本
   */
  ipcMain.handle('clipboard-read', () => {
    return clipboard.readText();
  });
} 