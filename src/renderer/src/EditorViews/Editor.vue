<template>
  <div class="editor-container">
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <el-icon class="loading"><Loading /></el-icon>
      加载中...
    </div>
    
    <!-- 错误提示 -->
    <div v-if="error" class="error-message">
      {{ error }}
    </div>

    <!-- 标签栏 -->
    <div class="editor-tabs">
      <div 
        v-for="tab in tabs" 
        :key="tab.path"
        :class="['tab', { active: activeTab === tab.path }]"
        @click="switchTab(tab.path)"
      >
        <span class="tab-name">{{ tab.name }}</span>
        <el-icon class="tab-close" @click.stop="closeTab(tab.path)">
          <Close />
        </el-icon>
      </div>
    </div>

    <!-- 顶部工具栏 -->
    <div class="editor-toolbar">
      <div class="file-info">
        <span class="file-name">{{ currentTab?.name }}</span>
        <span class="file-path">{{ currentTab?.path }}</span>
      </div>
      <div class="toolbar-actions">
        <el-button-group>
          <el-button size="small" @click="saveCurrentFile">
            <el-icon><Document /></el-icon>
            保存
          </el-button>
          <el-button size="small" @click="formatCode">
            <el-icon><Operation /></el-icon>
            格式化
          </el-button>
        </el-button-group>
      </div>
    </div>
    
    <!-- 编辑器主体 -->
    <div class="editor-main">
      <div 
        v-for="tab in tabs" 
        :key="tab.path"
        :ref="el => setEditorRef(el, tab.path)"
        :class="['editor-instance', { hidden: activeTab !== tab.path }]"
      ></div>
    </div>
    
    <!-- 底部状态栏 -->
    <div class="editor-statusbar">
      <div class="status-left">
        <span>{{ getFileType() }}</span>
        <span>{{ getCursorPosition() }}</span>
      </div>
      <div class="status-right">
        <span>UTF-8</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { indentOnInput } from '@codemirror/language'
import { bracketMatching } from '@codemirror/language'
import { foldGutter } from '@codemirror/language'
import { lineNumbers } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Document, Operation, Close, Loading } from '@element-plus/icons-vue'
import EditorIpcService from '../services/EditorIpcService'

// 标签管理
const tabs = ref([])
const activeTab = ref(null)
const editors = new Map()

const loading = ref(false)
const error = ref(null)

// 检查文件是否有未保存的更改
const hasUnsavedChanges = (path) => {
  const editor = editors.get(path)
  if (!editor) return false
  const tab = tabs.value.find(t => t.path === path)
  return editor.state.doc.toString() !== tab.content
}

// 获取当前标签
const currentTab = computed(() => tabs.value.find(tab => tab.path === activeTab.value))

// 创建或切换到标签
const openFile = async (fileInfo) => {
  loading.value = true
  error.value = null
  
  try {
    // 如果标签已存在，切换到该标签
    if (tabs.value.some(tab => tab.path === fileInfo.path)) {
      switchTab(fileInfo.path)
      return
    }

    // 读取文件内容
    const content = await EditorIpcService.readFile(fileInfo.path)
    
    // 创建新标签
    tabs.value.push({
      path: fileInfo.path,
      name: fileInfo.name,
      content
    })
    
    // 切换到新标签
    switchTab(fileInfo.path)
  } catch (err) {
    console.error('Failed to open file:', err)
    error.value = `打开文件失败: ${err.message}`
  } finally {
    loading.value = false
  }
}

// 切换标签
const switchTab = (path) => {
  activeTab.value = path
  // 如果编辑器实例还未创建，创建它
  if (!editors.has(path)) {
    const tab = tabs.value.find(t => t.path === path)
    createEditor(tab.content, path)
  }
}

// 关闭标签
const closeTab = async (path) => {
  const index = tabs.value.findIndex(tab => tab.path === path)
  if (index === -1) return

  // 如果有未保存的更改，提示保存
  if (hasUnsavedChanges(path)) {
    const action = await ElMessageBox.confirm(
      '是否保存更改？',
      '提示',
      {
        confirmButtonText: '保存',
        cancelButtonText: '不保存',
        type: 'warning',
        distinguishCancelAndClose: true
      }
    ).catch(action => action)

    if (action === 'confirm') {
      await saveFile(path)
    }
  }

  // 销毁编辑器实例
  if (editors.has(path)) {
    editors.get(path).destroy()
    editors.delete(path)
  }

  // 移除标签
  tabs.value.splice(index, 1)

  // 如果关闭的是当前标签，切换到其他标签
  if (activeTab.value === path) {
    activeTab.value = tabs.value[Math.min(index, tabs.value.length - 1)]?.path || null
  }
}

