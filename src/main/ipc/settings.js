import { ipcMain, dialog, BrowserWindow, nativeTheme } from 'electron';
import SettingsManager from '../services/SQLite/SettingsManager';
import settingsStore from '../services/stores/settingsStore';
import connectionStore from '../services/stores/connectStore';
import fs from 'fs';

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

    // 导出 SSH 连接配置为 JSON 文件
    ipcMain.handle('connections:export', async () => {
        try {
            const mainWindow = BrowserWindow.getFocusedWindow();
            const connections = await connectionStore.getAllConnections();

            const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
                title: '导出连接配置',
                defaultPath: 'connections-backup.json',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (canceled || !filePath) {
                return { canceled: true };
            }

            await fs.promises.writeFile(filePath, JSON.stringify(connections, null, 2), 'utf-8');
            return { canceled: false, filePath };
        } catch (error) {
            console.error('导出连接配置失败:', error);
            throw new Error('导出连接配置失败：' + error.message);
        }
    });

    // 从 JSON 文件导入 SSH 连接配置
    ipcMain.handle('connections:import', async () => {
        try {
            const mainWindow = BrowserWindow.getFocusedWindow();
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
                title: '导入连接配置',
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            });

            if (canceled || !filePaths || !filePaths[0]) {
                return { canceled: true };
            }

            const filePath = filePaths[0];
            const content = await fs.promises.readFile(filePath, 'utf-8');
            let data;
            try {
                data = JSON.parse(content);
            } catch (e) {
                throw new Error('文件格式不是有效的 JSON');
            }

            if (!Array.isArray(data)) {
                throw new Error('连接配置格式不正确，应为数组');
            }

            await connectionStore.saveConnection(data);

            // 通知所有窗口连接配置已更新，刷新左侧连接树等 UI
            const windows = BrowserWindow.getAllWindows();
            windows.forEach((win) => {
                if (!win.isDestroyed()) {
                    win.webContents.send('connections:updated');
                }
            });

            return { canceled: false, filePath, count: data.length };
        } catch (error) {
            console.error('导入连接配置失败:', error);
            throw new Error('导入连接配置失败：' + error.message);
        }
    });

    // 直接设置主题
    ipcMain.handle('dark-mode:set', async (event, theme) => {
        if (['light', 'dark', 'system'].includes(theme)) {
            nativeTheme.themeSource = theme;
            // 立即通知所有窗口状态变化
            setTimeout(() => {
                BrowserWindow.getAllWindows().forEach(window => {
                    if (!window.isDestroyed()) {
                        window.webContents.send('native-theme:changed');
                    }
                });
            }, 50); // 给 nativeTheme 一点时间来更新状态
        }
    });

    // 主题切换处理
    ipcMain.handle('dark-mode:toggle', () => {
        if (nativeTheme.shouldUseDarkColors) {
            nativeTheme.themeSource = 'light'
        } else {
            nativeTheme.themeSource = 'dark'
        }
        return nativeTheme.shouldUseDarkColors
    })

    ipcMain.handle('dark-mode:system', () => {
        nativeTheme.themeSource = 'system'
    })

    // 获取当前主题状态
    ipcMain.handle('dark-mode:get', () => {
        return {
            shouldUseDarkColors: nativeTheme.shouldUseDarkColors,
            themeSource: nativeTheme.themeSource
        }
    })

    // 手动触发系统主题检查（用于调试或强制刷新）
    ipcMain.handle('dark-mode:refresh', () => {
        BrowserWindow.getAllWindows().forEach(window => {
            if (!window.isDestroyed()) {
                window.webContents.send('native-theme:changed');
            }
        });
    });
}