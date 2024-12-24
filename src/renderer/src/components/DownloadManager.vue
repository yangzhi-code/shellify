<template>
  <div class="download-manager">
    <el-popover
      v-model:visible="showDownloadList"
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="download-popover"
    >
      <template #reference>
        <div class="download-button">
          <el-badge
            :value="activeDownloads"
            :max="99"
            class="download-badge"
            :hidden="activeDownloads === 0"
          >
            <div class="download-icon-wrapper">
              <el-icon style="font-size: 16px; color: #000"><Download /></el-icon>
              <div v-if="hasActiveDownload" class="progress-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E6E6E6"
                    stroke-width="3"
                  />
                  <path
                    d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="var(--el-color-primary)"
                    stroke-width="3"
                    :stroke-dasharray="`${totalProgress}, 100`"
                  />
                </svg>
              </div>
            </div>
          </el-badge>
        </div>
      </template>

      <div class="download-list">
        <div class="download-header">
          <span>下载记录</span>
          <div class="header-actions">
            <el-tooltip :content="currentDownloadPath || '未设置'" placement="top">
              <el-button link size="small" @click="openDownloadPathSettings">
                <el-icon><Setting /></el-icon>
                下载路径
              </el-button>
            </el-tooltip>
            <el-button
              link
              size="small"
              @click="clearDownloadRecords"
              :disabled="downloadRecords.length === 0"
            >
              清空所有记录
            </el-button>
          </div>
        </div>

        <div class="download-items">
          <template v-if="downloadRecords.length">
            <div
              v-for="record in downloadRecords"
              :key="record.id"
              class="download-item"
              :class="{
                'is-active': record.status === 'downloading',
                'is-error': record.status === 'error'
              }"
            >
              <div class="item-info">
                <el-icon><Document /></el-icon>
                <div class="file-info">
                  <div class="filename" :title="record.file_name">
                    {{ record.file_name }}
                  </div>
                  <div class="status-info">
                    <div class="status">
                      <template v-if="record.status === 'downloading'">
                        <div class="download-progress">
                          <div>
                            {{ formatFileSize(getDownloadedSize(record)) }} /
                            {{ formatFileSize(record.total_size) }}
                          </div>
                          <div class="download-speed">
                            {{ formatSpeed(calculateSpeed(record)) }}
                          </div>
                        </div>
                      </template>
                      <template v-else-if="record.status === 'completed'">
                        已完成 - {{ formatFileSize(record.total_size) }}
                        <span class="completed-time">{{ formatTime(record.updated_at) }}</span>
                      </template>
                      <template v-else-if="record.status === 'error'">
                        下载失败 - {{ record.error }}
                      </template>
                      <template v-else-if="record.status === 'interrupted'">
                        <div class="interrupted-status">
                          下载中断 - {{ formatFileSize(getDownloadedSize(record)) }} / {{ formatFileSize(record.total_size) }}
                          <el-button 
                            type="primary" 
                            link 
                            size="small" 
                            @click="retryDownload(record)"
                          >
                            重试
                          </el-button>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                <!-- 操作按钮 -->
                <div class="item-actions">
                  <template v-if="record.status === 'completed'">
                    <el-button type="primary" link size="small" @click="openFile(record)">
                      <el-icon><FolderOpened /></el-icon>
                    </el-button>
                    <el-button type="primary" link size="small" @click="openFolder(record)">
                      <el-icon><Folder /></el-icon>
                    </el-button>
                  </template>
                  <el-button type="danger" link size="small" @click.stop="deleteRecord(record.id)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <el-progress
                v-if="record.status === 'downloading'"
                :percentage="record.progress"
                :show-text="false"
                :stroke-width="2"
                :status="record.status === 'error' ? 'exception' : 'success'"
              />
            </div>
          </template>
          <div v-else class="no-downloads">暂无下载记录</div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Document, Download, FolderOpened, Folder, Delete, Setting } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const showDownloadList = ref(false)
const downloadRecords = ref([])

// 添加下载速率的状态
const downloadSpeeds = ref(new Map())
const lastChunkSizes = ref(new Map())
const lastUpdateTimes = ref(new Map())

// 添加当前下载路径状态
const currentDownloadPath = ref('')

