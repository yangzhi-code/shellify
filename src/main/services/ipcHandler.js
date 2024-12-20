import { ipcMain } from 'electron';
import sshService from './sshService';
import connectionStore from './store';

// 创建新连接
ipcMain.handle('new-connection', async (event, serverInfo) => {
  try {
    const { connectionId } = await sshService.connect(serverInfo);
    
    // 创建交互式 Shell
    await sshService.createShell(connectionId);
    
    // 设置数据回调
    sshService.onData(connectionId, (data) => {
      event.sender.send('terminal-output', {
        connectionId,
        output: data
      });
    });

    // 只返回必要的信息
    return { 
      id: connectionId, 
      message: '连接成功' 
    };
  } catch (error) {
    console.error('连接失败:', error);
    throw new Error('连接失败: ' + error.message);
  }
});

// 处理终端输入
ipcMain.on('terminal-input', (event, { id, data }) => {
  sshService.writeToShell(id, data);
});

// 处理终端大小调整
ipcMain.on('resize-terminal', (event, { connectionId, cols, rows }) => {
  sshService.resizeShell(connectionId, cols, rows);
});

// 断开连接
ipcMain.handle('disconnect', (event, connectionId) => {
  sshService.disconnect(connectionId);
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
