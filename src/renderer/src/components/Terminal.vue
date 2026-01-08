<template>
  <div class="terminal-wrapper" ref="terminalWrapper">
    <QuickConnect 
      v-show="showQuickConnect" 
      :item="props.item"
      :onConnect="handleQuickConnect" 
    />
    <div 
      v-show="!showQuickConnect" 
      ref="terminalContainer" 
      class="terminal-container"
    >
      <div ref="xtermHost" class="xterm-host" style="flex:1; min-height:0;"></div>
      <TerminalControls
        v-show="!showQuickConnect"
        @send="handleControlsSend"
        @toggle-fullscreen="toggleFullscreen"
        :is-fullscreen="isFullscreen"
      />
    </div>
  </div>
</template>

<script setup>
import TerminalControls from './TerminalControls.vue'
import { onMounted, onBeforeUnmount, ref, computed, watch, nextTick } from 'vue'
import 'xterm/css/xterm.css'
import { useTabsStore } from '../stores/terminalStore'
import { TerminalManager } from '../utils/TerminalManager'
import { TerminalInputHandler } from '../utils/TerminalInputHandler'
import { TerminalCommandHandler } from '../utils/TerminalCommandHandler'
import QuickConnect from './QuickConnect.vue'
import { throttle, debounce } from 'lodash-es';  // 添加 throttle 和 debounce 导入

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
const xtermHost = ref(null)
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
    await initTerminal()

    // 连接到服务器
    if (props.item.info.host && !props.item.data) {
      await connectToServer(props.item.info)
    }
  } catch (error) {
    console.error('连接失败:', error)
    terminalManager.value?.writeln('连接失败: ' + error.message)
  }
}

// 发送终端大小到服务器（使用 debounce）
const sendTerminalSize = debounce((connectionId, cols, rows) => {
  console.log('发送终端大小到服务器:', { connectionId, cols, rows });
  window.electron.ipcRenderer.send('resize-terminal', {
    connectionId,
    cols: Math.floor(cols),
    rows: Math.floor(rows)
  });
}, 300);  // 300ms 的防抖时间

// 终端大小调整函数
const handleTerminalResize = throttle(() => {
  if (terminalManager.value && terminalContainer.value) {
    const { height, width } = terminalContainer.value.getBoundingClientRect();
    console.log('终端大小调整', height, width);
    if (height > 0 && width > 0) {
      terminalManager.value.resize();
      
      // 如果已连接，同步发送新的尺寸到服务器
      if (props.item.data?.id) {
        const terminal = terminalManager.value._terminal;
        if (terminal) {
          const cols = Math.floor(terminal.cols);
          const rows = Math.floor(terminal.rows);
          console.log('终端尺寸', cols, rows);
          sendTerminalSize(props.item.data.id, cols, rows);
        }
      }
    }
  }
}, 100);

// 获取终端字体配置
const getTerminalFontConfig = async () => {
  try {
    const settings = await window.electron.ipcRenderer.invoke('settings:load')
    return {
      fontSize: settings.terminalFontSize || 14,
      fontFamily: settings.terminalFont ? `"${settings.terminalFont}", monospace` : '"Consolas", "Microsoft YaHei", "微软雅黑", monospace'
    }
  } catch (error) {
    console.error('获取终端字体配置失败:', error)
    return {
      fontSize: 14,
      fontFamily: '"Consolas", "Microsoft YaHei", "微软雅黑", monospace'
    }
  }
}

// 更新终端字体
// 待处理的字体配置（用于在终端初始化前收到的配置）
let pendingFontConfig = null

const updateTerminalFont = (fontConfig) => {
  console.log('终端接收到字体更新事件:', fontConfig)
  if (terminalManager.value && terminalManager.value._terminal) {
    // 终端已初始化，直接更新字体
    const success = terminalManager.value.updateFont(fontConfig.fontSize, fontConfig.fontFamily)
    if (success) {
      console.log('字体设置更新成功')
    } else {
      console.log('字体设置更新失败')
    }
  } else {
    // 终端还没初始化，保存配置等待应用
    console.log('终端未初始化，保存待处理配置:', fontConfig)
    pendingFontConfig = fontConfig
  }
}

