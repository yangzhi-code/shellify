import { setupSSHHandlers } from './ssh';
import { setupMenuHandlers } from './menu';
import { setupStoreHandlers } from './store';
import { setupClipboardHandlers } from './clipboard';
import { setupFileHandlers } from './file';
import { setupDownloadHandlers } from './download';
import { setupSettingsHandlers } from './settings';

/**
 * 初始化所有 IPC 处理器
 * 这是 IPC 模块的统一入口点
 * 负责设置所有的主进程 IPC 通信处理器
 */
export function setupIpcHandlers() {
  // 设置 SSH 相关处理器（连接、终端、状态监控等）
  setupSSHHandlers();
  // 设置连接配置存储处理器
  setupStoreHandlers();
  // 设置剪贴板操作处理器
  setupClipboardHandlers();
  // 设置上下文菜单处理器
  setupMenuHandlers();
  // 设置文件相关处理器
  setupFileHandlers();
  // 设置下载处理程序
  setupDownloadHandlers();
  // 设置设置处理器
  setupSettingsHandlers();
} 