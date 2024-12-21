<template>
    <div class="terminal-layout">
      <!-- 布局切换按钮 -->
      <div class="layout-switcher" v-show="!showQuickConnect">
        <el-button-group>
          <el-button
            :type="layoutMode === 'terminal' ? 'primary' : 'default'"
            @click="switchLayout('terminal')"
            size="small"
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
            >
              <el-icon><CopyDocument /></el-icon>
            </el-button>
            <el-button
              :type="layoutMode === 'file' ? 'primary' : 'default'"
              @click="switchLayout('file')"
              size="small"
              :disabled="!isConnected"
              :title="!isConnected ? '请先连接到服务器' : ''"
            >
              <el-icon><Folder /></el-icon>
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
          v-show="layoutMode === 'split'"
          class="resize-handle"
          @mousedown="startResize"
        ></div>
        <div class="file-area" ref="fileArea">
          <FileManager
            v-if="item.data?.id"
            :connectionId="item.data.id"
          />
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
  import { Monitor, CopyDocument, Folder } from '@element-plus/icons-vue'
  import Terminal from './Terminal.vue'
  import FileManager from './FileManager.vue'
  
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
  
  // 计算是���已连接
  const isConnected = computed(() => {
    return !!props.item.data?.id
  })
  
  // 计算是否显示快速连接界面
  const showQuickConnect = computed(() => {
    const info = props.item.info
    return !info.host || !info.username || !info.password
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
    await nextTick()
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
    if (layoutMode.value === 'split') {
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
    top: 10px;
    right: 10px;
    z-index: 100;
    background-color: rgba(0, 0, 0, 0.6);
    padding: 4px;
    border-radius: 4px;
  }
  
  .content-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    position: relative;
    min-height: 0;
    height: 100%;
  }
  
  /* 分屏模��� */
  .content-area.split {
    flex-direction: column;
    overflow: hidden;
  }
  
  /* 终端布局 */
  .content-area.split .terminal-area {
    flex: 0 0 50%;
    min-height: 100px;
  }
  
  .content-area.split .file-area {
    flex: 0 0 50%;
    min-height: 100px;
    border-top: 1px solid #333;
    overflow: hidden;
  }
  
  /* 仅终端模式 */
  .content-area.terminal .terminal-area {
    flex: 1;
  }
  
  .content-area.terminal .file-area {
    display: none;
  }
  
  /* 仅文件模式 */
  .content-area.file .terminal-area {
    display: none;
  }
  
  .content-area.file .file-area {
    flex: 1;
  }
  
  /* 分割线样式 */
  .resize-handle {
    height: 6px;
    background-color: #333;
    cursor: row-resize;
    position: relative;
    margin: -3px 0;
    z-index: 10;
  }
  
  .resize-handle:hover {
    background-color: #666;
  }
  
  .resize-handle:active {
    background-color: #999;
  }
  
  .terminal-area,
  .file-area {
    position: relative;
    transition: flex 0.1s ease;
    min-height: 0;
    display: flex;
  }
  
  .terminal-area {
    background-color: #1e1e1e;
  }
  
  .file-area {
    position: relative;
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
  </style>
  