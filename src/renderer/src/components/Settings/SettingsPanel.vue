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

            <el-form-item label="SSH 连接配置">
              <div class="connections-actions">
                <el-button size="small" @click="exportConnections">导出连接配置</el-button>
                <el-button size="small" @click="importConnections">导入连接配置</el-button>
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 字体设置 -->
        <el-tab-pane>
          <template #label>
            <el-icon><Edit /></el-icon>
            <span>终端</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="终端字体大小">
              <el-select v-model="settings.terminalFontSize" class="full-width" @change="updateTerminalFont" @input="updateTerminalFont">
                <el-option
                  v-for="size in fontSizeOptions"
                  :key="size"
                  :label="`${size}px`"
                  :value="size"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="终端字体">
              <el-select
                v-model="settings.terminalFont"
                class="full-width"
                filterable
                @change="updateTerminalFont"
                @input="updateTerminalFont"
                :loading="fontListLoading"
              >
                <el-option
                  v-for="font in systemFonts"
                  :key="font"
                  :label="font"
                  :value="font"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="终端配色方案">
              <el-select
                v-model="settings.terminalColorScheme"
                class="full-width"
                @change="updateTerminalColorScheme"
                @input="updateTerminalColorScheme"
              >
                <el-option
                  v-for="scheme in colorSchemeOptions"
                  :key="scheme.value"
                  :label="scheme.label"
                  :value="scheme.value"
                />
              </el-select>
            </el-form-item>

            <el-form-item label="终端背景图片">
              <div class="background-image-section">

                <!-- 图库 -->
                <div class="preset-images">
                  <div class="preset-image-grid">
                    <div
                      v-for="(image, index) in imagesList"
                      :key="index"
                      class="preset-image-item"
                      :class="{ 'selected': settings.terminalBackgroundImage === image.path && image.path !== 'add://' }"
                      @click="selectPresetImage(image.path)"
                    >
                      <img :src="image.src" :alt="image.name" />
                      <div v-if="image.path !== '' && image.path !== 'add://'" class="image-overlay">{{ image.name }}</div>
                    </div>
                  </div>
                </div>

                

                
              </div>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <!-- 关于 -->
        <el-tab-pane>
          <template #label>
            <el-icon><InfoFilled /></el-icon>
            <span>关于</span>
          </template>
          <AboutPanel :appVersion="appVersion" />
        </el-tab-pane>
      </el-tabs>
    </div>

    <div class="settings-footer">
      <el-button @click="resetSettings">恢复默认设置</el-button>
      <div class="footer-right">
        <el-button @click="$emit('update:visible', false)">关闭</el-button>
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
import { Close, Setting, Edit, InfoFilled } from '@element-plus/icons-vue'
import AboutPanel from './AboutPanel.vue'
import { ElMessage } from 'element-plus'
import { themeManager } from '../../styles/theme'
import { getColorSchemeOptions, getColorScheme, convertToXtermTheme } from '../../utils/terminalColorSchemes'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

defineEmits(['update:visible'])

// 设置数据
const settings = ref({
  // 主题设置
  theme: 'system',
  // 终端设置
  terminalFontSize: 14,
  // 终端字体
  terminalFont: 'Consolas',
  // 终端配色方案
  terminalColorScheme: 'vscode-深色',
  // 终端背景设置
  terminalBackgroundType: 'none', // none, preset
  // 终端背景图片
  terminalBackgroundImage: ''
})

// 字体大小选项
const fontSizeOptions = ref([])
for (let i = 8; i <= 36; i++) {
  fontSizeOptions.value.push(i)
}

// 系统字体列表
const systemFonts = ref([])
const fontListLoading = ref(false)

// 配色方案选项
const colorSchemeOptions = ref([])

// 图库图片列表（动态）
const imagesList = ref([])
const selectedPreview = ref('')

// 关于页面相关已迁移到 AboutPanel

// 组件挂载时无需加载关于信息（已移至 AboutPanel）

