import Database from 'better-sqlite3'
import path from 'path'
import { app, BrowserWindow } from 'electron'

class UploadManager {
  constructor() {
    this.db = null
    this.statements = {}
    this.initDatabase()
  }

  initDatabase() {
    const dbPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'data', 'shellify.db')
      : path.join(app.getPath('userData'), 'shellify.db');

    console.log('[UploadManager] 数据库路径:', dbPath)

    this.db = new Database(dbPath)

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS uploads (
        id TEXT PRIMARY KEY,
        connection_id TEXT NOT NULL,
        file_name TEXT NOT NULL,
        file_path TEXT NOT NULL,
        remote_path TEXT NOT NULL,
        total_size INTEGER NOT NULL,
        progress INTEGER DEFAULT 0,
        status TEXT CHECK(status IN ('uploading', 'completed', 'error', 'interrupted')) NOT NULL,
        error TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)

    // 预编译常用语句
    this.statements.getUpload = this.db.prepare('SELECT * FROM uploads WHERE id = ?')
    this.statements.updateUpload = this.db.prepare(`
      UPDATE uploads
      SET progress = ?, status = ?, error = ?, updated_at = ?
      WHERE id = ?
    `)
    this.statements.insertUpload = this.db.prepare(`
      INSERT INTO uploads (
        id, connection_id, file_name, file_path, remote_path,
        total_size, progress, status, error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    this.statements.getAllUploads = this.db.prepare('SELECT * FROM uploads ORDER BY updated_at DESC')
    this.statements.deleteUpload = this.db.prepare('DELETE FROM uploads WHERE id = ?')
    this.statements.deleteAllUploads = this.db.prepare('DELETE FROM uploads')
    this.statements.markInterrupted = this.db.prepare(`
      UPDATE uploads
      SET status = 'interrupted', updated_at = ?
      WHERE connection_id = ? AND status = 'uploading'
    `)
    this.statements.getInterrupted = this.db.prepare(`
      SELECT * FROM uploads
      WHERE connection_id = ? AND status = 'interrupted'
    `)
    this.statements.cleanupOld = this.db.prepare(`
      DELETE FROM uploads
      WHERE updated_at < ? AND status IN ('completed', 'error')
    `)
  }

  //保存上传记录
  updateOrCreate(data) {

    try {
      const now = Date.now()

      const existing = this.statements.getUpload.get(data.uploadId)

      if (existing) {
        // 更新现有记录
        this.statements.updateUpload.run(
          data.progress,
          data.status,
          data.error || null,
          now,
          data.uploadId
        )
      } else {
        // 创建新记录
        this.statements.insertUpload.run(
          data.uploadId,
          data.connectionId,
          data.fileName,
          data.filePath,
          data.remotePath,
          data.total,
          data.progress,
          data.status,
          data.error || null,
          now,
          now
        )
      }

      // 使用 _notifyProgressUpdate 通知进度更新
      this._notifyProgressUpdate(data.uploadId, data.progress)

      // 发送更新事件
      if (global.mainWindow) {
        global.mainWindow.webContents.send('upload-updated', {
          id: data.uploadId,
          connection_id: data.connectionId,
          file_name: data.fileName,
          file_path: data.filePath,
          remote_path: data.remotePath,
          total_size: data.total,
          progress: data.progress,
          status: data.status,
          error: data.error,
          updated_at: now
        })
      }

      return true
    } catch (error) {
      console.error('更新上传记录失败:', error)
      throw error
    }
  }

  getAll() {
    try {
      return this.statements.getAllUploads.all()
    } catch (error) {
      console.error('获取上传记录失败:', error)
      throw error
    }
  }

  delete(id) {
    try {
      this.statements.deleteUpload.run(id)
      return true
    } catch (error) {
      console.error('删除上传记录失败:', error)
      throw error
    }
  }

  deleteAll() {
    try {
      this.statements.deleteAllUploads.run()
      return true
    } catch (error) {
      console.error('删除所有上传记录失败:', error)
      throw error
    }
  }

  markInterrupted(connectionId) {
    try {
      const now = Date.now()

      // 标记中断的上传
      this.statements.markInterrupted.run(now, connectionId)

      // 获取被标记为中断的记录
      const interruptedUploads = this.statements.getInterrupted.all(connectionId)

      // 通知前端
      if (global.mainWindow && interruptedUploads.length > 0) {
        interruptedUploads.forEach(upload => {
          global.mainWindow.webContents.send('upload-updated', upload)
        })
      }

      return true
    } catch (error) {
      console.error('标记中断上传失败:', error)
      throw error
    }
  }

  cleanupOldRecords(days = 7) {
    try {
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)

      this.statements.cleanupOld.run(cutoff)

      return true
    } catch (error) {
      console.error('清理过期上传记录失败:', error)
      throw error
    }
  }

  // 获取单个上传记录
  getUpload(id) {
    try {
      return this.statements.getUpload.get(id)
    } catch (error) {
      console.error('获取上传记录失败:', error)
      return null
    }
  }

  // 通知渲染进程上传进度更新
  _notifyProgressUpdate(uploadId, progress) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        const upload = this.getUpload(uploadId)
        if (upload) {
          win.webContents.send('upload-updated', {
            id: upload.id,
            connection_id: upload.connection_id,
            file_name: upload.file_name,
            file_path: upload.file_path,
            remote_path: upload.remote_path,
            total_size: upload.total_size,
            progress: upload.progress,
            status: upload.status,
            error: upload.error,
            updated_at: upload.updated_at
          })
        }
      }
    })
  }
}

export default new UploadManager() 