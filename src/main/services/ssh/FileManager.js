import SSHConnectionManager from './SSHConnectionManager';
import DownloadManager from '../SQLite/DownloadManager';
import SettingsManager from '../SQLite/SettingsManager';
import path from 'path';
import { join } from 'path';
import FileOperations from './FileOperations';
import fs from 'fs';
import UploadManager from '../SQLite/UploadManager';

class FileManager {
  constructor() {
    // 记录每个下载任务使用的独立 SFTP 会话
    this.activeDownloads = new Map();
  }

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
      const client = SSHConnectionManager.getClient(connectionId);
      const sftp = await new Promise((resolve, reject) => {
        client.sftp((err, sftpSession) => {
          if (err) reject(err);
          else resolve(sftpSession);
        });
      });
      const { dialog } = require('electron');
      
      // 获取文件信息
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
      //根据连接id获取连接信息
      const connectionInfo_json = await SSHConnectionManager.getConnectionInfo(connectionId);
      const connectionInfo = JSON.stringify(connectionInfo_json);
      
      console.log('[FileManager] 获取到的连接信息:', connectionInfo);

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
        let finished = false;

        // 记录当前下载的独立 SFTP，会用于取消
        this.activeDownloads.set(downloadId, { sftp, cancelled: false });

        const handleError = async (err) => {
          if (finished) return;
          finished = true;
          this.activeDownloads.delete(downloadId);
          try {
            sftp.end();
          } catch (e) {
            // ignore end error
          }

          const isCancelled = err && err.message === '用户取消下载';
          const status = isCancelled ? 'interrupted' : 'error';
          const message = isCancelled ? '用户取消下载' : (err?.message || '下载失败');

          await DownloadManager.updateOrCreate({
            downloadId,
            connectionId,
            serverInfo: connectionInfo,
            fileName,
            filePath,
            remotePath,
            progress: lastProgress,
            total: totalSize,
            status,
            error: message
          });
          reject(new Error(message));
        };

        try {
          sftp.fastGet(remotePath, filePath, {
            step: async (transferred, chunk, total) => {
              const percent = Math.round((transferred / total) * 100);
              
              // 只在进度变化时更新
              if (percent !== lastProgress) {
                lastProgress = percent;
                
                await DownloadManager.updateOrCreate({
                  downloadId,
                  connectionId,
                  serverInfo: connectionInfo,
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
            if (finished) return;
            finished = true;
            this.activeDownloads.delete(downloadId);
            try {
              sftp.end();
            } catch (e) {
              // ignore
            }

            if (err) {
              await handleError(err);
            } else {
              console.log('文件下载完成');
              resolve(filePath);
            }
          });

          sftp.once('error', (err) => {
            handleError(err);
          });

        } catch (err) {
          handleError(err);
        }
      });
    } catch (error) {
      console.error('[FileManager] 文件下载失败:', error);
      throw error;
    }
  }

  //重试下载
  async retryDownload(record) {
    console.log('[FileManager] 重试下载:', record);
    try {
      // 从数据库获取完整的下载记录
      const fullRecord = await DownloadManager.getDownload(record.id);
      if (!fullRecord) {
        throw new Error('找不到下载记录');
      }
      
      if (!fullRecord.server_info) {
        throw new Error('下载记录缺少服务器信息');
      }

      // 首先判断连接id是否还连接着，如果没有连接着，则先重连
      //根据连接信息重新连接
      const connectionInfo = await SSHConnectionManager.reconnect_info(JSON.parse(fullRecord.server_info).serverInfo);
      console.log('[FileManager] 文件下载重新连接服务器, connectionId:', connectionInfo.connectionId);
      
      // 重试下载,下载到原来的文件夹
      await this.downloadFileToPath(
        connectionInfo.connectionId, 
        fullRecord.remote_path, 
        fullRecord.file_name,
        fullRecord.file_path,
        fullRecord.id
      );
      
      return { success: true };
    } catch (error) {
      console.error('[FileManager] 重试下载失败:', error.message);
      throw error;
    }
  }

