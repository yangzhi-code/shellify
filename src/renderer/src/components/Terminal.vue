<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useTabsStore } from '../store/terminalStore'
import { TerminalManager } from '../utils/TerminalManager'
import { TerminalInputHandler } from '../utils/TerminalInputHandler'
import { TerminalCommandHandler } from '../utils/TerminalCommandHandler'

const tabsStore = useTabsStore()

// Props
const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

// 引用和状态
const terminalContainer = ref(null)
const terminalManager = ref(null)
const inputHandler = ref(null)
const commandHandler = ref(null)

// 初始化终端
const initTerminal = () => {
  terminalManager.value = new TerminalManager({
    fontSize: 14,
    rows: 30,
    cols: 80
  })

  const terminal = terminalManager.value.init(terminalContainer.value)
  
  commandHandler.value = new TerminalCommandHandler(terminalManager.value)
  inputHandler.value = new TerminalInputHandler(terminalManager.value, commandHandler.value)

  // 监听用户输入
  terminal.onData((data) => {
    inputHandler.value.handleInput(data, {
      connectionId: props.item.data?.id,
      username: props.item.info.username,
      host: props.item.info.host
    })
  })

  // 监听终端输出
  window.electron.ipcRenderer.on('terminal-output', (event, data) => {
    if (data.connectionId === props.item.data?.id) {
      terminalManager.value.write(data.output)
    }
  })

  // 监听窗口大小变化
  window.addEventListener('resize', () => {
    terminalManager.value.resize()
    if (props.item.data?.id) {
      const { cols, rows } = terminal
      window.electron.ipcRenderer.send('resize-terminal', {
        connectionId: props.item.data.id,
        cols,
        rows
      })
    }
  })
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
    showPrompt()
  } catch (error) {
    terminalManager.value.writeln('连接失败：' + error.message)
  }
}

// 显示命令提示符
const showPrompt = () => {
  const prompt = commandHandler.value.getPrompt(
    props.item.info.username,
    props.item.info.host
  )
  terminalManager.value.write(prompt)
}

// 生命周期钩子
onMounted(() => {
  initTerminal()
  if (props.item.info.host && !props.item.data) {
    connectToServer(props.item.info)
  }
})

onBeforeUnmount(() => {
  if (props.item.data?.id) {
    window.electron.ipcRenderer.invoke('disconnect', props.item.data.id)
  }
  terminalManager.value?.dispose()
})
</script>

<style scoped>
.terminal-container {
  width: 100%;
  height: 100%;
  background-color: #1e1e1e;
}
</style>
