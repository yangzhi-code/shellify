<template>
  <div class="editor-tabs">
    <div class="tabs-container">
      <div
        v-for="tab in tabs"
        :key="tab.path"
        :class="['tab', { active: activeTab === tab.path }]"
        @click="$emit('switch', tab.path)"
      >
        <el-icon class="tab-icon">
          <Document />
        </el-icon>
        <span class="tab-name">{{ tab.name }}</span>
        <el-icon 
          class="tab-close"
          @click.stop="$emit('close', tab.path)"
        >
          <Close />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Document, Close } from '@element-plus/icons-vue'

defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: null
  }
})
</script>

<style scoped>
.editor-tabs {
  height: 35px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  position: relative;
  overflow: hidden;
}

.tabs-container {
  height: 100%;
  display: flex;
  align-items: center;
  overflow-x: auto;
  overflow-y: hidden;
  /* 隐藏滚动条 */
  scrollbar-width: none;
  -ms-overflow-style: none;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab {
  height: 100%;
  padding: 0 8px;
  min-width: 120px;
  max-width: 200px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  user-select: none;
  position: relative;
  transition: background-color 0.2s;
}

.tab.active {
  background: var(--el-bg-color-page);
  color: var(--el-text-color-primary);
}

.tab.active::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: var(--el-color-primary);
}

.tab:hover:not(.active) {
  background: var(--el-fill-color-light);
}

.tab-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tab-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
}

.tab-close {
  width: 16px;
  height: 16px;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  color: var(--el-text-color-secondary);
  flex-shrink: 0;
  opacity: 0.8;
  transition: all 0.2s;
}

.tab:hover .tab-close,
.tab.active .tab-close {
  opacity: 1;
}

.tab-close:hover {
  background: var(--el-fill-color-darker);
  color: var(--el-text-color-primary);
}

/* 激活状态下的图标颜色 */
.tab.active .tab-icon {
  color: var(--el-color-primary);
}
</style> 