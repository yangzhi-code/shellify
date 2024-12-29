import { BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'

// 创建编辑器窗口
function createEditorWindow(fileInfo) {
  console.log('创建编辑器窗口，文件信息:', fileInfo)

  const editorWindow = new BrowserWindow({
    width: 1100,
    height: 670,
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

  require('@electron/remote/main').enable(editorWindow.webContents)

  editorWindow.on('ready-to-show', () => {
    editorWindow.show()
  })

  // 直接加载编辑器页面，不传递参数
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    editorWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    editorWindow.loadFile(join(__dirname, '../renderer/editor.html'))
  }

  // 等待页面加载完成后发送文件信息
  editorWindow.webContents.on('did-finish-load', () => {
    console.log('编辑器窗口加载完成,发送文件信息:', fileInfo)
    editorWindow.webContents.send('file-to-edit', fileInfo)
  })

  return editorWindow
}

export { createEditorWindow }