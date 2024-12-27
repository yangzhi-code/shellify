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
    const connections = this.store.get(this.key, []);
    // 确保返回的是正确的数据结构
    return this.validateConnections(connections);
  }

  // 添加数据验证方法
  validateConnections(connections) {
    if (!Array.isArray(connections)) return [];
    
    // 转换为正确的数据结构
    return connections.map(node => {
      if (node.type === 'file') {
        return {
          id: node.id,
          type: 'file',
          info: {
            name: node.info?.name || 'Unnamed',
            host: node.info?.host || '',
            port: node.info?.port || 22,
            username: node.info?.username || '',
            password: node.info?.password || '',
            authMethod: node.info?.authMethod || 'password',
            privateKey: node.info?.privateKey || '',
            passphrase: node.info?.passphrase || '',
            encoding: node.info?.encoding || 'utf8',
            remark: node.info?.remark || '',
            // ... 其他必要的字段
          }
        };
      } else {
        return {
          id: node.id,
          type: 'folder',
          children: this.validateConnections(node.children || []),
          info: {
            name: node.info?.name || 'New Folder'
          }
        };
      }
    });
  }

  // 保存新的连接信息
  async saveConnection(connection) {
    if (!this.store) await this.init();
    // 确保保存前数据结构正确
    const validatedConnection = this.validateConnections(connection);
    this.store.set(this.key, validatedConnection);
    return validatedConnection;
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
