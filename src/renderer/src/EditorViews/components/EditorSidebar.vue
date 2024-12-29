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
      node-key="path"
      lazy
    >
      <template #default="{ node, data }">
        <div 
          class="custom-tree-node" 
          @click="handleNodeClick(data)"
          @dblclick.stop="handleNodeDoubleClick(data)"
          @contextmenu.prevent="handleContextMenu($event, data)"
        >
          <el-icon>
            <Folder v-if="data.type === 'directory'" />
            <Document v-else />
          </el-icon>
          <span>{{ node.label }}</span>
        </div>
      </template>
    </el-tree>

    <!-- 右键菜单 -->
    <div 
      v-show="showContextMenu" 
      class="context-menu"
      :style="{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }"
    >
      <div class="menu-item" @click="handleDelete">
        <el-icon><Delete /></el-icon>
        <span>删除</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, h, watch } from 'vue'
import { Document, Folder, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

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
  console.log('开始加载节点:', node, props.connectionId)

  if (node.level === 0) {
    console.log('加载根节点')
    const parentPath = props.currentPath ? 
      props.currentPath.substring(0, props.currentPath.lastIndexOf('/')) || '/' : 
      '/'
    console.log('父目录路径:', parentPath)

    try {
      if (!props.connectionId) {
        console.log('未找到有效的连接ID,仅创建根节点')
        resolve([{ 
          name: parentPath, 
          path: parentPath, 
          type: 'directory',
          isLeaf: false
        }])
        return
      }

      console.log('开始加载根目录文件列表...')
      const files = await window.electron.ipcRenderer.invoke('ssh:list-files', {
        connectionId: props.connectionId,
        path: parentPath
      })
      console.log('根目录文件列表加载完成，文件数量:', files.length)

      resolve([{ 
        name: parentPath, 
        path: parentPath, 
        type: 'directory',
        isLeaf: files.length === 0
      }])
    } catch (error) {
      console.error('检查根目录失败:', error)
      resolve([{ name: parentPath, path: parentPath, type: 'directory' }])
    }
    return
  }

  if (!props.connectionId) {
    console.log('未找到有效的连接ID，无法加载子节点')
    resolve([])
    return
  }

  try {
    console.log('开始加载子节点，路径:', node.data.path)
    const files = await window.electron.ipcRenderer.invoke('ssh:list-files', {
      connectionId: props.connectionId,
      path: node.data.path
    })
    console.log('子节点文件列表加载完成，文件数量:', files.length)

    // 对于文件夹，预先检查是否为空
    const processedFiles = await Promise.all(files.map(async file => {
      if (file.type === 'directory') {
        console.log('检查目录是否为空:', file.path)
        try {
          const subFiles = await window.electron.ipcRenderer.invoke('ssh:list-files', {
            connectionId: props.connectionId,
            path: file.path
          })
          console.log('目录检查完成:', file.path, '包含文件数:', subFiles.length)
          return {
            ...file,
            isLeaf: subFiles.length === 0
          }
        } catch (error) {
          console.error('检查子目录失败:', error)
          return file
        }
      }
      return file
    }))
    console.log('所有文件处理完成，总数:', processedFiles.length)
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
  console.log('节点被点击:', data)
  if (data.type === 'file') {
    if (!isFileOpenable(data.name)) {
      console.log('文件类型不支持打开:', data.name)
      ElMessage.warning('该类型的文件不支持在编辑器中打开')
      return
    }
    console.log('触发文件点击事件:', data)
    emit('file-click', data)
  }
}

const handleNodeDoubleClick = (data) => {
  console.log('节点被双击:', data)
  if (data.type === 'file') {
    if (!isFileOpenable(data.name)) {
      console.log('文件类型不支持打开:', data.name)
      ElMessage.warning('该类型的文件不支持在编辑器中打开')
      return
    }
    console.log('触发文件双击事件:', data)
    emit('file-dblclick', data)
  }
}

const showContextMenu = ref(false)
const menuPosition = ref({ x: 0, y: 0 })
const selectedNode = ref(null)

// 处理右键菜单
const handleContextMenu = (e, data) => {
  e.preventDefault()
  e.stopPropagation()  // 阻止事件冒泡
  selectedNode.value = data
  menuPosition.value = {
    x: e.clientX,
    y: e.clientY
  }
  showContextMenu.value = true
}

// 倒计时相关
const countdown = ref(5)
const confirmButtonText = computed(() => {
  return countdown.value > 0 ? `确定 (${countdown.value}s)` : '确定'
})

// 处理删除操作
const handleDelete = async () => {
  showContextMenu.value = false
  const node = selectedNode.value
  if (!node) return
  
  try {
    // 如果是目录，先检查是否为空
    if (node.type === 'directory') {
      const files = await window.electron.ipcRenderer.invoke('ssh:list-files', {
        connectionId: props.connectionId,
        path: node.path
      })
      
      if (files.length > 0) {
        ElMessage.warning('不能删除非空文件夹')
        return
      }
    }

    // 重置倒计时
    countdown.value = 5
    let timer = startCountdown()

    try {
      // 显示确认对话框
      await ElMessageBox.confirm(
        h('div', { class: 'delete-confirm-content' }, [
          h('p', { class: 'warning-text' }, '⚠️ 警告：删除后将无法恢复'),
          h('p', { class: 'file-info' }, [
            '确定要删除',
            node.type === 'directory' ? '文件夹' : '文件',
            ' "',
            h('span', { class: 'file-name' }, node.name),
            '" 吗？'
          ])
        ]),
        '删除确认',
        {
          confirmButtonText: confirmButtonText.value,
          distinguishCancelAndClose: true,
          confirmButtonProps: {
            disabled: true,
            class: 'is-disabled'
          },
          beforeClose: async (action, instance, done) => {
            if (action === 'confirm' && countdown.value > 0) {
              return
            }
            clearInterval(timer)
            done()
          },
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'delete-confirm-dialog'
        }
      )

      // 执行删除操作
      await window.electron.ipcRenderer.invoke('ssh:delete-file', {
        connectionId: props.connectionId,
        path: node.path,
        isDirectory: node.type === 'directory'
      })

      // 刷新父节点
      const treeInstance = treeRef.value
      const currentNode = treeInstance.getNode(node)
      const parentNode = currentNode.parent
      if (parentNode && parentNode.level !== 0) {
        parentNode.loaded = false
        parentNode.expand()
      }

      ElMessage.success('删除成功')
    } catch (error) {
      // 只有在不是取消操作时才显示错误
      const errorStr = error.toString().toLowerCase()
      if (!errorStr.includes('cancel') && !errorStr.includes('close')) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败: ' + error.message)
      }
      // 确保清理定时器
      if (timer) {
        clearInterval(timer)
      }
    }
  } catch (error) {
    console.error('检查目录失败:', error)
    ElMessage.error('检查目录失败: ' + error.message)
  }
}

