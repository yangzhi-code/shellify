class EditorIpcService {
  // 读取文件内容
  static async readFile(path) {
    try {
      console.log('Reading file:', path)
      return await window.electron.ipcRenderer.invoke('read-file', path)
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  }

  // 保存文件内容
  static async saveFile(path, content) {
    try {
      console.log('Saving file:', path)
      await window.electron.ipcRenderer.invoke('save-file', { path, content })
      return true
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  }

  // 监听文件打开事件
  static onFileOpen(callback) {
    window.electron.ipcRenderer.on('file-to-edit', callback)
  }

  // 移除文件打开事件监听
  static removeFileOpenListener(callback) {
    window.electron.ipcRenderer.removeListener('file-to-edit', callback)
  }
}

export default EditorIpcService 