// 加载图库图片（从主进程列出并转换为 base64 以便预览）
const loadPresetImages = async () => {
  try {
    const imgs = await window.electron.ipcRenderer.invoke('system:list-images')
    const basePath = await window.electron.ipcRenderer.invoke('system:get-resource-path', 'imgs')
    const list = []

    // 添加无背景选项（显示居中文本“默认”，使用圆角与圆帽的实线，避免锯齿）
    list.push({
      name: '无背景',
      path: '',
      src:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\">' +
            '<rect x=\"1\" y=\"1\" width=\"98\" height=\"98\" rx=\"8\" fill=\"none\" stroke=\"#CCCCCC\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/>' +
            '<text x=\"50\" y=\"50\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-family=\"Arial, sans-serif\" font-size=\"14\" fill=\"#999\">默认</text>' +
          '</svg>'
        )
    })

    for (const fileName of imgs) {
      try {
        const fullPath = `${basePath}/${fileName}`
        const base64Data = await window.electron.ipcRenderer.invoke('system:get-image-base64', fullPath)
        if (base64Data) {
          const ext = fileName.split('.').pop().toLowerCase()
          const mimeType = ext === 'jpg' ? 'jpeg' : ext
          list.push({
            name: fileName,
            path: `preset://${fileName}`,
            src: `data:image/${mimeType};base64,${base64Data}`
          })
        } else {
          list.push({
            name: fileName,
            path: `preset://${fileName}`,
            src: `./imgs/${fileName}`
          })
        }
      } catch (err) {
        console.error('加载单张预设图片失败:', fileName, err)
      }
    }

    // 添加导入图片占位（使用 runtime 编码的 SVG，简洁圆形加号）
    list.push({
      name: '添加图片',
      path: 'add://',
      src:
        'data:image/svg+xml;utf8,' +
        encodeURIComponent(
          '<svg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"><rect x=\"1\" y=\"1\" width=\"98\" height=\"98\" rx=\"8\" fill=\"none\" stroke=\"#CCCCCC\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/><circle cx=\"50\" cy=\"50\" r=\"15\" fill=\"#41A4F5\"/><path d=\"M50 40 V60 M40 50 H60\" stroke=\"#FFFFFF\" stroke-width=\"4\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>'
        )
    })

    imagesList.value = list
  } catch (error) {
    console.error('加载预设图片失败:', error)
    imagesList.value = []
  }
}

// 自动保存设置
const saveSettings = async (newSettings) => {
  try {
    await window.electron.ipcRenderer.invoke('settings:save', toRaw(newSettings))
    console.log('设置已自动保存')
  } catch (error) {
    console.error('设置保存失败:', error.message)
  }
}

// 监听设置变化并自动保存
watch(settings, (newSettings) => {
  console.log('检测到设置变化，自动保存:', newSettings)
  saveSettings(newSettings)

  // 立即应用字体设置（字体设置每次变化都应用）
  updateTerminalFont()

  // 立即应用配色方案（配色方案每次变化都应用）
  updateTerminalColorScheme()

  // 立即应用背景设置（背景设置每次变化都应用）
  updateTerminalBackground()
}, { deep: true })

// 单独监听主题变化
watch(() => settings.value.theme, (newTheme) => {
  console.log('主题变化:', newTheme)
  themeManager.applyTheme(newTheme)
})

// 导出 SSH 连接配置
const exportConnections = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('connections:export')
    if (!result?.canceled) {
      ElMessage.success('连接配置已导出到: ' + result.filePath)
    }
  } catch (error) {
    console.error('导出连接配置失败:', error)
    ElMessage.error('导出连接配置失败：' + (error.message || '未知错误'))
  }
}

// 导入 SSH 连接配置
const importConnections = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('connections:import')
    if (!result?.canceled) {
      ElMessage.success('导入连接配置成功，共导入 ' + (result.count || 0) + ' 条连接')
    }
  } catch (error) {
    console.error('导入连接配置失败:', error)
    ElMessage.error('导入连接配置失败：' + (error.message || '未知错误'))
  }
}

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

