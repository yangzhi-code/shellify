import { ipcMain } from 'electron';
import SSHConnectionManager from '../services/ssh/SSHConnectionManager';
import ConnectionInitializer from '../services/ssh/ConnectionInitializer';
import ShellManager from '../services/ssh/ShellManager';
const { Client } = require('ssh2')
const fs = require('fs')

// 处理新连接请求
ipcMain.handle('initialize-connection', async (event, config) => {
  try {
    return await ConnectionInitializer.initialize(config);
  } catch (error) {
    console.error('Connection error:', error);
    throw new Error(`连接失败: ${error.message}`);
  }
});

// 创建新连接
async function newConnection(event, connectionInfo) {
  return new Promise((resolve, reject) => {
    const conn = new Client()

    // 准备认证配置
    const config = {
      host: connectionInfo.host,
      port: connectionInfo.port || 22,
      username: connectionInfo.username,
    }

    // 根据认证方式选择认证方法
    if (connectionInfo.authMethod === 'key') {
      // 使用密钥认证
      try {
        config.privateKey = fs.readFileSync(connectionInfo.privateKey)
        if (connectionInfo.passphrase) {
          config.passphrase = connectionInfo.passphrase
        }
      } catch (error) {
        console.error('读取私钥文件失败:', error)
        reject(new Error('私钥文件读取失败'))
        return
      }
    } else if (connectionInfo.authMethod === 'password') {
      // 使用密码认证
      if (!connectionInfo.password) {
        reject(new Error('未提供密码'))
        return
      }
      config.password = connectionInfo.password
    } else {
      reject(new Error('未指定认证方式'))
      return
    }

    conn.on('ready', () => {
      console.log('SSH 连接成功')
      resolve(conn)
    })

    conn.on('error', (err) => {
      console.error('SSH 连接错误:', err)
      reject(new Error(`连接失败: ${err.message}`))
    })

    // 尝试连接
    try {
      conn.connect(config)
    } catch (error) {
      reject(new Error(`连接失败: ${error.message}`))
    }
  })
}

// 处理错误回调设置
ipcMain.handle('shell:onError', (event, connectionId, callback) => {
  ShellManager.onError(connectionId, callback);
});

// ... 其他处理器 ... 
module.exports = {
  newConnection,
  // ... 其他导出保持不变 ...
} 