// 设置编辑器容器引用
const setEditorRef = (el, path) => {
  if (el) {
    const tab = tabs.value.find(t => t.path === path)
    if (tab && !editors.has(path)) {
      console.log('Creating editor for:', path)
      createEditor(tab.content, path, el)
    }
  }
}

// 创建编辑器实例
const createEditor = (content, path, container) => {
  console.log('Creating editor with content:', content)
  const state = EditorState.create({
    doc: content,
    extensions: [
      lineNumbers(),
      history(),
      indentOnInput(),
      bracketMatching(),
      autocompletion(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle),
      defaultKeymap,
      historyKeymap,
      javascript(),
      oneDark,
      EditorView.theme({
        '&': {
          height: '100%',
          fontSize: '14px'
        },
        '.cm-scroller': {
          fontFamily: 'Consolas, "Courier New", monospace'
        }
      })
    ]
  })

  const view = new EditorView({
    state,
    parent: container
  })

  editors.set(path, view)
  console.log('Editor created for:', path)
}

// 保存当前文件
const saveCurrentFile = () => {
  if (!activeTab.value) return
  saveFile(activeTab.value)
}

// 保存指定文件
const saveFile = async (path) => {
  const editor = editors.get(path)
  if (!editor) return
  
  try {
    await EditorIpcService.saveFile(path, editor.state.doc.toString())
    ElMessage.success('文件保存成功')
  } catch (error) {
    ElMessage.error('保存失败：' + error.message)
  }
}

// 格式化代码
const formatCode = () => {
  // TODO: 实现代码格式化
  ElMessage.info('格式化功能开发中')
}

// 获取文件类型
const getFileType = () => {
  if (!currentTab.value?.name) return 'Text'
  const ext = currentTab.value.name.split('.').pop()?.toLowerCase()
  return ext || 'Text'
}

// 获取光标位置
const getCursorPosition = () => {
  if (!activeTab.value) return 'Ln 1, Col 1'
  const editor = editors.get(activeTab.value)
  if (!editor) return 'Ln 1, Col 1'
  const pos = editor.state.selection.main.head
  const line = editor.state.doc.lineAt(pos)
  return `Ln ${line.number}, Col ${pos - line.from + 1}`
}

onMounted(() => {
  // 监听新文件打开请求
  EditorIpcService.onFileOpen(async (info) => {
    console.log('Received file info:', info)
    openFile(info)
  })
})

onUnmounted(() => {
  // 清理所有编辑器实例
  editors.forEach(editor => editor.destroy())
  editors.clear()
  // 移除事件监听
  EditorIpcService.removeFileOpenListener()
})
</script>

<style scoped>
.editor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);
}

.editor-tabs {
  display: flex;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-light);
  height: 32px;
  overflow-x: auto;
}

.tab {
  display: flex;
  align-items: center;
  padding: 0 16px;
  min-width: 120px;
  max-width: 200px;
  height: 32px;
  border-right: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-overlay);
  cursor: pointer;
  user-select: none;
}

.tab.active {
  background: var(--el-color-primary-light-9);
  border-bottom: 2px solid var(--el-color-primary);
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}

.tab-close {
  margin-left: 8px;
  font-size: 12px;
  opacity: 0.6;
}

.tab-close:hover {
  opacity: 1;
}

.editor-main {
  flex: 1;
  overflow: auto;
  background: var(--el-bg-color);
  position: relative;
}

.editor-instance {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
}

.editor-instance.hidden {
  display: none;
}

.editor-toolbar {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--el-bg-color-overlay);
  border-bottom: 1px solid var(--el-border-color-light);
}

.file-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.file-path {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}

.editor-statusbar {
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-left, .status-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

:deep(.el-button--small) {
  height: 28px;
  padding: 0 12px;
}

:deep(.el-icon) {
  margin-right: 4px;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  overflow: auto;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 16px;
  z-index: 100;
}

.error-message {
  padding: 16px;
  margin: 16px;
  background: var(--el-color-danger-light-9);
  border: 1px solid var(--el-color-danger);
  border-radius: 4px;
  color: var(--el-color-danger);
}

:deep(.el-icon.loading) {
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style> 