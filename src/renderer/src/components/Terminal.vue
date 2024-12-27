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
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import 'xterm/css/xterm.css'
import { useTabsStore } from '../stores/terminalStore'
import { TerminalManager } from '../utils/TerminalManager'
import { TerminalInputHandler } from '../utils/TerminalInputHandler'
import { TerminalCommandHandler } from '../utils/TerminalCommandHandler'
import QuickConnect from './QuickConnect.vue'
import { throttle } from 'lodash-es';  // 添加 throttle 导入

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
  if (!info.host || !info.username) return true
  if (info.authMethod === 'password' && !info.password) return true
  if (info.authMethod === 'key' && !info.privateKey) return true
  return false
})

// 引用和状态
const terminalContainer = ref(null)
const terminalManager = ref(null)
const inputHandler = ref(null)
const commandHandler = ref(null)

const emit = defineEmits(['connected'])

// 布局模式：terminal(仅终端)、split(终端和文件)、file(仅文件)
const layoutMode = ref('terminal')

// 在 setup 中添加状态
const isConnectionBroken = ref(false);  // 跟踪连接状态
const currentServerInfo = ref(null);    // 保存当前连接信息

// 处理快速连接
const handleQuickConnect = async (connection) => {
  try {
    console.log('快速连接信息:', connection)
    // 确保 connection 和 connection.info 存在
    if (!connection || !connection.info) {
      throw new Error('无效的连接信息')
    }

    // 更新当前标签的连接信息
    props.item.info = {
      name: connection.info.name || '未命名连接',
      host: connection.info.host,
      port: connection.info.port || 22,
      username: connection.info.username,
      authMethod: connection.info.authMethod || 'password',
      ...(connection.info.authMethod === 'password'
        ? { password: connection.info.password }
        : {
            privateKey: connection.info.privateKey,
            passphrase: connection.info.passphrase
          }
      ),
      encoding: connection.info.encoding || 'utf8'
    }

    // 初始化终端
    initTerminal()
    
    // 连接到服务器
    if (props.item.info.host && !props.item.data) {
      await connectToServer(props.item.info)
    }
  } catch (error) {
    console.error('连接失败:', error)
    terminalManager.value?.writeln('连接失败: ' + error.message)
  }
}

// 优化后的终端大小调整函数
const handleTerminalResize = throttle(() => {
  if (terminalManager.value && terminalContainer.value) {
    const { height, width } = terminalContainer.value.getBoundingClientRect();
    if (height > 0 && width > 0) {
      terminalManager.value.resize();
      
      // 如果已连接，同步发送新的尺寸到服务器
      if (props.item.data?.id && terminalManager.value.terminal) {
        const { cols, rows } = terminalManager.value.terminal;
        window.electron.ipcRenderer.send('resize-terminal', {
          connectionId: props.item.data.id,
          cols,
          rows
        });
      }
    }
  }
}, 100);  // 100ms 的节流时间

// 修改 initTerminal 函数中的 resize 相关代码
const initTerminal = () => {
  try {
    terminalManager.value = new TerminalManager({
      fontSize: 14,
    })

    const terminal = terminalManager.value.init(terminalContainer.value)
    if (!terminal) {
      throw new Error('Terminal initialization failed')
    }
    
    commandHandler.value = new TerminalCommandHandler(terminalManager.value)
    inputHandler.value = new TerminalInputHandler(terminalManager.value, commandHandler.value)

    // 使用单一的 onKey 监听处理所有键盘输入
    const disposable = terminal.onKey(e => {
      if (e.key === '\r' && isConnectionBroken.value && currentServerInfo.value) {
        // 清除当前终端内容
        terminalManager.value.clear();
        // 重新连接
        connectToServer(currentServerInfo.value);
      } else if (!isConnectionBroken.value) {
        // 正常的输入处理
        inputHandler.value?.handleInput(e.key, {
          connectionId: props.item.data?.id,
          username: props.item.info.username,
          host: props.item.info.host
        });
      }
    });

    // 监听终端输出
    window.electron.ipcRenderer.on('terminal-output', (event, data) => {
      if (data.connectionId === props.item.data?.id) {
        // 使用 requestAnimationFrame 进行输出
        requestAnimationFrame(() => {
          terminalManager.value?.write(data.output);
        });
      }
    })

    // 使用 ResizeObserver 监听容器大小变化
    const resizeObserver = new ResizeObserver(handleTerminalResize);
    resizeObserver.observe(terminalContainer.value);

    // 监听窗口大小变化
    window.addEventListener('resize', handleTerminalResize);

    // 保存清理函数
    terminal._cleanup = () => {
      disposable.dispose();
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleTerminalResize);
    };
  } catch (error) {
    console.error('Terminal initialization error:', error);
  }
};

