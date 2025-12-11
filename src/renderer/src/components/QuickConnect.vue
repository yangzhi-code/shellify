<template>
  <div class="quick-connect">
    <div class="welcome-section">
      <h1>欢迎使用 Shellify</h1>
      <p>选择一个保存的连接开始使用</p>
    </div>

    <div class="connection-section">
      <div class="section-header">
        <h2>保存的连接</h2>
      </div>

      <div class="connection-list">
        <!-- 连接列表 -->
        <div v-if="connections.length > 0" class="list-container">
          <div class="list-header">
            <span class="name-col">名称</span>
            <span class="host-col">主机</span>
            <span class="user-col">用户名</span>
            <span class="action-col">操作</span>
          </div>
          <div 
            v-for="conn in connections" 
            :key="conn.id" 
            class="list-item"
          >
            <span class="name-col">{{ conn.name || '未命名连接' }}</span>
            <span class="host-col">{{ conn.host }}</span>
            <span class="user-col">{{ conn.username }}</span>
            <span class="action-col">
              <el-button 
                type="primary" 
                size="small" 
                @click="handleConnect(conn)"
              >连接</el-button>
            </span>
          </div>
        </div>

        <!-- 空状态展示 -->
        <div v-else class="empty-state">
          <el-empty description="暂无保存的连接" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { useTabsStore } from '../stores/terminalStore'

const tabsStore = useTabsStore()
const connections = ref([])

// Props
const props = defineProps({
  item: {
    type: Object,
    required: true
  },
  onConnect: {
    type: Function,
    required: true
  }
})

// 递归获取所有连接
const getAllConnections = (nodes) => {
  let result = []
  nodes.forEach(node => {
    if (node.type === 'file' && node.info) {
      result.push({
        id: node.id,
        name: node.info.name,
        host: node.info.host,
        port: node.info.port,
        username: node.info.username,
        password: node.info.password,
        authMethod: node.info.authMethod || 'password',
        privateKey: node.info.privateKey || '',
        passphrase: node.info.passphrase || '',
        encoding: node.info.encoding || 'utf8'
      })
    }
    if (node.children && node.children.length > 0) {
      result = result.concat(getAllConnections(node.children))
    }
  })
  return result
}

// 加载保存的连接
const loadConnections = async () => {
  try {
    const data = await window.electron.ipcRenderer.invoke('get-connections')
    if (data && Array.isArray(data)) {
      connections.value = getAllConnections(data)
    }
  } catch (error) {
    console.error('获取连接数据失败:', error)
  }
}

// 处理连接
const handleConnect = (connection) => {
  console.log('快速连接信息:', connection)
  // 确保传递完整的连接信息
  const connectionInfo = {
    info: {
      name: connection.name || '未命名连接',
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      password: connection.password,
      authMethod: connection.authMethod || 'password',
      privateKey: connection.privateKey || '',
      passphrase: connection.passphrase || '',
      encoding: connection.encoding || 'utf8'
    },
    type: 'file'
  }
  
  // 调用父组件传入的 onConnect 函数
  props.onConnect(connectionInfo)
}

onMounted(() => {
  loadConnections()

  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.on('connections:updated', loadConnections)
  }
})

onBeforeUnmount(() => {
  if (window.electron?.ipcRenderer) {
    window.electron.ipcRenderer.removeListener('connections:updated', loadConnections)
  }
})
</script>

<style scoped>
.quick-connect {
  height: 100%;
  padding: 20px;
  background-color: var(--el-bg-color);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.welcome-section {
  text-align: center;
  margin-bottom: 30px;
}

.welcome-section h1 {
  font-size: 1.8em;
  color: var(--el-text-color-primary);
  margin-bottom: 10px;
}

.welcome-section p {
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 10px;
}

.section-header h2 {
  font-size: 1.2em;
  color: var(--el-text-color-primary);
  margin: 0;
}

.connection-list {
  background: var(--el-bg-color-overlay);
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.list-container {
  width: 100%;
}

.list-header {
  display: flex;
  padding: 12px 16px;
  background-color: var(--el-fill-color-light);
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-weight: 500;
  color: var(--el-text-color-primary);
  font-size: 0.9em;
}

.list-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  align-items: center;
  transition: background-color 0.2s;
  color: var(--el-text-color-regular);
}

.list-item:hover {
  background-color: var(--el-fill-color-light);
}

.list-item:last-child {
  border-bottom: none;
}

/* 列宽设置 */
.name-col {
  flex: 2;
  padding-right: 16px;
  color: var(--el-text-color-regular);
}

.host-col {
  flex: 2;
  padding-right: 16px;
  color: var(--el-text-color-regular);
}

.user-col {
  flex: 1;
  padding-right: 16px;
  color: var(--el-text-color-regular);
}

.action-col {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  padding: 40px;
  text-align: center;
  color: var(--el-text-color-secondary);
}

/* 按钮样式调整 */
:deep(.el-button--small) {
  padding: 6px 12px;
  font-size: 0.85em;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .user-col {
    display: none;
  }
  
  .action-col {
    flex: 1;
  }
}
</style> 