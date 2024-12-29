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
      <el-tabs>
        <!-- 常规设置 -->
        <el-tab-pane label="常规">
          <el-form label-position="top">
            <el-form-item label="主题">
              <el-select v-model="settings.theme" placeholder="选择主题">
                <el-option label="浅色" value="light" />
                <el-option label="深色" value="dark" />
                <el-option label="跟随系统" value="system" />
              </el-select>
            </el-form-item>
            <el-form-item label="字体大小">
              <el-input-number v-model="settings.fontSize" :min="12" :max="20" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 终端设置 -->
        <el-tab-pane label="终端">
          <el-form label-position="top">
            <el-form-item label="终端字体">
              <el-select v-model="settings.terminalFont" placeholder="选择字体">
                <el-option label="Menlo" value="Menlo" />
                <el-option label="Monaco" value="Monaco" />
                <el-option label="Consolas" value="Consolas" />
              </el-select>
            </el-form-item>
            <el-form-item label="终端字体大小">
              <el-input-number v-model="settings.terminalFontSize" :min="12" :max="20" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 编辑器设置 -->
        <el-tab-pane label="编辑器">
          <el-form label-position="top">
            <el-form-item label="Tab 大小">
              <el-input-number v-model="settings.tabSize" :min="2" :max="8" />
            </el-form-item>
            <el-form-item label="自动保存">
              <el-switch v-model="settings.autoSave" />
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 快捷键设置 -->
        <el-tab-pane label="快捷键">
          <el-form label-position="top">
            <el-form-item label="新建终端">
              <el-input v-model="settings.shortcuts.newTerminal" placeholder="Ctrl + T" />
            </el-form-item>
            <el-form-item label="关闭终端">
              <el-input v-model="settings.shortcuts.closeTerminal" placeholder="Ctrl + W" />
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="settings-footer">
      <el-button type="primary" @click="saveSettings">保存设置</el-button>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
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
import { ref, watch } from 'vue'
import { Close } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])

// 设置数据
const settings = ref({
  theme: 'system',
  fontSize: 14,
  terminalFont: 'Menlo',
  terminalFontSize: 14,
  tabSize: 4,
  autoSave: true,
  shortcuts: {
    newTerminal: 'Ctrl + T',
    closeTerminal: 'Ctrl + W'
  }
})

// 保存设置
const saveSettings = async () => {
  try {
    await window.electron.ipcRenderer.invoke('settings:save', settings.value)
    ElMessage.success('设置保存成功')
    emit('update:visible', false)
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
  justify-content: flex-end;
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

:deep(.el-tabs__nav) {
  margin-bottom: 20px;
}

:deep(.el-form-item) {
  margin-bottom: 24px;
}
</style> 