// 创建倒计时定时器
const startCountdown = () => {
  countdown.value = 5
  return setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
      // 更新确认按钮状态
      const confirmButton = document.querySelector('.delete-confirm-dialog .el-button--primary')
      if (confirmButton) {
        confirmButton.disabled = countdown.value > 0
        confirmButton.classList.toggle('is-disabled', countdown.value > 0)
        // 更新按钮文本
        confirmButton.textContent = countdown.value > 0 ? `确定 (${countdown.value}s)` : '确定'
      }
    }
  }, 1000)
}

// 修改确认对话框的显示
const showDeleteConfirm = async (node) => {
  let timer = startCountdown()
  try {
    await ElMessageBox.confirm(
      `确定要删除${node.type === 'directory' ? '文件夹' : '文件'} "${node.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定 (5s)',  // 设置初始文本
        distinguishCancelAndClose: true,
        beforeClose: async (action, instance, done) => {
          if (action === 'confirm' && countdown.value > 0) {
            return
          }
          clearInterval(timer)
          done()
        },
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    return true
  } catch (error) {
    clearInterval(timer)
    return false
  }
}

// 点击其他地方关闭菜单
const closeContextMenu = () => {
  showContextMenu.value = false
}

// 添加和移除全局点击事件监听
onMounted(() => {
  setTimeout(() => {
    document.addEventListener('click', closeContextMenu)
    document.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('.custom-tree-node')) {
        closeContextMenu()
      }
    })
  }, 0)
})

onUnmounted(() => {
  document.removeEventListener('click', closeContextMenu)
  document.removeEventListener('contextmenu', (e) => {
    if (!e.target.closest('.custom-tree-node')) {
      closeContextMenu()
    }
  })
})

// 展开到指定路径并选中
const expandAndSelect = async (path) => {
  if (!path || !treeRef.value) return

  try {
    console.log('准备展开并选中路径:', path)
    // 获取父目录路径
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
    console.log('父目录路径:', parentPath)

    // 先展开父目录
    const parentNode = treeRef.value.getNode(parentPath)
    if (parentNode) {
      console.log('找到父节点，开始展开')
      await parentNode.expand()
      // 等待节点加载完成
      await new Promise(resolve => setTimeout(resolve, 100))
      console.log('父节点展开完成')
    }

    // 选中目标文件
    console.log('设置当前选中节点:', path)
    treeRef.value.setCurrentKey(path)
  } catch (error) {
    console.error('展开并选中文件失败:', error)
  }
}

// 监听 currentPath 的变化
watch(() => props.currentPath, async (newPath) => {
  if (newPath && newPath !== '/' && treeRef.value) {
    await expandAndSelect(newPath)
  }
})

// 监听 connectionId 的变化，重新加载根目录
watch(() => props.connectionId, async (newId) => {
  console.log('连接ID变化，准备重新加载目录:', newId)
  if (newId && treeRef.value) {
    // 获取根节点
    const rootNode = treeRef.value.getNode('/')
    if (rootNode) {
      // 重置节点状态
      rootNode.loaded = false
      rootNode.expanded = false
      // 触发重新加载
      await rootNode.expand()
      console.log('根目录重新加载完成')
    }
  }
})

// 暴露方法给父组件
defineExpose({
  expandAndSelect
})
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

/* 右键菜单样式 */
.context-menu {
  position: fixed;
  z-index: 9999;
  background: var(--el-bg-color);
  border-radius: 4px;
  box-shadow: var(--el-box-shadow-light);
  padding: 4px 0;
  min-width: 120px;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 28px;
  font-size: 13px;
  cursor: pointer;
  color: var(--el-text-color-regular);
}

.menu-item:hover {
  background-color: var(--el-fill-color-light);
}

.menu-item .el-icon {
  margin-right: 8px;
  font-size: 14px;
}

/* 添加禁用按钮的样式 */
:deep(.el-message-box__btns .el-button--primary[disabled]) {
  cursor: not-allowed;
  opacity: 0.7;
}

/* 删除确认对话框样式 */
:deep(.delete-confirm-dialog) {
  .delete-confirm-content {
    margin-bottom: 12px;
    text-align: center;
  }

  .warning-text {
    color: var(--el-color-danger);
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .file-info {
    color: var(--el-text-color-regular);
    font-size: 14px;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  .file-name {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-family: monospace;
    background-color: var(--el-fill-color-light);
    padding: 2px 4px;
    border-radius: 2px;
    word-break: break-all;
    max-width: 100%;
    display: inline-block;
  }

  /* 调整消息框的整体样式 */
  &.el-message-box {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .el-message-box__header {
    text-align: center;
    width: 100%;
  }

  .el-message-box__content {
    text-align: center;
    width: 100%;
  }

  .el-message-box__btns {
    justify-content: center;
    .el-button--primary {
      font-size: 13px;
      
      &[disabled],
      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.5;
        background-color: var(--el-button-disabled-bg);
        border-color: var(--el-button-disabled-border-color);
        color: var(--el-button-disabled-text-color);
        pointer-events: none;
      }
    }
    
    .el-button--default {
      font-size: 13px;
    }
  }
}
</style> 