import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
      }
    })
    contextBridge.exposeInMainWorld('electronAPI', {
      ...electronAPI,
      // 暴露主题相关的 API
      nativeTheme: {
        shouldUseDarkColors: () => ipcRenderer.invoke('dark-mode:get').then(result => result.shouldUseDarkColors),
        themeSource: () => ipcRenderer.invoke('dark-mode:get').then(result => result.themeSource)
      },
      onThemeChange: (callback) => {
        // 监听主进程发送的主题变化事件
        ipcRenderer.on('native-theme:changed', callback)
      }
    })
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.electronAPI = {
    ...electronAPI,
    // 暴露主题相关的 API
    nativeTheme: {
      shouldUseDarkColors: () => ipcRenderer.invoke('dark-mode:get').then(result => result.shouldUseDarkColors),
      themeSource: () => ipcRenderer.invoke('dark-mode:get').then(result => result.themeSource)
    },
    onThemeChange: (callback) => {
      // 监听主进程发送的主题变化事件
      ipcRenderer.on('native-theme:changed', callback)
    }
  }
  window.api = api
}
