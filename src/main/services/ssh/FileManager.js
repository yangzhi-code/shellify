import SSHConnectionManager from './SSHConnectionManager';
import DownloadManager from '../SQLite/DownloadManager';

class FileManager {
  /**
   * 获取文件列表
   * @param {string} connectionId - SSH连接ID
   * @param {string} path - 目录路径，默认为用户目录
   */
  async listFiles(connectionId, path = '~') {
    try {
      // 获取 SFTP 会话
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      
      // 获取实际路径
      const actualPath = await this._getActualPath(connectionId, path);
      
      return new Promise((resolve, reject) => {
        sftp.readdir(actualPath, (err, list) => {
          if (err) reject(err);
          else {
            resolve(this._formatFileList(list, actualPath));
          }
        });
      });
    } catch (error) {
      console.error('文件列表获取失败:', error);
      throw error;
    }
  }

  /**
   * 获取实际路径（解析 ~ 等）
   * @private
   */
  async _getActualPath(connectionId, path) {
    if (path === '/') return '/';
    if (path !== '~') return path;
    
    // 使用新的命令执行方法
    const homeDir = await SSHConnectionManager.execCommand(connectionId, 'pwd');
    return homeDir;
  }

  /**
   * 格式化文件列表
   * @private
   */
  _formatFileList(list, basePath) {
    return list.map(item => ({
      name: item.filename,
      size: item.attrs.size,
      modifiedTime: new Date(item.attrs.mtime * 1000).toLocaleString(),
      permissions: this._formatPermissions(item.attrs.mode),
      type: item.attrs.isDirectory() ? 'directory' : 'file',
      path: `${basePath}/${item.filename}`.replace(/\/+/g, '/')
    }));
  }

  /**
   * 格式化权限字符串
   * @private
   */
  _formatPermissions(mode) {
    const perms = [];
    // 用户权限
    perms.push((mode & 0o400) ? 'r' : '-');
    perms.push((mode & 0o200) ? 'w' : '-');
    perms.push((mode & 0o100) ? 'x' : '-');
    // 组权限
    perms.push((mode & 0o40) ? 'r' : '-');
    perms.push((mode & 0o20) ? 'w' : '-');
    perms.push((mode & 0o10) ? 'x' : '-');
    // 其他用户权限
    perms.push((mode & 0o4) ? 'r' : '-');
    perms.push((mode & 0o2) ? 'w' : '-');
    perms.push((mode & 0o1) ? 'x' : '-');
    return perms.join('');
  }

  /**
   * 搜索文件和目录
   * @param {string} connectionId - SSH连接ID
   * @param {string} startPath - 搜索起始路径
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   */
  async searchFiles(connectionId, startPath, keyword, options = {}) {
    console.log('开始搜索:', { 
      startPath,  // 记录搜索起始路径
      keyword, 
      options 
    });

    const {
      caseSensitive = false,
      recursive = true,
      maxResults = 1000,
      maxDepth = 10
    } = options;

    try {
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      const results = [];
      const searchStartTime = Date.now();
      
      console.log(`获取到SFTP会话，从 ${startPath} 开始递归搜索`);

      await this._searchInDirectory(sftp, startPath, keyword, {
        ...options,
        maxResults,
        maxDepth,
        currentDepth: 0,
        results,
        searchStartTime
      });
      
      console.log('搜索完成，找到结果数:', results.length);
      return results;
    } catch (error) {
      console.error('文件搜索失败:', error);
      throw error;
    }
  }

