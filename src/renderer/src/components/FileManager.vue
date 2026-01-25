<template>
  <div class="file-manager">
    <FileToolbar
      :current-path="currentPath"
      @navigate-root="navigateToRoot"
      @navigate="navigateTo"
      @refresh="refresh"
      @upload="handleUpload"
      @new-folder="handleNewFolder"
      @search="handleSearch"
      @clear-search="clearSearch"
    />
    
    <FileList
      :files="currentPageData"
      :loading="loading"
      @file-click="handleFileClick"
      @download="downloadFile"
      @delete="deleteFile"
      @save-new-folder="saveNewFolder"
      @cancel-new-folder="cancelNewFolder"
      @compress="compressFile"
      @extract="extractFile"
    />

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
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onUnmounted, onBeforeUnmount, getCurrentInstance, h } from 'vue';
import FileToolbar from './file/FileToolbar.vue';
import FileList from './file/FileList.vue';
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus';

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
const isCreatingNewFolder = ref(false)

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
    file.loading = true;
    // 调用下载方法
    await window.electron.ipcRenderer.invoke('ssh:download-file', {
      connectionId: props.connectionId,
      remotePath: file.path,
      fileName: file.name
    });
    
    // 直接显示成功消息，不需要检查 result
    ElMessage.success('文件下载成功');
  } catch (error) {
    console.error('文件下载失败:', error);
    ElMessage.error('文件下载失败: ' + error.message);
  } finally {
    file.loading = false;
  }
}

// 倒计时相关
const countdown = ref(5)
const confirmButtonText = computed(() => {
  return countdown.value > 0 ? `确定 (${countdown.value}s)` : '确定'
})

// 创建倒计时定时器
const startCountdown = () => {
  countdown.value = 5
  return setInterval(() => {
    if (countdown.value > 0) {
      countdown.value--
      // 更新确认按钮状态
      const confirmButton = document.querySelector('.delete-confirm-dialog .el-button--primary')
      if (confirmButton) {
        confirmButton.disabled = countdown.value > 0
        confirmButton.classList.toggle('is-disabled', countdown.value > 0)
        confirmButton.textContent = countdown.value > 0 ? `确定 (${countdown.value}s)` : '确定'
      }
    }
  }, 1000)
}

