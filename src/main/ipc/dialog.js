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

  // 处理多文件选择对话框
  ipcMain.handle('dialog:select-multiple-files', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    return result;
  });

  // 多文件选择对话框
  //不能选择文件夹
  ipcMain.handle('dialog:select-folder-list', async () => {
    const result = await dialog.showOpenDialog({
      title: '选择文件',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'All Files', extensions: ['*'] } // 允许选择所有文件
      ]
    });
    return result;
  });

  // 添加私钥文件选择处理器
  ipcMain.handle('select-private-key', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: '私钥文件', extensions: ['pem', 'key', 'ppk', 'rsa', 'pub'] },
        { name: '所有文件', extensions: ['*'] },
        { name: '无后缀文件', extensions: [''] }
      ],
      title: '选择私钥文件'
    });
    
    return {
      canceled: result.canceled,
      filePath: result.filePaths[0]
    };
  });
} 