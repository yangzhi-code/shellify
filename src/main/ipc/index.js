import { ipcMain } from 'electron'
import { editorHandlers } from './editor/editor'
import { setupSSHHandlers } from './ssh'
import { setupMenuHandlers } from './menu'
import { setupStoreHandlers } from './store'
import { setupClipboardHandlers } from './clipboard'
import { setupFileHandlers } from './file'
import { setupDownloadHandlers } from './download'
import { setupSettingsHandlers } from './settings'
import { setupDialogHandlers } from './dialog'
import { setupUploadHandlers } from './upload'
import { setupSystemHandlers } from './system'

// 注册所有 IPC 处理器
export function setupIpcHandlers() {
  // 注册编辑器相关处理器
  Object.entries(editorHandlers).forEach(([channel, handler]) => {
    if (channel.includes('save') || channel.includes('read')) {
      ipcMain.handle(channel, handler)
    } else {
      ipcMain.on(channel, handler)
    }
  })

  // 设置其他处理器
  setupSSHHandlers()
  setupStoreHandlers()
  setupClipboardHandlers()
  setupMenuHandlers()
  setupFileHandlers()
  setupDownloadHandlers()
  setupUploadHandlers()
  setupSettingsHandlers()
  setupDialogHandlers()
  setupSystemHandlers()
} 