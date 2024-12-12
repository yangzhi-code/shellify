import { NodeSSH } from 'node-ssh';
import { v4 as uuidv4 } from 'uuid';

class SshService {
  constructor() {
    this.clients = {}; // 存储多个连接
  }

  // 连接到服务器
  async connect(serverInfo) {
    const ssh = new NodeSSH();
    const connectionId = uuidv4();

    try {
      await ssh.connect(serverInfo);
      this.clients[connectionId] = ssh;
      // 确保连接已准备好后，返回连接 ID
      return { connectionId, client: ssh };
    } catch (err) {
      console.error('连接失败:', err);
      throw err;
    }
  }

  // 断开连接
  disconnect(connectionId) {
    const ssh = this.clients[connectionId];
    if (ssh) {
      ssh.dispose(); // 释放连接
      delete this.clients[connectionId];
      console.log('SSH Connection closed.');
    } else {
      console.warn(`No connection found with ID: ${connectionId}`);
    }
  }

  // 执行命令
  async sendCommand(connectionId, command) {
    const ssh = this.clients[connectionId];
    if (!ssh) {
      throw new Error(`No connection found with ID: ${connectionId}`);
    }

    try {
      // 执行命令，并返回结果
      const result = await ssh.execCommand(command);
      console.log('STDOUT:', result.stdout);
      console.error('STDERR:', result.stderr);
      return result;
    } catch (err) {
      console.error('Error executing command:', err);
      throw err;
    }
  }

  // 上传文件
  async uploadFile(connectionId, localPath, remotePath) {
    const ssh = this.clients[connectionId];
    if (!ssh) {
      throw new Error(`No connection found with ID: ${connectionId}`);
    }

    try {
      await ssh.putFile(localPath, remotePath);
      console.log(`File uploaded to ${remotePath}`);
    } catch (err) {
      console.error('Error uploading file:', err);
      throw err;
    }
  }

  // 下载文件
  async downloadFile(connectionId, remotePath, localPath) {
    const ssh = this.clients[connectionId];
    if (!ssh) {
      throw new Error(`No connection found with ID: ${connectionId}`);
    }

    try {
      await ssh.getFile(localPath, remotePath);
      console.log(`File downloaded to ${localPath}`);
    } catch (err) {
      console.error('Error downloading file:', err);
      throw err;
    }
  }

  async getSsh(connectionId) {
    const ssh = this.clients[connectionId];
    if (!ssh) {
      throw new Error(`这个连接不存在: ${connectionId}`);
    }
    console.log('返回 SSH 连接', ssh);
    return ssh; // 直接返回 ssh 实例
  }
  
}

export default new SshService();
