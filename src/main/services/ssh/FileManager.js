import SSHConnectionManager from './SSHConnectionManager';

class FileManager {
  /**
   * 获取文件列表
   * @param {string} connectionId - SSH连接ID
   * @param {string} path - 目录路径，默认为用户目录
   */
  async listFiles(connectionId, path = '~') {
    try {
      const client = SSHConnectionManager.getClient(connectionId);
      return new Promise((resolve, reject) => {
        client.sftp((err, sftp) => {
          if (err) reject(err);
          else {
            // 获取实际路径
            this._getActualPath(client, path).then(actualPath => {
              sftp.readdir(actualPath, (err, list) => {
                if (err) reject(err);
                else {
                  resolve(this._formatFileList(list, actualPath));
                }
              });
            }).catch(reject);
          }
        });
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取实际路径（解析 ~ 等）
   * @private
   */
  async _getActualPath(client, path) {
    if (path !== '~') return path;
    
    return new Promise((resolve, reject) => {
      client.exec('pwd', (err, channel) => {
        if (err) reject(err);
        else {
          let pwd = '';
          channel.on('data', data => pwd += data);
          channel.on('close', () => resolve(pwd.trim()));
        }
      });
    });
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
}

export default new FileManager(); 