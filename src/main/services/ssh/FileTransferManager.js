import SSHConnectionManager from './SSHConnectionManager';

/**
 * 文件传输管理器
 * 负责处理 SSH 文件传输操作
 */
class FileTransferManager {
  /**
   * 上传文件到远程服务器
   * @param {string} connectionId - SSH 连接ID
   * @param {string} localPath - 本地文件路径
   * @param {string} remotePath - 远程文件路径
   * @returns {Promise<void>}
   */
  uploadFile(connectionId, localPath, remotePath) {
    return new Promise((resolve, reject) => {
      const client = SSHConnectionManager.getClient(connectionId);

      client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }

  /**
   * 从远程服务器下载文件
   * @param {string} connectionId - SSH 连接ID
   * @param {string} remotePath - 远程文件路径
   * @param {string} localPath - 本地文件路径
   * @returns {Promise<void>}
   */
  downloadFile(connectionId, remotePath, localPath) {
    return new Promise((resolve, reject) => {
      const client = SSHConnectionManager.getClient(connectionId);

      client.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.fastGet(remotePath, localPath, (err) => {
          if (err) {
            reject(err);
            return;
          }
          resolve();
        });
      });
    });
  }
}

export default new FileTransferManager(); 