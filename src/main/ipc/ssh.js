import { ipcMain } from 'electron';
import { connect } from 'net';
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

  // 测试连接处理器
  ipcMain.handle('test-connection', async (event, config) => {
    console.log('收到连接测试请求:', config);

    return new Promise((resolve, reject) => {
      // 参数验证
      if (!config.host || !config.port) {
        console.log('参数验证失败: 主机地址或端口为空');
        reject('主机地址或端口不能为空');
        return;
      }

      console.log('开始创建 TCP 连接...');
      const socket = connect({
        host: config.host,
        port: parseInt(config.port), // 确保端口是数字
        timeout: 3000
      });

      socket.on('connect', () => {
        console.log('TCP 连接成功');
        socket.end();
        resolve('连接测试成功');
      });

      socket.on('error', (err) => {
        console.error('TCP 连接错误:', err);
        socket.destroy();
        let message = '连接失败';
        
        switch (err.code) {
          case 'ECONNREFUSED':
            message = '连接被拒绝，请检查主机地址和端口是否正确';
            break;
          case 'ETIMEDOUT':
            message = '连接超时，请检查网络连接';
            break;
          case 'EHOSTUNREACH':
            message = '无法访问主机，请检查网络连接';
            break;
          case 'ENETUNREACH':
            message = '网络不可达';
            break;
          default:
            message = `连接失败: ${err.message}`;
        }
        
        console.log('发送错误消息:', message);
        reject(message);
      });

      socket.on('timeout', () => {
        console.log('TCP 连接超时');
        socket.destroy();
        reject('连接超时，请检查网络连接');
      });

      socket.on('close', () => {
        console.log('TCP 连接关闭');
        if (!socket.destroyed) {
          socket.destroy();
        }
      });
    });
  });
}
