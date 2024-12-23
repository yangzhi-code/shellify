import { ipcMain } from 'electron';
import SSHConnectionManager from '../services/ssh/SSHConnectionManager';
import ConnectionInitializer from '../services/ssh/ConnectionInitializer';

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
    throw new Error(`连接失败: ${error.message}`);
  }
});

// ... 其他处理器 ... 