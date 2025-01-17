import { posix } from 'path';

class FileOperations {
  constructor(sftp) {
    this.sftp = sftp;
  }

  async createFolder(path, folderName) {
    try {
      const fullPath = posix.join(path, folderName);
      //console.log('[FileOperations] 尝试创建文件夹:', { path, folderName, fullPath });

      // 直接尝试创建文件夹
      await new Promise((resolve, reject) => {
        this.sftp.mkdir(fullPath, (err) => {
          if (err) {
            // 处理特定的错误情况
            if (err.code === 2) { // No such file
              reject(new Error('目标路径不存在'));
            } else if (err.code === 3) { // Permission denied
              reject(new Error('权限不足'));
            } else if (err.code === 4) { // Failure (可能是文件夹已存在)
              reject(new Error('文件夹已存在'));
            } else {
              reject(new Error(`创建文件夹失败: ${err.message || err.code}`));
            }
          } else {
            //console.log('[FileOperations] 文件夹创建成功:', fullPath);
            resolve();
          }
        });
      });
    } catch (error) {
      console.error('[FileOperations] 创建文件夹操作失败:', {
        error: error,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }
}

export default FileOperations; 