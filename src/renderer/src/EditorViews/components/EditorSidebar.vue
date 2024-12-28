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
  overflow: hidden;
  user-select: none;
  background: var(--el-bg-color);
}

.sidebar-header {
  height: 35px;
  padding: 0 12px;
  display: flex;
  align-items: center;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--el-text-color-secondary);
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

:deep(.el-tree) {
  flex: 1;
  overflow: auto;
  padding: 8px 0;
  font-size: 13px;
  background: transparent;
  height: 0;
}

:deep(.el-tree-node) {
  white-space: nowrap;
  outline: none;
}

:deep(.el-tree-node__content) {
  height: 22px;
  padding-left: 8px !important;
}

:deep(.el-tree-node__children) {
  padding-left: 12px;
}

:deep(.el-tree-node__expand-icon) {
  padding: 4px;
  margin-right: 2px;
  font-size: 12px;
}

:deep(.el-tree-node__expand-icon.expanded) {
  transform: rotate(90deg);
}

.custom-tree-node {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  height: 100%;
  font-size: 13px;
  padding-right: 8px;
}

:deep(.el-icon) {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-right: 2px;
}

:deep(.el-tree-node__content:hover) {
  background-color: var(--el-fill-color-light);
}

:deep(.el-tree-node.is-current > .el-tree-node__content) {
  background-color: var(--el-fill-color-darker);
  color: var(--el-color-primary);
}

:deep(.el-tree-node.is-expanded > .el-tree-node__content .el-icon) {
  color: var(--el-color-primary);
}
</style> 