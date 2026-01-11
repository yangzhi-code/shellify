import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';
import { BrowserWindow } from 'electron';

/**
 * 下载管理器
 * 负责管理所有下载任务的状态
 */
class DownloadManager {
  constructor() {
    this.db = null;
    this.statements = {};
    this.init();
  }

  init() {
    try {
      const dbPath = process.env.NODE_ENV === 'development'
        ? path.join(process.cwd(), 'data', 'shellify.db')
        : path.join(app.getPath('userData'), 'shellify.db');

      console.log('[DownloadManager] 数据库路径:', dbPath);

      this.db = new Database(dbPath);

      this.db.exec(`
        CREATE TABLE IF NOT EXISTS downloads (
          id TEXT PRIMARY KEY,
          connection_id TEXT,
          server_info TEXT,
          file_name TEXT,
          file_path TEXT,
          remote_path TEXT,
          progress INTEGER DEFAULT 0,
          total_size INTEGER,
          chunk_size INTEGER,
          status TEXT DEFAULT 'pending',
          error TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
        CREATE INDEX IF NOT EXISTS idx_downloads_updated ON downloads(updated_at);
      `);

      // 预编译常用语句
      this.statements.createDownload = this.db.prepare(`
        INSERT INTO downloads (
          id, connection_id, server_info, file_name, file_path,
          remote_path, total_size, status, error, chunk_size, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      this.statements.updateProgress = this.db.prepare(`
        UPDATE downloads
        SET progress = ?, chunk_size = ?, updated_at = CURRENT_TIMESTAMP,
            status = CASE
              WHEN ? >= 100 THEN 'completed'
              ELSE 'downloading'
            END
        WHERE id = ?
      `);

      this.statements.markError = this.db.prepare(`
        UPDATE downloads
        SET status = 'error', error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      this.statements.getDownload = this.db.prepare('SELECT * FROM downloads WHERE id = ?');

      this.statements.getAllDownloads = this.db.prepare(`
        SELECT * FROM downloads
        ORDER BY updated_at DESC
        LIMIT 100
      `);

      this.statements.cleanup = this.db.prepare(`
        DELETE FROM downloads
        WHERE status IN ('completed', 'error')
        AND updated_at < datetime('now', '-7 days')
      `);

      this.statements.deleteDownload = this.db.prepare('DELETE FROM downloads WHERE id = ?');
      this.statements.deleteAllDownloads = this.db.prepare('DELETE FROM downloads');

      this.statements.updateDownload = this.db.prepare(`
        UPDATE downloads
        SET connection_id = ?, server_info = ?, file_name = ?, file_path = ?,
            remote_path = ?, progress = ?, total_size = ?, chunk_size = ?,
            status = ?, error = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      this.statements.insertDownload = this.db.prepare(`
        INSERT INTO downloads (
          id, connection_id, server_info, file_name, file_path, remote_path,
          progress, total_size, chunk_size, status, error, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `);

      this.statements.markInterrupted = this.db.prepare(`
        UPDATE downloads
        SET status = 'interrupted', error = '下载意外中断', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);

      this.statements.markAllInterrupted = this.db.prepare(`
        UPDATE downloads
        SET status = 'interrupted', error = '下载意外中断', updated_at = CURRENT_TIMESTAMP
        WHERE status = 'downloading'
      `);

      // 程序启动时，将所有 downloading 状态的下载标记为中断
      this.statements.markAllInterrupted.run();

    } catch (error) {
      console.error('初始化下载管理器失败:', error);
    }
  }

  // 创建新的下载记录
  createDownload(data) {
    try {
      const result = this.statements.createDownload.run(
        data.downloadId,
        data.connectionId,
        data.serverInfo,
        data.fileName,
        data.filePath,
        data.remotePath,
        data.total,
        'downloading',
        null,  // error
        0      // chunk_size
      );

      return result;
    } catch (error) {
      console.error('创建下载记录失败:', error);
      throw error;
    }
  }

  // 更新下载进度
  updateProgress(downloadId, progress, chunk) {
    try {
      const result = this.statements.updateProgress.run(progress, chunk, progress, downloadId);

      // 通知渲染进程
      this._notifyProgressUpdate(downloadId, progress);

      return result;
    } catch (error) {
      console.error('更新下载进度失败:', error);
      throw error;
    }
  }

  // 标记下载错误
  markError(downloadId, error) {
    try {
      this.statements.markError.run(error, downloadId);
    } catch (err) {
      console.error('标记下载错误失败:', err);
    }
  }

  // 获取下载记录
  getDownload(downloadId) {
    try {
      return this.statements.getDownload.get(downloadId);
    } catch (error) {
      console.error('获取下载记录失败:', error);
      throw error;
    }
  }

  // 获取所有下载记录
  getAllDownloads() {
    try {
      return this.statements.getAllDownloads.all();
    } catch (error) {
      console.error('获取下载记录失败:', error);
      return [];
    }
  }

  // 清理旧的下载记录
  cleanup() {
    try {
      this.statements.cleanup.run();
    } catch (error) {
      console.error('清理下载记录失败:', error);
    }
  }
  //删除指定id的下载记录
  deleteDownload(downloadId) {
    this.statements.deleteDownload.run(downloadId);
  }
  //删除所有下载记录
  deleteAllDownloads() {
    this.statements.deleteAllDownloads.run();
  }

  // 通知渲染进程进度更新
  _notifyProgressUpdate(downloadId, progress) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach((win) => {
      if (!win.isDestroyed()) {
        const download = this.getDownload(downloadId);
        if (download) {
          win.webContents.send('download-updated', {
            id: download.id,
            progress: download.progress,
            total_size: download.total_size,
            status: download.status,
            file_name: download.file_name,
            file_path: download.file_path,
            error: download.error,
            updated_at: download.updated_at
          });
        }
      }
    });
  }

  /**
   * 更新或新增下载记录
   * @param {Object} data 下载数据
   * @returns {Object} 返回更新后的记录
   */
  updateOrCreate(data) {
    // 使用 better-sqlite3 的事务方法
    const transaction = this.db.transaction(() => {
      // 尝试更新现有记录
      const result = this.statements.updateDownload.run(
        data.connectionId,
        data.serverInfo,
        data.fileName,
        data.filePath,
        data.remotePath,
        data.progress,
        data.total,
        data.chunk || 0,
        data.status || (data.progress >= 100 ? 'completed' : 'downloading'),
        data.error || null,
        data.downloadId
      );

      // 如果没有更新任何记录，则插入新记录
      if (result.changes === 0) {
        this.statements.insertDownload.run(
          data.downloadId,
          data.connectionId,
          data.serverInfo,
          data.fileName,
          data.filePath,
          data.remotePath,
          data.progress || 0,
          data.total,
          data.chunk || 0,
          data.status || 'downloading',
          data.error || null
        );
      }

      // 获取更新后的记录
      return this.getDownload(data.downloadId);
    });

    try {
      const updatedRecord = transaction();

      // 如果是进度更新，通知渲染进程
      if (typeof data.progress === 'number') {
        this._notifyProgressUpdate(data.downloadId, data.progress);
      }

      return updatedRecord;
    } catch (error) {
      console.error('更新/创建下载记录失败:', error);
      throw error;
    }
  }

  /**
   * 批量更新或创建下载记录
   * @param {Array<Object>} records 下载记录数组
   * @returns {Array} 返回更新后的记录数组
   */
  batchUpdateOrCreate(records) {
    const transaction = this.db.transaction(() => {
      const results = [];
      for (const data of records) {
        const result = this.updateOrCreate(data);
        results.push(result);
      }
      return results;
    });

    try {
      return transaction();
    } catch (error) {
      console.error('批量更新/创建下载记录失败:', error);
      throw error;
    }
  }

  // 标记下载中断
  markInterrupted(downloadId) {
    try {
      this.statements.markInterrupted.run(downloadId);
    } catch (err) {
      console.error('[DownloadManager] 标记下载中断失败:', err);
    }
  }

  // 在应用退出时标记所有进行中的下载为中断
  markAllDownloadsInterrupted() {
    try {
      this.statements.markAllInterrupted.run();
    } catch (error) {
      console.error('[DownloadManager] 标记所有下载中断失败:', error);
    }
  }
}

export default new DownloadManager(); 