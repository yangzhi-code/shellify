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
          
          <el-input
            class="edit-input"
            v-if="row.isEditing"
            v-model="row.editingName"
            size="small"
            @blur="handleNameBlur(row)"
            @keyup.enter="handleNameBlur(row)"
            @keyup.esc="cancelEdit(row)"
            v-focus
          />
          
          <template v-else>
            <el-tooltip
              v-if="row.path"
              :content="row.path"
              placement="top"
              :show-after="500"
            >
              <span class="file-name" @click="$emit('file-click', row)">{{ row.name }}</span>
            </el-tooltip>
            <span v-else class="file-name" @click="$emit('file-click', row)">{{ row.name }}</span>
          </template>
        </div>
      </template>
    </el-table-column>
    <el-table-column prop="size" label="大小" width="120">
      <template #default="{ row }">
        <span v-if="row.type === 'file'">{{ formatFileSize(row.size) }}</span>
        <span v-else>-</span>
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

const props = defineProps({
  files: Array,
  loading: Boolean,
  currentPath: String
});

const emit = defineEmits(['file-click', 'download', 'rename', 'delete', 'save-new-folder', 'cancel-new-folder']);

const canDownload = (file) => {
  if (file.type === 'file') return true;
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'];
  return compressedFormats.some(format => file.name.toLowerCase().endsWith(format));
};

const vFocus = {
  mounted: (el) => el.querySelector('input').focus()
};

const handleNameBlur = (row) => {
  if (row.isNew) {
    emit('save-new-folder', row.editingName);
  }
};

const cancelEdit = (row) => {
  if (row.isNew) {
    emit('cancel-new-folder');
  }
};
</script>

<style scoped>
:deep(.el-table) {
  flex: 1;
  overflow: auto;
  width: 100% !important;
  min-width: 0;
  --el-table-header-cell-height: 20px; /* 表头高度 */
  --el-table-row-height: 20px; /* 列表行高 */
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 2px; /* 减少间距，适应更小的行高 */
  height: 20px; /* 确保和行高一致 */
}

.file-name {
  cursor: pointer;
}

.file-name:hover {
  color: var(--el-color-primary);
}

.edit-input :deep(.el-input__inner) {
  display: flex;
  align-items: center;
  height: 18px; /* 输入框高度略小于行高，避免视觉溢出 */
  padding: 0 1px; /* 减少输入框的内边距 */
  margin: 0; /* 去除额外的外边距 */
  box-sizing: border-box;
}

:deep(.el-table td.el-table__cell),
:deep(.el-table th.el-table__cell) {
  padding: 0; /* 去除单元格额外内边距 */
}

:deep(.el-button--small) {
  height: 18px; /* 按钮高度适配行高 */
  padding: 0 4px; /* 减少按钮内边距 */
}

:deep(.el-icon) {
  display: flex;
  align-items: center;
  font-size: 12px; /* 缩小图标尺寸 */
}
</style>
