import { ipcMain, Menu } from 'electron';

/**
 * 设置上下文菜单相关的 IPC 处理器
 * 用于终端的右键菜单功能
 */
export function setupMenuHandlers() {
  /**
   * 显示上下文菜单
   * @param {Object} options - 菜单选项
   * @param {boolean} options.hasSelection - 是否有文本选中
   * @returns {Promise<string>} 用户选择的操作('copy'|'paste'|'selectAll')
   */
  ipcMain.handle('show-context-menu', (event, { hasSelection }) => {
    return new Promise((resolve) => {
      const menu = Menu.buildFromTemplate([
        {
          label: '复制',
          enabled: hasSelection,
          click: () => resolve('copy')
        },
        {
          label: '粘贴',
          click: () => resolve('paste')
        },
        { type: 'separator' },
        {
          label: '全选',
          click: () => resolve('selectAll')
        }
      ]);
      menu.popup();
    });
  });
} 