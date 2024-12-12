<script setup>
import { ref } from 'vue'
import Sidebar from './components/sidebar.vue'

// 用于管理终端输出和连接状态
const terminalData = ref([])
const activeConnections = ref([])

// 处理连接
const startResize = (e) => {
  const resizer = e.target
  const sidebar = resizer.previousElementSibling
  let startX = e.clientX
  let startWidth = sidebar.offsetWidth

  const doDrag = (e) => {
    const newWidth = startWidth + e.clientX - startX
    if (newWidth > 120 && newWidth < 500) {
      sidebar.style.width = newWidth + 'px'
    }
  }

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}

const openNewTerminal = () => {
  const serverInfo = {
    host: '47.108.49.80',
    port: 22,
    username: 'root',
    password: '419199yZ'
  }
  connectToServer(serverInfo)
}

// 连接到服务器
const connectToServer = (serverInfo) => {
  window.electron.ipcRenderer
    .invoke('new-connection', serverInfo)
    .then((response) => {
      console.log(response)
      activeConnections.value.push(response.id) // 添加连接 ID
    })
    .catch((error) => {
      console.error('连接失败', error)
    })
}

// 监听终端输出
window.electron.ipcRenderer.on('terminal-output', (event, { id, data }) => {
  if (activeConnections.value.includes(id)) {
    terminalData.value.push({ id, data }) // 收集终端输出
  }
})

// 处理终端输入
const sendTerminalInput = (id, input) => {
  window.electron.ipcRenderer.send('terminal-input', { id, data: input })
}
</script>

<template>
  <div class="container">
    <div class="sidebar">
      <Sidebar />
    </div>
    <div class="resizer" @mousedown="startResize"></div>
    <div class="main">
      <div class="top-bar">
        <a-button type="primary" @click="openNewTerminal">添加连接</a-button>
      </div>
      <div class="content">
        <div v-for="(data, index) in terminalData" :key="index">
          <div v-if="data.id === activeConnections[activeConnections.length - 1]">
            <pre>{{ data.data }}</pre>
          </div>
        </div>
        <input v-if="activeConnections.length" v-model="terminalInput" @keydown.enter="sendTerminalInput(activeConnections[activeConnections.length - 1], terminalInput)" placeholder="输入命令" />
      </div>
    </div>
  </div>
</template>

<style>
.container {
  margin-top: 80px;
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #fff;
}

.sidebar {
  width: 200px;
  background: #f5f5f5;
  height: 100%;
  padding: 5px;
  overflow-y: auto;
  flex-shrink: 0;
}

.resizer {
  width: 2px;
  background: #e0e0e0;
  cursor: col-resize;
  transition: background 0.2s;
}

.resizer:hover,
.resizer:active {
  background: #bdbdbd;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标签栏 */
.top-bar {
  height: 30px;
  background: #b2a2a2;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* 防止文本被选中 */
.resizer,
.top-bar {
  user-select: none;
}

/* 终端显示区域 */
.content {
  padding: 10px;
  background: #000;
  color: #fff;
  height: 100%;
  overflow-y: auto;
}

input {
  margin-top: 10px;
  padding: 5px;
  width: 100%;
  color: #fff;
  background: #333;
  border: none;
  outline: none;
}
</style>
