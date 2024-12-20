import { Client } from 'ssh2';
import { v4 as uuidv4 } from 'uuid';

class SshService {
  constructor() {
    this.clients = {};     // SSH 连接
    this.shells = {};      // Shell 会话
    this.callbacks = {};   // 数据回调
    this.buffers = {};        // 添加输出缓冲
    this.flushInterval = 16;  // 60fps
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

      const env = {
        TERM: 'xterm-256color',
        LANG: 'en_US.UTF-8'
      };

      client.shell({
        term: 'xterm-256color',
        cols: cols,
        rows: rows,
        env: env
      }, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        this.shells[connectionId] = stream;

        this.buffers[connectionId] = {
          data: '',
          timer: null
        };

        // 处理数据
        stream.on('data', (data) => {
          if (this.callbacks[connectionId]) {
            // 将数据添加到缓冲区
            this.buffers[connectionId].data += data.toString();
            
            // 如果没有定时器在运行，创建一个
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

        // 处理错误
        stream.on('error', (err) => {
          console.error('Shell error:', err);
        });

        // 处理关闭
        stream.on('close', () => {
          console.log('Shell session closed');
          // 清理缓冲区和定时器
          if (this.buffers[connectionId]?.timer) {
            clearInterval(this.buffers[connectionId].timer);
          }
          delete this.buffers[connectionId];
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

    if (this.buffers[connectionId]?.timer) {
      clearInterval(this.buffers[connectionId].timer);
      delete this.buffers[connectionId];
    }
  }

  // 修改获取服务器状态的方法
  async getServerStatus(connectionId) {
    try {
      const client = this.clients[connectionId]
      if (!client) {
        throw new Error('SSH session not found')
      }

      // CPU 使用率
      const { stdout: cpu } = await this.execCommand(connectionId, "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'")

      // 内存信息
      const { stdout: memory } = await this.execCommand(connectionId, "free -m | awk 'NR==2{printf \"%s/%s\", $3,$2}'")

      // 运行时间 - 获取秒数后自己转换
      const { stdout: uptimeSeconds } = await this.execCommand(connectionId, "cat /proc/uptime | awk '{print $1}'")

      // 系统负载 - 获取1分钟、5分钟、15分钟负��
      const { stdout: load } = await this.execCommand(connectionId, "cat /proc/loadavg | awk '{print $1,$2,$3}'")

      // 磁盘使用情况
      const { stdout: disks } = await this.execCommand(connectionId, "df -h | grep '^/dev'")

      // 网络流量
      const { stdout: network } = await this.execCommand(connectionId, "cat /proc/net/dev | grep eth0")

      // IP 地址
      const { stdout: ip } = await this.execCommand(connectionId, "hostname -I | awk '{print $1}'")

      return {
        ip: ip.trim(),
        cpu: parseFloat(cpu),
        memory: this.parseMemory(memory),
        load: this.parseLoad(load),
        uptime: this.formatUptime(parseFloat(uptimeSeconds)),
        disks: this.parseDiskInfo(disks),
        network: this.parseNetworkInfo(network)
      }
    } catch (error) {
      console.error('Error getting server status:', error)
      throw error
    }
  }

  // 解析内存信息
  parseMemory(memoryStr) {
    const [used, total] = memoryStr.split('/')
    const percentage = (parseInt(used) / parseInt(total) * 100).toFixed(1)
    return {
      used: `${(parseInt(used)/1024).toFixed(1)}GB`,
      total: `${(parseInt(total)/1024).toFixed(1)}GB`,
      percentage: parseFloat(percentage)
    }
  }

  // 解析磁盘信息
  parseDiskInfo(diskStr) {
    return diskStr.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/)
        return {
          path: parts[5],
          used: parts[2],
          total: parts[1],
          percentage: parseInt(parts[4])
        }
      })
  }

  // 解析网络信息
  parseNetworkInfo(networkStr) {
    const parts = networkStr.split(/\s+/)
    return {
      download: this.formatSpeed(parts[1]),
      upload: this.formatSpeed(parts[9])
    }
  }

  // 格式化网络速度
  formatSpeed(bytesStr) {
    const bytes = parseInt(bytesStr)
    if (bytes < 1024) return `${bytes} B/s`
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB/s`
    return `${(bytes/1024/1024).toFixed(1)} MB/s`
  }

  // 添加格式化运行时间的方法
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    const parts = []
    if (days > 0) parts.push(`${days}天`)
    if (hours > 0) parts.push(`${hours}小时`)
    if (minutes > 0) parts.push(`${minutes}分钟`)
    
    return parts.join('') || '刚刚启动'
  }

  // 修改解析负载的方法
  parseLoad(loadStr) {
    try {
      const [load1, load5, load15] = loadStr.trim().split(/\s+/).map(Number)
      return {
        '1min': load1.toFixed(2),
        '5min': load5.toFixed(2),
        '15min': load15.toFixed(2)
      }
    } catch (error) {
      console.error('Error parsing load:', error)
      return {
        '1min': '0.00',
        '5min': '0.00',
        '15min': '0.00'
      }
    }
  }
}

export default new SshService();
