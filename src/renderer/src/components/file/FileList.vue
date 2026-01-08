<template>
  <el-table
    :data="files"
    style="width: 100%"
    v-loading="loading"
    @row-contextmenu="handleRowContextMenu"
    @row-dblclick="handleRowDblClick"
  >
    <el-table-column prop="name" label="文件名" min-width="200">
      <template #default="{ row }">
        <div class="file-name-cell" :data-row-id="row.path">
          <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>

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
        </div>

        <!-- 编辑状态 -->
        <div v-if="row.isEditing" class="file-name-cell">
          <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
          <el-icon v-else><Document /></el-icon>

          <el-input
            class="edit-input"
            v-model="row.editingName"
            size="small"
            @blur="handleNameBlur(row)"
            @keyup.enter="handleNameBlur(row)"
            @keyup.esc="cancelEdit(row)"
            v-focus
          />
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

  <!-- 全局右键菜单组件 -->
  <ContextMenu
    :selected-file="selectedFile"
    :context-menu-visible="contextMenuVisible"
    :context-menu-position="contextMenuPosition"
    @menu-command="handleContextMenuCommand"
    @hide-context-menu="handleContextMenuHide"
    @update:context-menu-visible="handleContextMenuVisible"
  />
</template>

<script setup>
import { ref } from 'vue';
import { Document, Folder, Download, Edit, Delete, Plus, Minus } from '@element-plus/icons-vue';
import { formatFileSize } from '../../utils/format';
import { useTabsStore } from '../../stores/terminalStore';
import { toRaw } from 'vue';
import ContextMenu from './ContextMenu.vue';
const tabsStore = useTabsStore()

const props = defineProps({
  files: Array,
  loading: Boolean,
  currentPath: String
});

const emit = defineEmits(['file-click', 'download', 'delete', 'save-new-folder', 'cancel-new-folder', 'compress', 'extract']);

// 右键菜单相关的响应式变量
const contextMenuVisible = ref(false);
const selectedFile = ref(null);
const contextMenuPosition = ref({ x: 0, y: 0 });


const canDownload = (file) => {
  if (!file) return false;
  if (file.type === 'file') return true;
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'];
  return compressedFormats.some(format => file.name?.toLowerCase().endsWith(format));
};

const canCompress = (file) => {
  if (!file) return false;
  // allow compressing both files and folders
  return true;
};

const canExtract = (file) => {
  if (!file) return false;
  if (file.type === 'directory') return false;
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z', '.tar.gz', '.tar.bz2', '.tar.xz'];
  return compressedFormats.some(format => file.name?.toLowerCase().endsWith(format));
};
const handleRowContextMenu = (row, column, event) => {
  // 阻止默认的右键菜单
  event.preventDefault();

  // 只有当不是在编辑状态时才显示右键菜单
  if (!row.isEditing) {
    // 记录选中的文件和菜单位置
    selectedFile.value = row;
    contextMenuPosition.value = {
      x: event.clientX,
      y: event.clientY
    };

    // 显示右键菜单
    contextMenuVisible.value = true;
  }
};

// 行双击处理：在非编辑状态下双击任意行（除按钮等交互元素）打开文件/进入目录
const handleRowDblClick = (row, column, event) => {
  // 如果正在编辑，忽略双击
  if (row.isEditing) return;

  // 防止在操作按钮、输入框等元素上触发双击打开
  try {
    const target = event?.target;
    if (target) {
      if (target.closest('.el-button') || target.closest('.el-button-group') || target.closest('.edit-input')) {
        return;
      }
    }
  } catch (e) {
    // ignore errors from closest in some environments
  }

  // 调用现有的双击处理逻辑
  handleNameDblClick(row);
};

const handleContextMenuCommand = (command) => {
  const { action, file } = command;
  switch (action) {
    case 'compress':
      emit('compress', file);
      break;
    case 'extract':
      emit('extract', file);
      break;
    case 'download':
      emit('download', file);
      break;
    case 'edit':
      handleEdit(file);
      break;
    case 'delete':
      emit('delete', file);
      break;
  }
  // ContextMenu 组件会自动隐藏菜单
};

const handleContextMenuHide = () => {
  contextMenuVisible.value = false;
  selectedFile.value = null;
};

const handleContextMenuVisible = (visible) => {
  contextMenuVisible.value = visible;
  if (!visible) {
    selectedFile.value = null;
  }
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
