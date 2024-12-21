<template>
  <div class="file-manager">
    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="path-nav">
        <el-breadcrumb>
          <el-breadcrumb-item @click="navigateToRoot">根目录</el-breadcrumb-item>
          <el-breadcrumb-item 
            v-for="(part, index) in currentPath" 
            :key="index"
            @click="navigateTo(index)"
          >
            {{ part }}
          </el-breadcrumb-item>
        </el-breadcrumb>
      </div>
      <div class="tools-group">
        <div class="tools">
          <el-button-group>
            <el-button size="small" @click="refresh">
              <el-icon><Refresh /></el-icon>
            </el-button>
            <el-button size="small" @click="uploadFile">
              <el-icon><Upload /></el-icon>上传
            </el-button>
            <el-button size="small" @click="createFolder">
              <el-icon><FolderAdd /></el-icon>新建文件夹
            </el-button>
          </el-button-group>
        </div>
        <div class="search-bar">
          <div class="search-input">
            <el-icon class="search-icon"><Search /></el-icon>
            <input
              v-model="searchKeyword"
              class="input-field"
              placeholder="搜索文件..."
              @keyup.enter="handleSearch"
            />
            <el-icon 
              v-if="searchKeyword" 
              class="clear-icon" 
              @click="clearSearch"
            >
              <Close />
            </el-icon>
          </div>
          <div class="search-options">
            <el-checkbox v-model="searchOptions.caseSensitive" size="small">区分大小写</el-checkbox>
            <el-checkbox v-model="searchOptions.recursive" size="small">搜索子目录</el-checkbox>
          </div>
        </div>
      </div>
    </div>

    <!-- 文件列表 -->
    <el-table 
      :data="currentPageData" 
      style="width: 100%"
      v-loading="loading"
    >
      <el-table-column prop="name" label="文件名" min-width="200">
        <template #default="{ row }">
          <div class="file-name-cell">
            <el-icon v-if="row.type === 'directory'"><Folder /></el-icon>
            <el-icon v-else><Document /></el-icon>
            <span class="file-name" @click="handleFileClick(row)">{{ row.name }}</span>
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
              @click="downloadFile(row)"
              :disabled="!canDownload(row)"
              :title="!canDownload(row) ? '目录不可直接下载' : '下载文件'"
            >
              <el-icon><Download /></el-icon>
            </el-button>
            <el-button size="small" @click="renameFile(row)">
              <el-icon><Edit /></el-icon>
            </el-button>
            <el-button size="small" type="danger" @click="deleteFile(row)">
              <el-icon><Delete /></el-icon>
            </el-button>
          </el-button-group>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页器 -->
    <div class="pagination-container">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[20, 50, 100, 200]"
        :total="fileList.length"
        layout="total, sizes, prev, pager, next"
        :pager-count="5"
        size="small"
        background
        :popper-class="'select-small'"
        
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Folder, Document, Refresh, Upload, FolderAdd,
  Download, Edit, Delete, Search, Close
} from '@element-plus/icons-vue'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  }
})

// 状态变量
const currentPath = ref([])
const currentFullPath = computed(() => {
  if (currentPath.value.length === 0) return '/';
  return '/' + currentPath.value.join('/');
})
const fileList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(20)

// 计算当前页的数据
const currentPageData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return fileList.value.slice(start, end)
})

// 加载文件列表
const loadFileList = async () => {
  console.log('请求路径:', currentFullPath.value);
  loading.value = true;
  try {
    const response = await window.electron.ipcRenderer.invoke('ssh:list-files', {
      connectionId: props.connectionId,
      path: currentFullPath.value
    });
    fileList.value = response;
  } catch (error) {
    console.error('加载文件列表失败:', error);
    if (error.message?.includes('Channel open failure')) {
      window.$message?.error?.('连接已断开，请重新连接');
      return;
    }
    window.$message?.error?.('加载文件列表失败: ' + (error.message || '未知错误'));
  } finally {
    loading.value = false;
  }
};

// 处理文件点击
const handleFileClick = (file) => {
  if (file.type === 'directory') {
    // 处理特殊目录
    if (file.name === '..') {
      // 返回上级目录
      currentPath.value.pop();
    } else {
      // 进入子目录
      currentPath.value.push(file.name);
    }
    loadFileList();
  }
}

// 分页相关方法
const handleSizeChange = (val) => {
  pageSize.value = val
  currentPage.value = 1
}

const handleCurrentChange = (val) => {
  currentPage.value = val
}