// 初始化终端
const initTerminal = async () => {
  try {
    const fontConfig = await getTerminalFontConfig()

    terminalManager.value = new TerminalManager({
      fontSize: fontConfig.fontSize,
      fontFamily: fontConfig.fontFamily,
      scrollBottomOffset: 2
    })
    const terminal = terminalManager.value.init(xtermHost.value || terminalContainer.value)
    if (!terminal) {
      throw new Error('Terminal initialization failed')
    }

    commandHandler.value = new TerminalCommandHandler(terminalManager.value)
    inputHandler.value = new TerminalInputHandler(terminalManager.value, commandHandler.value)

    // 添加输入法事件监听
    terminal.element.addEventListener('compositionstart', (e) => {
      // 输入法编辑开始
      inputHandler.value?.setCompositionMode(true);
    });

    terminal.element.addEventListener('compositionend', (e) => {
      // 输入法编辑结束，发送最终文本
      inputHandler.value?.setCompositionMode(false);
      if (e.data) {
        inputHandler.value?.handleInput(e.data, {
          connectionId: props.item.data?.id,
          username: props.item.info.username,
          host: props.item.info.host
        });
      }
    });

    // 修改原有的 onKey 处理
    const disposable = terminal.onKey(e => {
      if (e.key === '\r' && isConnectionBroken.value && currentServerInfo.value) {
        terminalManager.value.clear();
        connectToServer(currentServerInfo.value);
      } else if (!isConnectionBroken.value && !inputHandler.value?.isComposing) {
        // 只在非输入法编辑状态下处理键盘输入
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
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        if (terminalManager.value && terminalContainer.value) {
          terminalManager.value.resize();
          
          // 如果已连接，同步发送新的尺寸到服务器
          if (props.item.data?.id) {
            const terminal = terminalManager.value._terminal;
            if (terminal) {
              const cols = Math.floor(terminal.cols);
              const rows = Math.floor(terminal.rows);
              sendTerminalSize(props.item.data.id, cols, rows);
            }
          }
        }
      });
    });

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

// 处理从控制组件发送的命令
const handleControlsSend = async (text) => {
  if (!inputHandler.value || !props.item.data?.id) return
  // send each character then enter
  for (const ch of text) {
    inputHandler.value.handleInput(ch, {
      connectionId: props.item.data.id,
      username: props.item.info.username,
      host: props.item.info.host
    })
  }
  // send enter
  inputHandler.value.handleInput('\r', {
    connectionId: props.item.data.id,
    username: props.item.info.username,
    host: props.item.info.host
  })
}

// Fullscreen handling: request fullscreen on the terminal wrapper element
const terminalWrapper = ref(null)
const isFullscreen = ref(false)

const toggleFullscreen = async () => {
  try {
    if (!isFullscreen.value) {
      const el = terminalWrapper.value || document.documentElement
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      }
      // isFullscreen will be updated by the fullscreenchange event
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen()
      } else if (document.webkitExitFullscreen) {
        await document.webkitExitFullscreen()
      }
    }
  } catch (e) {
    console.warn('切换全屏失败', e)
  }
}

// listen to fullscreenchange to adjust terminal and update state
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
  // small delay to allow layout to settle
  setTimeout(() => {
    adjustTerminalSize()
    terminalManager.value?.resize()
  }, 120)
}

onMounted(() => {
  window.addEventListener('fullscreenchange', onFullscreenChange)
})
onBeforeUnmount(() => {
  window.removeEventListener('fullscreenchange', onFullscreenChange)
})

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

    // 连接成功后同步终端大小
    if (terminalManager.value && terminalManager.value._terminal) {
      const { cols, rows } = terminalManager.value._terminal;
      console.log('连接成功，同步终端大小:', { cols, rows });
      sendTerminalSize(response.id, cols, rows);
    }

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
    errorMessage += '连接超时，请检查网络或服务器地址';
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
// 字体更新事件监听器
let fontUpdateHandler = null

// 在组件创建时立即设置自定义事件监听器
fontUpdateHandler = (event) => {
  console.log('自定义事件监听器被触发，接收到字体配置:', event.detail)
  updateTerminalFont(event.detail)
}
console.log('设置自定义字体更新事件监听器')
window.addEventListener('terminal-font-changed', fontUpdateHandler)

onMounted(async () => {
  // 只有当有完的连接信息时才初始化终端
  if (!showQuickConnect.value) {
    await initTerminal()
    if (props.item.info.host && !props.item.data) {
      await connectToServer(props.item.info)
    }
    // 给一个短暂的延时确保终端完全初始化
    setTimeout(() => {
      adjustTerminalSize()
    }, 100)
  }
})

onBeforeUnmount(() => {
  try {
    // 移除自定义字体更新监听器
    if (fontUpdateHandler) {
      window.removeEventListener('terminal-font-changed', fontUpdateHandler)
      fontUpdateHandler = null
    }

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

// NOTE: layout is simplified — TerminalControls is in the container flow (flex column);
// xtermHost is flex:1 so FitAddon will compute available rows automatically.
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
  display: flex;
  flex-direction: column;
  background-color: var(--terminal-bg);
  transition: background-color 0.3s ease;
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
  background-color: var(--terminal-cursor)
  
}

:deep(.xterm) {
  .xterm-viewport {
    background-color: var(--terminal-bg) !important;
    transition: background-color 0.3s ease;
  }
  
  .xterm-screen {
    background-color: var(--terminal-bg);
    transition: background-color 0.3s ease;
  }
  
  /* .xterm-cursor {
    background-color: var(--terminal-cursor) !important;
    border-color: var(--terminal-cursor) !important;
  } */
  
  .xterm-selection {
    background-color: var(--terminal-selection) !important;
  }
}
</style>