// 计算下载速率
const calculateSpeed = (record) => {
  if (record.status !== 'downloading') return 0

  const now = Date.now()
  const lastTime = lastUpdateTimes.value.get(record.id) || now
  const lastDownloaded = lastChunkSizes.value.get(record.id) || 0
  const currentDownloaded = getDownloadedSize(record)
  const timeDiff = now - lastTime

  if (timeDiff > 0 && currentDownloaded > lastDownloaded) {
    const byteDiff = currentDownloaded - lastDownloaded
    const speed = (byteDiff * 1000) / timeDiff // bytes per second

    // 更新缓存
    lastUpdateTimes.value.set(record.id, now)
    lastChunkSizes.value.set(record.id, currentDownloaded)
    downloadSpeeds.value.set(record.id, speed)

    return speed
  }

  return downloadSpeeds.value.get(record.id) || 0
}

// 格式化速率
const formatSpeed = (bytesPerSecond) => {
  if (!bytesPerSecond) return '0 B/s'
  const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  let index = 0
  let speed = bytesPerSecond

  while (speed >= 1024 && index < units.length - 1) {
    speed /= 1024
    index++
  }

  return `${speed.toFixed(1)} ${units[index]}`
}
//计算已经下载的文件大小
const getDownloadedSize = (record) => {
  if (!record.total_size) return 0
  return Math.floor(record.total_size * (record.progress / 100))
}

// 计算活跃下载数量
const activeDownloads = computed(() => {
  return downloadRecords.value.filter((r) => r.status === 'downloading').length
})

// 是否有活跃下载
const hasActiveDownload = computed(() => {
  return downloadRecords.value.some((r) => r.status === 'downloading')
})

// 计算总体下载进度
const totalProgress = computed(() => {
  const downloading = downloadRecords.value.filter((r) => r.status === 'downloading')
  if (downloading.length === 0) return 0

  const totalProgress = downloading.reduce((sum, record) => sum + record.progress, 0)
  return Math.round(totalProgress / downloading.length)
})

// 格式化文件大小
const formatFileSize = (size) => {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let index = 0
  let fileSize = size

  while (fileSize >= 1024 && index < units.length - 1) {
    fileSize /= 1024
    index++
  }

  return `${fileSize.toFixed(2)} ${units[index]}`
}

// 格式化时间
const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString()
}

// 打开文件
const openFile = async (record) => {
  try {
    if (!record.file_path) {
      throw new Error('文件路径不存在');
    }
    // 先检查文件是否存在
    const exists = await window.electron.ipcRenderer.invoke('file:exists', record.file_path);
    if (!exists) {
      throw new Error('文件已被移动或删除');
    }

    const result = await window.electron.ipcRenderer.invoke('file:open', record.file_path);
    if (!result.success) {
      throw new Error(result.error);
    }
  } catch (error) {
    ElMessage.error('打开文件失败: ' + error.message);
  }
};

// 打开所在文件夹
const openFolder = async (record) => {
  try {
    if (!record.file_path) {
      throw new Error('文件路径不存在')
    }
    await window.electron.ipcRenderer.invoke('file:show-in-folder', record.file_path)
  } catch (error) {
    ElMessage.error('打开文件夹失败: ' + error.message)
  }
}

// 删除单条记录
const deleteRecord = async (downloadId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条下载记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      beforeClose: (action, instance, done) => {
        // 阻止弹窗闭时触发的事件冒泡
        if (action === 'confirm') {
          instance.confirmButtonLoading = true
          window.electron.ipcRenderer
            .invoke('store:delete-download', downloadId)
            .then(() => {
              instance.confirmButtonLoading = false
              loadDownloadRecords()
              ElMessage.success('删除成功')
              done()
            })
            .catch((error) => {
              instance.confirmButtonLoading = false
              console.error('删除下载记录失败:', error)
              ElMessage.error('删除失败')
              done()
            })
        } else {
          done()
        }
      }
    })
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除下载记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 清空所有记录
const clearDownloadRecords = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有下载记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await window.electron.ipcRenderer.invoke('store:delete-all-downloads')
    await loadDownloadRecords()
    ElMessage.success('清空成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空下载记录失败:', error)
      ElMessage.error('清空失败')
    }
  }
}

// 修改下载记录加载函数
const loadDownloadRecords = async () => {
  try {
    const records = await window.electron.ipcRenderer.invoke('store:get-downloads')
    // 清理已完成下载的缓存
    records.forEach((record) => {
      if (record.status !== 'downloading') {
        downloadSpeeds.value.delete(record.id)
        lastChunkSizes.value.delete(record.id)
        lastUpdateTimes.value.delete(record.id)
      }
    })
    downloadRecords.value = records
  } catch (error) {
    console.error('加载下载记录失败:', error)
  }
}

