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
            <span class="name-col">{{ conn.info.name || '未命名连接' }}</span>
            <span class="host-col">{{ conn.info.host }}</span>
            <span class="user-col">{{ conn.info.username }}</span>
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
import { ref, onMounted } from 'vue'
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

// 递归获取所有文件类型的连接
const getAllFileConnections = (items) => {
  let result = [];
  
  const traverse = (items) => {
    items.forEach(item => {
      if (item.type === 'file') {
        result.push(item);
      } else if (item.children && Array.isArray(item.children)) {
        traverse(item.children);
      }
    });
  };
  
  traverse(items);
  return result;
};

// 加载保存的连接
const loadConnections = async () => {
  try {
    const savedConnections = await window.electron.ipcRenderer.invoke('get-connections')
    // 递归获取所有文件类型的连接
    connections.value = getAllFileConnections(savedConnections)
    console.log("调试1",connections.value)
  } catch (error) {
    ElMessage.error('加载连接列表失败')
    console.error('Failed to load connections:', error)
  }
}

// 处理连接
const handleConnect = (connection) => {
  // 更新当前标签的连接信息
  props.item.info = {
    name: connection.info.name || '未命名连接',
    host: connection.info.host,
    port: connection.info.port,
    username: connection.info.username,
    password: connection.info.password
  }
  
  // 调用父组件传入的 onConnect 函数
  props.onConnect(connection)
}

onMounted(() => {
  loadConnections()
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
  margin: 0;
}

.connection-list {
  background: #fff;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.list-container {
  width: 100%;
}

.list-header {
  display: flex;
  padding: 12px 16px;
  background-color: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
  font-weight: 500;
  color: #000;
  font-size: 0.9em;
}

.list-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  align-items: center;
  transition: background-color 0.2s;
  color: #000;
}

.list-item:hover {
  background-color: #f5f7fa;
}

.list-item:last-child {
  border-bottom: none;
}

/* 列宽设置 */
.name-col {
  flex: 2;
  padding-right: 16px;
  color: #000;
}

.host-col {
  flex: 2;
  padding-right: 16px;
  color: #000;
}

.user-col {
  flex: 1;
  padding-right: 16px;
  color: #000;
}

.action-col {
  flex: 1;
  display: flex;
  justify-content: flex-end;
}

.empty-state {
  padding: 40px;
  text-align: center;
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