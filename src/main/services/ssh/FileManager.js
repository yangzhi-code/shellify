import SSHConnectionManager from './SSHConnectionManager';

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
      modifyTime: new Date(item.attrs.mtime * 1000).toLocaleString(),
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
   * @param {string} path - 搜索起始路径
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @param {boolean} options.caseSensitive - 是否区分大小写
   * @param {boolean} options.recursive - 是否递归搜索子目录
   */
  async searchFiles(connectionId, path, keyword, options = {}) {
    const {
      caseSensitive = false,
      recursive = true
    } = options;

    try {
      const sftp = await SSHConnectionManager.getSFTPSession(connectionId);
      const results = [];
      
      // 执行搜索
      await this._searchInDirectory(sftp, path, keyword, options, results);
      
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
  async _searchInDirectory(sftp, path, keyword, options, results) {
    const { caseSensitive, recursive } = options;
    const searchPattern = caseSensitive ? keyword : keyword.toLowerCase();

    try {
      const list = await new Promise((resolve, reject) => {
        sftp.readdir(path, (err, files) => {
          if (err) reject(err);
          else resolve(files);
        });
      });

      for (const item of list) {
        const itemPath = `${path}/${item.filename}`.replace(/\/+/g, '/');
        const itemName = caseSensitive ? item.filename : item.filename.toLowerCase();

        // 检查文件名是否匹配
        if (itemName.includes(searchPattern)) {
          results.push({
            name: item.filename,
            path: itemPath,
            size: item.attrs.size,
            modifyTime: new Date(item.attrs.mtime * 1000).toLocaleString(),
            permissions: this._formatPermissions(item.attrs.mode),
            type: item.attrs.isDirectory() ? 'directory' : 'file'
          });
        }

        // 如果是目录且需要递归搜索
        if (recursive && item.attrs.isDirectory()) {
          await this._searchInDirectory(sftp, itemPath, keyword, options, results);
        }
      }
    } catch (error) {
      console.error(`搜索目录 ${path} 失败:`, error);
    }
  }
}

export default new FileManager(); 