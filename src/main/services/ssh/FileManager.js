import SSHConnectionManager from './SSHConnectionManager';
import DownloadManager from '../SQLite/DownloadManager';
import SettingsManager from '../SQLite/SettingsManager';
import path from 'path';

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
    try {
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      const results = [];
      const searchStartTime = Date.now();

      await this._searchInDirectory(sftp, startPath, keyword, {
        caseSensitive: options.caseSensitive || false,
        recursive: options.recursive !== false,
        maxResults: options.maxResults || 1000,
        maxDepth: options.maxDepth || 10,
        currentDepth: 0,
        results,
        searchStartTime
      });

      return results;
    } catch (error) {
      // 如果是超时错误，直接返回已找到的结果
      if (error.message?.includes('搜索超时')) {
        console.warn('搜索已超时，返回部分结果');
        return error.partialResults || [];
      }
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

    // 检查是否超时
    if (Date.now() - searchStartTime > 30000) {
      const error = new Error('搜索超时（30秒），请缩小搜索范围或指定更具体的目录');
      error.partialResults = results; // 保存已找到的结果
      throw error;
    }

    // 检查是否达到最大深度
    if (currentDepth > maxDepth) {
      console.warn(`达到最大深度（${maxDepth}层），停止搜索当前目录: ${path}`);
      return;
    }
    
    // 检查是否达到最大结果数
    if (results.length >= maxResults) {
      console.warn(`达到最大结果数（${maxResults}条），停止搜索`);
      return;
    }

    try {
      const list = await new Promise((resolve, reject) => {
        sftp.readdir(path, (err, files) => {
          if (err) {
            // 忽略权限错误，继续搜索其他目录
            if (err.message.includes('Permission denied')) {
              console.warn(`无权限访问目录: ${path}`);
              resolve([]);
              return;
            }
            reject(err);
          } else {
            resolve(files);
          }
        });
      });

      // 处理当前目录的文件
      for (const item of list) {
        if (results.length >= maxResults) break;

        const itemPath = `${path}/${item.filename}`.replace(/\/+/g, '/');
        const itemName = caseSensitive ? item.filename : item.filename.toLowerCase();
        const searchPattern = caseSensitive ? keyword : keyword.toLowerCase();

        if (itemName.includes(searchPattern)) {
          results.push({
            name: item.filename,
            path: itemPath,
            size: item.attrs.size,
            modifiedTime: new Date(item.attrs.mtime * 1000).toLocaleString(),
            permissions: this._formatPermissions(item.attrs.mode),
            type: item.attrs.isDirectory() ? 'directory' : 'file'
          });
        }

        // 递归搜索子目录
        if (recursive && item.attrs.isDirectory()) {
          try {
            await this._searchInDirectory(sftp, itemPath, keyword, {
              ...options,
              currentDepth: currentDepth + 1
            });
          } catch (error) {
            // 如果是超时错误，立即停止整个搜索
            if (error.message?.includes('搜索超时')) {
              throw error;
            }
            // 其他错误继续搜索
            console.warn(`搜索目录 ${itemPath} 失败:`, error.message);
          }
        }
      }
    } catch (error) {
      // 如果是超时错误，向上传递
      if (error.message?.includes('搜索超时')) {
        throw error;
      }
      console.warn(`搜索目录 ${path} 失败:`, error.message);
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

      // 获取默认下载路径
      const defaultDownloadPath = await SettingsManager.getDownloadPath();
      console.log('[FileManager] 获取到的默认下载路径:', defaultDownloadPath);
      const defaultFilePath = defaultDownloadPath ? path.join(defaultDownloadPath, fileName) : fileName;
      console.log('[FileManager] 组合后的文件路径:', defaultFilePath);

      const result = await dialog.showSaveDialog({
        defaultPath: defaultFilePath,
        filters: [{ name: 'All Files', extensions: ['*'] }]
      });

      // 检查用户是否取消了保存对话框
      if (result.canceled) {
        console.log('[FileManager] 用户取消了保存对话框');
        return null; // 返回 null 而不是抛出错误
      }

      const filePath = result.filePath;
      if (!filePath) {
        console.log('[FileManager] 未获取到有效的文件路径');
        return null;
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
                //console.log(`下载进度: ${percent}%`);

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
      console.error('[FileManager] 文件下载失败:', error);
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