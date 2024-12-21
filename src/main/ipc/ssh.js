import { ipcMain } from 'electron';
import sshService from '../services/ssh';
import FileManager from '../services/ssh/FileManager';

/**
 * 设置 SSH 相关的 IPC 处理器
 * 包含：连接管理、终端操作、服务器状态监控等功能
 */
export function setupSSHHandlers() {
  /**
   * 创建新的 SSH 连接
   * @param {Object} serverInfo - 服务器连接信息
   * @param {string} serverInfo.host - 主机地址
   * @param {number} serverInfo.port - 端口号
   * @param {string} serverInfo.username - 用户名
   * @param {string} serverInfo.password - 密码
   * @returns {Promise<{id: string, message: string}>} 连接成功后的信息
   */
  ipcMain.handle('new-connection', async (event, serverInfo) => {
    try {
      const { connectionId } = await sshService.connect(serverInfo);
      await sshService.createShell(connectionId);
      
      // 设置终端数据输出的回调
      sshService.onData(connectionId, (data) => {
        event.sender.send('terminal-output', {
          connectionId,
          output: data
        });
      });

      return { 
        id: connectionId, 
        message: '连接成功' 
      };
    } catch (error) {
      console.error('连接失败:', error);
      throw new Error('连接失败: ' + error.message);
    }
  });

  /**
   * 处理终端输入
   * 将用户输入发送到 SSH 会话
   */
  ipcMain.on('terminal-input', (event, { id, data }) => {
    sshService.writeToShell(id, data);
  });

  /**
   * 处理终端窗口大小调整
   * 同步更新 SSH 终端大小
   */
  ipcMain.on('resize-terminal', (event, { connectionId, cols, rows }) => {
    sshService.resizeShell(connectionId, cols, rows);
  });

  /**
   * 断开 SSH 连接
   * 清理相关资源
   */
  ipcMain.handle('disconnect', (event, connectionId) => {
    sshService.disconnect(connectionId);
  });

  /**
   * 获取服务器状态信息
   * 包括：CPU、内存、磁盘、网络等系统信息
   */
  ipcMain.handle('get-server-status', async (event, connectionId) => {
    try {
      return await sshService.getServerStatus(connectionId);
    } catch (error) {
      console.error('Failed to get server status:', error);
      throw error;
    }
  });
}
