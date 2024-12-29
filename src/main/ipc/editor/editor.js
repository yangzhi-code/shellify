import { BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'
import fs from 'fs/promises'
import { createEditorWindow } from '../../editor'

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