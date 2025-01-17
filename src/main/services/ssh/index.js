/**
 * SSH 服务模块的统一出口
 * 整合所有 SSH 相关功能，提供统一的接口
 */

import SSHConnectionManager from './SSHConnectionManager';
import ShellManager from './ShellManager';
import FileTransferManager from './FileTransferManager';
import ServerMonitorService from './ServerMonitorService';

// 导出单独的服务
export {
  SSHConnectionManager,
  ShellManager,
  FileTransferManager,
  ServerMonitorService
};

// 为了保持向后兼容，导出默认对象
const sshService = {
  // SSH 连接相关
  connect: SSHConnectionManager.connect.bind(SSHConnectionManager),
  disconnect: SSHConnectionManager.disconnect.bind(SSHConnectionManager),
  
  // Shell 相关
  createShell: ShellManager.createShell.bind(ShellManager),
  onData: ShellManager.onData.bind(ShellManager),
  writeToShell: ShellManager.writeToShell.bind(ShellManager),
  resizeShell: ShellManager.resizeShell.bind(ShellManager),
  
  // 文件传输相关
  uploadFile: FileTransferManager.uploadFile.bind(FileTransferManager),
  downloadFile: FileTransferManager.downloadFile.bind(FileTransferManager),
  
  // 服务器监控相关
  getServerStatus: ServerMonitorService.getServerStatus.bind(ServerMonitorService),
  
  // 导出服务实例，以便需要时可以直接访问
  ServerMonitorService,
  SSHConnectionManager,
  ShellManager,
  FileTransferManager
};

export default sshService; 