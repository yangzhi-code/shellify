let Store;

(async () => {
  Store = (await import('electron-store')).default;
})();

// 下载数据存储
class DownloadStore{
  constructor() {
    this.store = null;
    this.key = 'downloads'; // 存储的主键
  }

  async init() {
    // 动态加载 Store，避免 require 报错
    if (!Store) {
      Store = (await import('electron-store')).default;
    }
    this.store = new Store();
    // 确保初始化时存储的是数组
    if (!Array.isArray(this.store.get(this.key))) {
      this.store.set(this.key, []);
    }
  }

  // 获取所有下载数据
  async getAllDownloads() {
    if (!this.store) await this.init();
    const downloads = this.store.get(this.key, []);
    return Array.isArray(downloads) ? downloads : [];
  }

  //查询相同文件的下载进度
  async getDownloadProgress(fileName, filePath, remotePath) {
    if (!this.store) await this.init();
    const downloads = await this.getAllDownloads();
    return downloads.find(d => 
      d.fileName === fileName && 
      d.filePath === filePath && 
      d.remotePath === remotePath
    );
  }

  // 保存新的下载数据
  async saveDownload(download) {
    if (!this.store) await this.init();
    const downloads = await this.getAllDownloads();
    downloads.unshift(download); // 添加到数组开头
    this.store.set(this.key, downloads);
    return download;
  }

  // 删除指定下载数据
  async deleteDownload(index) {
    if (!this.store) await this.init();
    const downloads = await this.getAllDownloads();
    if (index >= 0 && index < downloads.length) {
      downloads.splice(index, 1);
      this.store.set(this.key, downloads);
    }
    return downloads;
  }

  // 清空所有下载数据
  async clearDownloads() {
    if (!this.store) await this.init();
    this.store.set(this.key, []);
    return [];
  }
}

// 导出单例对象
export default new DownloadStore();
