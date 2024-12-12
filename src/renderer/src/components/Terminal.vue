
<template>
    <div>
      <div v-for="conn in connections" :key="conn.id">
        <div :id="`terminal-${conn.id}`" style="width: 100%; height: 100%;"></div>
      </div>
    </div>
  </template>
  
<script>
import { ref, onMounted } from 'vue';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { ipcRenderer } from 'electron';

export default {
  setup() {
    const connections = ref([]);

    onMounted(() => {
      // 初始化已有连接
      ipcRenderer.invoke('get-active-connections').then((activeConnections) => {
        activeConnections.forEach(({ id }) => {
          const term = new Terminal();
          const fitAddon = new FitAddon();
          term.loadAddon(fitAddon);
          term.open(document.getElementById(`terminal-${id}`));
          fitAddon.fit();

          // 监听终端输入
          term.onData((data) => {
            ipcRenderer.send('terminal-input', { id, data });
          });

          connections.value.push({ id, term, fitAddon });
        });
      });

      // 监听新连接事件
      ipcRenderer.on('new-connection', (event, { id }) => {
        const term = new Terminal();
        const fitAddon = new FitAddon();
        term.loadAddon(fitAddon);
        term.open(document.getElementById(`terminal-${id}`));
        fitAddon.fit();

        // 监听终端输入
        term.onData((data) => {
          ipcRenderer.send('terminal-input', { id, data });
        });

        connections.value.push({ id, term, fitAddon });
      });

      // 监听主进程发送到终端的数据
      ipcRenderer.on('terminal-output', (event, { id, data }) => {
        const conn = connections.value.find((c) => c.id === id);
        if (conn) {
          conn.term.write(data);
        }
      });
    });

    return { connections };
  },
};
</script>
