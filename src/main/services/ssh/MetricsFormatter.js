/**
 * 指标格式化工具类
 * 负责格式化各种系统指标数据
 */
class MetricsFormatter {
  /**
   * 解析内存使用信息
   * @param {string} memoryStr - 内存信息字符串 (格式: "used/total")
   * @returns {Object} 格式化后的内存信息
   */
  static parseMemory(memoryStr) {
    const [used, total] = memoryStr.split('/');
    const percentage = (parseInt(used) / parseInt(total) * 100).toFixed(1);
    return {
      used: `${(parseInt(used)/1024).toFixed(1)}GB`,
      total: `${(parseInt(total)/1024).toFixed(1)}GB`,
      percentage: parseFloat(percentage)
    };
  }

  /**
   * 获取磁盘使用率的颜色
   * @param {number} value - 使用率百分比
   * @returns {string} 颜色代码
   */
  static getDiskColor(value) {
    if (value > 90) return '#ff4444';
    if (value > 70) return '#ffbb33';
    return '#00C851';
  }

  /**
   * 解析磁盘信息
   * @param {string} diskStr - 磁盘信息字符串
   * @returns {Array<Object>} 格式化后的磁盘信息列表
   */
  static parseDiskInfo(diskStr) {
    return diskStr.split('\n')
      .filter(line => line.trim())
      .map(line => {
        const parts = line.split(/\s+/);
        return {
          mountPoint: parts[5],
          total: parts[1],
          available: parts[3],
          percentage: parseInt(parts[4])
        };
      })
      .sort((a, b) => {
        if (a.mountPoint === '/') return -1;
        if (b.mountPoint === '/') return 1;
        return a.mountPoint.localeCompare(b.mountPoint);
      });
  }

  /**
   * 格式化网络速度
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的速度字符串
   */
  static formatSpeed(bytes) {
    if (bytes < 1024) return `${bytes} B/s`;
    if (bytes < 1024 * 1024) return `${(bytes/1024).toFixed(1)} KB/s`;
    return `${(bytes/1024/1024).toFixed(1)} MB/s`;
  }

  /**
   * 格式化运行时间
   * @param {number} seconds - 运行秒数
   * @returns {string} 格式化后的运行时间
   */
  static formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (minutes > 0) parts.push(`${minutes}分钟`);
    
    return parts.join('') || '刚刚启动';
  }

  /**
   * 解析系统负载信息
   * @param {string} loadStr - 负载信息字符串
   * @returns {Object} 格式化后的负载信息
   */
  static parseLoad(loadStr) {
    try {
      const [load1, load5, load15] = loadStr.trim().split(/\s+/).map(Number);
      return {
        '1min': load1.toFixed(2),
        '5min': load5.toFixed(2),
        '15min': load15.toFixed(2)
      };
    } catch (error) {
      console.error('Error parsing load:', error);
      return {
        '1min': '0.00',
        '5min': '0.00',
        '15min': '0.00'
      };
    }
  }
}

export default MetricsFormatter; 