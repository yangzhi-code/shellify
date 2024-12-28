<template>
  <div class="editor-sidebar-container">
    <div class="sidebar-header">
      <span class="title">资源管理器</span>
    </div>
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="defaultProps"
      :load="loadNode"
      lazy
      @node-click="handleNodeClick"
    >
      <template #default="{ node, data }">
        <span class="custom-tree-node">
          <el-icon>
            <Folder v-if="data.type === 'directory'" />
            <Document v-else />
          </el-icon>
          <span>{{ node.label }}</span>
        </span>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Folder, Document } from '@element-plus/icons-vue'

const props = defineProps({
  connectionId: {
    type: String,
    default: ''
  },
  currentPath: {
    type: String,
    default: '/'
  }
})

const emit = defineEmits(['file-click'])
const treeRef = ref(null)
const treeData = ref([])

const defaultProps = {
  children: 'children',
  label: 'name',
  isLeaf: (data) => data.type === 'file'
}

const loadNode = async (node, resolve) => {
  if (node.level === 0) {
    const parentPath = props.currentPath ? 
      props.currentPath.substring(0, props.currentPath.lastIndexOf('/')) || '/' : 
      '/'
    resolve([{ name: parentPath, path: parentPath, type: 'directory' }])
    return
  }

  if (!props.connectionId) {
    console.log('当前连接信息:', { 
      connectionId: props.connectionId, 
      currentPath: props.currentPath 
    })
    resolve([])
    return
  }

  try {
    const files = await window.electron.ipcRenderer.invoke('ssh:list-files', {
      connectionId: props.connectionId,
      path: node.data.path
    })
    resolve(files)
  } catch (error) {
    console.error('加载文件失败:', error)
    resolve([])
  }
}

const handleNodeClick = (data) => {
  if (data.type === 'file') {
    emit('file-click', data)
  }
}
</script>

<style scoped>
.editor-sidebar-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-light);
}

.title {
  font-size: 13px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
}

:deep(.el-tree-node__content) {
  height: 24px;
}
</style> 