import SSHConnectionManager from './SSHConnectionManager';

class FileTransferManager {
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