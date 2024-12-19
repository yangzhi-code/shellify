<template>
  <div ref="terminalContainer" class="terminal-container"></div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import { useTabsStore } from '../store/terminalStore'
const tabsStore = useTabsStore()
import { toRaw } from 'vue'

// Props
const props = defineProps({
  fontSize: { type: Number, default: 14 },
  rows: { type: Number, default: 30 },
  cols: { type: Number, default: 80 },
  username: { type: String, default: 'root' },
  hostname: { type: String, default: '47.108.49.80' },
  info: {},
  connectionId: ''
})

// 定义引用和状态
const terminalContainer = ref(null)
const terminal = ref(null)
const fitAddon = ref(null)
const currentInput = ref('') // 用户当前输入内容

// 构造动态提示符
const getPrompt = () => {
  // 判断是否为 root 用户
  if (props.username === 'root') {
    return `${props.username}@${props.hostname}:~# `
  } else {
    return `${props.username}@${props.hostname}:~$ `
  }
}

// 初始化终端
const initTerminal = () => {
  terminal.value = new Terminal({
    // 设置字体大小
    fontSize: props.fontSize,
    // 设置终端行数
    rows: props.rows,
    // 设置终端列数
    cols: props.cols,
    cursorBlink: true,
    // 启用鼠标支持，这样就可以选择文本
    mouseEvents: true,
    // 启用右键菜单，方便用户复制/粘贴
    enableClipboard: true,
    // 启用复制功能
    copyOnSelection: true
  })

  fitAddon.value = new FitAddon()
  terminal.value.loadAddon(fitAddon.value)

  if (terminalContainer.value) {
    terminal.value.open(terminalContainer.value)
    fitAddon.value.fit()
  }

  // 初始输出
  terminal.value.writeln('Welcome to your custom terminal!')
  terminal.value.write(getPrompt())
}

// 输入处理逻辑
const handleInput = (data) => {
  //处理没有登录的情况
  if (props.connectionId === null) {
    terminal.value.writeln('请先连接到服务器！')
    return
  }
  // 处理回车逻辑
  if (data === '\r') {
    terminal.value.writeln('')
    const command = currentInput.value.trim()
    // 发送命令到服务器
    sendTerminalInput(props.connectionId, command)
    // 示例命令
    if (command === 'clear') {
      terminal.value.clear()
    } else if (command === 'help') {
      terminal.value.writeln('Available commands: clear, help, exit')
    } else if (command === 'exit') {
      terminal.value.writeln('Goodbye!')
    } else if (command) {
    }
    showPrompt()
  } else if (data === '\u007F') {
    // 处理退格键
    if (currentInput.value.length > 0) {
      currentInput.value = currentInput.value.slice(0, -1)
      terminal.value.write('\b \b')
    }
  } else {
    // 普通字符输入
    currentInput.value += data
    terminal.value.write(data)
  }
}
// 处理终端输入发送到服务器
const sendTerminalInput = (id, input) => {
  window.electron.ipcRenderer
    .invoke('terminal-input', { id, data: input })
    .then((response) => {
      // 逐行处理 stdout 输出，加入提示符
      const outputLines = response.stdout.split('\n')
      outputLines.forEach((line) => {
        terminal.value?.writeln(line) // 写入每一行的输出
      })
      showPrompt()
    })
    .catch((error) => {
      console.error('发送命令失败', error)
    })
}
//终端输出结束后，显示新的提示符
const showPrompt = () => {
  currentInput.value = ''
  terminal.value.write(getPrompt())
}

// 调整终端大小
const resizeTerminal = () => {
  if (fitAddon.value) fitAddon.value.fit()
}
// 连接服务器
const connectToServer = (serverInfo) => {
  window.electron.ipcRenderer
    .invoke('new-connection', serverInfo)
    .then((response) => {
      console.log(response)
      tabsStore.editableTabs.find((item) => item.id === serverInfo.id).data = response
    })
    .catch((error) => {
      console.error('连接失败', error)
    })
}

// 初始化
onMounted(() => {
  initTerminal()
  //连接服务器
  console.log('连接信息', props.info)
  const rawInfo = toRaw(props.info) // 获取非响应式对象
  if (props.info.host && props.info.port && props.info.username && props.info.password) {
    connectToServer(rawInfo)
  }
  // 监听用户输入
  terminal.value.onData(handleInput)

  // 监听窗口调整
  window.addEventListener('resize', resizeTerminal)
})

// 曝露方法
defineExpose({
  write: (data) => terminal.value?.write(data),
  onData: (callback) => terminal.value?.onData(callback)
})
</script>

<style>
.terminal-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: #1e1e1e;
  /* 允许用户选择文本 */
  user-select: text;
}
</style>