// 优化 adjustTerminalSize 函数
const adjustTerminalSize = () => {
  handleTerminalResize();
};

// 连接到服务器
const connectToServer = async (serverInfo) => {
  currentServerInfo.value = serverInfo;  // 保存连接信息
  isConnectionBroken.value = false;      // 重置连接状态
  
  terminalManager.value.writeln('正在连接到服务器...');
  try {
    const response = await window.electron.ipcRenderer.invoke('new-connection', {
      host: serverInfo.host,
      port: serverInfo.port,
      username: serverInfo.username,
      authMethod: serverInfo.authMethod || 'password',
      ...(serverInfo.authMethod === 'password'
        ? { password: serverInfo.password }
        : {
            privateKey: serverInfo.privateKey,
            passphrase: serverInfo.passphrase
          }
      ),
      encoding: serverInfo.encoding || 'utf8'
    });
    
    props.item.data = response;
    terminalManager.value.writeln('连接成功！');
    emit('connected', response.id);

    // 设置连接状态检查
    setupConnectionCheck(response.id);
  } catch (error) {
    handleConnectionError(error);
  }
}

// 处理连接错误
const handleConnectionError = (error) => {
  console.error('连接错误:', error);
  isConnectionBroken.value = true;
  
  // 格式化错误消息
  let errorMessage = '连接失败：';
  if (error.message.includes('认证失败')) {
    errorMessage += '用户名或密码错误';
  } else if (error.message.includes('ETIMEDOUT')) {
    errorMessage += '连接超时，��检查网络或服务器地址';
  } else if (error.message.includes('ECONNREFUSED')) {
    errorMessage += '连接被拒绝，请检查服务器地址和端口';
  } else if (error.message.includes('ENOTFOUND')) {
    errorMessage += '找不到服务器，请检查服务器地址';
  } else {
    errorMessage += error.message;
  }

  // 显示错误消息和重试提示
  terminalManager.value.writeln(`\r\n\x1b[31m${errorMessage}\x1b[0m`);
  terminalManager.value.writeln('\r\n按回车键重试连接...\r\n');

  // 清理连接相关的资源
  if (props.item.data?.id) {
    window.electron.ipcRenderer.invoke('disconnect', props.item.data.id);
    props.item.data = null;
  }
}

// 设置连接状态检查
const setupConnectionCheck = (connectionId) => {
  // 监听连接状态
  window.electron.ipcRenderer.on(`connection:status:${connectionId}`, (_, status) => {
    if (status === 'disconnected') {
      handleDisconnection();
    }
  });
}

// 处理连接断开
const handleDisconnection = () => {
  isConnectionBroken.value = true;
  terminalManager.value.writeln('\r\n\x1b[31m连接已断开\x1b[0m');
  terminalManager.value.writeln('\r\n按回车键重新连接...\r\n');
}

// 修改 watch 逻辑，使用防抖
watch(() => props.item.info, () => {
  nextTick(handleTerminalResize);
}, { deep: true });

// 优化分屏模式变化的监听
watch(() => props.item.layoutMode, (newMode, oldMode) => {
  if (newMode !== oldMode) {
    lastLayoutMode.value = oldMode;
    nextTick(handleTerminalResize);
  }
}, { immediate: true });

// 生命周期钩子
onMounted(() => {
  // 只有当有完的连接信息时才初始化终端
  if (!showQuickConnect.value) {
    initTerminal()
    if (props.item.info.host && !props.item.data) {
      connectToServer(props.item.info)
    }
    // 给一个短暂的延时确保终端完全初始化
    setTimeout(() => {
      adjustTerminalSize()
    }, 100)
  }
})

onBeforeUnmount(() => {
  try {
    // 先移除所有事件监听器
    if (terminalManager.value?.terminal) {
      terminalManager.value.terminal._cleanup?.()
    }

    // 断开 SSH 连接
    if (props.item.data?.id) {
      window.electron.ipcRenderer.invoke('disconnect', props.item.data.id)
        .catch(error => console.warn('断开连接时出错:', error))
    }

    // 最后销毁终端
    if (terminalManager.value) {
      terminalManager.value.dispose()
      terminalManager.value = null
    }
  } catch (error) {
    console.warn('Terminal cleanup error:', error)
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
