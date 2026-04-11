/* eslint-disable no-undef */
/* global MAIN_WINDOW_VITE_DEV_SERVER_URL MAIN_WINDOW_VITE_NAME */
import { app, shell, BrowserWindow, ipcMain, nativeTheme } from 'electron'
import { join } from 'path'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { setupIpcHandlers } from './ipc';
import SettingsManager from './services/SQLite/SettingsManager';
import systemEventHandler from './services/SystemEventHandler';
require('@electron/remote/main').initialize()


function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 870,
    minWidth: 800,
    minHeight: 500,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  })

  require('@electron/remote/main').enable(mainWindow.webContents)

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer based on @electron-forge/plugin-vite
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(async () => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  setupIpcHandlers();

  // 增强的系统主题监听
  let lastThemeState = nativeTheme.shouldUseDarkColors;

  // 轮询检查系统主题变化（作为 nativeTheme.on('updated') 的补充）
  const checkThemeChange = () => {
    const currentThemeState = nativeTheme.shouldUseDarkColors;
    if (currentThemeState !== lastThemeState) {
      lastThemeState = currentThemeState;
      // 通知所有窗口
      BrowserWindow.getAllWindows().forEach(window => {
        if (!window.isDestroyed()) {
          window.webContents.send('native-theme:changed');
        }
      });
    }
  };

  // 每秒检查一次系统主题变化
  setInterval(checkThemeChange, 1000);

  // 原有的监听也保留
  nativeTheme.on('updated', () => {
    // 立即通知所有窗口
    BrowserWindow.getAllWindows().forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send('native-theme:changed');
      }
    });
  });

  // 确保设置管理器已初始化
  await SettingsManager.init();

  createWindow()

  systemEventHandler.setupActivateListener(createWindow)
})

// 导出 createWindow 函数供其他模块使用
export { createWindow };

