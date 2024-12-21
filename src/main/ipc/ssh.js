import { ipcMain } from 'electron';
import sshService from '../services/ssh';

export function setupSSHHandlers() {
  // 创建新连接
  ipcMain.handle('new-connection', async (event, serverInfo) => {
    try {
      const { connectionId } = await sshService.connect(serverInfo);
      await sshService.createShell(connectionId);
      
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

  // 终端输入
  ipcMain.on('terminal-input', (event, { id, data }) => {
    sshService.writeToShell(id, data);
  });

  // 终端大小调整
  ipcMain.on('resize-terminal', (event, { connectionId, cols, rows }) => {
    sshService.resizeShell(connectionId, cols, rows);
  });

  // 断开连接
  ipcMain.handle('disconnect', (event, connectionId) => {
    sshService.disconnect(connectionId);
  });

  // 服务器状态
  ipcMain.handle('get-server-status', async (event, connectionId) => {
    try {
      return await sshService.getServerStatus(connectionId);
    } catch (error) {
      console.error('Failed to get server status:', error);
      throw error;
    }
  });
} 