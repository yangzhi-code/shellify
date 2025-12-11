<template>
  <div class="toolbar">
    <div class="path-nav">
      <el-breadcrumb>
        <el-breadcrumb-item @click="$emit('navigate-root')">根目录</el-breadcrumb-item>
        <el-breadcrumb-item 
          v-for="(part, index) in currentPath" 
          :key="index"
          @click="$emit('navigate', index)"
        >
          {{ part }}
        </el-breadcrumb-item>
      </el-breadcrumb>
      <el-button 
        class="copy-path-btn"
        size="small"
        text
        @click="handleCopyPath"
        title="复制当前路径"
      >
        <el-icon><CopyDocument /></el-icon>
      </el-button>
    </div>
    <div class="tools-group">
      <div class="tools">
        <el-button-group>
          <el-button size="small" @click="$emit('refresh')">
            <el-icon><Refresh /></el-icon>
          </el-button>
          <el-button size="small" @click="$emit('upload')">
            <el-icon><Upload /></el-icon>上传
          </el-button>
          <el-button size="small" @click="$emit('new-folder')">
            <el-icon><FolderAdd /></el-icon>新建文件夹
          </el-button>
        </el-button-group>
      </div>
      <FileSearch 
        v-model="searchModel"
        @search="$emit('search', $event)"
        @clear="$emit('clear-search')"
      />
    </div>
  </div>
</template>

<script setup>
import { Refresh, Upload, FolderAdd, CopyDocument } from '@element-plus/icons-vue';
import FileSearch from './FileSearch.vue';
import { ref, computed } from 'vue';
import { ElMessage } from 'element-plus';

const searchModel = ref({
  keyword: '',
  options: {
    caseSensitive: false,
    recursive: true
  }
});

const props = defineProps({
  currentPath: {
    type: Array,
    default: () => []
  }
});

const fullPath = computed(() => {
  const parts = props.currentPath || [];
  if (!parts.length) return '/';
  return '/' + parts.join('/');
});

const handleCopyPath = async () => {
  try {
    const text = `cd ${fullPath.value}`;
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      throw new Error('Clipboard API not available');
    }
    await navigator.clipboard.writeText(text);
    ElMessage.success('路径已复制');
  } catch (error) {
    console.error('复制路径失败:', error);
    ElMessage.error('复制路径失败');
  }
};

defineEmits([
  'navigate-root',
  'navigate',
  'refresh',
  'upload',
  'new-folder',
  'search',
  'clear-search'
]);
</script>

<style scoped>
.toolbar {
  padding: 4px 8px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex-shrink: 0;
  background-color: var(--el-bg-color);
}

.path-nav {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 0 8px;
  height: 24px;
  display: flex;
  align-items: center;
  background-color: var(--el-input-bg-color);
  transition: all 0.2s;
  user-select: text;
}

.path-nav:hover {
  border-color: var(--el-border-color-hover);
}

:deep(.el-breadcrumb) {
  line-height: 1;
  font-size: 12px;
}

:deep(.el-breadcrumb__item) {
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  color: var(--el-text-color-regular);
}

:deep(.el-breadcrumb__inner:hover) {
  color: var(--el-color-primary);
}

:deep(.el-breadcrumb__separator) {
  margin: 0 4px;
  color: var(--el-text-color-secondary);
}

.copy-path-btn {
  margin-left: auto;
  padding: 0 4px;
}

.tools-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tools {
  display: flex;
  align-items: center;
}

:deep(.el-button--small) {
  height: 24px;
  padding: 0 8px;
}

:deep(.el-icon) {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.file-toolbar {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.toolbar-button {
  color: var(--el-text-color-regular);

  .el-icon {
    color: var(--el-text-color-regular);
  }

  &:hover {
    background-color: var(--el-fill-color-light);
  }

  &.active {
    background-color: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
  }
}

:deep(.el-button) {
  background-color: var(--el-bg-color-overlay);
  border-color: var(--el-border-color);
  color: var(--el-text-color-regular);

  &:hover {
    background-color: var(--el-fill-color-light);
    border-color: var(--el-border-color-hover);
  }
}

/* 搜索框文字和图标颜色 */
:deep(.el-input__inner) {
  color: var(--el-text-color-regular);
}

:deep(.el-input__prefix-inner) {
  color: var(--el-text-color-secondary);
}

/* 按钮图标颜色 */
:deep(.el-button .el-icon) {
  color: var(--el-text-color-regular);
}

/* 按钮组分隔线颜色 */
:deep(.el-button-group .el-button + .el-button) {
  border-left-color: var(--el-border-color-light);
}
</style> 