const deleteFile = async (file) => {
  try {
    // 安全检查：禁止删除根路径或空路径
    const normalized = (file.path || '').trim();
    if (!normalized || normalized === '/' || normalized === '~' || normalized === '.' || normalized === '..') {
      ElMessage.error('禁止删除根目录或无效路径');
      return;
    }

    // 重置倒计时
    countdown.value = 5
    let timer = startCountdown()

    try {
      // 显示确认对话框（与之前行为一致）
      await ElMessageBox.confirm(
        h('div', { class: 'delete-confirm-content' }, [
          h('p', { class: 'warning-text' }, '⚠️ 警告：删除后将无法恢复'),
          h('p', { class: 'file-info' }, [
            '确定要删除',
            file.type === 'directory' ? '文件夹' : '文件',
            ' "',
            h('span', { class: 'file-name' }, file.name),
            '" 吗？'
          ])
        ]),
        '删除确认',
        {
          confirmButtonText: confirmButtonText.value,
          distinguishCancelAndClose: true,
          confirmButtonProps: {
            disabled: true,
            class: 'is-disabled'
          },
          beforeClose: async (action, instance, done) => {
            if (action === 'confirm' && countdown.value > 0) {
              return
            }
            clearInterval(timer)
            done()
          },
          cancelButtonText: '取消',
          type: 'warning',
          customClass: 'delete-confirm-dialog',
          modalAppendToBody: false,
          appendToBody: true,
          lockScroll: false,
          closeOnClickModal: false,
          draggable: true
        }
      )

      // 调用删除（允许递归删除 directory）
      await window.electron.ipcRenderer.invoke('ssh:delete-file', {
        connectionId: props.connectionId,
        path: file.path,
        isDirectory: file.type === 'directory',
        recursive: true
      })

      // 刷新文件列表
      await loadFileList()
      ElMessage.success('删除成功')
    } catch (error) {
      // 只有在不是取消操作时才显示错误
      const errorStr = (error && error.toString && error.toString().toLowerCase()) || ''
      if (!errorStr.includes('cancel') && !errorStr.includes('close')) {
        console.error('删除失败:', error)
        ElMessage.error('删除失败: ' + (error.message || errorStr || '未知错误'))
      }
      // 确保清理定时器
      if (timer) {
        clearInterval(timer)
      }
    }
  } catch (error) {
    console.error('删除流程失败:', error)
    ElMessage.error('删除失败: ' + error.message)
  }
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
const handleSearch = async (searchData) => {
  console.log('FileManager 收到搜索请求:', searchData);
  if (!searchData.keyword.trim()) {
    loadFileList();
    return;
  }

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
      keyword: searchData.keyword,
      options: searchData.options
    });
    
    console.log('搜索完成，结果数:', results?.length);
    fileList.value = results;
    
    if (results.length === 0) {
      ElMessage.info('未找到匹配的文件或文件夹');
    }
  } catch (error) {
    console.error('搜索失败:', error);
    if (error.message?.includes('搜索超时')) {
      showNotification('搜索提示', '搜索超时，请缩小搜索范围或用更具体关键词', 'warning');
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

// 清除搜索
const clearSearch = () => {
  console.log('清除搜索');
  // 如果正在搜索中，恢复到当前目录的文件列表
  if (isSearching.value) {
    loadFileList();
    isSearching.value = false;
  }
};

// 监听 connectionId 变化
watch(() => props.connectionId, (newId) => {
  if (newId) {
    loadFileList();
  }
}, { immediate: true }); // immediate: true 会在组件创建时立即执行一次

// 组件挂载时加载文件列表
onMounted(() => {
  loadFileList(); // 加载根目录文件列表
  
  // 保存事件监听器的引用
  const refreshHandler = (event, path) => {
    if (path === currentFullPath.value) {
      loadFileList()
    }
  }
  
  // 添加事件监听器并保存引用
  window.electron.ipcRenderer.on('file:refresh-needed', refreshHandler)
  
  // 在组件实例上保存引用，以便后续清理
  currentInstance.refreshHandler = refreshHandler
})

onUnmounted(() => {
  // 使用保存的引用来移除事件监听器
  if (currentInstance.refreshHandler) {
    window.electron.ipcRenderer.removeListener('file:refresh-needed', currentInstance.refreshHandler)
  }
})

// 处理新建文件夹
const handleNewFolder = () => {
  if (isCreatingNewFolder.value) return;
  
  isCreatingNewFolder.value = true;
  const newFolder = {
    name: '',
    editingName: '新建文件夹',
    type: 'directory',
    isEditing: true,
    isNew: true
  };
  
  // 检查是否有重名，如果有就添加序号
  let index = 1;
  const baseName = '新建文件夹';
  while (fileList.value.some(f => f.name === newFolder.editingName)) {
    newFolder.editingName = `${baseName}(${index})`;
    index++;
  }
  
  fileList.value.unshift(newFolder);
};

// 保存新建文件夹
const saveNewFolder = async (folderName) => {
  try {
    // 检查文件夹名称是否合法
    if (!folderName.trim()) {
      throw new Error('文件夹名称不能为空');
    }
    
    // 检查是否存在重名
    if (fileList.value.some(f => f.name === folderName && !f.isNew)) {
      throw new Error('文件夹名称已存在');
    }
    
    // 调用后端 API 创建文件夹
    await window.electron.ipcRenderer.invoke('file:create-folder', {
      connectionId: props.connectionId,
      path: currentFullPath.value,
      folderName
    });
    
    // 刷新文件列表
    await loadFileList();
    
    ElMessage.success('文件夹创建成功');
  } catch (error) {
    // 显示具体的错误原因
    ElMessage.error({
      message: error.message || '创建文件夹失败',
      duration: 5000  // 显示时间更长一些
    });
  } finally {
    cancelNewFolder();
  }
};

// 取消新建文件夹
const cancelNewFolder = () => {
  isCreatingNewFolder.value = false;
  fileList.value = fileList.value.filter(f => !f.isNew);
};

// 处理上传
const handleUpload = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:select-multiple-files', {
      multiple: true
    });

    if (result.filePaths && result.filePaths.length > 0) {
      // 开始上传每个文件
      for (const filePath of result.filePaths) {
        await window.electron.ipcRenderer.invoke('ssh:upload-file', {
          connectionId: props.connectionId,
          localPath: filePath,
          remotePath: currentFullPath.value
        });
      }
      ElMessage.success('文件上传成功');
    }
  } catch (error) {
    console.error('文件上传失败:', error);
    ElMessage.error('文件上传失败: ' + error.message);
  }
};