// 选择图库图片（或已导入图片）
const selectPresetImage = (imagePath) => {
  if (imagePath === 'add://') {
    // 点击添加图片占位，触发导入图片功能
    importImage()
    return
  }

  settings.value.terminalBackgroundImage = imagePath
  settings.value.terminalBackgroundType = imagePath === '' ? 'none' : 'preset'
  // 清除临时预览
  selectedPreview.value = ''
}

// 导入图片到应用图库并自动选中
const importImage = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:select-image')
    if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
      const srcPath = result.filePaths[0]
      // 将图片复制到应用 imgs 目录
      const destName = await window.electron.ipcRenderer.invoke('system:import-image', srcPath)
      if (destName) {
        // 刷新图库并自动选中
        await loadPresetImages()
        const presetPath = `preset://${destName}`
        settings.value.terminalBackgroundImage = presetPath
        settings.value.terminalBackgroundType = 'preset'
      } else {
        ElMessage.error('导入图片失败')
      }
    }
  } catch (error) {
    console.error('导入图片失败:', error)
    ElMessage.error('导入图片失败：' + (error.message || '未知错误'))
  }
}


// 获取图片文件名
const getImageFileName = (path) => {
  if (!path) return ''
  return path.split('/').pop().split('\\').pop()
}

// 获取预览 data URL（传入 preset://xxx 或 file 路径）
const getPreviewForPath = (p) => {
  if (!p) return ''
  if (p.startsWith('preset://')) {
    const fileName = p.replace('preset://', '')
    const found = imagesList.value.find(i => i.path === p)
    if (found) return found.src
    // 回退：尝试通过 resource path
    return `./imgs/${fileName}`
  }
  return p
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

// 加载设置
const loadSettings = async () => {
  try {
    const savedSettings = await window.electron.ipcRenderer.invoke('settings:load')
    if (savedSettings) {
      settings.value = { ...settings.value, ...savedSettings }
    }
    // 加载系统字体列表
    await loadSystemFonts()
    // 加载配色方案选项
    loadColorSchemeOptions()
    // 加载预设图片
    await loadPresetImages()
    // 加载应用信息
    await loadAppInfo()
  } catch (error) {
    console.error('加载设置失败：', error)
  }
}

// 加载系统字体列表
const loadSystemFonts = async () => {
  try {
    fontListLoading.value = true
    const fonts = await window.electron.ipcRenderer.invoke('system:get-fonts')
    systemFonts.value = fonts
  } catch (error) {
    console.error('加载系统字体失败:', error)
    // 如果获取失败，提供一些常见的字体作为fallback
    systemFonts.value = [
      'Consolas', 'Menlo', 'Monaco', 'Fira Code', 'JetBrains Mono',
      'Cascadia Code', 'Source Code Pro', 'Courier New', 'Monospace'
    ]
  } finally {
    fontListLoading.value = false
  }
}

// 加载配色方案选项
const loadColorSchemeOptions = () => {
  colorSchemeOptions.value = getColorSchemeOptions()
}

// 更新终端配色方案
const updateTerminalColorScheme = () => {
  const colorScheme = getColorScheme(settings.value.terminalColorScheme)
  const xtermTheme = convertToXtermTheme(colorScheme)

  console.log('更新终端配色方案:', settings.value.terminalColorScheme, xtermTheme)

  // 通过 localStorage 传递配色方案配置，让所有终端组件读取
  localStorage.setItem('terminal-color-scheme-config', JSON.stringify({
    schemeKey: settings.value.terminalColorScheme,
    theme: xtermTheme,
    timestamp: Date.now()
  }))

  // 触发自定义事件，让所有终端组件更新配色方案
  window.dispatchEvent(new CustomEvent('terminal-color-scheme-changed', {
    detail: {
      schemeKey: settings.value.terminalColorScheme,
      theme: xtermTheme
    }
  }))
}

// 更新终端字体 - 直接调用，不通过事件
const updateTerminalFont = () => {
  const fontFamily = settings.value.terminalFont
    ? `"${settings.value.terminalFont}", monospace`
    : '"Consolas", "Microsoft YaHei", "微软雅黑", monospace'

  console.log('直接更新所有终端字体:', {
    fontSize: settings.value.terminalFontSize,
    fontFamily: fontFamily
  })

  // 通过 localStorage 传递字体配置，让所有终端组件读取
  localStorage.setItem('terminal-font-config', JSON.stringify({
    fontSize: settings.value.terminalFontSize,
    fontFamily: fontFamily,
    timestamp: Date.now()
  }))

  // 触发自定义事件，让所有终端组件更新
  window.dispatchEvent(new CustomEvent('terminal-font-changed', {
    detail: {
      fontSize: settings.value.terminalFontSize,
      fontFamily: fontFamily
    }
  }))
}

// 更新终端背景 - 直接调用，不通过事件
const updateTerminalBackground = () => {
  console.log('直接更新所有终端背景:', {
    backgroundType: settings.value.terminalBackgroundType,
    backgroundImage: settings.value.terminalBackgroundImage
  })

  // 通过 localStorage 传递背景配置，让所有终端组件读取
  localStorage.setItem('terminal-background-config', JSON.stringify({
    backgroundType: settings.value.terminalBackgroundType,
    backgroundImage: settings.value.terminalBackgroundImage,
    timestamp: Date.now()
  }))

  // 触发自定义事件，让所有终端组件更新
  window.dispatchEvent(new CustomEvent('terminal-background-changed', {
    detail: {
      backgroundType: settings.value.terminalBackgroundType,
      backgroundImage: settings.value.terminalBackgroundImage
    }
  }))
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

/* 调整按钮和表单元素大小 */
:deep(.el-button) {
  height: 28px;  /* 减小按钮高度 */
  padding: 0 12px;  /* 减小按钮内边距 */
  font-size: 13px;  /* 减小字号 */
}

:deep(.el-select) {
  .el-input__wrapper {
    height: 28px;  /* 减小选择器高度 */
  }
  .el-input__inner {
    font-size: 13px;
  }
}

:deep(.el-tabs__item) {
  height: 32px;
  line-height: 32px;
  font-size: 13px;
}

:deep(.el-form-item__label) {
  font-size: 13px;
  line-height: 20px;
}

/* 调整图标大小 */
:deep(.el-icon) {
  font-size: 14px;
}

/* 背景图片设置样式 */
.background-image-section {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.background-type-selector {
  margin-bottom: 10px;
}

.preset-images {
  margin-top: 10px;
}

.preset-image-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 10px;
}

.preset-image-item {
  position: relative;
  width: 100%;
  aspect-ratio: 3 / 2;
  border: 2px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s ease;
}

.preset-image-item:hover {
  border-color: var(--el-color-primary);
  transform: scale(1.02);
}

.preset-image-item.selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-9);
}

.preset-image-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 4px 8px;
  font-size: 11px;
  text-align: center;
}

.custom-image-section {
  margin-top: 10px;
}

.custom-image-controls {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.selected-custom-image {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  background: var(--el-bg-color-page);
}

.selected-custom-image img {
  width: 60px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.image-info {
  font-size: 12px;
  color: var(--el-text-color-regular);
  flex: 1;
}

.background-opacity {
  margin-top: 15px;
  padding: 10px;
  background: var(--el-bg-color-page);
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.opacity-label {
  display: block;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}

:deep(.background-opacity .el-slider) {
  margin-top: 8px;
}

:deep(.background-opacity .el-slider__input) {
  width: 60px;
}

/* 关于页面样式 已迁移到 AboutPanel.vue */
</style> 