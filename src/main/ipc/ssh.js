import { ipcMain } from 'electron';
import sshService from '../services/ssh';
import FileManager from '../services/ssh/FileManager';

// 添加 getFileManager 函数
const getFileManager = async (connectionId) => {
  // 确保连接存在
  if (!connectionId) {
    throw new Error('未提供连接ID');
  }
  return FileManager;
};

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

  // 获取文件列表
  ipcMain.handle('ssh:list-files', async (event, { connectionId, path }) => {
    try {
      //console.log('收到文件列表请求:', { connectionId, path });
      return await FileManager.listFiles(connectionId, path);
    } catch (error) {
      console.error('文件列表处理失败:', error);
      throw error;
    }
  });

  // 文件搜索处理器
  ipcMain.handle('ssh:search-files', async (event, { connectionId, startPath, keyword, options }) => {
    try {
      console.log('收到搜索请求:', { connectionId, startPath, keyword, options });
      if (!startPath) {
        throw new Error('搜索路径不能为空');
      }
      return await FileManager.searchFiles(connectionId, startPath, keyword, options);
    } catch (error) {
      console.error('文件搜索失败:', error);
      throw error;
    }
  });

  // 文件下载处理器
  ipcMain.handle('ssh:download-file', async (event, { connectionId, remotePath, fileName }) => {
    try {
      return await FileManager.downloadFile(connectionId, remotePath, fileName);
    } catch (error) {
      console.error('文件下载失败:', error);
      throw error;
    }
  });

  // 处理文件上传
  ipcMain.handle('ssh:upload-file', async (event, { connectionId, localPath, remotePath }) => {
    try {
      const fileManager = await getFileManager(connectionId);
      return await fileManager.uploadFile(connectionId, localPath, remotePath);
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  });

  // 重试上传
  ipcMain.handle('ssh:retry-upload', async (event, { uploadId, connectionId, localPath, remotePath }) => {
    try {
      const fileManager = await getFileManager(connectionId);
      return await fileManager.uploadFile(connectionId, localPath, remotePath);
    } catch (error) {
      console.error('重试上传失败:', error);
      throw error;
    }
  });
}
