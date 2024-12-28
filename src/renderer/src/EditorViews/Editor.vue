<template>
  <div class="editor-layout">
    <!-- 左侧边栏 -->
    <div class="editor-sidebar">
      <EditorSidebar 
        :connection-id="connectionId"
        @file-click="handleFileClick" 
      />
    </div>

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
import { ref, onMounted, onUnmounted } from 'vue'
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

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  }
})

// 处理文件点击
const handleFileClick = async (fileInfo) => {
  // 如果标签页已存在，切换到该标签页
  if (tabs.value.some(tab => tab.path === fileInfo.filePath)) {
    handleTabSwitch(fileInfo.filePath)
    return
  }

  try {
    // 使用 SSH 连接信息读取文件
    const content = await window.electron.ipcRenderer.invoke('ssh:read-file', {
      connectionId: props.connectionId,
      path: fileInfo.filePath
    })
    tabs.value.push({
      path: fileInfo.filePath,
      name: fileInfo.fileName,
      content,
      type: fileInfo.fileType
    })
    handleTabSwitch(fileInfo.filePath)
  } catch (error) {
    console.error('Failed to open file:', error)
    ElMessage.error('打开文件失败：' + error.message)
  }
}

// 处理标签切换
const handleTabSwitch = (path) => {
  activeTab.value = path
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
      connectionId: props.connectionId,
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
const handleCursorChange = ({ line, column }) => {
  cursorPosition.value = `Ln ${line}, Col ${column}`
}

// 处理内容变化
const handleContentChange = (path, content) => {
  const tab = tabs.value.find(tab => tab.path === path)
  if (tab) {
    tab.content = content
  }
}

// 监听文件打开请求
onMounted(() => {
  console.log('Editor component mounted')
  EditorIpcService.onFileOpen(async (info) => {
    console.log('Received file info:', info)
    handleFileClick(info)
  })
})

onUnmounted(() => {
  EditorIpcService.removeFileOpenListener(handleFileClick)
})
</script>

<style scoped>
.editor-layout {
  height: 100vh;
  display: flex;
  background: var(--el-bg-color);
}

.editor-sidebar {
  width: 250px;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-overlay);
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
</style> 