<template>
    <div class="terminal-layout">
      <!-- 布局切换按钮 -->
      <div class="layout-switcher" v-show="!showQuickConnect">
        <el-button-group class="button-group">
          <el-button
            :type="layoutMode === 'terminal' ? 'primary' : 'default'"
            @click="switchLayout('terminal')"
            size="small"
            class="layout-button"
          >
            <el-icon><Monitor /></el-icon>
          </el-button>
          <template v-if="!showQuickConnect">
            <el-button
              :type="layoutMode === 'split' ? 'primary' : 'default'"
              @click="switchLayout('split')"
              size="small"
              :disabled="!isConnected"
              :title="!isConnected ? '请先连接到服务器' : ''"
              class="layout-button"
            >
              <el-icon><Folder /></el-icon>
            </el-button>
            <el-button
              :type="layoutMode === 'file' ? 'primary' : 'default'"
              @click="switchLayout('file')"
              size="small"
              :disabled="!isConnected"
              :title="!isConnected ? '请先连接到服务器' : ''"
              class="layout-button"
            >
              <el-icon><ChatLineSquare /></el-icon>
            </el-button>
          </template>
        </el-button-group>
      </div>
  
      <!-- 内容区域 -->
      <div class="content-area" :class="layoutMode" ref="contentArea">
        <div class="terminal-area" ref="terminalArea">
          <Terminal :item="item" @connected="handleConnected" ref="terminal" />
        </div>
        <div
          v-show="layoutMode === 'split' || layoutMode === 'file'"
          class="resize-handle"
          @mousedown="startResize"
        ></div>
        <div class="file-area" ref="fileArea">
          <!-- In split mode show FileManager; in file mode show CommandPanel (command-send UI) -->
          <FileManager
            v-if="layoutMode === 'split' && item.data?.id"
            :connectionId="item.data.id"
          />
          <CommandPanel
            v-if="layoutMode === 'file' && item.data?.id"
            :connectionId="item.data.id"
          />
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
  import { Monitor, Folder, ChatLineSquare } from '@element-plus/icons-vue'
  import Terminal from './Terminal.vue'
  import FileManager from './FileManager.vue'
  import CommandPanel from './file/CommandPanel.vue'
  
  const props = defineProps({
    item: {
      type: Object,
      required: true
    }
  })
  
  const emit = defineEmits(['connected'])
  const layoutMode = ref('terminal')
  const terminal = ref(null)
  const contentArea = ref(null)
  const terminalArea = ref(null)
  const fileArea = ref(null)
  
  // 计算是否已连接
  const isConnected = computed(() => {
    return !!props.item.data?.id
  })
  
  // 计算是否显示快速连接界面
  const showQuickConnect = computed(() => {
    const info = props.item.info
    if (!info.host || !info.username) return true
    if (info.authMethod === 'password' && !info.password) return true
    if (info.authMethod === 'key' && !info.privateKey) return true
    return false
  })
  
  // 切换布局
  const switchLayout = async (mode) => {
    if ((mode === 'split' || mode === 'file') && !isConnected.value) {
      return
    }
    
    layoutMode.value = mode
    
    // 清除手动调整时设置的内联样式
    const terminalDom = terminalArea.value
    const fileDom = fileArea.value
    if (terminalDom) {
      terminalDom.removeAttribute('style')  // 完全清除内联样式
    }
    if (fileDom) {
      fileDom.removeAttribute('style')  // 完全清除内联样式
    }
    
    await nextTick()
  
    // 强制重绘：触发 DOM 重新计算
    forceRedraw()
  
    // 调整终端大小
    if (terminal.value?.terminalManager?.value) {
      terminal.value.terminalManager.value.resize()
    }
  }
  
  // 强制重绘函数
  const forceRedraw = () => {
    const terminalDom = terminalArea.value
    const fileDom = fileArea.value
    if (terminalDom && fileDom) {
      // 隐藏并立即显示，触发浏览器重绘
      terminalDom.style.display = 'none'
      fileDom.style.display = 'none'
      void terminalDom.offsetHeight // 强制浏览器计算样式
      terminalDom.style.display = ''
      fileDom.style.display = ''
    }
  }
  
  // 监听布局变化
  watch(layoutMode, async () => {
    await nextTick()
    forceRedraw()
    // 调整终端大小
    if (terminal.value?.terminalManager?.value) {
      terminal.value.terminalManager.value.resize()
    }
  })
  
  // 处理终端连接成功
  const handleConnected = (connectionId) => {
    emit('connected', connectionId)
    if ((layoutMode.value === 'split' || layoutMode.value === 'file') && !isConnected.value) {
      layoutMode.value = 'terminal'
    }
  }
  
  // 拖动调整大小
  const startResize = (e) => {
    e.preventDefault()
    const container = contentArea.value
    const terminalArea = container.querySelector('.terminal-area')
    const fileArea = container.querySelector('.file-area')
    const startY = e.clientY
    const startHeight = terminalArea.offsetHeight
  
    const doDrag = (e) => {
      const deltaY = e.clientY - startY
      const containerHeight = container.offsetHeight
      const newTerminalHeight = Math.min(Math.max(100, startHeight + deltaY), containerHeight - 100)
      const percentage = (newTerminalHeight / containerHeight) * 100
  
      terminalArea.style.flex = `0 0 ${percentage}%`
      fileArea.style.flex = `0 0 ${100 - percentage}%`
  
      // 调整终端大小
      if (terminal.value?.terminalManager?.value) {
        terminal.value.terminalManager.value.resize()
      }
    }
  
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag)
      document.removeEventListener('mouseup', stopDrag)
    }
  
    document.addEventListener('mousemove', doDrag)
    document.addEventListener('mouseup', stopDrag)
  }
  
  // 窗口大小调整监听
  const onResize = () => {
    forceRedraw()
    if (layoutMode.value === 'split' || layoutMode.value === 'file') {
      terminal.value?.terminalManager?.value?.resize()
    }
  }
  
  onMounted(() => {
    window.addEventListener('resize', onResize)
  })
  
  onBeforeUnmount(() => {
    window.removeEventListener('resize', onResize)
  })
  </script>
  
  <style scoped>
  .terminal-layout {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
  
  .layout-switcher {
    position: absolute;
    top: 36px;
    right: 18px;
    z-index: 100;
  }
  
  .button-group {
    background: rgba(0, 0, 0, 0.3);
    padding: 4px;
    border-radius: 6px;
    backdrop-filter: blur(5px);
    box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  }
  
  .layout-button {
    background: rgba(255, 255, 255, 0.1) !important;
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    color: #fff !important;
    transition: all 0.3s ease;
  }
  
  .layout-button:hover {
    background: rgba(255, 255, 255, 0.2) !important;
    transform: translateY(-1px);
  }
  
  .layout-button.el-button--primary {
    background: rgba(64, 158, 255, 0.6) !important;
    border-color: rgba(64, 158, 255, 0.6) !important;
  }
  
  .layout-button:disabled {
    background: rgba(255, 255, 255, 0.05) !important;
    color: rgba(255, 255, 255, 0.3) !important;
    cursor: not-allowed;
    transform: none;
  }
  
  /* 图标样式 */
  .el-icon {
    font-size: 16px;
  }
  
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }
  
  /* 分屏模式 */
  .content-area.split {
    flex-direction: column;
    overflow: hidden;
    height: 100%;
  }
  
  /* 终端布局 */
  .content-area.split .terminal-area {
    height: 50%;
    min-height: 100px;
    max-height: calc(100% - 100px);
    position: relative;
    display: flex;
    overflow: hidden;
    border-bottom: 1px solid var(--split-line-color);
  }
  
  .content-area.split .file-area {
    height: 50%;
    min-height: 100px;
    border-top: 1px solid #333;
    overflow: hidden;
    position: relative;
  }
  
  /* 仅终端模式 */
  .content-area.terminal .terminal-area {
    flex: 1;
    overflow: hidden;
  }
  
  .content-area.terminal .file-area {
    display: none;
  }
  
