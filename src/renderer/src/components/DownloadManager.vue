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
              <el-icon style="font-size: 16px;color: #000;"><Download /></el-icon>
              <div v-if="hasActiveDownload" class="progress-ring">
                <svg viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E6E6E6"
                    stroke-width="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
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
            <el-button 
              type="text" 
              size="small"
              @click="clearDownloadRecords"
              :disabled="downloadRecords.length === 0"
            >
              清除记录
            </el-button>
          </div>
        </div>

        <div class="download-items">
          <template v-if="downloadRecords.length">
            <div 
              v-for="record in downloadRecords" 
              :key="record.id" 
              class="download-item"
              :class="{ 'is-active': record.status === 'downloading' }"
            >
              <div class="item-info">
                <el-icon><Document /></el-icon>
                <div class="file-info">
                  <div class="filename" :title="record.fileName">
                    {{ record.fileName }}
                  </div>
                  <div class="status-info">
                    <div class="status">
                      <template v-if="record.status === 'downloading'">
                        下载中 - {{ formatFileSize(record.downloadedSize) }} / {{ formatFileSize(record.totalSize) }}
                      </template>
                      <template v-else-if="record.status === 'completed'">
                        已完成 - {{ formatFileSize(record.totalSize) }}
                        <span class="completed-time">{{ formatTime(record.completedTime) }}</span>
                      </template>
                      <template v-else-if="record.status === 'error'">
                        下载失败 - {{ record.error }}
                      </template>
                    </div>
                  </div>
                </div>
                <!-- 添加操作按钮 -->
                <div class="item-actions" v-if="record.status === 'completed'">
                  <el-button 
                    type="primary" 
                    link
                    size="small"
                    @click="openFile(record)"
                  >
                    <el-icon><FolderOpened /></el-icon>
                  </el-button>
                  <el-button 
                    type="primary" 
                    link
                    size="small"
                    @click="openFolder(record)"
                  >
                    <el-icon><Folder /></el-icon>
                  </el-button>
                </div>
              </div>
              <el-progress 
                v-if="record.status === 'downloading'"
                :percentage="record.progress"
                :show-text="false"
                :stroke-width="2"
                status="success"
              />
            </div>
          </template>
          <div v-else class="no-downloads">
            暂无下载记录
          </div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Document, Download, FolderOpened, Folder } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const showDownloadList = ref(false)
const downloadRecords = ref([])

// 计算活跃下载数量
const activeDownloads = computed(() => {
  return downloadRecords.value.filter(r => r.status === 'downloading').length
})

// 是否有活跃下载
const hasActiveDownload = computed(() => {
  return downloadRecords.value.some(r => r.status === 'downloading')
})

// 计算总体下载进度
const totalProgress = computed(() => {
  const downloading = downloadRecords.value.filter(r => r.status === 'downloading')
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
    await window.electron.ipcRenderer.invoke('file:open', record.filePath)
  } catch (error) {
    ElMessage.error('打开文件失败: ' + error.message)
  }
}

// 打开所在文件夹
const openFolder = async (record) => {
  try {
    await window.electron.ipcRenderer.invoke('file:show-in-folder', record.filePath)
  } catch (error) {
    ElMessage.error('打开文件夹失败: ' + error.message)
  }
}

// 清除下载记录
const clearDownloadRecords = async () => {
  try {
    await window.electron.ipcRenderer.invoke('store:clear-downloads')
    await loadDownloadRecords()
    ElMessage.success('清除记录成功')
  } catch (error) {
    console.error('清除下载记录失败:', error)
    ElMessage.error('清除记录失败')
  }
}

// 加载下载记录
const loadDownloadRecords = async () => {
  try {
    const records = await window.electron.ipcRenderer.invoke('store:get-downloads')
    console.log('下载记录:', records)
    downloadRecords.value = records
  } catch (error) {
    console.error('加载下载记录失败:', error)
  }
}

// 监听下载进度更新
const handleDownloadUpdate = () => {
  loadDownloadRecords()
}

onMounted(() => {
  loadDownloadRecords()
  window.electron.ipcRenderer.on('download-updated', handleDownloadUpdate)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('download-updated', handleDownloadUpdate)
})
</script>

<style scoped>
.download-manager {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.download-button {
  position: relative;
  cursor: pointer;
  padding: 4px;
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
  margin-left: auto;
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
}

:deep(.el-button--small) [class*=el-icon]+span {
  margin-left: 4px;
}
</style> 