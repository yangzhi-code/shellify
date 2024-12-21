import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

class SSHConnectionManager {
  constructor() {
    this.clients = {};
  }

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

  getClient(connectionId) {
    const client = this.clients[connectionId];
    if (!client) {
      throw new Error(`找不到连接: ${connectionId}`);
    }
    return client;
  }

  disconnect(connectionId) {
    if (this.clients[connectionId]) {
      this.clients[connectionId].end();
      delete this.clients[connectionId];
    }
  }
}

export default new SSHConnectionManager(); 