/* 文件(命令)模式：与 split 模式保持一致（上下 50%），并支持拖动调整 */
.content-area.file .terminal-area {
    height: 50%;
    min-height: 100px;
    max-height: calc(100% - 100px);
    position: relative;
    display: flex;
    overflow: hidden;
    border-bottom: 1px solid var(--split-line-color);
  }

  .content-area.file .file-area {
    height: 50%;
    min-height: 100px;
    border-top: 1px solid #333;
    overflow: hidden;
    position: relative;
  }
  
  /* 分割线样式 */
  .resize-handle {
    height: 6px;
    background-color: var(--split-line-color);
    cursor: row-resize;
    position: relative;
    margin: -3px 0;
    z-index: 10;
    flex-shrink: 0;
    transition: background-color 0.3s ease;
    
    /* 悬停效果 */
    &:hover {
      background-color: var(--el-color-primary);
    }
  }
  
  .terminal-area,
  .file-area {
    position: relative;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }
  
  .terminal-area {
    background-color: #1e1e1e;
    display: flex;
    flex-direction: column;
    position: relative;
    overflow: hidden;
  }
  
  .file-area {
    background-color: #fff;
    overflow: auto;
    min-width: 0;
    width: 100%;
  }
  
  /* 禁用状态的按钮样式 */
  .el-button.is-disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .terminal-wrapper {
    width: 100%;
    height: 100%;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  
  .terminal-container {
    width: 100%;
    height: 100%;
    padding: 12px;
    box-sizing: border-box;
    flex: 1;
    overflow: hidden;
    position: relative;
  }
  
  :deep(.xterm-viewport),
  :deep(.xterm),
  :deep(.xterm-screen) {
    width: 100% !important;
    height: 100% !important;
  }
  
  :deep(.xterm-viewport) {
    box-sizing: border-box;
    overflow-y: auto !important;
  }
  
  /* 确保终端容器样式正确 */
  :deep(.terminal-container) {
    flex: 1;
    height: 100% !important;
    overflow: hidden;
    padding: 0;  /* 移除内边距 */
  }
  
  :deep(.xterm) {
    height: 100% !important;
    padding: 12px;  /* 将内边距移到这里 */
  }
  
  :deep(.xterm-viewport) {
    overflow-y: auto !important;
  }
  
  :deep(.xterm-screen) {
    position: relative !important;
  }
  </style>
  