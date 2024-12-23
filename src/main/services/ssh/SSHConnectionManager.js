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
    this.sftpSessions = {};  // 存储 SFTP 会话
    this.reconnectAttempts = {};
    this.MAX_RETRIES = 1;
    this.RETRY_DELAY = 1000;
    this.connectionStatus = {}; // 新增：跟踪连接状态
    this.connectionCheckers = {};  // 存储连接检查器
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

      // 保存连接信息用于重连
      this.reconnectAttempts[connectionId] = {
        attempts: 0,
        serverInfo
      };

      this.setupConnection(client, connectionId, serverInfo, resolve, reject);
    });
  }

  /**
   * 设置连接和重连逻辑
   */
  setupConnection(client, connectionId, serverInfo, resolve, reject) {
    client
      .on('ready', () => {
        console.log('SSH连接就绪:', connectionId);
        this.clients[connectionId] = client;
        this.reconnectAttempts[connectionId].attempts = 0;
        
        // 设置连接检查
        this.setupConnectionChecker(connectionId, client);
        
        resolve({ connectionId });
      })
      .on('error', (err) => {
        this.emitConnectionStatus(connectionId, 'disconnected');
        console.error('SSH连接错误:', err);
        this.handleConnectionError(connectionId, err, reject);
      })
      .on('end', () => {
        this.emitConnectionStatus(connectionId, 'disconnected');
        console.log('SSH连接结束:', connectionId);
        this.handleConnectionEnd(connectionId);
      })
      .connect({
        ...serverInfo,
        keepaliveInterval: 10000,
        keepaliveCountMax: 3,
        readyTimeout: 20000,
        env: {
          TERM: 'xterm-256color',
          LANG: 'en_US.UTF-8'
        },
        term: 'xterm-256color'
      });
  }

  /**
   * 设置连接检查器
   */
  setupConnectionChecker(connectionId, client) {
    // 清理现有的检查器
    if (this.connectionCheckers[connectionId]) {
      clearInterval(this.connectionCheckers[connectionId]);
    }

    // 每30秒检查一次连接状态
    this.connectionCheckers[connectionId] = setInterval(() => {
      if (!client._sock?.writable) {
        this.emitConnectionStatus(connectionId, 'disconnected');
        this.handleConnectionEnd(connectionId);
      }
    }, 30000);
  }

  /**
   * 发送连接状态
   */
  emitConnectionStatus(connectionId, status) {
    if (global.mainWindow) {
      global.mainWindow.webContents.send(`connection:status:${connectionId}`, status);
    }
  }

  /**
   * 处理连接错误
   */
  handleConnectionError(connectionId, error, reject) {
    if (error.level === 'client-authentication') {
      console.error('认证失败，不进行重试');
      delete this.reconnectAttempts[connectionId];
      reject(new Error('认证失败：用户名或密码错误'));
      return;
    }

    const reconnectInfo = this.reconnectAttempts[connectionId];
    if (!reconnectInfo) return;

    if (reconnectInfo.attempts < this.MAX_RETRIES) {
      reconnectInfo.attempts++;
      console.log(`尝试重新连接 (${reconnectInfo.attempts}/${this.MAX_RETRIES})...`);
      
      setTimeout(() => {
        const client = new Client();
        this.setupConnection(
          client,
          connectionId,
          reconnectInfo.serverInfo,
          () => console.log('重新连接成功'),
          (err) => {
            console.error('重新连接失败:', err);
            reject(new Error(err.message || '连接失败'));
          }
        );
      }, this.RETRY_DELAY);
    } else {
      console.error('重试次数已达上限');
      delete this.reconnectAttempts[connectionId];
      reject(new Error(error.message || '连接失败，已达重试上限'));
    }
  }

  /**
   * 处理连接断开
   */
  handleConnectionEnd(connectionId) {
    if (this.clients[connectionId]) {
      this.connectionStatus[connectionId] = 'disconnected';
      this._cleanupSFTPSession(connectionId);
      delete this.clients[connectionId];

      const reconnectInfo = this.reconnectAttempts[connectionId];
      if (reconnectInfo && !reconnectInfo.authError) {
        this.handleReconnect(connectionId).catch(err => {
          console.error('自动重连失败:', err);
        });
      }
    }
  }

  /**
   * 清理 SFTP 会话
   * @private
   */
  _cleanupSFTPSession(connectionId) {
    if (this.sftpSessions[connectionId]) {
      try {
        const { sftp } = this.sftpSessions[connectionId];
        if (sftp) {
          sftp.removeAllListeners();
          sftp.end();
        }
      } catch (error) {
        console.error('清理 SFTP 会话失败:', error);
      } finally {
        delete this.sftpSessions[connectionId];
      }
    }
  }

  /**
   * 检查连接状态
   * @param {string} connectionId - 连接ID
   * @returns {boolean} 连接是否可用
   */
  isConnected(connectionId) {
    const client = this.clients[connectionId];
    const isValid = client && client._sock && client._sock.writable;
    
    // 更新连接状态
    this.connectionStatus[connectionId] = isValid ? 'connected' : 'disconnected';
    
    return isValid;
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
   * 获取或创建 SFTP 会话
   */
  async getSFTPSession(connectionId) {
    try {
      const client = this.clients[connectionId];
      if (!client) {
        throw new Error(`找不到连接: ${connectionId}`);
      }

      // 如果已有可用的 SFTP 会话，验证其可用性
      if (this.sftpSessions[connectionId]?.sftp) {
        try {
          await new Promise((resolve, reject) => {
            this.sftpSessions[connectionId].sftp.stat('.', (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
          return this.sftpSessions[connectionId].sftp;
        } catch (error) {
          console.log('SFTP会话已失效，需要重新创建');
          this._cleanupSFTPSession(connectionId);
        }
      }

      // 创建新的 SFTP 会话
      return await new Promise((resolve, reject) => {
        client.sftp((err, sftp) => {
          if (err) {
            reject(err);
            return;
          }

          // 保存 SFTP 会话
          this.sftpSessions[connectionId] = {
            sftp,
            timestamp: Date.now()
          };

          // 监听 SFTP 会话事件
          sftp.on('close', () => {
            console.log('SFTP会话关闭');
            delete this.sftpSessions[connectionId];
          });

          sftp.on('error', (err) => {
            console.error('SFTP会话错误:', err);
            this._cleanupSFTPSession(connectionId);
          });

          resolve(sftp);
        });
      });
    } catch (error) {
      if (error.message.includes('找不到连接') && this.reconnectAttempts[connectionId]) {
        console.log('连接丢失，尝试重连...');
        await this.handleReconnect(connectionId);
        return this.getSFTPSession(connectionId);
      }
      throw error;
    }
  }

  /**
   * 执行命令
   */
  async execCommand(connectionId, command) {
    const client = this.getClient(connectionId);
    
    return new Promise((resolve, reject) => {
      client.exec(command, (err, channel) => {
        if (err) {
          reject(err);
          return;
        }

        let output = '';
        channel.on('data', (data) => {
          output += data;
        });

        channel.on('close', () => {
          resolve(output.trim());
        });

        channel.on('error', (err) => {
          reject(err);
        });
      });
    });
  }

  /**
   * 清理连接相关资源
   */
  disconnect(connectionId) {
    // 清理 SFTP 会话
    if (this.sftpSessions[connectionId]) {
      try {
        this.sftpSessions[connectionId].sftp.end();
      } catch (error) {
        console.error('清理 SFTP 会话失败:', error);
      }
      delete this.sftpSessions[connectionId];
    }

    // 断开 SSH 连接
    if (this.clients[connectionId]) {
      this.clients[connectionId].end();
      delete this.clients[connectionId];
    }

    delete this.reconnectAttempts[connectionId];
  }

  /**
   * 重新连接
   */
  async reconnect(connectionId) {
    const reconnectInfo = this.reconnectAttempts[connectionId];
    if (!reconnectInfo) {
      throw new Error('找不到连接配置');
    }

    try {
      // 清理旧连接和会话
      this._cleanupSFTPSession(connectionId);
      if (this.clients[connectionId]) {
        this.clients[connectionId].end();
        delete this.clients[connectionId];
      }

      // 创建新连接
      return await new Promise((resolve, reject) => {
        const client = new Client();
        this.setupConnection(
          client,
          connectionId,
          reconnectInfo.serverInfo,
          () => {
            console.log('重连成功');
            resolve(this.clients[connectionId]);
          },
          (err) => {
            console.error('重连失败:', err);
            reject(err);
          }
        );
      });
    } catch (error) {
      console.error('重连失败:', error);
      throw error;
    }
  }

  /**
   * 处理重连
   * @private
   */
  async handleReconnect(connectionId) {
    const reconnectInfo = this.reconnectAttempts[connectionId];
    if (!reconnectInfo || reconnectInfo.attempts >= this.MAX_RETRIES) {
      throw new Error('重连次数超过限制或无法找到连接配置');
    }

    reconnectInfo.attempts++;
    console.log(`尝试重连 (${reconnectInfo.attempts}/${this.MAX_RETRIES})...`);

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const client = new Client();
        this.setupConnection(
          client,
          connectionId,
          reconnectInfo.serverInfo,
          () => {
            console.log('重连成功');
            reconnectInfo.attempts = 0; // 重置重试次数
            resolve(this.clients[connectionId]);
          },
          (err) => {
            console.error('重连失败:', err);
            if (reconnectInfo.attempts < this.MAX_RETRIES) {
              this.handleReconnect(connectionId).then(resolve).catch(reject);
            } else {
              reject(err);
            }
          }
        );
      }, this.RETRY_DELAY);
    });
  }

  /**
   * 清理资源时也要清理检查器
   */
  cleanup(connectionId) {
    if (this.connectionCheckers[connectionId]) {
      clearInterval(this.connectionCheckers[connectionId]);
      delete this.connectionCheckers[connectionId];
    }
    // ... 其他清理代码
  }
}

export default new SSHConnectionManager(); 