  /**
   * 在指定目录中搜索
   * @private
   */
  async _searchInDirectory(sftp, path, keyword, options) {
    const {
      caseSensitive,
      recursive,
      maxResults,
      maxDepth,
      currentDepth,
      results,
      searchStartTime
    } = options;

    console.log(`搜索目录: ${path}, 当前深度: ${currentDepth}`);

    // 检查是否达到最大深度或结果数
    if (currentDepth > maxDepth) {
      throw new Error(`达到最大深度（${maxDepth}层），停止搜索`);
    }
    
    if (results.length >= maxResults) {
      throw new Error(`达到最大结果数（${maxResults}条），停止搜索`);
    }

    // 检查搜索是否超时（30秒）
    if (Date.now() - searchStartTime > 30000) {
      throw new Error('搜索超时（30秒），请缩小搜索范围');
    }

    const searchPattern = caseSensitive ? keyword : keyword.toLowerCase();

    try {
      const list = await new Promise((resolve, reject) => {
        sftp.readdir(path, (err, files) => {
          if (err) {
            console.error(`读取目录失败: ${path}`, err);
            reject(err);
          } else {
            console.log(`成功读取目录: ${path}, 文件数: ${files.length}`);
            resolve(files);
          }
        });
      });

      for (const item of list) {
        if (results.length >= maxResults) {
          console.log('达到最大结果数，停止搜索');
          break;
        }

        const itemPath = `${path}/${item.filename}`.replace(/\/+/g, '/');
        const itemName = caseSensitive ? item.filename : item.filename.toLowerCase();

        if (itemName.includes(searchPattern)) {
          console.log('找到匹配项:', itemPath);
          results.push({
            name: item.filename,
            path: itemPath,
            size: item.attrs.size,
            modifiedTime: new Date(item.attrs.mtime * 1000).toLocaleString(),
            permissions: this._formatPermissions(item.attrs.mode),
            type: item.attrs.isDirectory() ? 'directory' : 'file'
          });
        }

        if (recursive && item.attrs.isDirectory()) {
          await this._searchInDirectory(sftp, itemPath, keyword, {
            ...options,
            currentDepth: currentDepth + 1
          });
        }
      }
    } catch (error) {
      console.error(`搜索目录 ${path} 失败:`, error);
      if (error.message.includes('Permission denied')) {
        throw new Error('部分目录无访问权限，搜索中断');
      }
      throw error;
    }
  }

  /**
   * 下载文件
   * @param {string} connectionId - SSH连接ID
   * @param {string} remotePath - 远程文件路径
   * @param {string} fileName - 文件名
   */
  async downloadFile(connectionId, remotePath, fileName) {
    try {
      await this._ensureConnection(connectionId);
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      const { dialog } = require('electron');
      
      const stats = await new Promise((resolve, reject) => {
        sftp.stat(remotePath, (err, stats) => {
          if (err) reject(err);
          else resolve(stats);
        });
      });

      if (!stats.isFile()) {
        throw new Error('不是一个文件');
      }

      const totalSize = stats.size;

      const { filePath, canceled } = await dialog.showSaveDialog({
        defaultPath: fileName,
        filters: [{ name: 'All Files', extensions: ['*'] }]
      });

      if (canceled || !filePath) {
        throw new Error('用户取消下载');
      }

      return new Promise((resolve, reject) => {
        const downloadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        let lastProgress = -1;

        try {
          sftp.fastGet(remotePath, filePath, {
            step: async (transferred, chunk, total) => {
              const percent = Math.round((transferred / total) * 100);
              
              // 只在进度变化时更新
              if (percent !== lastProgress) {
                lastProgress = percent;
                console.log(`下载进度: ${percent}%`);

                await DownloadManager.updateOrCreate({
                  downloadId,
                  connectionId,
                  fileName,
                  filePath,
                  remotePath,
                  progress: percent,
                  total: totalSize,
                  chunk,
                  status: percent === 100 ? 'completed' : 'downloading'
                });
              }
            },
            concurrency: 1,
            mode: 0o644
          }, async (err) => {
            if (err) {
              console.error('文件传输失败:', err);
              await DownloadManager.updateOrCreate({
                downloadId,
                connectionId,
                fileName,
                filePath,
                remotePath,
                progress: lastProgress,
                total: totalSize,
                status: 'error',
                error: err.message
              });
              reject(new Error(`文件传输失败: ${err.message}`));
            } else {
              console.log('文件下载完成');
              resolve(filePath);
            }
          });

          sftp.once('error', async (err) => {
            await DownloadManager.updateOrCreate({
              downloadId,
              connectionId,
              fileName,
              filePath,
              remotePath,
              progress: lastProgress,
              total: totalSize,
              status: 'error',
              error: err.message
            });
            reject(new Error(`SFTP错误: ${err.message}`));
          });

        } catch (err) {
          reject(new Error(`启动下载失败: ${err.message}`));
        }
      });
    } catch (error) {
      console.error('文件下载失败:', error);
      throw error;
    }
  }

  /**
   * 确保连接可用
   * @private
   */
  async _ensureConnection(connectionId) {
    try {
      // 检查连接是否存在并且可用
      if (!SSHConnectionManager.isConnected(connectionId)) {
        console.log('连接已断开，尝试重连...');
        await SSHConnectionManager.reconnect(connectionId);
      }
    } catch (error) {
      console.error('确保连接可用失败:', error);
      throw new Error(`连接检查失败: ${error.message}`);
    }
  }
}

export default new FileManager(); 