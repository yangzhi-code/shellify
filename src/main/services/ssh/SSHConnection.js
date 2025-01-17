class SSHConnection {
  constructor() {
    this.client = new Client();
    this.sftp = null;
    // 存储活动的传输流
    this.activeTransfers = new Map();
  }

  /**
   * 取消下载
   * @param {string} downloadId - 下载ID
   */
  async cancelDownload(downloadId) {
    try {
      const transfer = this.activeTransfers.get(`download_${downloadId}`);
      if (transfer) {
        // 中断传输流
        transfer.destroy();
        this.activeTransfers.delete(`download_${downloadId}`);
      }
    } catch (error) {
      console.error('取消下载失败:', error);
      throw error;
    }
  }

  /**
   * 取消上传
   * @param {string} uploadId - 上传ID
   */
  async cancelUpload(uploadId) {
    const transfer = this.activeTransfers.get(`upload_${uploadId}`);
    if (transfer) {
      transfer.destroy(); // 中断传输流
      this.activeTransfers.delete(`upload_${uploadId}`);
    }
  }

  /**
   * 开始传输时保存流引用
   * @param {string} type - 传输类型 ('download' 或 'upload')
   * @param {string} id - 传输ID
   * @param {Stream} stream - 传输流
   */
  startTransfer(type, id, stream) {
    this.activeTransfers.set(`${type}_${id}`, stream);
  }

  /**
   * 传输完成时删除流引用
   * @param {string} type - 传输类型 ('download' 或 'upload')
   * @param {string} id - 传输ID
   */
  endTransfer(type, id) {
    this.activeTransfers.delete(`${type}_${id}`);
  }
} 