// 文件大小格式化
const formatFileSize = (size) => {
  if (!size) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(2)} ${units[index]}`
}

// 其他文件操作方法
const refresh = () => {
  loadFileList()
}

const uploadFile = () => {
  // TODO: 实现文件上传
}

const createFolder = () => {
  // TODO: 实现创建文件夹
}

// 检查文件是否可下载
const canDownload = (file) => {
  // 如果是文件，直接可下载
  if (file.type === 'file') return true;
  
  // 如果是压缩包格式的目录也可以下载
  const compressedFormats = ['.zip', '.tar', '.gz', '.tgz', '.rar', '.7z'];
  return compressedFormats.some(format => file.name.toLowerCase().endsWith(format));
}

// 处理文件下载
const downloadFile = async (file) => {
  if (!canDownload(file)) return;
  
  try {
    loading.value = true;
    await window.electron.ipcRenderer.invoke('ssh:download-file', {
      connectionId: props.connectionId,
      remotePath: file.path,
      fileName: file.name
    });
    window.$message.success('文件下载成功');
  } catch (error) {
    console.error('文件下载失败:', error);
    window.$message.error('文件下载失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

const renameFile = (file) => {
  // TODO: 实现文件重命名
}

const deleteFile = (file) => {
  // TODO: 实现文件删除
}

// 导航到根目录
const navigateToRoot = () => {
  currentPath.value = []
  loadFileList()
}

// 导航到指定层级
const navigateTo = (index) => {
  currentPath.value = currentPath.value.slice(0, index + 1)
  loadFileList()
}

// 搜索相关
const searchKeyword = ref('')
const searchOptions = ref({
  caseSensitive: false,
  recursive: true
})
const isSearching = ref(false)

// 显示通知
const showNotification = (title, message, type = 'info') => {
  new window.Notification(title, {
    body: message,
    icon: type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'
  });
}

// 处理搜索
const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    loadFileList();
    return;
  }

  console.log('开始搜索，关键词:', searchKeyword.value);
  console.log('搜索起始目录:', currentFullPath.value);
  loading.value = true;
  isSearching.value = true;

  try {
    // 确保有有效的搜索路径
    if (!currentFullPath.value) {
      throw new Error('当前路径无效');
    }

    const results = await window.electron.ipcRenderer.invoke('ssh:search-files', {
      connectionId: props.connectionId,
      startPath: currentFullPath.value,
      keyword: searchKeyword.value,
      options: {
        caseSensitive: searchOptions.value.caseSensitive,
        recursive: searchOptions.value.recursive,
        maxResults: 1000,
        maxDepth: 10
      }
    });
    
    console.log('搜索完成，结果数:', results?.length);
    fileList.value = results;
    
    if (results.length === 0) {
      window.$message.info('未找到匹配的文件或文件夹');
    }
  } catch (error) {
    console.error('搜索失败，详细错误:', error);
    if (error.message?.includes('搜索超时')) {
      showNotification('搜索提示', '搜索超时，请缩小搜索范围或使用更具体的关键词', 'warning');
    } else if (error.message?.includes('达到最大结果数')) {
      showNotification('搜索提示', '搜索结果过多，仅显示前1000条结果', 'warning');
    } else if (error.message?.includes('Permission denied')) {
      showNotification('搜索提示', '部分目录无访问权限，结果可能不完整', 'warning');
    } else if (error.message?.includes('达到最大深度')) {
      showNotification('搜索提示', '已达到最大搜索深度，结果可能不完整', 'warning');
    } else if (error.message?.includes('Channel open failure')) {
      showNotification('连接错误', '连接已断开，请重新连接后再试', 'error');
    } else {
      showNotification('搜索错误', '搜索失败: ' + (error.message || '发生未知错误，请重试'), 'error');
    }
  } finally {
    loading.value = false;
    isSearching.value = false;
  }
}

// 清除搜索并刷新列表
const clearSearch = () => {
  searchKeyword.value = '';
  // 如果正在搜索中，恢复到当前目录的文件列表
  if (isSearching.value) {
    loadFileList();
    isSearching.value = false;
  }
}

onMounted(() => {
  loadFileList()
})
</script>

<style scoped>
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  background: #fff;
  min-width: 0;
  width: 100%;
}

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

/* 调整面包屑样式以适应新容器 */
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

/* 调整包屑分隔符样式 */
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

:deep(.el-button--small) {
  height: 24px;
  padding: 0 8px;
}

:deep(.el-icon) {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.file-name-cell {
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-name {
  cursor: pointer;
}

.file-name:hover {
  color: var(--el-color-primary);
}

/* 确保图标垂直居中 */
:deep(.el-icon) {
  display: flex;
  align-items: center;
}

/* 分页容器样式 */
.pagination-container {
  padding: 4px 8px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

/* 自定义分页样式 */
:deep(.el-pagination) {
  font-size: 12px;
  --el-pagination-button-height: 24px;
  --el-pagination-button-width: 24px;
}

:deep(.el-pagination .el-select .el-input) {
  width: 90px;
}

/* 调整选择器弹出框样式 */
:deep(.select-small) {
  min-width: 90px !important;
}

:deep(.el-pagination__total) {
  margin-right: 8px;
}

:deep(.el-pagination__sizes) {
  margin-right: 8px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.search-input {
  position: relative;
  width: 160px;
  height: 24px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background-color: var(--el-input-bg-color);
  transition: all 0.2s;
  box-sizing: border-box;
  padding: 0 28px;
}

.search-input:hover,
.search-input:focus-within {
  border-color: var(--el-color-primary);
}

.search-icon {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--el-text-color-placeholder);
}

.clear-icon {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: var(--el-text-color-placeholder);
  cursor: pointer;
}

.input-field {
  width: 100%;
  height: 22px;
  line-height: 22px;
  font-size: 12px;
  color: var(--el-text-color-regular);
  border: none;
  outline: none;
  background: none;
  padding: 0;
  margin: 0;
  display: block;
}

.input-field::placeholder {
  color: var(--el-text-color-placeholder);
}

.search-options {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

:deep(.el-checkbox) {
  margin: 0;
  font-size: 12px;
  display: flex;
  align-items: center;
  min-height: 24px;
}

:deep(.el-checkbox__input) {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
}

:deep(.el-checkbox__label) {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding-left: 6px;
  line-height: 1;
}

:deep(.el-button.is-disabled) {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 