  /**
   * 直接下载文件到指定路径（不弹出保存对话框）
   * @param {string} connectionId - SSH连接ID
   * @param {string} remotePath - 远程文件路径
   * @param {string} fileName - 文件名
   * @param {string} targetPath - 目标保存路径
   */
  async downloadFileToPath(connectionId, remotePath, fileName, targetPath, downloadId) {
    try {
      await this._ensureConnection(connectionId);
      const client = SSHConnectionManager.getClient(connectionId);
      const sftp = await new Promise((resolve, reject) => {
        client.sftp((err, sftpSession) => {
          if (err) reject(err);
          else resolve(sftpSession);
        });
      });
      
      // 获取原有的下载记录
      const existingRecord = await DownloadManager.getDownload(downloadId);
      if (!existingRecord) {
        throw new Error('找不到下载记录');
      }
      
      // 设置超时标志
      let isTimeout = false;
      const timeout = setTimeout(() => {
        isTimeout = true;
        sftp.end();
      }, 30000); // 30秒超时

      // 先更新下载状态为 downloading
      await DownloadManager.updateOrCreate({
        downloadId,
        status: 'downloading',
        progress: 0,
        fileName,
        filePath: targetPath,
        remotePath,
        total: 0,  // 先设置为0，后面会更新
        chunk: 0,
        serverInfo: existingRecord.server_info  // 保留原有的服务器信息
      });

      // 检查目标路径是否存在同名文件
      const { dir: targetDir, name: baseName, ext } = path.parse(targetPath);
      let finalPath = targetPath;
      let counter = 1;
      
      while (fs.existsSync(finalPath)) {
        finalPath = path.join(targetDir, `${baseName} (${counter})${ext}`);
        counter++;
      }
      
      // 如果路径发生了变化，更新文件路径
      if (finalPath !== targetPath) {
        console.log('[FileManager] 检测到同名文件，新路径:', finalPath);
        targetPath = finalPath;
        await DownloadManager.updateOrCreate({
          downloadId,
          filePath: targetPath,
          serverInfo: existingRecord.server_info  // 保留原有的服务器信息
        });
      }
      
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
      // 更新文件大小
      await DownloadManager.updateOrCreate({
        downloadId,
        total: totalSize
      });

      const connectionInfo_json = await SSHConnectionManager.getConnectionInfo(connectionId);
      const connectionInfo = JSON.stringify(connectionInfo_json);
      
      console.log('[FileManager] 获取到的连接信息:', connectionInfo);
      console.log('[FileManager] 下载到路径:', targetPath);

      return new Promise((resolve, reject) => {
        let lastProgress = -1;
        let lastProgressTime = Date.now();
        let finished = false;

        // 记录当前下载的独立 SFTP，会用于取消
        this.activeDownloads.set(downloadId, { sftp, cancelled: false });

        const handleError = async (err) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          this.activeDownloads.delete(downloadId);
          try {
            sftp.end();
          } catch (e) {
            // ignore
          }

          const isCancelled = err && err.message === '用户取消下载';
          const status = isCancelled ? 'interrupted' : 'error';
          const message = isCancelled ? '用户取消下载' : (err?.message || '下载失败');

          await DownloadManager.updateOrCreate({
            downloadId,
            progress: lastProgress,
            status,
            error: message,
            serverInfo: existingRecord.server_info
          });
          reject(new Error(message));
        };

        try {
          sftp.fastGet(remotePath, targetPath, {
            step: async (transferred, chunk, total) => {
              const percent = Math.round((transferred / total) * 100);
              
              if (percent !== lastProgress) {
                lastProgress = percent;
                lastProgressTime = Date.now();
                
                await DownloadManager.updateOrCreate({
                  downloadId,
                  progress: percent,
                  chunk: chunk,
                  status: percent === 100 ? 'completed' : 'downloading',
                  fileName,
                  filePath: targetPath,
                  remotePath,
                  total: totalSize,
                  serverInfo: existingRecord.server_info
                });
              }
            },
            concurrency: 16,
            mode: 0o644
          }, async (err) => {
            if (finished) return;
            finished = true;
            clearTimeout(timeout);
            this.activeDownloads.delete(downloadId);
            try {
              sftp.end();
            } catch (e) {
              // ignore
            }

            if (err) {
              await handleError(err);
            } else {
              console.log('文件下载完成');
              resolve(targetPath);
            }
          });

          sftp.once('error', (err) => {
            handleError(err);
          });

          // 添加中断处理
          sftp.once('close', () => {
            if (finished) return;
            if (!isTimeout) {
              handleError(new Error('连接已关闭'));
            }
          });

        } catch (err) {
          handleError(err);
        }
      });
    } catch (error) {
      console.error('[FileManager] 文件下载失败:', error);
      // 确保更新错误状态
      await DownloadManager.updateOrCreate({
        downloadId,
        status: 'error',
        error: error.message
      });
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

  async createFolder(connectionId, path, folderName) {
    try {
      //console.log('[FileManager] 开始创建文件夹:', { connectionId, path, folderName });
      
      await this._ensureConnection(connectionId);
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      
      if (!sftp) {
        throw new Error('无法获取 SFTP 会话');
      }
      
      // 先获取当前用户名
      const whoami = await SSHConnectionManager.execCommand(connectionId, 'whoami');
      const isRoot = whoami.trim() === 'root';
      
      // 如果不是 root 用户，检查权限
      if (!isRoot) {
        try {
          await new Promise((resolve, reject) => {
            sftp.stat(path, (err, stats) => {
              if (err) {
                reject(new Error(`无法访问目标路径: ${err.message}`));
              } else if (!stats.isDirectory()) {
                reject(new Error('目标路径不是一个目录'));
              } else {
                const writePermission = stats.mode & 0o200;
                const groupWritePermission = stats.mode & 0o020;
                const otherWritePermission = stats.mode & 0o002;
                
                if (!writePermission && !groupWritePermission && !otherWritePermission) {
                  reject(new Error('当前用户没有此目录的写入权限'));
                }
                resolve();
              }
            });
          });
        } catch (error) {
          throw new Error(`无法在此位置创建文件夹: ${error.message}`);
        }
      }
      
      const fileOps = new FileOperations(sftp);
      await fileOps.createFolder(path, folderName);
      
      //console.log('[FileManager] 文件夹创建成功');
    } catch (error) {
      // 根据错误类型提供更友好的错误信息
      let errorMessage = error.message;
      if (error.message.includes('Permission denied')) {
        errorMessage = '权限不足，无法在此目录创建文件夹';
      } else if (error.message.includes('No such file')) {
        errorMessage = '目标路径不存在';
      }

      console.error('[FileManager] 创建文件夹失败:', {
        error: error,
        message: errorMessage,
        stack: error.stack
      });
      throw new Error(errorMessage);
    }
  }

  //上传文件
  async uploadFile(connectionId, localPath, remotePath) {
    try {
      await this._ensureConnection(connectionId);
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      
      const fileName = path.basename(localPath);
      const remoteFilePath = path.join(remotePath, fileName).replace(/\\/g, '/');
      
      // 获取文件大小
      const stats = await fs.promises.stat(localPath);
      const fileSize = stats.size;
      
      // 创建上传记录
      const uploadId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      let lastProgress = -1;
      
      return new Promise((resolve, reject) => {
        try {
          sftp.fastPut(localPath, remoteFilePath, {
            step: async (transferred, chunk, total) => {
              const percent = Math.round((transferred / total) * 100);
              
              if (percent !== lastProgress) {
                lastProgress = percent;
                
                await UploadManager.updateOrCreate({
                  uploadId,
                  connectionId,
                  fileName,
                  filePath: localPath,
                  remotePath: remoteFilePath,
                  progress: percent,
                  total: fileSize,
                  chunk,
                  status: percent === 100 ? 'completed' : 'uploading'
                });
              }
            },
            concurrency: 16,
            mode: 0o644
          }, async (err) => {
            if (err) {
              console.error('文件上传��败:', err);
              await UploadManager.updateOrCreate({
                uploadId,
                connectionId,
                fileName,
                filePath: localPath,
                remotePath: remoteFilePath,
                progress: lastProgress,
                total: fileSize,
                status: 'error',
                error: err.message
              });
              reject(new Error(`文件上传失败: ${err.message}`));
            } else {
              console.log('文件上传完成');
              resolve(remoteFilePath);
            }
          });
          
          sftp.once('error', async (err) => {
            await UploadManager.updateOrCreate({
              uploadId,
              connectionId,
              fileName,
              filePath: localPath,
              remotePath: remoteFilePath,
              progress: lastProgress,
              total: fileSize,
              status: 'error',
              error: err.message
            });
            reject(new Error(`SFTP错误: ${err.message}`));
          });
        } catch (err) {
          reject(new Error(`启动上传失败: ${err.message}`));
        }
      });

      // 上传完成后发送刷新事件
      if (global.mainWindow) {
        global.mainWindow.webContents.send('file:refresh-needed', remotePath)
      }

      return remoteFilePath
    } catch (error) {
      console.error('[FileManager] 文件上传失败:', error)
      throw error
    }
  }
  //读取文件
  async readFile(connectionId, remotePath) {
    try {
      // 确保有连接
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId)
      if (!sftp) {
        throw new Error('SFTP 会话未建立')
      }

      // 读取文件
      const content = await new Promise((resolve, reject) => {
        sftp.readFile(remotePath, (err, data) => {
          if (err) {
            reject(err)
          } else {
            // 尝试检测编码
            let encoding = 'utf8';
            try {
              // 检查是否是二进制文件
              const isBinary = this._isBinaryContent(data);
              if (isBinary) {
                // 如果是二进制文件，返回 base64 编码
                resolve({
                  content: data.toString('base64'),
                  encoding: 'base64',
                  binary: true
                });
                return;
              }
              
              // 尝试不同的编码
              const encodings = ['utf8', 'utf16le'];
              for (const enc of encodings) {
                try {
                  const text = data.toString(enc);
                  if (text.includes('')) {
                    continue;
                  }
                  encoding = enc;
                  break;
                } catch (e) {
                  continue;
                }
              }
              
              resolve({
                content: data.toString(encoding),
                encoding,
                binary: false
              });
            } catch (e) {
              // 如果编码检测失败，默认使用 utf8
              resolve({
                content: data.toString('utf8'),
                encoding: 'utf8',
                binary: false
              });
            }
          }
        })
      })

      console.log(`[FileManager] Read file ${remotePath}, encoding: ${content.encoding}`)
      return content

    } catch (error) {
      console.error(`[FileManager] Failed to read file ${remotePath}:`, error)
      throw new Error(`读取文件失败: ${error.message}`)
    }
  }
  //写入文件
  async writeFile(connectionId, remotePath, content) {
    const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
    return sftp.writeFile(remotePath, content);
  }

