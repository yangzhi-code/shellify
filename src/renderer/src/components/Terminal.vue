<template>
  <div class="terminal-wrapper">
    <QuickConnect v-if="showQuickConnect" @connect="handleQuickConnect" />
    <div v-else ref="terminalContainer" class="terminal-container"></div>
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

// 处理快速连接选择
const handleQuickConnect = (connection) => {
  // 更新当前标签的连接信息
  props.item.info = { ...connection }
  // 初始化终端并连接
  initTerminal()
  connectToServer(connection)
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

    // 监听窗口大小变化
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

    // 保存清理函数引用
    terminal._cleanup = () => {
      disposable.dispose()
      window.removeEventListener('resize', handleResize)
    }
  } catch (error) {
    console.error('Terminal initialization error:', error)
  }
}

// 连接到服务器
const connectToServer = async (serverInfo) => {
  terminalManager.value.writeln('正在连接到服务器...')
  try {
    const response = await window.electron.ipcRenderer.invoke('new-connection', {
      host: serverInfo.host,
      port: serverInfo.port,
      username: serverInfo.username,
      password: serverInfo.password
    });
    
    props.item.data = response;
    terminalManager.value.writeln('连接成功！')
  } catch (error) {
    terminalManager.value.writeln('连接失败：' + error.message)
  }
}

// 生命周期钩子
onMounted(() => {
  // 只有当有完整的连接信息时才初始化终端
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

    // 最后销毁终端
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
}

.terminal-container {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #1e1e1e;
  padding: 10px;
}

:deep(.xterm-viewport),
:deep(.xterm),
:deep(.xterm-screen) {
  width: 100% !important;
  height: 100% !important;
}

:deep(.xterm-viewport) {
  padding: 10px;
  box-sizing: border-box;
}
</style>
