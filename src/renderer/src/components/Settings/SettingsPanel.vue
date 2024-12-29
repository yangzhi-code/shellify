<template>
  <div 
    class="settings-panel"
    :class="{ 'settings-panel-open': visible }"
  >
    <div class="settings-header">
      <h2>设置</h2>
      <el-button 
        class="close-button" 
        @click="$emit('update:visible', false)"
        text
      >
        <el-icon><Close /></el-icon>
      </el-button>
    </div>

    <div class="settings-content">
      <el-tabs type="border-card">
        <!-- 常规设置 -->
        <el-tab-pane>
          <template #label>
            <el-icon><Setting /></el-icon>
            <span>常规</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="主题">
              <el-select v-model="settings.theme" class="full-width">
                <el-option label="浅色" value="light" />
                <el-option label="深色" value="dark" />
                <el-option label="跟随系统" value="system" />
              </el-select>
            </el-form-item>
            <el-form-item label="界面缩放">
              <el-select v-model="settings.zoom" class="full-width">
                <el-option label="100%" value="100" />
                <el-option label="125%" value="125" />
                <el-option label="150%" value="150" />
              </el-select>
            </el-form-item>
            <el-form-item label="语言">
              <el-select v-model="settings.language" class="full-width">
                <el-option label="简体中文" value="zh-CN" />
                <el-option label="English" value="en-US" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 终端设置 -->
        <el-tab-pane>
          <template #label>
            <el-icon><Monitor /></el-icon>
            <span>终端</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="终端字体">
              <el-select v-model="settings.terminalFont" class="full-width">
                <el-option label="Menlo" value="Menlo" />
                <el-option label="Monaco" value="Monaco" />
                <el-option label="Consolas" value="Consolas" />
                <el-option label="JetBrains Mono" value="JetBrains Mono" />
                <el-option label="Fira Code" value="Fira Code" />
              </el-select>
            </el-form-item>
            <el-form-item label="终端字体大小">
              <el-input-number v-model="settings.terminalFontSize" :min="12" :max="20" class="full-width" />
            </el-form-item>
            <el-form-item label="光标样式">
              <el-select v-model="settings.cursorStyle" class="full-width">
                <el-option label="块状" value="block" />
                <el-option label="下划线" value="underline" />
                <el-option label="竖线" value="bar" />
              </el-select>
            </el-form-item>
            <el-form-item label="终端透明度">
              <el-slider v-model="settings.terminalOpacity" :min="0.3" :max="1" :step="0.1" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 编辑器设置 -->
        <el-tab-pane>
          <template #label>
            <el-icon><Edit /></el-icon>
            <span>编辑器</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="Tab 大小">
              <el-input-number v-model="settings.tabSize" :min="2" :max="8" class="full-width" />
            </el-form-item>
            <el-form-item label="自动保存">
              <el-switch v-model="settings.autoSave" />
            </el-form-item>
            <el-form-item label="自动保存延迟(秒)">
              <el-input-number 
                v-model="settings.autoSaveDelay" 
                :min="1" 
                :max="60"
                :disabled="!settings.autoSave"
                class="full-width"
              />
            </el-form-item>
            <el-form-item label="显示行号">
              <el-switch v-model="settings.showLineNumbers" />
            </el-form-item>
            <el-form-item label="启用代码折叠">
              <el-switch v-model="settings.codeFolding" />
            </el-form-item>
            <el-form-item label="文件编码">
              <el-select v-model="settings.fileEncoding" class="full-width">
                <el-option label="UTF-8" value="utf8" />
                <el-option label="GBK" value="gbk" />
                <el-option label="GB2312" value="gb2312" />
              </el-select>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 快捷键设置 -->
        <el-tab-pane>
          <template #label>
            <el-icon><Operation /></el-icon>
            <span>快捷键</span>
          </template>
          <el-form label-position="top" class="shortcut-form">
            <el-form-item label="新建终端">
              <el-input v-model="settings.shortcuts.newTerminal" readonly @click="startCapture($event, 'newTerminal')" />
            </el-form-item>
            <el-form-item label="关闭终端">
              <el-input v-model="settings.shortcuts.closeTerminal" readonly @click="startCapture($event, 'closeTerminal')" />
            </el-form-item>
            <el-form-item label="分屏模式">
              <el-input v-model="settings.shortcuts.splitMode" readonly @click="startCapture($event, 'splitMode')" />
            </el-form-item>
            <el-form-item label="文件模式">
              <el-input v-model="settings.shortcuts.fileMode" readonly @click="startCapture($event, 'fileMode')" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="settings-footer">
      <el-button @click="resetSettings">恢复默认</el-button>
      <div class="footer-right">
        <el-button @click="$emit('update:visible', false)">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存设置</el-button>
      </div>
    </div>
  </div>

  <!-- 遮罩层 -->
  <div 
    class="settings-overlay"
    :class="{ 'settings-overlay-visible': visible }"
    @click="$emit('update:visible', false)"
  ></div>
</template>

