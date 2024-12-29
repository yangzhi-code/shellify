<template>
  <div class="editor-layout">
    <!-- 左侧边栏 -->
    <div class="editor-sidebar" :style="{ width: sidebarWidth + 'px' }">
      <EditorSidebar 
        :connection-id="connectionId"
        :current-path="currentPath"
        @file-click="handleFileClick"
        @file-dblclick="handleFileDoubleClick"
      />
    </div>

    <!-- 拖动条 -->
    <div 
      class="resize-handle"
      @mousedown="startResize"
    ></div>

    <!-- 主编辑区域 -->
    <div class="editor-main">
      <!-- 顶部工具栏 -->
      <EditorToolbar @save="handleSave" />

      <!-- 标签栏 -->
      <EditorTabs
        :tabs="tabs"
        :active-tab="activeTab"
        @switch="handleTabSwitch"
        @close="handleTabClose"
      />

      <!-- 编辑器内容区 -->
      <EditorContent
        :tabs="tabs"
        :active-tab="activeTab"
        @cursor-change="handleCursorChange"
        @content-change="handleContentChange"
        ref="editorRef"
      />

      <!-- 底部状态栏 -->
      <EditorStatusBar
        :file-type="fileType"
        :cursor-position="cursorPosition"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import EditorSidebar from './components/EditorSidebar.vue'
import EditorToolbar from './components/EditorToolbar.vue'
import EditorTabs from './components/EditorTabs.vue'
import EditorContent from './components/EditorContent.vue'
import EditorStatusBar from './components/EditorStatusBar.vue'
import EditorIpcService from '../services/EditorIpcService'

// 状态管理
const tabs = ref([])
const activeTab = ref(null)
const fileType = ref('Text')
const cursorPosition = ref('Ln 1, Col 1')
const editorRef = ref(null)

// 当前编辑器的连接信息
const currentConnection = ref({
  data: { id: null },
  filePath: '',
  fileName: '',
  fileType: 'text'
})

// 计算属性：获取连接 ID
const connectionId = computed(() => currentConnection.value?.data?.id)

// 添加计算属性用于处理路径
const currentPath = computed(() => currentConnection.value?.filePath || '/')

// 添加侧边栏宽度调整相关的状态
const sidebarWidth = ref(200)
const isResizing = ref(false)

