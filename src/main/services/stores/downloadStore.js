/**
 * 动态导入 electron-store
 * 使用动态导入避免启动时的同步加载
 */
let Store;
(async () => {
  Store = (await import('electron-store')).default;
})();

/**
 * 下载管理器存储类
 * 负责管理所有下载任务的状态和进度
 * 实现了单例模式和并发控制
 */
class DownloadStore {
  constructor() {
    /** @private 存储实例 */
    this.store = null;
    /** @private 存储键名 */
    this.key = 'downloads';
    /** @private 锁状态标志 */
    this._lock = false;
    /** @private 等待队列 - 存储 {resolve, reject, timer} 对象 */
    this._queue = [];
    /** @private 缓存的下载记录 */
    this._cachedDownloads = null;
    /** @private 缓存过期时间 */
    this._cacheExpireTime = 0;
    /** @private 缓存有效期（毫秒） */
    this._cacheDuration = 1000; // 1秒缓存
    /** @private 记录当前持有锁的操作ID */
    this._currentLockId = null;
    /** @private 操作计数器 */
    this._operationCounter = 0;
    /** @private 锁超时时间（毫秒） */
    this._lockTimeout = 5000; // 5秒超时
    /** @private 最后活动时间 */
    this._lastActivityTime = Date.now();
  }

  /**
   * 生成操作ID
   * @private
   * @returns {string}
   */
  _generateOperationId() {
    return `op_${++this._operationCounter}_${Date.now()}`;
  }

  /**
   * 检查锁是否超时
   * @private
   * @returns {boolean}
   */
  _isLockTimedOut() {
    return this._lock && 
           (Date.now() - this._lastActivityTime) > this._lockTimeout;
  }

  /**
   * 清理队列中的超时项
   * @private
   */
  _cleanupQueue() {
    this._queue = this._queue.filter(item => {
      if (item.timer) {
        clearTimeout(item.timer);
      }
      return true;
    });
  }

  /**
   * 获取锁，实现并发控制
   * @private
   * @returns {Promise<void>}
   */
  async _acquireLock() {
    const operationId = this._generateOperationId();
    console.log(`[Lock] 操作 ${operationId} 请求获取锁`);
    
    // 检查是否需要强制释放锁
    if (this._isLockTimedOut()) {
      console.warn(`[Lock] 检测到锁超时`);
      this._forceLockRelease();
    }
    
    if (this._lock) {
      console.log(`[Lock] 操作 ${operationId} 等待锁释放，当前持有锁的操作: ${this._currentLockId}`);
      
      try {
        await new Promise((resolve, reject) => {
          // 创建超时定时器
          const timer = setTimeout(() => {
            // 从队列中移除这个项
            const index = this._queue.findIndex(item => item.timer === timer);
            if (index !== -1) {
              this._queue.splice(index, 1);
            }
            reject(new Error(`操作 ${operationId} 等待锁超时`));
          }, this._lockTimeout);

          // 将 resolve, reject 和 timer 都存入队列
          this._queue.push({
            resolve: () => {
              clearTimeout(timer);
              resolve();
            },
            reject: (error) => {
              clearTimeout(timer);
              reject(error);
            },
            timer,
            operationId
          });
        });
      } catch (error) {
        console.warn(`[Lock] 操作 ${operationId} 等待超时，强制释放锁`);
        this._forceLockRelease();
        throw error;
      }
    }
    
    this._lock = true;
    this._currentLockId = operationId;
    this._lastActivityTime = Date.now();
    console.log(`[Lock] 操作 ${operationId} 获得锁`);
  }

  /**
   * 释放锁，并触发队列中的下一个操作
   * @private
   */
  _releaseLock() {
    const releasingOperationId = this._currentLockId;
    console.log(`[Lock] 操作 ${releasingOperationId} 准备释放锁`);
    
    this._lock = false;
    this._currentLockId = null;
    this._lastActivityTime = Date.now();
    
    // 清理队列中的超时项
    this._cleanupQueue();
    
    // 获取并移除队列中的第一个等待项
    const next = this._queue.shift();
    if (next) {
      console.log(`[Lock] 操作 ${releasingOperationId} 释放锁，触发队列中的操作 ${next.operationId}`);
      next.resolve();
    } else {
      console.log(`[Lock] 操作 ${releasingOperationId} 释放锁，队列为空`);
    }
  }

