<template>
  <div class="command-panel">
  <div class="command-input-row">
      <textarea
        v-model="commandText"
        class="cmd-textarea"
        placeholder="输入要发送的命令，支持多行；按 Ctrl+Enter 发送，或点发送按钮。"
        @keydown="onKeyDown"
      ></textarea>
      <div class="command-controls">
        <el-select v-model="target" size="small" class="target-select" placeholder="发送到">
          <el-option label="当前会话" value="current" />
          <el-option label="全部会话" value="all" />
        </el-select>
        <el-button size="small" type="primary" @click="sendCommand" :disabled="!commandText.trim()">发送</el-button>
        <el-button size="small" @click="clear">清除</el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useTabsStore } from '../../stores/terminalStore'

const props = defineProps({
  connectionId: {
    type: String,
    default: ''
  }
})

const commandText = ref('')
const target = ref('current')
const tabsStore = useTabsStore()

// 支持 Ctrl+Enter 快捷发送：监听 keydown
const onKeyDown = (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    sendCommand()
  }
}

const sendCommand = async () => {
  const text = (commandText.value || '').trim()
  if (!text) {
    ElMessage.warning('请输入命令')
    return
  }

  // 将多行文本按行发送：去掉空行并在每行末尾追加回车
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  const dataToSend = lines.join('\r') + '\r'

  if (target.value === 'current') {
    if (!props.connectionId) {
      ElMessage.error('当前会话未连接')
      return
    }
    window.electron.ipcRenderer.send('terminal-input', {
      id: props.connectionId,
      data: dataToSend
    })
    ElMessage.success('已发送到当前会话')
  } else {
    // send to all connected sessions via main ipc handler
    try {
      const result = await window.electron.ipcRenderer.invoke('ssh:send-commands', {
        data: dataToSend
      });

      if (result.sent === 0) {
        ElMessage.warning('没有可用的会话进行发送')
      } else {
        ElMessage.success(`已发送到 ${result.sent} 个会话`)
      }
    } catch (err) {
      console.error('发送到全部会话失败:', err)
      ElMessage.error('发送到全部会话失败: ' + (err.message || String(err)))
    }
  }
  commandText.value = ''
}

const clear = () => {
  commandText.value = ''
}
</script>

<style scoped>
.command-panel {
  padding: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.command-input-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.cmd-textarea {
  width: 100%;
  flex: 1;
  padding: 8px 10px;
  border-radius: 4px;
  border: 1px solid var(--el-border-color);
  background: var(--el-input-bg-color);
  color: var(--el-text-color-regular);
  resize: vertical;
  min-height: 80px;
  max-height: 400px;
  font-family: monospace;
  font-size: 13px;
}
.command-controls {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-start;
}
.target-select {
  width: 160px;
}
.hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