  // 检查是否是二进制内容
  _isBinaryContent(buffer) {
    // 检查前4KB的内容
    const sampleSize = Math.min(4096, buffer.length);
    for (let i = 0; i < sampleSize; i++) {
      const byte = buffer[i];
      // 如果控制字符（除了换行、回车、制表符）或者 null 字节，认为是二进制
      if ((byte < 32 && byte !== 9 && byte !== 10 && byte !== 13) || byte === 0) {
        return true;
      }
    }
    return false;
  }

  /**
   * 删除文件或空文件夹
   * @param {string} connectionId - SSH连接ID
   * @param {string} path - 文件或文件夹路径
   * @param {boolean} isDirectory - 是否是文件夹
   */
  async deleteFile(connectionId, path, isDirectory) {
    try {
      // 获取 SFTP 会话
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId)
      if (!sftp) {
        throw new Error('SFTP 会话未建立')
      }

      // 使用 Promise 包装删除操作
      await new Promise((resolve, reject) => {
        if (isDirectory) {
          sftp.rmdir(path, (err) => {
            if (err) {
              reject(new Error(err.message))
            } else {
              resolve()
            }
          })
        } else {
          sftp.unlink(path, (err) => {
            if (err) {
              reject(new Error(err.message))
            } else {
              resolve()
            }
          })
        }
      })

      return true
    } catch (error) {
      console.error('删除文件失败:', error)
      // 优化错误消息
      let errorMessage = '删除失败'
      if (error.message.includes('Permission denied')) {
        errorMessage = '权限不足，无法删除'
      } else if (error.message.includes('No such file')) {
        errorMessage = '文件或目录不存在'
      } else if (error.message) {
        errorMessage = error.message
      }
      throw new Error(errorMessage)
    }
  }

  /**
   * 取消正在进行的下载
   * @param {string} downloadId 下载记录ID
   */
  async cancelDownload(downloadId) {
    try {
      const transfer = this.activeDownloads.get(downloadId);

      // 如果有独立的 SFTP 会话，先尝试结束它
      if (transfer && transfer.sftp) {
        transfer.cancelled = true;
        try {
          transfer.sftp.end();
        } catch (error) {
          console.error('结束 SFTP 会话时出错:', error);
        }
        this.activeDownloads.delete(downloadId);
      }

      // 主动把这条记录标记为中断，并通知渲染进程刷新状态
      const record = await DownloadManager.getDownload(downloadId);
      if (record) {
        await DownloadManager.updateOrCreate({
          downloadId,
          connectionId: record.connection_id,
          serverInfo: record.server_info,
          fileName: record.file_name,
          filePath: record.file_path,
          remotePath: record.remote_path,
          progress: typeof record.progress === 'number' ? record.progress : 0,
          total: record.total_size,
          chunk: record.chunk_size,
          status: 'interrupted',
          error: '用户取消下载'
        });
      } else {
        // 兜底：如果查不到记录，至少在数据库里做一次中断标记
        await DownloadManager.markInterrupted(downloadId);
      }
    } catch (error) {
      console.error('[FileManager] 取消下载失败:', error);
      throw error;
    }
  }

  /**
   * 检查压缩工具可用性
   * @param {string} connectionId - SSH连接ID
   * @returns {Object} 包含工具可用性的对象
   */
  async checkCompressionTools(connectionId) {
    try {
      const tools = {};

      // 检查 tar 工具
      try {
        await SSHConnectionManager.execCommand(connectionId, 'which tar');
        tools.tar = true;
      } catch (error) {
        tools.tar = false;
      }

      // 检查 gzip 工具
      try {
        await SSHConnectionManager.execCommand(connectionId, 'which gzip');
        tools.gzip = true;
      } catch (error) {
        tools.gzip = false;
      }

      // 检查 zip 工具
      try {
        await SSHConnectionManager.execCommand(connectionId, 'which zip');
        tools.zip = true;
      } catch (error) {
        tools.zip = false;
      }

      // 检查 unzip 工具
      try {
        await SSHConnectionManager.execCommand(connectionId, 'which unzip');
        tools.unzip = true;
      } catch (error) {
        tools.unzip = false;
      }

      return tools;
    } catch (error) {
      console.error('[FileManager] 检查压缩工具失败:', error);
      return { tar: false, gzip: false, zip: false, unzip: false };
    }
  }

  /**
   * 压缩文件或文件夹
   * @param {string} connectionId - SSH连接ID
   * @param {string} path - 要压缩的文件/文件夹路径
   * @param {boolean} isDirectory - 是否是文件夹
   * @param {string} currentPath - 当前工作目录
   */
  async compressFile(connectionId, path, isDirectory, currentPath) {
    try {
      // 检查压缩工具可用性
      const tools = await this.checkCompressionTools(connectionId);

      if (!tools.tar) {
        throw new Error('服务器上未安装 tar 工具，无法进行压缩操作');
      }

      // 获取文件名（不含路径）
      const fileName = path.split('/').pop();
      // 生成压缩文件名
      const archiveName = `${fileName}.tar.gz`;

      let command;
      if (isDirectory) {
        // 压缩文件夹：tar -czf archiveName -C parentDir folderName
        const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
        const folderName = fileName;
        command = `cd "${parentDir}" && tar -czf "${archiveName}" "${folderName}"`;
      } else {
        // 压缩文件：tar -czf archiveName fileName
        const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
        command = `cd "${parentDir}" && tar -czf "${archiveName}" "${fileName}"`;
      }

      console.log('[FileManager] 执行压缩命令:', command);
      const result = await SSHConnectionManager.execCommand(connectionId, command);

      if (result) {
        console.log('[FileManager] 压缩完成');
      }

      return true;
    } catch (error) {
      console.error('[FileManager] 压缩文件失败:', error);
      throw error;
    }
  }

  /**
   * 解压文件
   * @param {string} connectionId - SSH连接ID
   * @param {string} path - 要解压的文件路径
   * @param {string} currentPath - 当前工作目录
   */
  async extractFile(connectionId, path, currentPath) {
    try {
      // 检查压缩工具可用性
      const tools = await this.checkCompressionTools(connectionId);

      // 获取文件扩展名
      const fileName = path.split('/').pop();
      const fileExt = fileName.toLowerCase();

      let command;
      const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';

      if (fileExt.endsWith('.tar.gz') || fileExt.endsWith('.tgz')) {
        // tar.gz 文件
        if (!tools.tar) {
          throw new Error('服务器上未安装 tar 工具，无法进行解压操作');
        }
        command = `cd "${parentDir}" && tar -xzf "${fileName}"`;
      } else if (fileExt.endsWith('.tar')) {
        // tar 文件
        if (!tools.tar) {
          throw new Error('服务器上未安装 tar 工具，无法进行解压操作');
        }
        command = `cd "${parentDir}" && tar -xf "${fileName}"`;
      } else if (fileExt.endsWith('.gz')) {
        // gz 文件
        if (!tools.gzip) {
          throw new Error('服务器上未安装 gzip 工具，无法进行解压操作');
        }
        const decompressedName = fileName.replace(/\.gz$/, '');
        command = `cd "${parentDir}" && gzip -d "${fileName}"`;
      } else if (fileExt.endsWith('.zip')) {
        // zip 文件
        if (!tools.unzip) {
          throw new Error('服务器上未安装 unzip 工具，无法进行解压操作');
        }
        command = `cd "${parentDir}" && unzip "${fileName}"`;
      } else {
        throw new Error(`不支持的文件格式: ${fileExt}`);
      }

      console.log('[FileManager] 执行解压命令:', command);
      const result = await SSHConnectionManager.execCommand(connectionId, command);

      if (result) {
        console.log('[FileManager] 解压完成');
      }

      return true;
    } catch (error) {
      console.error('[FileManager] 解压文件失败:', error);
      throw error;
    }
  }
}

export default new FileManager();