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
import { Refresh, Upload, FolderAdd } from '@element-plus/icons-vue';
import FileSearch from './FileSearch.vue';
import { ref } from 'vue';

const searchModel = ref({
  keyword: '',
  options: {
    caseSensitive: false,
    recursive: true
  }
});

defineProps({
  currentPath: Array
});

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
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
  flex-shrink: 0;
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
}

:deep(.el-breadcrumb__inner:hover) {
  color: var(--el-color-primary);
}

:deep(.el-breadcrumb__separator) {
  margin: 0 4px;
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
  background-color: var(--toolbar-bg);
  border-bottom: 1px solid var(--toolbar-border);
}

.toolbar-button {
  color: var(--toolbar-text);

  .el-icon {
    color: var(--toolbar-icon);
  }

  &:hover {
    background-color: var(--toolbar-button-hover);
  }

  &.active {
    background-color: var(--toolbar-button-active);
    color: #ffffff;
  }
}
</style> 