<script setup>
import { ref, watch, toRaw } from 'vue'
import { Close, Setting, Monitor, Edit, Operation } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { themeManager } from '../../styles/theme'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])

// 扩展设置数据
const settings = ref({
  theme: 'system',
  zoom: '100',
  language: 'zh-CN',
  fontSize: 14,
  terminalFont: 'Menlo',
  terminalFontSize: 14,
  cursorStyle: 'block',
  terminalOpacity: 1,
  tabSize: 4,
  autoSave: true,
  autoSaveDelay: 3,
  showLineNumbers: true,
  codeFolding: true,
  fileEncoding: 'utf8',
  shortcuts: {
    newTerminal: 'Ctrl + T',
    closeTerminal: 'Ctrl + W',
    splitMode: 'Ctrl + S',
    fileMode: 'Ctrl + F'
  }
})

// 快捷键捕获
const startCapture = (event, shortcutKey) => {
  const input = event.target
  input.value = '按下快捷键...'
  
  const handler = (e) => {
    e.preventDefault()
    const keys = []
    if (e.ctrlKey) keys.push('Ctrl')
    if (e.altKey) keys.push('Alt')
    if (e.shiftKey) keys.push('Shift')
    if (e.metaKey) keys.push('Cmd')
    if (e.key !== 'Control' && e.key !== 'Alt' && e.key !== 'Shift' && e.key !== 'Meta') {
      keys.push(e.key.toUpperCase())
    }
    
    if (keys.length > 0) {
      settings.value.shortcuts[shortcutKey] = keys.join(' + ')
      document.removeEventListener('keydown', handler)
    }
  }
  
  document.addEventListener('keydown', handler)
  input.blur()
}

// 重置设置
const resetSettings = async () => {
  try {
    const defaultSettings = await window.electron.ipcRenderer.invoke('settings:reset')
    settings.value = { ...defaultSettings }
    ElMessage.success('设置已重置')
  } catch (error) {
    ElMessage.error('重置设置失败：' + error.message)
  }
}

// 监听主题变化
watch(() => settings.value.theme, (newTheme) => {
  themeManager.applyTheme(newTheme)
})

// 保存设置
const saveSettings = async () => {
  try {
    const settingsValue = toRaw(settings.value)
    await window.electron.ipcRenderer.invoke('settings:save', settingsValue)
    ElMessage.success('设置保存成功')
    // 应用主题
    themeManager.applyTheme(settingsValue.theme)
  } catch (error) {
    ElMessage.error('设置保存失败：' + error.message)
  }
}

// 加载设置
const loadSettings = async () => {
  try {
    const savedSettings = await window.electron.ipcRenderer.invoke('settings:load')
    if (savedSettings) {
      settings.value = { ...settings.value, ...savedSettings }
    }
  } catch (error) {
    console.error('加载设置失败：', error)
  }
}

// 监听可见性变化，当面板打开时加载设置
watch(() => props.visible, (newValue) => {
  if (newValue) {
    loadSettings()
  }
})
</script>

<style scoped>
.settings-panel {
  position: fixed;
  top: 0;
  right: -50%;
  width: 50%;
  height: 100vh;
  background: var(--el-bg-color);
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.15);
  z-index: 2000;
  transition: right 0.3s ease;
  display: flex;
  flex-direction: column;
}

.settings-panel-open {
  right: 0;
}

.settings-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.close-button {
  font-size: 20px;
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.settings-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-right {
  display: flex;
  gap: 12px;
}

.settings-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1999;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.3s ease;
}

.settings-overlay-visible {
  opacity: 1;
  visibility: visible;
}

:deep(.el-tabs__header) {
  margin-bottom: 15px;
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.el-tabs__nav-wrap::after) {
  height: 1px;
}

:deep(.el-form-item) {
  margin-bottom: 20px;
}

:deep(.el-tabs__item) {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 32px;
  line-height: 32px;
}

.full-width {
  width: 100%;
}

.shortcut-form :deep(.el-input__inner) {
  cursor: pointer;
}

:deep(.el-tabs__content) {
  padding: 15px;
}

:deep(.el-icon) {
  vertical-align: middle;
}

:deep(.el-input__inner),
:deep(.el-input-number__decrease),
:deep(.el-input-number__increase),
:deep(.el-select),
:deep(.el-switch) {
  background-color: var(--settings-input-bg);
  border-color: var(--settings-input-border);
  color: var(--settings-input-text);

  &:hover {
    border-color: var(--settings-input-hover-border);
  }

  &:focus {
    border-color: var(--settings-input-focus-border);
  }
}

:deep(.el-form-item__label) {
  color: var(--settings-label-text);
}

:deep(.el-select-dropdown) {
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color);
}

:deep(.el-select-dropdown__item) {
  color: var(--el-text-color-regular);

  &.hover {
    background-color: var(--el-fill-color-light);
  }

  &.selected {
    color: var(--el-color-primary);
    background-color: var(--el-color-primary-light-9);
  }
}
</style> 