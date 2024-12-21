const { ipcMain, dialog } = require('electron');

export function setupDialogHandlers() {
  // 选择目录
  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: '选择下载目录'
    });
    
    if (!result.canceled) {
      return result.filePaths[0];
    }
    return null;
  });
} 