// 开始调整大小
const startResize = (e) => {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sidebarWidth.value

  const handleMouseMove = (e) => {
    if (!isResizing.value) return
    const newWidth = startWidth + e.clientX - startX
    // 限制最小和最大宽度
    sidebarWidth.value = Math.min(Math.max(newWidth, 160), 600)
  }

  const handleMouseUp = () => {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }

  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 初始化标签页
onMounted(() => {
  // 监听文件打开请求
  EditorIpcService.onFileOpen((fileInfo) => {
    console.log('EditorIpcService 收到文件信息:', fileInfo)
    if (fileInfo && typeof fileInfo === 'object') {
      // 更新当前连接信息
      currentConnection.value = fileInfo
      console.log('开始打开文件-------:', currentConnection.value)
      
      // 转换为统一格式
      handleFileClick({
        path: fileInfo.filePath,
        name: fileInfo.fileName,
        type: 'file'
      })
    }
  })
})

// 处理文件点击
const handleFileClick = async (fileInfo) => {
  console.log('处理文件点击:', fileInfo)
  if (!fileInfo?.path) {
    console.warn('无效的文件信息:', fileInfo)
    return
  }

  try {
    console.log('Opening file:', fileInfo.path)
    
    // 如果标签页已存在，切换到该标签页
    if (tabs.value.some(tab => tab.path === fileInfo.path)) {
      handleTabSwitch(fileInfo.path)
      return
    }

    // 先创建标签页，但不包含内容
    const newTab = {
      path: fileInfo.path,
      name: fileInfo.name,
      content: undefined, // 初始为 undefined
      type: fileInfo.type
    }
    console.log('创建新标签页:', newTab)
    tabs.value.push(newTab)
    handleTabSwitch(fileInfo.path)

    // 读取文件内容
    const result = await window.electron.ipcRenderer.invoke('ssh:read-file', {
      connectionId: connectionId.value,
      path: fileInfo.path
    })

    if (!result) {
      throw new Error('读取文件失败：未获取到内容')
    }

    // 处理二进制文件
    if (result.binary) {
      ElMessage.warning('这是一个二进制文件，可能无法正确显示')
    }

    // 更新标签页内容
    const tab = tabs.value.find(t => t.path === fileInfo.path)
    if (tab) {
      // 确保所有必要的属性都存在
      Object.assign(tab, {
        content: result.content || '',
        encoding: result.encoding || 'utf8',
        binary: result.binary || false
      })
    }

  } catch (error) {
    console.error('打开文件失败:', error)
    // 如果读取失败，移除标签页
    const index = tabs.value.findIndex(tab => tab.path === fileInfo.path)
    if (index !== -1) {
      tabs.value.splice(index, 1)
    }
    ElMessage.error('打开文件失败：' + error.message)
  }
}

// 处理标签切换
const handleTabSwitch = async (path) => {
  activeTab.value = path
  // 更新当前路径，这会触发 EditorSidebar 中的 watch
  currentConnection.value = {
    ...currentConnection.value,
    filePath: path
  }
}

// 处理标签关闭
const handleTabClose = (path) => {
  const index = tabs.value.findIndex(tab => tab.path === path)
  if (index === -1) return

  tabs.value.splice(index, 1)
  
  // 如果关闭的是当前标签页，切换到其他标签页
  if (path === activeTab.value) {
    activeTab.value = tabs.value[index] // 切换到下一个
      ? tabs.value[index].path
      : tabs.value[index - 1] // 或者上一个
        ? tabs.value[index - 1].path
        : null // 或者没有标签页了
  }
}

// 处理保存
const handleSave = async () => {
  const tab = tabs.value.find(tab => tab.path === activeTab.value)
  if (!tab) return

  try {
    const content = editorRef.value.getContent(tab.path)
    await window.electron.ipcRenderer.invoke('ssh:save-file', {
      connectionId: connectionId.value,
      path: tab.path,
      content
    })
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('Failed to save file:', error)
    ElMessage.error('保存失败：' + error.message)
  }
}

// 处理光标位置变化
const handleCursorChange = ({ line, column, totalLines, totalChars }) => {
  cursorPosition.value = totalLines ? 
    `Ln ${line}, Col ${column} (${totalLines} 行, ${totalChars} 字符)` :
    `Ln ${line}, Col ${column}`
}

// 处理内容变化
const handleContentChange = (path, content) => {
  const tab = tabs.value.find(tab => tab.path === path)
  if (tab) {
    tab.content = content
  }
}

// 处理文件双击
const handleFileDoubleClick = async (fileInfo) => {
  console.log('处理文件双击:', fileInfo)
  if (fileInfo.type === 'file') {
    console.log('准备打开文件')
    await handleFileClick(fileInfo)
  }
}

onUnmounted(() => {
  // 清理 IPC 监听器
  EditorIpcService.removeFileOpenListener()
})
</script>

<style scoped>
.editor-layout {
  height: 100vh;
  display: flex;
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', sans-serif;
  overflow: hidden;
  position: fixed; /* 防止页面滚动 */
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.editor-sidebar {
  height: 100%;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex-shrink: 0; /* 止侧边栏被压缩 */
}

/* 拖动条样式 */
.resize-handle {
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  position: relative;
  flex-shrink: 0;
}

.resize-handle:hover,
.resize-handle:active {
  background: var(--el-color-primary-light-8);
}

.resize-handle::after {
  content: '';
  position: absolute;
  left: -2px;
  width: 9px;
  height: 100%;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--el-bg-color);
}

/* 工具栏样式 */
:deep(.editor-toolbar) {
  height: 35px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* 标签栏样式 */
:deep(.editor-tabs) {
  height: 35px;
  background: var(--el-bg-color-page);
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

/* 编辑器内容区域 */
:deep(.editor-content) {
  flex: 1;
  overflow: hidden;
  background: var(--el-bg-color);
  min-height: 0;
}

/* 状态栏样式 */
:deep(.editor-status-bar) {
  height: 22px;
  padding: 0 8px;
  font-size: 12px;
  background: var(--el-bg-color);
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}
</style> 