import { ipcMain, dialog, BrowserWindow } from 'electron';
import SettingsManager from '../services/SQLite/SettingsManager';
import settingsStore from '../services/stores/settingsStore';

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

    // 保存设置
    ipcMain.handle('settings:save', async (event, settings) => {
        //console.log('保存设置', settings);
        try {
            await settingsStore.saveSettings(settings);
            return true;
        } catch (error) {
            throw new Error('保存设置失败：' + error.message);
        }
    });

    // 加载设置
    ipcMain.handle('settings:load', async () => {
        try {
            return await settingsStore.getAllSettings();
        } catch (error) {
            throw new Error('加载设置失败：' + error.message);
        }
    });

    // 重置设置
    ipcMain.handle('settings:reset', async () => {
        try {
            return await settingsStore.resetSettings();
        } catch (error) {
            throw new Error('重置设置失败：' + error.message);
        }
    });

    // 更新部分设置
    ipcMain.handle('settings:update', async (event, partialSettings) => {
        try {
            return await settingsStore.updateSettings(partialSettings);
        } catch (error) {
            throw new Error('更新设置失败：' + error.message);
        }
    });
} 