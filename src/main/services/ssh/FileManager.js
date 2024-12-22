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
      // 构建 find 命令，添加权限检查
      let findCommand = `find "${startPath}" -readable`; // 只搜索可读文件
      
      // 添加搜索选项
      if (!options.caseSensitive) {
        findCommand += ` -iname "*${keyword}*"`;  // -iname 忽略大小写
      } else {
        findCommand += ` -name "*${keyword}*"`;
      }
      
      // 限制搜索深度
      if (options.maxDepth) {
        findCommand += ` -maxdepth ${options.maxDepth}`;
      }

      // 排除一些系统目录
      findCommand += ` -not -path "/sys/*" -not -path "/proc/*" -not -path "/dev/*"`;

      // 设置超时
      findCommand = `timeout 30s ${findCommand} 2>/dev/null`; // 忽略错误输出
      
      // 执行命令
      const result = await SSHConnectionManager.execCommand(connectionId, findCommand);
      const files = result.split('\n').filter(Boolean);
      
      // 获取文件详细信息
      const fileDetails = await Promise.all(files.slice(0, options.maxResults || 1000).map(async (filePath) => {
        try {
          // 使用 stat 命令获取文件信息，添加错误处理
          const statCommand = `stat -c '%s %Y %a %F' "${filePath}" 2>/dev/null`;
          const statResult = await SSHConnectionManager.execCommand(connectionId, statCommand);
          
          if (!statResult) {
            console.warn(`无法获取文件信息: ${filePath}`);
            return null;
          }

          const [size, mtime, permissions, type] = statResult.split(' ');
          const name = filePath.split('/').pop();
          
          return {
            name,
            path: filePath,
            parentPath: filePath.substring(0, filePath.lastIndexOf('/')),
            size: parseInt(size),
            modifiedTime: new Date(parseInt(mtime) * 1000).toLocaleString(),
            permissions: this._formatPermissions(parseInt(permissions, 8)),
            type: type.toLowerCase().includes('directory') ? 'directory' : 'file'
          };
        } catch (error) {
          // 静默跳过无法访问的文件
          return null;
        }
      }));

      const validResults = fileDetails.filter(Boolean);
      
      if (validResults.length === 0) {
        console.log('未找到匹配的文件或目录');
      } else {
        console.log(`找到 ${validResults.length} 个匹配项`);
      }

      return validResults;
    } catch (error) {
      if (error.message?.includes('timeout')) {
        console.warn('搜索超时，返回部分结果');
        return [];
      }
      console.error('文件搜索失败:', error);
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
        throw new Error('不是一个文��');
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