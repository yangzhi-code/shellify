import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { app, BrowserWindow } from 'electron'

class UploadManager {
  constructor() {
    this.dbPromise = this.initDatabase()
  }

  async initDatabase() {
    const dbPath = process.env.NODE_ENV === 'development'
      ? path.join(process.cwd(), 'uploads.db')
      : path.join(app.getPath('userData'), 'uploads.db')

    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    await db.exec(`
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

    return db
  }

  //保存上传记录
  async updateOrCreate(data) {
    console.log('上传记录', data)
    try {
      const db = await this.dbPromise
      const now = Date.now()

      const existing = await db.get('SELECT * FROM uploads WHERE id = ?', data.uploadId)

      if (existing) {
        // 更新现有记录
        await db.run(`
          UPDATE uploads 
          SET progress = ?,
              status = ?,
              error = ?,
              updated_at = ?
          WHERE id = ?
        `, [
          data.progress,
          data.status,
          data.error || null,
          now,
          data.uploadId
        ])
      } else {
        // 创建新记录
        await db.run(`
          INSERT INTO uploads (
            id, connection_id, file_name, file_path, remote_path,
            total_size, progress, status, error, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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
        ])
      }

      // 使用 _notifyProgressUpdate 通知进度更新
      await this._notifyProgressUpdate(data.uploadId, data.progress)

      console.log("测试", global.mainWindow)

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

  async getAll() {
    try {
      const db = await this.dbPromise
      return await db.all('SELECT * FROM uploads ORDER BY updated_at DESC')
    } catch (error) {
      console.error('获取上传记录失败:', error)
      throw error
    }
  }

  async delete(id) {
    try {
      const db = await this.dbPromise
      await db.run('DELETE FROM uploads WHERE id = ?', id)
      return true
    } catch (error) {
      console.error('删除上传记录失败:', error)
      throw error
    }
  }

  async deleteAll() {
    try {
      const db = await this.dbPromise
      await db.run('DELETE FROM uploads')
      return true
    } catch (error) {
      console.error('删除所有上传记录失败:', error)
      throw error
    }
  }

  async markInterrupted(connectionId) {
    try {
      const db = await this.dbPromise
      const now = Date.now()

      // 标记中断的上传
      await db.run(`
        UPDATE uploads 
        SET status = 'interrupted',
            updated_at = ?
        WHERE connection_id = ?
        AND status = 'uploading'
      `, [now, connectionId])

      // 获取被标记为中断的记录
      const interruptedUploads = await db.all(`
        SELECT * FROM uploads 
        WHERE connection_id = ?
        AND status = 'interrupted'
      `, connectionId)

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

  async cleanupOldRecords(days = 7) {
    try {
      const db = await this.dbPromise
      const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000)
      
      await db.run(`
        DELETE FROM uploads 
        WHERE updated_at < ? 
        AND status IN ('completed', 'error')
      `, cutoff)
      
      return true
    } catch (error) {
      console.error('清理过期上传记录失败:', error)
      throw error
    }
  }

  // 获取单个上传记录
  async getUpload(id) {
    try {
      const db = await this.dbPromise
      return await db.get('SELECT * FROM uploads WHERE id = ?', id)
    } catch (error) {
      console.error('获取上传记录失败:', error)
      return null
    }
  }

  // 通知渲染进程上传进度更新
  async _notifyProgressUpdate(uploadId, progress) {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(async (win) => {
      if (!win.isDestroyed()) {
        const upload = await this.getUpload(uploadId)
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