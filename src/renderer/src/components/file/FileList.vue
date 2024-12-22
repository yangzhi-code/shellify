<template>
  <el-table 
    :data="files" 
    style="width: 100%"
    v-loading="loading"
  >
    <el-table-column prop="name" label="文件名" min-width="200">
      <template #default="{ row }">
        <div class="file-name-cell">
          <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>
          <span class="file-name" @click="$emit('file-click', row)">{{ row.name }}</span>
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="size" label="大小" width="120">
      <template #default="{ row }">
        {{ formatFileSize(row.size) }}
      </template>
    </el-table-column>
    <el-table-column prop="permissions" label="权限" width="100" />
    <el-table-column prop="modifiedTime" label="修改时间" width="180" />
    <el-table-column label="操作" width="200" fixed="right">
      <template #default="{ row }">
        <el-button-group>
          <el-button 
            size="small" 
            @click="$emit('download', row)"
            :disabled="!canDownload(row)"
            :title="!canDownload(row) ? '目录不可直接下载' : '下载文件'"
          >
            <el-icon><Download /></el-icon>
          </el-button>
          <el-button size="small" @click="$emit('rename', row)">
            <el-icon><Edit /></el-icon>
          </el-button>
          <el-button size="small" type="danger" @click="$emit('delete', row)">
            <el-icon><Delete /></el-icon>
          </el-button>
        </el-button-group>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup>
import { Document, Folder, Download, Edit, Delete } from '@element-plus/icons-vue';
import { formatFileSize } from '../../utils/format';

defineProps({
  files: Array,
  loading: Boolean
});

defineEmits(['file-click', 'download', 'rename', 'delete']);

const canDownload = (file) => {
  if (file.type === 'file') return true;
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'];
  return compressedFormats.some(format => file.name.toLowerCase().endsWith(format));
};
</script>

<style scoped>
:deep(.el-table) {
  flex: 1;
  overflow: auto;
  width: 100% !important;
  min-width: 0;
  --el-table-header-cell-height: 32px;
  --el-table-row-height: 32px;
}

:deep(.el-table__inner-wrapper) {
  min-width: 0;
  width: 100% !important;
}

:deep(.el-table td.el-table__cell) {
  padding: 4px 0;
}

:deep(.el-table th.el-table__cell) {
  padding: 4px 0;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-name {
  cursor: pointer;
}

.file-name:hover {
  color: var(--el-color-primary);
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
</style> 