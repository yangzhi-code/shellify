import { ipcMain, Menu } from 'electron';

export function setupMenuHandlers() {
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