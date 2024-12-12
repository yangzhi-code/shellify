

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
        <Terminal ref="terminal" :fontSize="13" :connectionId="currentConnectionId" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import Sidebar from './components/sidebar.vue'
import Terminal from './components/Terminal.vue'
// 用于管理终端输出和连接状态
const terminalData = ref([])
const activeConnections = ref([])
// 当前连接ID
const currentConnectionId = ref(null)
// 终端实例
const terminal = ref(null)
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
      currentConnectionId.value = response.id
      terminal.value?.write('连接成功！')
    })
    .catch((error) => {
      console.error('连接失败', error)
    })
}


onMounted(() => {
})
</script>
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
