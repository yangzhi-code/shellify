import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

/**
 * SSH 连接管理器
 * 负责管理所有 SSH 连接的创建、获取和销毁
 */
class SSHConnectionManager {
  constructor() {
    /**
     * 存储所有活动的 SSH 连接
     * @type {Object.<string, import('ssh2').Client>}
     */
    this.clients = {};
  }

  /**
   * 创建新的 SSH 连接
   * @param {Object} serverInfo - 服务器连接信息
   * @param {string} serverInfo.host - 服务器地址
   * @param {number} serverInfo.port - SSH 端口号
   * @param {string} serverInfo.username - 用户名
   * @param {string} serverInfo.password - 密码
   * @returns {Promise<{connectionId: string}>} 返回连接ID
   */
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

  /**
   * 获取指定ID的SSH连接客户端
   * @param {string} connectionId - 连接ID
   * @returns {import('ssh2').Client} SSH客户端实例
   * @throws {Error} 如果找不到指定的连接
   */
  getClient(connectionId) {
    const client = this.clients[connectionId];
    if (!client) {
      throw new Error(`找不到连接: ${connectionId}`);
    }
    return client;
  }

  /**
   * 断开指定的SSH连接
   * @param {string} connectionId - 要断开的连接ID
   */
  disconnect(connectionId) {
    if (this.clients[connectionId]) {
      this.clients[connectionId].end();
      delete this.clients[connectionId];
    }
  }
}

export default new SSHConnectionManager(); 