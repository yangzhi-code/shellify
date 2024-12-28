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

const handleEdit = (row) => {
  window.electron.ipcRenderer.send('open-editor', {
    path: row.path,
    name: row.name,
    type: row.type
  });
};
</script>

<style scoped>
/* 表格基础样式设置 */
:deep(.el-table) {
  flex: 1;                                /* 允许表格伸展填充剩余空间 */
  overflow: auto;                         /* 内容溢出时显示滚动条 */
  width: 100% !important;                 /* 强制表格宽度100% */
  min-width: 0;                          /* 防止表格溢出父容器 */
  --el-table-header-cell-height: 20px;   /* 自定义表头高度 */
  --el-table-row-height: 17px;           /* 自定义行高 */
  font-size: 12px;                       /* 设置表格整体字体大小 */
}

/* 表头样式自定义 */
:deep(.el-table th.el-table__cell) {
  font-size: 12px;                       /* 表头字体大小 */
  font-weight: normal;                   /* 表头字体粗细 */
}

/* 文件名单元格布局 */
.file-name-cell {
  display: flex;                         /* 弹性布局 */
  align-items: center;                   /* 垂直居中对齐 */
  gap: 2px;                             /* 子元素间距 */
  height: 20px;                         /* 单元格高度 */
}

/* 文件名文本样式 */
.file-name {
  padding-left: 5px;                    /* 文本左侧内边距 */
  cursor: pointer;                      /* 鼠标指针样式 */
  font-size: 12px;                      /* 文件名字体大小 */
}

/* 文件名悬停效果 */
.file-name:hover {
  color: var(--el-color-primary);       /* 悬停时的文字颜色 */
}

/* 编辑输入框样式 */
.edit-input :deep(.el-input__inner) {
  display: flex;                        /* 弹性布局 */
  align-items: center;                  /* 垂直居中对齐 */
  height: 18px;                         /* 输入框高度 */
  padding: 0 1px;                       /* 输入框内边距 */
  margin: 0;                            /* 清除外边距 */
  box-sizing: border-box;               /* 盒模型设置 */
  font-size: 12px;                      /* 输入框字体大小 */
}

/* 表格单元格内边距设置 */
:deep(.el-table td.el-table__cell),
:deep(.el-table th.el-table__cell) {
  padding: 0;                           /* 移除单元格默认内边距 */
}

/* 小型按钮样式 */
:deep(.el-button--small) {
  height: 18px;                         /* 按钮高度 */
  padding: 3px 8px;                       /* 按钮内边距 */
  font-size: 12px;                      /* 按钮字体大小 */
}

/* 图标样式 */
:deep(.el-icon) {
  display: flex;                        /* 弹性布局 */
  align-items: center;                  /* 垂直居中对齐 */
  font-size: 12px;                      /* 图标大小 */
}

/* 表格单元格文字大小 */
:deep(.el-table td.el-table__cell) {
  font-size: 12px;                      /* 单元格内容字体大小 */
}
</style>