  /**
   * 强制释放锁
   * @private
   */
  _forceLockRelease() {
    console.warn(`[Lock] 强制释放锁: ${this._currentLockId}, 已锁定时间: ${Date.now() - this._lastActivityTime}ms`);
    
    this._lock = false;
    this._currentLockId = null;
    this._lastActivityTime = Date.now();
    
    // 拒绝所有等待中的操作
    while (this._queue.length > 0) {
      const item = this._queue.shift();
      if (item.timer) {
        clearTimeout(item.timer);
      }
      item.reject(new Error('锁被强制释放'));
    }
  }

  /**
   * 包装异步操作，确保操作的原子性
   * @private
   * @param {Function} operation - 要执行的异步操作
   * @returns {Promise<any>}
   */
  async _withLock(operation) {
    let error = null;
    try {
      await this._acquireLock();
      const operationId = this._currentLockId;
      
      console.log(`[Lock] 操作 ${operationId} 开始执行`);
      const result = await operation();
      console.log(`[Lock] 操作 ${operationId} 执行完成`);
      return result;
    } catch (e) {
      error = e;
      console.error(`[Lock] 操作执行失败:`, e);
      throw e;
    } finally {
      if (this._lock && this._currentLockId) {
        this._releaseLock();
      }
      
      if (error) {
        // 确保错误时清理所有状态
        this._forceLockRelease();
      }
    }
  }

  /**
   * 获取当前锁状态信息
   * @returns {Object} 锁状态信息
   */
  getLockStatus() {
    return {
      isLocked: this._lock,
      currentOperation: this._currentLockId,
      queueLength: this._queue.length,
      operationCount: this._operationCounter
    };
  }

