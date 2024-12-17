import { ipcMain } from 'electron';
import SshService from './sshService';
import connectionStore from './store';

// 存储活动的连接
const activeConnections = new Map();

// 获取所有活动连接
ipcMain.handle('get-active-connections', () => {
  return Array.from(activeConnections.keys()).map((id) => ({ id }));
});

// 处理终端输入
ipcMain.handle('terminal-input', async (event, { id, data }) => {
  const connection = activeConnections.get(id);
  if (connection) {
    console.log('发送命令', data)
    // 将用户输入发送到 SSH 服务器
    const result = await SshService.sendCommand(id, data)
    console.log('发送命令结果', result)
    return result
  }
  return null
});


// 创建新连接
ipcMain.handle('new-connection', async (event, serverInfo) => {
  try {
    // 等待连接建立并获得连接信息
    const { connectionId, client } = await SshService.connect(serverInfo);
    
    // 确保 ssh 存在
    if (!client) {
      throw new Error('连接失败: client 是空的');
    }
    // 存储连接信息client
    activeConnections.set(connectionId, client);

    // 返回连接信息
    return { id: connectionId, message: '连接成功' };
  } catch (error) {
    console.error('Failed to connect:', error);
    throw new Error('连接失败: ' + error.message);
  }
});


//连接存储
// 监听渲染进程的请求，调用封装好的 store 方法
ipcMain.handle('save-connection', (event, connection) => {
  return connectionStore.saveConnection(connection);
});

ipcMain.handle('get-connections', () => {
  return connectionStore.getAllConnections();
});

ipcMain.handle('delete-connection', (event, index) => {
  return connectionStore.deleteConnection(index);
});

ipcMain.handle('clear-connections', () => {
  return connectionStore.clearConnections();
});