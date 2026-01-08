<template>
  <div class="terminal-controls" role="region" aria-label="终端控制">
  <div class="controls-inner">
      <div class="input-wrap" ref="inputWrap">
        <input
          v-model="command"
          class="command-input"
          @keyup.enter="onSend"
          placeholder="在此输入命令并回车发送到终端"
        />
        <div class="btn-group-inside" ref="btnGroup">
          <el-button class="btn-inside" size="small" @click="onSend" :disabled="!command">发送</el-button>
          <el-button class="btn-inside" size="small" @click="onClear">清除</el-button>
          <el-button class="btn-inside" size="small" @click="toggleFullscreen" :title="props.isFullscreen ? '退出全屏' : '进入全屏'">
            <el-icon v-if="!props.isFullscreen"><Monitor /></el-icon>
            <el-icon v-else><Fold /></el-icon>
          </el-button>
          <el-button class="btn-inside" size="small" @click="onClearTerminal" title="清屏">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Monitor, Fold, Refresh } from '@element-plus/icons-vue'
const emit = defineEmits(['send', 'toggle-fullscreen', 'clear-terminal'])

const props = defineProps({
  isFullscreen: {
    type: Boolean,
    default: false
  }
})

const command = ref('')

const onSend = () => {
  if (!command.value) return
  emit('send', command.value)
  command.value = ''
}

const onClear = () => {
  command.value = ''
}

const toggleFullscreen = () => {
  emit('toggle-fullscreen')
}

const onClearTerminal = () => {
  emit('clear-terminal')
}
</script>

<style scoped>
.terminal-controls {
  width: 100%;
  display: flex;
  justify-content: center;

  margin-top: auto; /* push to bottom inside a column flex container */
  margin-bottom: 12px; /* keep a small distance from bottom */
}
.controls-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px;
  border-radius: 6px;
  pointer-events: auto;
  height: 40px; /* slightly taller to comfortably fit input and buttons */
  box-sizing: border-box;
}
.command-input {
  min-width: 320px;
  max-width: 520px;
  width: 46vw;
  height: 32px;
  border-radius: 18px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--el-text-color-regular);
  padding-left: 15px;
  line-height: 20px;
  box-shadow: none;
}
.buttons {
  display: flex;
  gap: 6px;
  align-items: center;
  height: 100%;
}

.input-wrap {
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 900px;
  position: relative;
}
.command-input {
  flex: 1;
  padding-right: 12px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  box-sizing: border-box;
  margin: 0;
}
.btn-group-inside {
  display: flex;
  gap: 6px;
  height: 32px;
  margin-left: 12px;
  align-items: center;
}
.btn-inside {
  background: #111;
  color: #fff;
  border-radius: 6px;
  height: 32px;
  padding: 0 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: none !important;
  box-shadow: none !important;
  outline: none !important;
  line-height: 1;
  font-size: 13px;
}
.btn-inside:disabled {
  opacity: 0.5;
  background: rgba(0,0,0,0.5);
  color: rgba(255,255,255,0.6);
}
/* Ensure Element Plus inner styles don't add extra border or background */
.btn-inside .el-button__inner {
  background: transparent !important;
  color: inherit !important;
  padding: 0 6px !important;
  height: 100% !important;
  display: inline-flex !important;
  align-items: center !important;
  justify-content: center !important;
  box-shadow: none !important;
  border: none !important;
}
.btn-inside:focus,
.btn-inside:active,
.btn-inside.is-active,
.btn-inside.is-focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
</style>