  /**
   * 初始化存储实例
   * @private
   */
  async init() {
    if (!Store) {
      Store = (await import('electron-store')).default;
    }
    if (!this.store) {
      this.store = new Store({
        name: 'downloads', // 指定存储文件名
        // 添加数据结构校验
        schema: {
          downloads: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                downloadId: { type: 'string' },
                fileName: { type: 'string' },
                status: { type: 'string' },
                progress: { type: 'number' },
                // ... 其他属性定义
              },
              required: ['downloadId', 'fileName']
            }
          }
        }
      });
      
      // 确保数据结构正确
      if (!Array.isArray(this.store.get(this.key))) {
        this.store.set(this.key, []);
      }
    }
  }

  /**
   * 获���所有下载记录（带缓存）
   * @returns {Promise<Array>}
   */
  async getAllDownloads() {
    return this._withLock(async () => {
      await this.init();
      
      // 检查缓存是否有效
      const now = Date.now();
      if (this._cachedDownloads && now < this._cacheExpireTime) {
        return this._cachedDownloads;
      }

      // 获取并缓存数据
      const downloads = this.store.get(this.key, []);
      this._cachedDownloads = Array.isArray(downloads) ? downloads : [];
      this._cacheExpireTime = now + this._cacheDuration;
      
      return this._cachedDownloads;
    });
  }

  /**
   * 获取指定下载任务的进度
   * @param {string} downloadId - 下载任务ID
   * @returns {Promise<Object|null>}
   */
  async getDownloadProgress(downloadId) {
    return this._withLock(async () => {
      await this.init();
      const downloads = await this.getAllDownloads();
      return downloads.find(d => d.downloadId === downloadId) || null;
    });
  }

  /**
   * 更新下载进度
   * @param {string} downloadId - 下载任务ID
   * @param {number} progress - 进度百分比
   * @param {Object} oldDownload - 原下载记录
   * @returns {Promise<Object|null>}
   */
  async updateDownloadProgress(downloadId, progress) {
    return this._withLock(async () => {
      await this.init();
      const downloads = await this.getAllDownloads();
      const index = downloads.findIndex(d => d.downloadId === downloadId);
      
      if (index !== -1) {
        const updatedDownload = {
          ...downloads[index],
          progress,
          lastUpdated: new Date().toISOString(),
          status: progress === 100 ? 'completed' : 'downloading',
          completedTime: progress === 100 ? new Date().toISOString() : null
        };
        
        downloads[index] = updatedDownload;
        this.store.set(this.key, downloads);
        this._invalidateCache();
        this._notifyUpdate(updatedDownload);
        
        return updatedDownload;
      }
      return null;
    });
  }

  /**
   * 保存新的下载记录
   * @param {Object} download - 下载任务信息
   * @returns {Promise<Object>}
   */
  async saveDownload(download) {
    return this._withLock(async () => {
      await this.init();
      const downloads = await this.getAllDownloads();
      
      // 检查重复下载
      const existingIndex = downloads.findIndex(d => 
        d.downloadId === download.downloadId
      );

      let savedDownload;
      if (existingIndex !== -1) {
        // 更新现有记录
        savedDownload = {
          ...downloads[existingIndex],
          ...download,
          lastUpdated: new Date().toISOString()
        };
        downloads[existingIndex] = savedDownload;
      } else {
        // 添加新记录
        savedDownload = {
          ...download,
          status: 'downloading',
          progress: 0,
          startTime: new Date().toISOString(),
          lastUpdated: new Date().toISOString()
        };
        downloads.unshift(savedDownload);
      }
      
      this.store.set(this.key, downloads);
      this._invalidateCache();
      this._notifyUpdate(savedDownload);
      
      return savedDownload;
    });
  }

  /**
   * 删除下载记录
   * @param {string} downloadId - 下载任务ID
   * @returns {Promise<Array>}
   */
  async deleteDownload(downloadId) {
    return this._withLock(async () => {
      await this.init();
      const downloads = await this.getAllDownloads();
      const index = downloads.findIndex(d => d.downloadId === downloadId);
      
      if (index !== -1) {
        downloads.splice(index, 1);
        this.store.set(this.key, downloads);
        this._invalidateCache();
      }
      
      return downloads;
    });
  }

  /**
   * 清空所有下载记录
   * @returns {Promise<Array>}
   */
  async clearDownloads() {
    return this._withLock(async () => {
      await this.init();
      this.store.set(this.key, []);
      this._invalidateCache();
      return [];
    });
  }

  /**
   * 使缓存失效
   * @private
   */
  _invalidateCache() {
    this._cachedDownloads = null;
    this._cacheExpireTime = 0;
  }

  /**
   * 通知渲染进程更新
   * @private
   * @param {Object} download - 更新的下载记录
   */
  _notifyUpdate(download) {
    if (this._notifyTimeout) {
      clearTimeout(this._notifyTimeout);
    }
    
    const operationId = this._currentLockId;
    this._notifyTimeout = setTimeout(() => {
      console.log(`[Notify] 操作 ${operationId} 发送下载更新通知:`, {
        downloadId: download.downloadId,
        progress: download.progress,
        status: download.status
      });
      
      const { BrowserWindow } = require('electron');
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(win => {
        if (!win.isDestroyed()) {
          win.webContents.send('download-updated', download);
        }
      });
    }, 100);
  }

  /**
   * 更新或新增下载记录
   * @param {Object} download - 下载记录数据
   * @param {string} download.downloadId - 下载任务ID
   * @param {string} download.fileName - 文件名
   * @param {string} download.filePath - 文件路径
   * @param {string} download.remotePath - 远程路径
   * @param {number} download.progress - 下载进度
   * @param {number} download.total - 文件总大小
   * @param {string} download.status - 下载状态
   * @returns {Promise<Object>} 返回更新或新增后的记录
   */
  async updateOrCreate(download) {
    return this._withLock(async () => {
      const operationId = this._currentLockId;
      console.log(`[Store] 操作 ${operationId} 开始更新/创建下载记录:`, download.downloadId);
      
      await this.init();
      const downloads = await this.getAllDownloads();
      
      const existingIndex = downloads.findIndex(d => d.downloadId === download.downloadId);
      console.log(`[Store] 操作 ${operationId} 查找结果: ${existingIndex !== -1 ? '找到现有记录' : '未找到记录'}`);
      
      let updatedDownload;
      const now = new Date().toISOString();

      if (existingIndex !== -1) {
        // 更新现有记录
        updatedDownload = {
          ...downloads[existingIndex],  // 保留原有数据
          ...download,                  // 使用新数据覆盖
          lastUpdated: now,            // 更新时间戳
          // 如果进度为100，自动设置完成状态和时间
          ...(download.progress === 100 ? {
            status: 'completed',
            completedTime: now
          } : {})
        };
        downloads[existingIndex] = updatedDownload;
      } else {
        // 创建新记录
        updatedDownload = {
          ...download,
          status: download.status || 'downloading',
          progress: download.progress || 0,
          startTime: now,
          lastUpdated: now,
          completedTime: null
        };
        downloads.unshift(updatedDownload);  // 添加到列表开头
      }

      // 保存到存储
      this.store.set(this.key, downloads);
      
      // 更新缓存和通知
      this._invalidateCache();
      this._notifyUpdate(updatedDownload);

      console.log(`[Store] 操作 ${operationId} 完成更新/创建下载记录`);
      return updatedDownload;
    });
  }

  /**
   * 检查下载记录是否存在
   * @param {string} downloadId - 下载任务ID
   * @returns {Promise<boolean>}
   */
  async exists(downloadId) {
    return this._withLock(async () => {
      await this.init();
      const downloads = await this.getAllDownloads();
      return downloads.some(d => d.downloadId === downloadId);
    });
  }
}

// 导出单例实例
export default new DownloadStore();