// 监听下载进度更新
const handleDownloadUpdate = (event, downloadInfo) => {
  // 更新单条记录而不是重新加载所有记录
  const index = downloadRecords.value.findIndex((r) => r.id === downloadInfo.id)

  if (index !== -1) {
    const oldRecord = downloadRecords.value[index]
    const newRecord = {
      ...oldRecord,
      ...downloadInfo
    }

    // 只在进度有变化时更新速度计算相关的数据
    if (oldRecord.progress !== newRecord.progress) {
      const now = Date.now()
      const lastTime = lastUpdateTimes.value.get(newRecord.id) || now
      const lastDownloaded = lastChunkSizes.value.get(newRecord.id) || 0
      const currentDownloaded = getDownloadedSize(newRecord)
      const timeDiff = now - lastTime

      if (timeDiff > 0 && currentDownloaded > lastDownloaded) {
        const byteDiff = currentDownloaded - lastDownloaded
        const speed = (byteDiff * 1000) / timeDiff

        lastUpdateTimes.value.set(newRecord.id, now)
        lastChunkSizes.value.set(newRecord.id, currentDownloaded)
        downloadSpeeds.value.set(newRecord.id, speed)
      }
    }

    downloadRecords.value[index] = newRecord
  } else {
    // 添加新记录
    downloadRecords.value.unshift(downloadInfo)
    // 初始化速度计算相关的数据
    lastUpdateTimes.value.set(downloadInfo.id, Date.now())
    lastChunkSizes.value.set(downloadInfo.id, getDownloadedSize(downloadInfo))
  }
}

// 加载下载路径
const loadDownloadPath = async () => {
  try {
    const path = await window.electron.ipcRenderer.invoke('settings:get-download-path')
    currentDownloadPath.value = path
  } catch (error) {
    console.error('加载下载路径失败:', error)
  }
}

// 打开下载路径设置
const openDownloadPathSettings = async () => {
  try {
    const result = await window.electron.ipcRenderer.invoke('dialog:select-folder');
    if (result && result.filePaths && result.filePaths[0]) {
      const selectedPath = result.filePaths[0];
      await window.electron.ipcRenderer.invoke('settings:set-download-path', selectedPath);
      currentDownloadPath.value = selectedPath;
      ElMessage({
        type: 'success',
        message: '下载路径设置成功',
        duration: 2000
      });
    }
  } catch (error) {
    console.error('设置下载路径失败:', error);
    ElMessage({
      type: 'error',
      message: '设置下载路径失败: ' + error.message,
      duration: 3000
    });
  }
}

// 重试下载
const retryDownload = async (record) => {
  try {
    await window.electron.ipcRenderer.invoke('ssh:retry-download', {
      downloadId: record.id,
      connectionId: record.connection_id,
      remotePath: record.remote_path,
      fileName: record.file_name
    });
    ElMessage.success('开始重新下载');
  } catch (error) {
    console.error('重试下载失败:', error);
    ElMessage.error('重试下载失败: ' + error.message);
  }
};

onMounted(async () => {
  await loadDownloadPath() // 加载下载路径
  loadDownloadRecords() // 加载下载记录
  window.electron.ipcRenderer.on('download-updated', handleDownloadUpdate)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('download-updated', handleDownloadUpdate)
})
</script>

<style scoped>
.download-manager {
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.download-button {
  position: relative;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.download-icon-wrapper {
  position: relative;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.progress-ring {
  position: absolute;
  top: -2px;
  left: -2px;
  width: 24px;
  height: 24px;
  transform: rotate(-90deg);
}

.download-badge :deep(.el-badge__content) {
  transform: scale(0.8);
}

.download-list {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.download-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.download-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.download-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.download-item:last-child {
  border-bottom: none;
}

.item-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.filename {
  font-size: 13px;
  color: var(--el-text-color-primary);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.no-downloads {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px;
}

:deep(.el-progress-bar__inner) {
  transition: width 0.3s ease;
}

:deep(.el-popover.download-popover) {
  padding: 0;
  max-height: 400px;
  overflow: hidden;
  margin-top: 5px !important;
}

.item-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.download-item:hover .item-actions {
  opacity: 1;
}

.status-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.completed-time {
  margin-left: 8px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.download-item.is-active {
  background-color: var(--el-color-primary-light-9);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

/* 添加下载路径按钮样式 */
.header-actions :deep(.el-button--small) {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
}

.header-actions :deep(.el-icon) {
  margin-right: 4px;
}

/* 提示框样式 */
:deep(.el-tooltip__trigger) {
  display: inline-flex;
}

.is-error {
  background-color: var(--el-color-danger-light-9);
}

.download-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.download-speed {
  color: var(--el-color-primary);
  font-family: monospace;
}

.interrupted-status {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--el-color-warning);
}
</style> 