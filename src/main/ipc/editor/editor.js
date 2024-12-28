import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'
import fs from 'fs/promises'

// 创建编辑器窗口
function createEditorWindow(fileInfo) {
  console.log('创建编辑器窗口携带的参数:', fileInfo);
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
    console.log('Editor window ready to show');
    editorWindow.show()
  })

  // 加载编辑器页面
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    console.log('编辑器开发环境地址:', `${process.env['ELECTRON_RENDERER_URL']}/editor.html`);
    editorWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/editor.html`)
  } else {
    console.log('Loading production file');
    editorWindow.loadFile(join(__dirname, '../../../renderer/editor.html'))
  }

  editorWindow.webContents.on('did-finish-load', () => {
    console.log('编辑器窗口加载完成,发送文件信息:', fileInfo);
    editorWindow.webContents.send('file-to-edit', fileInfo)
  })
}

// 编辑器相关的 IPC 处理器
export const editorHandlers = {
  // 打开编辑器窗口
  'open-editor': (event, editableTab) => {
    console.log('打开一个新的编辑器:',editableTab);
    createEditorWindow(editableTab)
  },

  // 读取文件内容
  'read-file': async (event, path) => {
    try {
      console.log('Reading file:', path)
      const content = await fs.readFile(path, 'utf8')
      return content
    } catch (error) {
      console.error('Error reading file:', error)
      throw error
    }
  },

  // 保存文件内容
  'save-file': async (event, { path, content }) => {
    try {
      console.log('Saving file:', path)
      await fs.writeFile(path, content, 'utf8')
      return true
    } catch (error) {
      console.error('Error saving file:', error)
      throw error
    }
  }
} 