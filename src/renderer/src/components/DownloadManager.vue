<template>
  <div class="download-manager">
    <!-- 下载按钮 -->
    <div class="download-button" @click="showDownloadList = true">
      <el-badge :value="activeDownloads" :max="99" class="download-badge">
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

    <!-- 下载记录弹出框 -->
    <el-popover
      v-model:visible="showDownloadList"
      placement="bottom-start"
      :width="400"
      trigger="click"
      popper-class="download-popover"
    >
      <template #reference>
        <div style="display: none"></div>
      </template>
      <div class="download-list">
        <div class="download-header">
          <span>下载记录</span>
          <el-button 
            type="text" 
            size="small"
            @click="clearDownloadRecords"
          >
            清除记录
          </el-button>
        </div>
        <div class="download-items">
          <template v-if="downloadRecords.length">
            <div 
              v-for="record in downloadRecords" 
              :key="record.id" 
              class="download-item"
            >
              <div class="item-info">
                <el-icon><Document /></el-icon>
                <div class="file-info">
                  <div class="filename" :title="record.fileName">
                    {{ record.fileName }}
                  </div>
                  <div class="status">
                    <template v-if="record.status === 'downloading'">
                      下载中 - {{ record.progress }}%
                    </template>
                    <template v-else-if="record.status === 'completed'">
                      已完成
                    </template>
                    <template v-else>
                      下载失败 - {{ record.error }}
                    </template>
                  </div>
                </div>
              </div>
              <el-progress 
                v-if="record.status === 'downloading'"
                :percentage="record.progress"
                :show-text="false"
                :stroke-width="2"
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
import { Document, Download } from '@element-plus/icons-vue'

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

// 清除下载记录
const clearDownloadRecords = async () => {
  try {
    await window.electron.ipcRenderer.invoke('store:clear-downloads')
    await loadDownloadRecords()
  } catch (error) {
    console.error('清除下载记录失败:', error)
  }
}

// 加载下载记录
const loadDownloadRecords = async () => {
  try {
    const records = await window.electron.ipcRenderer.invoke('store:get-downloads')
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
}
</style> 