// 处理压缩文件
const compressFile = async (file) => {
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在压缩，请稍候...',
    background: 'rgba(0, 0, 0, 0.4)'
  });

  try {
    await window.electron.ipcRenderer.invoke('ssh:compress-file', {
      connectionId: props.connectionId,
      path: file.path,
      isDirectory: file.type === 'directory',
      currentPath: currentFullPath.value
    });

    ElMessage.success('压缩完成');
    await loadFileList(); // 刷新文件列表
  } catch (error) {
    console.error('压缩失败:', error);
    ElMessage.error('压缩失败: ' + (error.message || '未知错误'));
  } finally {
    try {
      loadingInstance.close();
    } catch (e) {
      // ignore
    }
  }
};

// 处理解压文件
const extractFile = async (file) => {
  const loadingInstance = ElLoading.service({
    lock: true,
    text: '正在解压，请稍候...',
    background: 'rgba(0, 0, 0, 0.4)'
  });

  try {
    await window.electron.ipcRenderer.invoke('ssh:extract-file', {
      connectionId: props.connectionId,
      path: file.path,
      currentPath: currentFullPath.value
    });
    ElMessage.success('解压完成');
    await loadFileList(); // 刷新文件列表
  } catch (error) {
    console.error('解压失败:', error);
    ElMessage.error('解压失败: ' + (error.message || '未知错误'));
  } finally {
    try {
      loadingInstance.close();
    } catch (e) {
      // ignore
    }
  }
};

// 确保在组件卸载前清理事件监听器
onBeforeUnmount(() => {
  try {
    // 清理文件刷新事件监听器
    if (currentInstance.refreshHandler) {
      window.electron.ipcRenderer.removeListener('file:refresh-needed', currentInstance.refreshHandler)
    }
    
    // 清理其他可能的事件监听器
    const events = [
      'file-list-response',
      'file-operation-error',
      'file-operation-success'
    ]
    
    events.forEach(eventName => {
      const handler = currentInstance[`${eventName}Handler`]
      if (handler) {
        try {
          window.electron.ipcRenderer.removeListener(eventName, handler)
        } catch (error) {
          console.warn(`清理事件 ${eventName} 时出错:`, error)
        }
      }
    })
  } catch (error) {
    console.warn('清理事件监听器时出错:', error)
  }
})

// 在 setup 顶部添加
const currentInstance = getCurrentInstance()
</script>

<style scoped>
.file-manager {
  height: 100%;
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--el-bg-color);
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.pagination-container {
  padding: 8px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--el-border-color-lighter);
  background-color: var(--el-bg-color);
}

:deep(.el-pagination) {
  background-color: var(--el-bg-color);
  
  .el-pagination__total,
  .el-pagination__jump {
    color: var(--el-text-color-regular);
  }
  
  .el-pager li,
  .btn-prev,
  .btn-next {
    background-color: var(--el-bg-color);
    color: var(--el-text-color-regular);
    
    &:hover {
      color: var(--el-color-primary);
    }
    
    &.is-active {
      background-color: var(--el-color-primary);
      color: #fff;
    }
  }
}

/* 删除确认对话框样式 */
:deep(.delete-confirm-dialog) {
  :deep(.el-overlay) {
    overflow: hidden;
    position: fixed;
  }

  &.el-message-box {
    background-color: var(--el-bg-color) !important;
    border-color: var(--el-border-color) !important;
    margin: 15vh auto !important;
    position: fixed !important;
    top: 0;
    left: 50% !important;
    transform: translateX(-50%);
  }

  .delete-confirm-content {
    margin-bottom: 12px;
    text-align: center;
  }

  .warning-text {
    color: var(--el-color-danger);
    font-weight: bold;
    margin-bottom: 8px;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .file-info {
    color: var(--el-text-color-regular);
    font-size: 14px;
    margin: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
  }

  .file-name {
    color: var(--el-text-color-primary);
    font-size: 13px;
    font-family: monospace;
    background-color: var(--el-fill-color-light);
    padding: 2px 4px;
    border-radius: 2px;
    word-break: break-all;
    max-width: 100%;
    display: inline-block;
  }

  .el-message-box__header {
    text-align: center;
    width: 100%;
  }

  .el-message-box__content {
    text-align: center;
    width: 100%;
  }

  .el-message-box__btns {
    justify-content: center;
    .el-button--primary {
      font-size: 13px;
      
      &[disabled],
      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.5;
        background-color: var(--el-button-disabled-bg);
        border-color: var(--el-button-disabled-border-color);
        color: var(--el-button-disabled-text-color);
        pointer-events: none;
      }
    }
    
    .el-button--default {
      font-size: 13px;
    }
  }
}
</style> 