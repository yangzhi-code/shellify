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
        <!-- 只保留常规设置 -->
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
            <!-- 其他设置暂时隐藏 -->
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
  theme: 'system'
  // 其他设置暂时移除
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

/* 静态选择框的背景颜色 - 提高优先级 */
:deep(.el-select .el-input__wrapper) {
  background-color: var(--el-bg-color-overlay) !important;
  box-shadow: 0 0 0 1px var(--el-border-color) inset !important;
}

:deep(.el-select .el-input__inner) {
  color: var(--el-text-color-regular) !important;
}

/* 选择框的悬停和焦点状态 */
:deep(.el-select) .el-input__wrapper {
  &:hover {
    box-shadow: 0 0 0 1px var(--el-border-color-hover) inset !important;
  }

  &.is-focus {
    box-shadow: 0 0 0 1px var(--el-color-primary) inset !important;
  }
}

/* 下拉菜单样式 */
:deep(.el-select-dropdown) {
  background-color: var(--el-bg-color-overlay) !important;
  border-color: var(--el-border-color) !important;
}
</style> 