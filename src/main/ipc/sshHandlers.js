import { ipcMain } from 'electron';
import SSHConnectionManager from '../services/ssh/SSHConnectionManager';
import ConnectionInitializer from '../services/ssh/ConnectionInitializer';
import ShellManager from '../services/ssh/ShellManager';

// 处理新连接请求
ipcMain.handle('initialize-connection', async (event, config) => {
  try {
    return await ConnectionInitializer.initialize(config);
  } catch (error) {
    console.error('Connection error:', error);
    throw new Error(`连接失败: ${error.message}`);
  }
});

// 保留其他现有的处理器
ipcMain.handle('new-connection', async (event, config) => {
  try {
    return await SSHConnectionManager.connect(config);
  } catch (error) {
    console.error('SSH连接错误:', error);
    // 确保错误消息被正确传递到渲染进程
    throw error;
  }
});

// 处理错误回调设置
ipcMain.handle('shell:onError', (event, connectionId, callback) => {
  ShellManager.onError(connectionId, callback);
});

// ... 其他处理器 ... 