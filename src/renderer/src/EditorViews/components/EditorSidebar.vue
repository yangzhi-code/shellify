<template>
  <div class="editor-sidebar">
    <div class="sidebar-header">
      <span class="title">资源管理器</span>
    </div>
    <el-tree
      ref="treeRef"
      :data="treeData"
      :props="defaultProps"
      :load="loadNode"
      lazy
    >
      <template #default="{ node, data }">
        <div 
          class="custom-tree-node" 
          @click="handleNodeClick(data)"
          @dblclick.stop="handleNodeDoubleClick(data)"
        >
          <el-icon>
            <Folder v-if="data.type === 'directory'" />
            <Document v-else />
          </el-icon>
          <span>{{ node.label }}</span>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Document, Folder } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  },
  currentPath: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['file-click', 'file-dblclick'])
const treeRef = ref(null)
const treeData = ref([])

const defaultProps = {
  children: 'children',
  label: 'name',
  isLeaf: (data) => data.type === 'file' || data.isLeaf
}

const loadNode = async (node, resolve) => {
  if (node.level === 0) {
    const parentPath = props.currentPath ? 
      props.currentPath.substring(0, props.currentPath.lastIndexOf('/')) || '/' : 
      '/'
    try {
      const files = await window.electron.ipcRenderer.invoke('ssh:list-files', {
        connectionId: props.connectionId,
        path: parentPath
      })
      resolve([{ 
        name: parentPath, 
        path: parentPath, 
        type: 'directory',
        isLeaf: files.length === 0  // 如果目录为空，设置为叶子节点
      }])
    } catch (error) {
      console.error('检查根目录失败:', error)
      resolve([{ name: parentPath, path: parentPath, type: 'directory' }])
    }
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
    // 对于文件夹，预先检查是否为空
    const processedFiles = await Promise.all(files.map(async file => {
      if (file.type === 'directory') {
        try {
          const subFiles = await window.electron.ipcRenderer.invoke('ssh:list-files', {
            connectionId: props.connectionId,
            path: file.path
          })
          return {
            ...file,
            isLeaf: subFiles.length === 0  // 如果目录为空，设置为叶子节点
          }
        } catch (error) {
          console.error('检查子目录失败:', error)
          return file
        }
      }
      return file
    }))
    resolve(processedFiles)
  } catch (error) {
    console.error('加载文件失败:', error)
    resolve([])
  }
}

// 定义可打开的文件类型
const OPENABLE_EXTENSIONS = new Set([
  // 文本文件
  'txt', 'log', 'md', 'markdown',

  // 配置文件
  'json', 'yaml', 'yml', 'toml', 'ini', 'conf', 'config',
  'properties', 'prop', 'env',

  // 编程语言
  'js', 'jsx', 'ts', 'tsx', 'vue', 'html', 'htm', 'css', 'scss', 'less',
  'py', 'pyw', 'java', 'c', 'cpp', 'h', 'hpp', 'cs', 'go', 'rs',
  'php', 'rb', 'pl', 'pm', 'sh', 'bash', 'zsh', 'fish',
  'sql', 'mysql', 'pgsql', 'lua', 'swift',

  // 标记语言
  'xml', 'svg', 'wxml', 'xaml',
])

// 定义特殊文件名列表（不带扩展名但可以打开的文件）
const SPECIAL_FILES = new Set([
  'dockerfile',
  'makefile',
  'jenkinsfile',
  '.env',
  '.gitignore',
  '.dockerignore',
  'nginx.conf',
  '.babelrc',
  '.eslintrc',
  '.prettierrc',
])

// 检查文件是否可以打开
const isFileOpenable = (filename) => {
  // 转换为小写以进行大小写不敏感的比较
  const lowerFilename = filename.toLowerCase()

  // 检查特殊文件名
  if (SPECIAL_FILES.has(lowerFilename)) {
    return true
  }

  // 获取文件扩展名
  const ext = lowerFilename.split('.').pop()
  return OPENABLE_EXTENSIONS.has(ext)
}

const handleNodeClick = (data) => {
  console.log('Node clicked:', data)
  if (data.type === 'file' && !isFileOpenable(data.name)) {
    ElMessage.warning('该类型的文件不支持在编辑器中打开')
    return
  }
  emit('file-click', data)
}

const handleNodeDoubleClick = (data) => {
  console.log('Node double clicked:', data)
  if (data.type === 'file' && !isFileOpenable(data.name)) {
    ElMessage.warning('该类型的文件不支持在编辑器中打开')
    return
  }
  if (data.type === 'file') {
    console.log('Emitting file-dblclick event')
    emit('file-dblclick', data)
  }
}
</script>

<style scoped>
.editor-sidebar {
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