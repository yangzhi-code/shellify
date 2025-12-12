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
              <span
                class="file-name"
                @click="$emit('file-click', row)"
                @dblclick="handleNameDblClick(row)"
              >
                {{ row.name }}
              </span>
            </el-tooltip>
            <span
              v-else
              class="file-name"
              @click="$emit('file-click', row)"
              @dblclick="handleNameDblClick(row)"
            >
              {{ row.name }}
            </span>
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
// 处理名称双击：文件夹双击还是导航，文件双击打开编辑器
const handleNameDblClick = (row) => {
  if (row.type === 'directory') {
    emit('file-click', row);
  } else if (row.type === 'file') {
    handleEdit(row);
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
  --el-table-header-bg-color: var(--el-fill-color-light);
  --el-table-bg-color: var(--el-bg-color);
  --el-table-border-color: var(--el-border-color);
  --el-table-text-color: var(--el-text-color-regular);
  --el-table-header-text-color: var(--el-text-color-primary);
  background-color: var(--el-bg-color);
}

:deep(.el-table__row) {
  &:hover td {
    background-color: var(--el-fill-color-light) !important;
  }
}

:deep(.el-table__row.current-row) td {
  background-color: var(--el-fill-color-darker) !important;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;

  .el-icon {
    color: var(--el-text-color-secondary);
    font-size: 16px;
  }
}

.file-name {
  color: var(--el-text-color-regular);
  cursor: pointer;
  &:hover {
    color: var(--el-color-primary);
  }
}

/* 添加表格边框颜色 */
:deep(.el-table__inner-wrapper::before) {
  background-color: var(--el-border-color);
}

/* 确保表格单元格边框颜色正确 */
:deep(.el-table__cell) {
  border-bottom: 1px solid var(--el-border-color-lighter);
}

/* 表头背景色 */
:deep(.el-table__header) {
  background-color: var(--el-fill-color-light);
}

/* 操作按钮样式 */
:deep(.el-button-group) {
  .el-button {
    background-color: var(--el-bg-color); /* 使用深色背景 */
    border-color: var(--el-border-color);
    color: var(--el-text-color-regular);
  }
}

/* 删除按钮样式 */
:deep(.el-button--danger) {
  background-color: var(--el-bg-color); /* 使用深色背景 */
  border-color: var(--el-border-color);
}

/* 加载遮罩层样式 */
:deep(.el-loading-mask) {
  background-color: var(--el-bg-color);
}

:deep(.el-loading-spinner) {
  .el-loading-text {
    color: var(--el-text-color-regular);
  }
  
  .path {
    stroke: var(--el-color-primary);
  }
}

/* 表格背景色 */
:deep(.el-table__body-wrapper) {
  background-color: var(--el-bg-color);
}

:deep(.el-table) {
  --el-table-row-hover-bg-color: var(--el-fill-color-light);
}
</style>
