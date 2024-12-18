let Store;

(async () => {
  Store = (await import('electron-store')).default;
})();

// 连接信息存储
class ConnectionStore {
  constructor() {
    this.store = null;
    this.key = 'connections'; // 存储的主键
  }

  async init() {
    // 动态加载 Store，避免 require 报错
    if (!Store) {
      Store = (await import('electron-store')).default;
    }
    this.store = new Store();
  }

  // 获取所有连接信息
  async getAllConnections() {
    if (!this.store) await this.init();
    return this.store.get(this.key, []);
  }

  // 保存新的连接信息
  async saveConnection(connection) {
    if (!this.store) await this.init();
    this.store.set(this.key, connection);
    return connection;
  }

  // 删除指定连接信息
  async deleteConnection(index) {
    if (!this.store) await this.init();
    const connections = await this.getAllConnections();
    if (index >= 0 && index < connections.length) {
      connections.splice(index, 1);
      this.store.set(this.key, connections);
    }
    return connections;
  }

  // 清空所有连接信息
  async clearConnections() {
    if (!this.store) await this.init();
    this.store.set(this.key, []);
    return [];
  }
}

// 导出单例对象
export default new ConnectionStore();
