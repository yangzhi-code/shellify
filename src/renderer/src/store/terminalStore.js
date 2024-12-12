import { defineStore } from 'pinia';

export const useTerminalStore = defineStore('terminal', {
  state: () => ({
    connections: [],
  }),
  actions: {
    addConnection(connection) {
      this.connections.push(connection);
    },
    removeConnection(id) {
      this.connections = this.connections.filter(conn => conn.id !== id);
    },
  },
});