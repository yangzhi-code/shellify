import { ipcMain, dialog, BrowserWindow } from 'electron';
import SettingsManager from '../services/SQLite/SettingsManager';

export function setupSettingsHandlers() {
    // 获取下载路径
    ipcMain.handle('settings:get-download-path', async () => {
        return await SettingsManager.getDownloadPath();
    });

    // 设置下载路径
    ipcMain.handle('settings:set-download-path', async (event, path) => {
        return await SettingsManager.setDownloadPath(path);
    });

    // 选择文件夹
    ipcMain.handle('dialog:select-folder', async () => {
        const mainWindow = BrowserWindow.getFocusedWindow();
        return await dialog.showOpenDialog(mainWindow, {
            title: '选择下载目录',
            properties: ['openDirectory'],
            buttonLabel: '选择文件夹'
        });
    });
} 