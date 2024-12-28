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
    // 移除之前的监听器，避免重复
    window.electron.ipcRenderer.removeAllListeners('file-to-edit')
    
    window.electron.ipcRenderer.on('file-to-edit', (_event, fileInfo) => {
      // 确保 fileInfo 是正确的对象格式
      if (typeof fileInfo === 'object' && fileInfo !== null) {
        console.log('收到文件信息:', fileInfo)
        callback(fileInfo)
      } else {
        console.warn('收到无效的文件信息:', fileInfo)
      }
    })
  }

  // 移除文件打开事件监听
  static removeFileOpenListener() {
    window.electron.ipcRenderer.removeAllListeners('file-to-edit')
  }
}

export default EditorIpcService 