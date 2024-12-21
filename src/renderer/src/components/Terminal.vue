<template>
  <div class="terminal-wrapper">
    <QuickConnect 
      v-show="showQuickConnect" 
      :item="props.item"
      :onConnect="handleQuickConnect" 
    />
    <div 
      v-show="!showQuickConnect" 
      ref="terminalContainer" 
      class="terminal-container"
    ></div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import 'xterm/css/xterm.css'
import { useTabsStore } from '../store/terminalStore'
import { TerminalManager } from '../utils/TerminalManager'
import { TerminalInputHandler } from '../utils/TerminalInputHandler'
import { TerminalCommandHandler } from '../utils/TerminalCommandHandler'
import QuickConnect from './QuickConnect.vue'

const tabsStore = useTabsStore()

// Props
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

// 计算是否显示快速连接界面
const showQuickConnect = computed(() => {
  const info = props.item.info
  return !info.host || !info.username || !info.password
})

// 引用和状态
const terminalContainer = ref(null)
const terminalManager = ref(null)
const inputHandler = ref(null)
const commandHandler = ref(null)

const emit = defineEmits(['connected'])

// 布局模式：terminal(仅终端)、split(终端和文件)、file(仅文件)
const layoutMode = ref('terminal')

// 处理快速连接选择
const handleQuickConnect = async (connection) => {
  try {
    // 更新当前标签的连接信息
    props.item.info = {
      name: connection.info.name || '未命名连接',
      host: connection.info.host,
      port: connection.info.port,
      username: connection.info.username,
      password: connection.info.password
    }
    // 初始化终端
    initTerminal()
    
    // 连接到服务器
    if (props.item.info.host && !props.item.data) {
      connectToServer(props.item.info)
    }
  } catch (error) {
    console.error('连接失败:', error)
    terminalManager.value?.writeln('连接失败' + error.message)
  }
}

// 初始化终端
const initTerminal = () => {
  try {
    terminalManager.value = new TerminalManager({
      fontSize: 14,
      rows: 30,
      cols: 80
    })

    const terminal = terminalManager.value.init(terminalContainer.value)
    if (!terminal) {
      throw new Error('Terminal initialization failed')
    }
    
    commandHandler.value = new TerminalCommandHandler(terminalManager.value)
    inputHandler.value = new TerminalInputHandler(terminalManager.value, commandHandler.value)

    // 监听用户输入
    const disposable = terminal.onData((data) => {
      inputHandler.value?.handleInput(data, {
        connectionId: props.item.data?.id,
        username: props.item.info.username,
        host: props.item.info.host
      })
    })

    // 监听终端输出
    window.electron.ipcRenderer.on('terminal-output', (event, data) => {
      if (data.connectionId === props.item.data?.id) {
        // 使用 requestAnimationFrame 进行输出
        requestAnimationFrame(() => {
          terminalManager.value?.write(data.output);
        });
      }
    })

    // 监听口大小变化
    const handleResize = () => {
      terminalManager.value?.resize()
      if (props.item.data?.id) {
        const { cols, rows } = terminal
        window.electron.ipcRenderer.send('resize-terminal', {
          connectionId: props.item.data.id,
          cols,
          rows
        })
      }
    }

    window.addEventListener('resize', handleResize)

    // 添加 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(() => {
      if (terminalManager.value) {
        terminalManager.value.resize()
      }
    })
    resizeObserver.observe(terminalContainer.value)

    // 保存清理函数引用
    terminal._cleanup = () => {
      disposable.dispose()
      window.removeEventListener('resize', handleResize)
      resizeObserver.disconnect()  // 清理 ResizeObserver
    }
  } catch (error) {
    console.error('Terminal initialization error:', error)
  }
}

// 连接到服务器
const connectToServer = async (serverInfo) => {
  
  terminalManager.value.writeln('正在连接到服务器...')
  console.log("快速连接",serverInfo)
  try {
    const response = await window.electron.ipcRenderer.invoke('new-connection', {
      host: serverInfo.host,
      port: serverInfo.port,
      username: serverInfo.username,
      password: serverInfo.password
    });
    
    props.item.data = response;
    terminalManager.value.writeln('连接成功！')
    emit('connected', response.id)
  } catch (error) {
    terminalManager.value.writeln('连接失败：' + error.message)
  }
}

// 生命周期钩子
onMounted(() => {
  // 只有当有完的连接信息时才初始化终端
  if (!showQuickConnect.value) {
    initTerminal()
    if (props.item.info.host && !props.item.data) {
      connectToServer(props.item.info)
    }
  }
})

onBeforeUnmount(() => {
  try {
    // 先清理事件监听
    window.removeEventListener('resize', () => {
      terminalManager.value?.resize()
    })

    // 断开 SSH 连接
    if (props.item.data?.id) {
      window.electron.ipcRenderer.invoke('disconnect', props.item.data.id)
    }

    // 最后销毁���端
    if (terminalManager.value) {
      terminalManager.value.dispose()
      terminalManager.value = null
    }
  } catch (error) {
    console.error('Terminal cleanup error:', error)
  }
})
</script>

<style scoped>
.terminal-wrapper {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: column;
}

.terminal-container {
  width: 100%;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  flex: 1;
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

/* 添加选中文本的样式 */
:deep(.xterm-selection) {
  background-color: rgba(255, 255, 255, 0.3) !important;
}

/* 添加光标样式 */
:deep(.xterm-cursor) {
  background-color: #fff;
}
</style>
