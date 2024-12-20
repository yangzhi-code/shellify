<template>
  <div class="quick-connect">
    <div class="welcome-section">
      <h1>欢迎使用 Shellify</h1>
      <p>选择一个保存的连接或创建新连接开始使用</p>
    </div>

    <div class="connection-section">
      <div class="section-header">
        <h2>保存的连接</h2>
        <el-button type="primary" @click="createNewConnection">
          <el-icon><Plus /></el-icon>新建连接
        </el-button>
      </div>

      <div class="connection-grid">
        <el-card 
          v-for="conn in connections" 
          :key="conn.id" 
          class="connection-card"
          :class="{ 'favorite': conn.favorite }"
          shadow="hover"
        >
          <div class="card-content">
            <div class="connection-icon">
              <el-icon><Monitor /></el-icon>
            </div>
            <div class="connection-info">
              <h3>{{ conn.name || '未命名连接' }}</h3>
              <p>{{ conn.username }}@{{ conn.host }}</p>
              <p class="description">{{ conn.description || '无描述' }}</p>
            </div>
          </div>
          <div class="card-actions">
            <el-button type="primary" @click="handleConnect(conn)">
              连接
            </el-button>
            <el-button @click="handleEdit(conn)">
              编辑
            </el-button>
          </div>
        </el-card>

        <!-- 空状态展示 -->
        <div v-if="connections.length === 0" class="empty-state">
          <el-empty description="暂无保存的连接">
            <el-button type="primary" @click="createNewConnection">
              创建新连接
            </el-button>
          </el-empty>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Monitor } from '@element-plus/icons-vue'

const connections = ref([])

// Props
const props = defineProps({
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
  } catch (error) {
    ElMessage.error('加载连接列表失败')
    console.error('Failed to load connections:', error)
  }
}

// 处理连接
const handleConnect = (connection) => {
  props.onConnect(connection)
}

// 创建新连接
const createNewConnection = () => {
  // TODO: 实现新建连接的逻辑
  ElMessage.info('新建连接功能开发中')
}

// 编辑连接
const handleEdit = (connection) => {
  // TODO: 实现编辑连接的逻辑
  ElMessage.info('编辑连接功能开发中')
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
  font-size: 2em;
  color: var(--el-text-color-primary);
  margin-bottom: 12px;
}

.welcome-section p {
  color: var(--el-text-color-secondary);
  font-size: 1em;
}

.connection-section {
  flex: 1;
  min-height: 0; /* 重要：防止flex子元素溢出 */
}

.section-header {
  margin-bottom: 20px;
}

.connection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding-bottom: 20px;
}

.connection-card {
  border: 1px solid var(--el-border-color-light);
  transition: all 0.3s ease;
}

.connection-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-content {
  display: flex;
  align-items: flex-start;
  padding: 16px;
}

.connection-icon {
  font-size: 24px;
  color: var(--el-color-primary);
  margin-right: 16px;
  padding: 12px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.connection-info {
  flex: 1;
}

.connection-info h3 {
  margin: 0 0 8px 0;
  color: var(--el-text-color-primary);
}

.connection-info p {
  margin: 4px 0;
  color: var(--el-text-color-secondary);
  font-size: 0.9em;
}

.description {
  font-size: 0.85em;
  color: var(--el-text-color-secondary);
  margin-top: 8px;
}

.card-actions {
  padding: 12px 16px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

.favorite {
  border: 1px solid var(--el-color-primary-light-5);
}

.empty-state {
  grid-column: 1 / -1;
  padding: 40px;
  text-align: center;
}
</style> 