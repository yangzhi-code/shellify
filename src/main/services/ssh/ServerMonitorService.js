import SSHConnectionManager from './SSHConnectionManager';
import MetricsFormatter from './MetricsFormatter';

/**
 * 服务器监控服务
 * 负责获取和处理服务器状态信息
 */
class ServerMonitorService {
  /**
   * 在远程服务器上执行命令
   * @private
   * @param {string} connectionId - SSH 连接ID
   * @param {string} command - 要执行的命令
   * @returns {Promise<{stdout: string, stderr: string}>}
   */
  async execCommand(connectionId, command) {
    return new Promise((resolve, reject) => {
      const client = SSHConnectionManager.getClient(connectionId);

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

  /**
   * 获取服务器状态信息
   * @param {string} connectionId - SSH 连接ID
   * @returns {Promise<Object>} 服务器状态信息
   */
  async getServerStatus(connectionId) {
    try {
      const { stdout: publicIp } = await this.execCommand(
        connectionId, 
        "curl -s http://checkip.amazonaws.com"
      );

      const { stdout: cpu } = await this.execCommand(
        connectionId, 
        "top -bn1 | grep 'Cpu(s)' | awk '{print $2}'"
      );

      const { stdout: memory } = await this.execCommand(
        connectionId, 
        "free -m | awk 'NR==2{printf \"%s/%s\", $3,$2}'"
      );

      const { stdout: uptimeSeconds } = await this.execCommand(
        connectionId, 
        "cat /proc/uptime | awk '{print $1}'"
      );

      const { stdout: load } = await this.execCommand(
        connectionId, 
        "cat /proc/loadavg | awk '{print $1,$2,$3}'"
      );

      const { stdout: disks } = await this.execCommand(
        connectionId,
        "df -h | grep '^/dev'"
      );

      const networkInfo = await this.getNetworkInfo(connectionId);

      return {
        publicIp: publicIp.trim(),
        cpu: parseFloat(cpu),
        memory: MetricsFormatter.parseMemory(memory),
        load: MetricsFormatter.parseLoad(load),
        uptime: MetricsFormatter.formatUptime(parseFloat(uptimeSeconds)),
        disks: MetricsFormatter.parseDiskInfo(disks),
        network: networkInfo
      };
    } catch (error) {
      console.error('Error getting server status:', error);
      throw error;
    }
  }

  /**
   * 获取网络接口信息
   * @private
   * @param {string} connectionId - SSH 连接ID
   * @returns {Promise<Object>} 网络接口信息
   */
  async getNetworkInfo(connectionId) {
    const { stdout: networkInterfaces } = await this.execCommand(
      connectionId,
      "ip -o link show | awk -F': ' '{print $2}' | grep -E '^(eth|ens|enp|wlan)'"
    );

    const interfaces = [];
    for (const iface of networkInterfaces.split('\n').filter(Boolean)) {
      const { stdout: stats } = await this.execCommand(
        connectionId,
        `old_rx=$(cat /proc/net/dev | grep "${iface}" | awk '{print $2}');
         old_tx=$(cat /proc/net/dev | grep "${iface}" | awk '{print $10}');
         sleep 1;
         new_rx=$(cat /proc/net/dev | grep "${iface}" | awk '{print $2}');
         new_tx=$(cat /proc/net/dev | grep "${iface}" | awk '{print $10}');
         echo "$old_rx $old_tx $new_rx $new_tx"`
      );

      const [old_rx, old_tx, new_rx, new_tx] = stats.trim().split(/\s+/).map(Number);
      interfaces.push({
        name: iface,
        download: MetricsFormatter.formatSpeed(new_rx - old_rx),
        upload: MetricsFormatter.formatSpeed(new_tx - old_tx)
      });
    }

    const defaultIface = interfaces[0] || { upload: '0 B/s', download: '0 B/s' };
    return {
      interfaces,
      upload: defaultIface.upload,
      download: defaultIface.download
    };
  }
}

export default new ServerMonitorService(); 