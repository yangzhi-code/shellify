import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

class SshService {
  constructor() {
    this.clients = {};     // SSH 连接
    this.shells = {};      // Shell 会话
    this.callbacks = {};   // 数据回调
  }

  // 连接到服务器
  connect(serverInfo) {
    return new Promise((resolve, reject) => {
      const connectionId = uuidv4();
      const client = new Client();

      client
        .on('ready', () => {
          this.clients[connectionId] = client;
          resolve({ connectionId });
        })
        .on('error', (err) => {
          console.error('SSH 连接错误:', err);
          reject(err);
        })
        .connect({
          host: serverInfo.host,
          port: serverInfo.port || 22,
          username: serverInfo.username,
          password: serverInfo.password
        });
    });
  }

  // 创建交互式 Shell
  createShell(connectionId, cols = 80, rows = 24) {
    return new Promise((resolve, reject) => {
      const client = this.clients[connectionId];
      if (!client) {
        reject(new Error(`找不到连接: ${connectionId}`));
        return;
      }

      client.shell({
        term: 'xterm-256color',
        cols: cols,
        rows: rows
      }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        this.shells[connectionId] = stream;

        stream.on('data', (data) => {
          if (this.callbacks[connectionId]) {
            this.callbacks[connectionId](data.toString());
          }
        });

        stream.on('close', () => {
          console.log('Shell session closed');
          delete this.shells[connectionId];
        });

        resolve(stream);
      });
    });
  }

  // 执行单个命令
  execCommand(connectionId, command) {
    return new Promise((resolve, reject) => {
      const client = this.clients[connectionId];
      if (!client) {
        reject(new Error(`找不到连接: ${connectionId}`));
        return;
      }

      client.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('data', (data) => {
          stdout += data;
        });

        stream.stderr.on('data', (data) => {
          stderr += data;
        });

        stream.on('close', () => {
          resolve({ stdout, stderr });
        });
      });
    });
  }

  // 文件操作
  uploadFile(connectionId, localPath, remotePath) {
    return new Promise((resolve, reject) => {
      const client = this.clients[connectionId];
      if (!client) {
        reject(new Error(`找不到连接: ${connectionId}`));
        return;
      }

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
      const client = this.clients[connectionId];
      if (!client) {
        reject(new Error(`找不到连接: ${connectionId}`));
        return;
      }

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

  // Shell 操作
  onData(connectionId, callback) {
    this.callbacks[connectionId] = callback;
  }

  writeToShell(connectionId, data) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      shell.write(data);
    }
  }

  resizeShell(connectionId, cols, rows) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      shell.setWindow(rows, cols);
    }
  }

  // 断开连接
  disconnect(connectionId) {
    // 关闭 Shell
    if (this.shells[connectionId]) {
      this.shells[connectionId].end();
      delete this.shells[connectionId];
    }

    // 关闭 SSH 连接
    if (this.clients[connectionId]) {
      this.clients[connectionId].end();
      delete this.clients[connectionId];
    }

    delete this.callbacks[connectionId];
  }
}

export default new SshService();
