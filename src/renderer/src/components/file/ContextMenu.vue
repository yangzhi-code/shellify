<template>
  <!-- 全局右键菜单 -->
  <teleport to="body">
    <div
      v-if="contextMenuVisible"
      ref="contextMenuRef"
      class="context-menu-overlay"
      @click.self="hideContextMenu"
      @contextmenu.prevent
    >
      <el-menu
        ref="menuRoot"
        class="context-menu"
        :style="{ left: menuLeft + 'px', top: menuTop + 'px', background: 'var(--el-bg-color)', visibility: isPositioned ? 'visible' : 'hidden', pointerEvents: isPositioned ? 'auto' : 'none' }"
        @select="handleMenuSelect"
      >
      <el-menu-item
        v-if="selectedFile"
        index="compress"
        :disabled="!canCompress(selectedFile)"
      >
        <el-icon><Plus /></el-icon>
        <span>压缩文件</span>
      </el-menu-item>
      <el-menu-item
        v-if="selectedFile"
        index="extract"
        :disabled="!canExtract(selectedFile)"
      >
        <el-icon><Minus /></el-icon>
        <span>解压文件</span>
      </el-menu-item>
      <el-menu-item
        v-if="selectedFile"
        index="download"
        :disabled="!canDownload(selectedFile)"
      >
        <el-icon><Download /></el-icon>
        <span>下载</span>
      </el-menu-item>
      <el-menu-item
        v-if="selectedFile"
        index="edit"
        :disabled="selectedFile.type !== 'file'"
      >
        <el-icon><Edit /></el-icon>
        <span>编辑</span>
      </el-menu-item>
      <el-divider v-if="selectedFile" />
      <el-menu-item
        v-if="selectedFile"
        index="delete"
        class="danger-item"
      >
        <el-icon class="danger-icon"><Delete /></el-icon>
        <span>删除</span>
      </el-menu-item>
      </el-menu>
    </div>
  </teleport>
</template>

<script setup>
import { ref, defineProps, defineEmits, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { Download, Edit, Delete, Plus, Minus } from '@element-plus/icons-vue'

const props = defineProps({
  selectedFile: {
    type: Object,
    default: null
  },
  contextMenuVisible: {
    type: Boolean,
    default: false
  },
  contextMenuPosition: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const emit = defineEmits(['update:contextMenuVisible', 'menu-command', 'hide-context-menu'])

const contextMenuRef = ref(null)
const menuRoot = ref(null)
const menuLeft = ref(0)
const menuTop = ref(0)
const isPositioned = ref(false)

// 判断是否可以压缩
const canCompress = (file) => {
  // 文件夹和文件都可以压缩
  return true
}

// 判断是否可以解压
const canExtract = (file) => {
  if (file.type === 'directory') return false
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.tar.gz', '.tar.bz2', '.tar.xz']
  return compressedFormats.some(format => file.name.toLowerCase().endsWith(format))
}

// 判断是否可以下载
const canDownload = (file) => {
  if (file.type === 'file') return true
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z']
  return compressedFormats.some(format => file.name.toLowerCase().endsWith(format))
}

// 点击外部隐藏菜单
const hideContextMenu = () => {
  emit('update:contextMenuVisible', false)
  emit('hide-context-menu')
}

// 菜单选择处理
const handleMenuSelect = (index) => {
  if (props.selectedFile) {
    const command = { action: index, file: props.selectedFile }
    emit('menu-command', command)
    // 执行完命令后隐藏菜单
    emit('update:contextMenuVisible', false)
  }
}

// 监听键盘事件，按 ESC 键隐藏菜单
const handleKeyDown = (event) => {
  if (event.key === 'Escape' && props.contextMenuVisible) {
    hideContextMenu()
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
})

// 当菜单显示时，初始化位置并调整以避免超出视口
watch(() => props.contextMenuVisible, async (visible) => {
  if (visible) {
    // 初始化为传入坐标
    // hide until we've measured and positioned to avoid flicker
    isPositioned.value = false
    menuLeft.value = props.contextMenuPosition.x || 0
    menuTop.value = props.contextMenuPosition.y || 0
    await nextTick()
    // Give Element Plus time to render inner items, wait a couple of frames
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    // also wait a tiny timeout to be robust against async rendering
    await new Promise((r) => setTimeout(r, 20))
    // support both raw DOM node and component proxy (ElementPlus component)
    let elNode = null
    if (menuRoot.value) {
      if (typeof menuRoot.value.getBoundingClientRect === 'function') {
        elNode = menuRoot.value
      } else if (menuRoot.value.$el) {
        elNode = menuRoot.value.$el
      } else {
        elNode = menuRoot.value
      }
    }
    const rect = elNode && typeof elNode.getBoundingClientRect === 'function' ? elNode.getBoundingClientRect() : null
    if (rect) {
      const padding = 8
      const maxLeft = Math.max(padding, document.documentElement.clientWidth - rect.width - padding)
      const maxTop = Math.max(padding, document.documentElement.clientHeight - rect.height - padding)
      // If the menu would overflow to the right/bottom, prefer to place it above/left of the click
      if (menuLeft.value > maxLeft) {
        // try positioning to the left of click
        const altLeft = (props.contextMenuPosition.x || 0) - rect.width - padding
        menuLeft.value = Math.max(padding, Math.min(maxLeft, altLeft))
      }
      if (menuTop.value > maxTop) {
        // prefer placing menu above the pointer if space permits
        const altTop = (props.contextMenuPosition.y || 0) - rect.height - padding
        if (altTop >= padding) {
          menuTop.value = altTop
        } else {
          menuTop.value = Math.max(padding, maxTop)
        }
      }
    }
    // mark positioned so menu becomes visible
    isPositioned.value = true
  }
})

// 如果外部坐标变动则更新（比如拖动、缩放等）
watch(() => props.contextMenuPosition, (pos) => {
  if (pos) {
    menuLeft.value = pos.x
    menuTop.value = pos.y
  }
}, { deep: true })
</script>

<style scoped>
.context-menu-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 9998;
  background: transparent;
}

.context-menu {
  position: fixed;
  z-index: 2147483647;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: var(--el-border-radius-base);
  box-shadow: var(--el-box-shadow-dark);
  min-width: 160px;
  padding: 4px 0;
}

:deep(.el-menu) {
  background: transparent;
  border: none;
}

:deep(.el-menu-item) {
  height: 36px;
  line-height: 36px;
  padding: 0 16px;
  margin: 0;
  color: var(--el-text-color-regular);
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  white-space: nowrap;
}

:deep(.el-menu-item:hover) {
  background-color: var(--el-fill-color-light);
  color: var(--el-color-primary);
}

:deep(.el-menu-item.is-disabled) {
  color: var(--el-text-color-disabled);
  cursor: not-allowed;
}

:deep(.el-menu-item.is-disabled:hover) {
  background-color: transparent;
  color: var(--el-text-color-disabled);
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}

:deep(.danger-item:hover) {
  background-color: var(--el-color-danger-light-9);
  color: var(--el-color-danger);
}

:deep(.danger-icon) {
  color: var(--el-color-danger);
}

:deep(.el-divider) {
  margin: 4px 0;
  border-color: var(--el-border-color-lighter);
}
</style>
