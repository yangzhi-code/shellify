import { ipcMain } from 'electron';
import connectionStore from '../services/stores/connectStore';

/**
 * 设置连接存储相关的 IPC 处理器
 * 用于管理 SSH 连接配置的持久化存储
 */
export function setupStoreHandlers() {
  /**
   * 保存新的连接配置
   * @param {Object} connection - 连接配置信息
   */
  ipcMain.handle('save-connection', (event, connection) => {
    return connectionStore.saveConnection(connection);
  });

  /**
   * 获取所有已保存的连接配置
   * @returns {Array} 连接配置列表
   */
  ipcMain.handle('get-connections', () => {
    return connectionStore.getAllConnections();
  });

  /**
   * 删除指定索引的连接配置
   * @param {number} index - 要删除的配置索引
   */
  ipcMain.handle('delete-connection', (event, index) => {
    return connectionStore.deleteConnection(index);
  });

  /**
   * 清空所有已保存的连接配置
   */
  ipcMain.handle('clear-connections', () => {
    return connectionStore.clearConnections();
  });
} 