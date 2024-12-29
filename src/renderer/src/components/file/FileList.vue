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
          <el-button 
            size="small" 
            @click="handleEdit(row)"
            :disabled="row.type !== 'file'"
            :title="row.type === 'file' ? '编辑文件' : '文件夹不可编辑'"
          >
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
import { useTabsStore } from '../../stores/terminalStore';
import { Row } from 'ant-design-vue';
import { toRaw } from 'vue';
const tabsStore = useTabsStore()

const props = defineProps({
  files: Array,
  loading: Boolean,
  currentPath: String
});

const emit = defineEmits(['file-click', 'download', 'delete', 'save-new-folder', 'cancel-new-folder']);

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
// 打开编辑器
const handleEdit = (row) => {
  //通过connectionId查找editableTabs
  var connectionId = tabsStore.activeConnectionId
  var editableTab = tabsStore.editableTabs
  const editableTabs = tabsStore.editableTabs.find(tab => tab.data?.id === connectionId)
  
  var editableTab = toRaw(editableTabs)
  // 合并 SSH 连接信息和文件信息
  const editorInfo = {
    ...editableTab,  // SSH 连接信息
    filePath: row.path,  // 文件路径
    fileName: row.name,  // 文件名
    fileType: row.type   // 文件类型
  }
  //通过id打开编辑器
  window.electron.ipcRenderer.send('open-editor', editorInfo);
};
</script>

<style scoped>
.el-table {
  --el-table-header-bg-color: var(--file-list-header-bg);
  --el-table-bg-color: var(--file-list-bg);
  --el-table-border-color: var(--file-list-border);
  --el-table-text-color: var(--file-item-text);
  --el-table-header-text-color: var(--el-text-color-primary);
  background-color: var(--file-list-bg);
}

:deep(.el-table__row) {
  &:hover td {
    background-color: var(--file-item-hover) !important;
  }
}

:deep(.el-table__row.current-row) td {
  background-color: var(--file-item-active) !important;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-icon {
    color: var(--file-item-icon);
    font-size: 16px;
  }
}

.file-name {
  color: var(--file-item-text);
  cursor: pointer;
  &:hover {
    color: var(--el-color-primary);
  }
}
</style>
