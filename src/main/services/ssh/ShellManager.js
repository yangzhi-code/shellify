import SSHConnectionManager from './SSHConnectionManager';

/**
 * Shell 会话管理器
 * 负责管理所有交互式 Shell 会话的创建、数据传输和清理
 */
class ShellManager {
  constructor() {
    /**
     * 存储所有活动的 Shell 会话
     * @type {Object.<string, import('ssh2').ClientChannel>}
     */
    this.shells = {};

    /**
     * 存储数据回调函数
     * @type {Object.<string, Function>}
     */
    this.callbacks = {};

    /**
     * 存储数据缓冲区
     * @type {Object.<string, {data: string, timer: NodeJS.Timer|null}>}
     */
    this.buffers = {};

    /**
     * 缓冲区刷新间隔（毫秒）
     * @type {number}
     */
    this.flushInterval = 16; // 60fps

    /**
     * 存储错误回调函数
     * @type {Object.<string, Function>}
     */
    this.errorCallbacks = {};
  }

  /**
   * 创建新的交互式 Shell 会话
   * @param {string} connectionId - SSH 连接ID
   * @param {number} cols - 终端列数
   * @param {number} rows - 终端行数
   * @returns {Promise<import('ssh2').ClientChannel>}
   */
  createShell(connectionId, cols = 80, rows = 24) {
    return new Promise((resolve, reject) => {
      const client = SSHConnectionManager.getClient(connectionId);

      if (!client) {
        const error = new Error('SSH连接未建立或已断开');
        this.handleError(connectionId, error);
        reject(error);
        return;
      }

      client.shell({
        term: 'xterm-256color',
        cols: cols,
        rows: rows
      }, (err, stream) => {
        if (err) {
          this.handleError(connectionId, err);
          reject(err);
          return;
        }

        
        this.shells[connectionId] = stream;
        this.setupShellEvents(connectionId, stream);
        resolve(stream);
      });
    });
  }

  /**
   * 设置 Shell 会话的事件处理
   * @private
   * @param {string} connectionId - 连接ID
   * @param {import('ssh2').ClientChannel} stream - Shell 流
   */
  setupShellEvents(connectionId, stream) {
    this.buffers[connectionId] = {
      data: '',
      timer: null
    };

    stream.on('data', (data) => {
      if (this.callbacks[connectionId]) {
        this.buffers[connectionId].data += data.toString();
        
        if (!this.buffers[connectionId].timer) {
          this.buffers[connectionId].timer = setInterval(() => {
            if (this.buffers[connectionId].data) {
              this.callbacks[connectionId](this.buffers[connectionId].data);
              this.buffers[connectionId].data = '';
            }
          }, this.flushInterval);
        }
      }
    });

    stream.on('error', (err) => {
      console.error('Shell error:', err);
      this.handleError(connectionId, err);
    });

    stream.on('close', () => {
      this.cleanup(connectionId);
    });
  }

  /**
   * 设置数据回调函数
   * @param {string} connectionId - 连接ID
   * @param {Function} callback - 数据回调函数
   */
  onData(connectionId, callback) {
    this.callbacks[connectionId] = callback;
  }

  /**
   * 向 Shell 写入数据
   * @param {string} connectionId - 连接ID
   * @param {string|Buffer} data - 要写入的数据
   */
  writeToShell(connectionId, data) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      shell.write(data);
    }
  }

  /**
   * 调整 Shell 窗口大小
   * @param {string} connectionId - 连接ID
   * @param {number} cols - 新的列数
   * @param {number} rows - 新的行数
   */
  resizeShell(connectionId, cols, rows) {
    const shell = this.shells[connectionId];
    if (shell && !shell.destroyed) {
      if (cols > 0 && rows > 0 && 
          (cols !== shell.columns || rows !== shell.rows)) {
        try {
          shell.setWindow(rows, cols);
        } catch (error) {
          console.error('Resize shell error:', error);
        }
      }
    }
  }

  /**
   * 清理指定连接的资源
   * @private
   * @param {string} connectionId - 连接ID
   */
  cleanup(connectionId) {
    if (this.buffers[connectionId]?.timer) {
      clearInterval(this.buffers[connectionId].timer);
    }
    delete this.buffers[connectionId];
    delete this.shells[connectionId];
    delete this.callbacks[connectionId];
    delete this.errorCallbacks[connectionId];
  }

  /**
   * 关闭指定的 Shell 会话
   * @param {string} connectionId - 连接ID
   */
  closeShell(connectionId) {
    if (this.shells[connectionId]) {
      this.shells[connectionId].end();
      this.cleanup(connectionId);
    }
  }

  /**
   * 设置错误回调函数
   * @param {string} connectionId - 连接ID
   * @param {Function} callback - 错误回调函数
   */
  onError(connectionId, callback) {
    this.errorCallbacks[connectionId] = callback;
  }

  /**
   * 处理错误
   * @private
   * @param {string} connectionId - 连接ID
   * @param {Error} error - 错误对象
   */
  handleError(connectionId, error) {
    if (this.errorCallbacks[connectionId]) {
      const errorMessage = this.formatErrorMessage(error);
      this.errorCallbacks[connectionId](errorMessage);
    }
  }

  /**
   * 格式化错误消息
   * @private
   * @param {Error} error - 错误对象
   * @returns {string} 格式化后的错误消息
   */
  formatErrorMessage(error) {
    if (error.message.includes('All configured authentication methods failed')) {
      return '认证失败：用户名或密码错误';
    }
    if (error.message.includes('connect ETIMEDOUT')) {
      return '连接超时：请检查网络或服务器地址';
    }
    if (error.message.includes('connect ECONNREFUSED')) {
      return '连接被拒绝：请检查服务器地址和端口';
    }
    return `连接错误：${error.message}`;
  }
}

export default new ShellManager(); 