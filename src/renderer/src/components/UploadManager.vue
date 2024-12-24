<template>
  <div class="upload-manager">
    <el-popover
      v-model:visible="showUploadList"
      placement="bottom-end"
      :width="400"
      trigger="click"
      popper-class="upload-popover"
    >
      <template #reference>
        <div class="upload-button">
          <el-badge
            :value="activeUploads"
            :max="99"
            class="upload-badge"
            :hidden="activeUploads === 0"
          >
            <div class="upload-icon-wrapper">
              <el-icon style="font-size: 16px; color: #000"><Upload /></el-icon>
              <div v-if="hasActiveUpload" class="progress-ring">
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

      <div class="upload-list">
        <div class="upload-header">
          <span>上传记录</span>
          <div class="header-actions">
            <el-button
              link
              size="small"
              @click="clearUploadRecords"
              :disabled="uploadRecords.length === 0"
            >
              清空所有记录
            </el-button>
          </div>
        </div>

        <div class="upload-items">
          <template v-if="uploadRecords.length">
            <div
              v-for="record in uploadRecords"
              :key="record.id"
              class="upload-item"
              :class="{
                'is-active': record.status === 'uploading',
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
                      <template v-if="record.status === 'uploading'">
                        <div class="upload-progress">
                          <div>
                            {{ formatFileSize(getUploadedSize(record)) }} /
                            {{ formatFileSize(record.total_size) }}
                          </div>
                          <div class="upload-speed">
                            {{ formatSpeed(calculateSpeed(record)) }}
                          </div>
                          <el-button 
                            type="danger" 
                            link 
                            size="small" 
                            @click.stop="cancelUpload(record)"
                          >
                            取消
                          </el-button>
                        </div>
                      </template>
                      <template v-else-if="record.status === 'completed'">
                        已完成 - {{ formatFileSize(record.total_size) }}
                        <span class="completed-time">{{ formatTime(record.updated_at) }}</span>
                      </template>
                      <template v-else-if="record.status === 'error'">
                        上传失败 - {{ record.error }}
                      </template>
                      <template v-else-if="record.status === 'interrupted'">
                        <div class="interrupted-status">
                          上传中断 - {{ formatFileSize(getUploadedSize(record)) }} / {{ formatFileSize(record.total_size) }}
                          <el-button 
                            type="primary" 
                            link 
                            size="small" 
                            @click="retryUpload(record)"
                          >
                            重试
                          </el-button>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
                <div class="item-actions">
                  <el-button type="danger" link size="small" @click.stop="deleteRecord(record.id)">
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
              <el-progress
                v-if="record.status === 'uploading'"
                :percentage="record.progress"
                :show-text="false"
                :stroke-width="2"
                :status="record.status === 'error' ? 'exception' : 'success'"
              />
            </div>
          </template>
          <div v-else class="no-uploads">暂无上传记录</div>
        </div>
      </div>
    </el-popover>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Document, Upload, Delete } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const showUploadList = ref(false)
const uploadRecords = ref([])

// 上传速率状态
const uploadSpeeds = ref(new Map())
const lastChunkSizes = ref(new Map())
const lastUpdateTimes = ref(new Map())

// 计算上传速率
const calculateSpeed = (record) => {
  if (record.status !== 'uploading') return 0

  const now = Date.now()
  const lastTime = lastUpdateTimes.value.get(record.id) || now
  const lastUploaded = lastChunkSizes.value.get(record.id) || 0
  const currentUploaded = getUploadedSize(record)
  const timeDiff = now - lastTime

  if (timeDiff > 0 && currentUploaded > lastUploaded) {
    const byteDiff = currentUploaded - lastUploaded
    const speed = (byteDiff * 1000) / timeDiff

    lastUpdateTimes.value.set(record.id, now)
    lastChunkSizes.value.set(record.id, currentUploaded)
    uploadSpeeds.value.set(record.id, speed)

    return speed
  }

  return uploadSpeeds.value.get(record.id) || 0
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

// 计算已上传的文件大小
const getUploadedSize = (record) => {
  if (!record.total_size) return 0
  return Math.floor(record.total_size * (record.progress / 100))
}

// 计算活跃上传数量
const activeUploads = computed(() => {
  return uploadRecords.value.filter((r) => r.status === 'uploading').length
})

// 是否有活跃上传
const hasActiveUpload = computed(() => {
  return uploadRecords.value.some((r) => r.status === 'uploading')
})

// 计算总���上传进度
const totalProgress = computed(() => {
  const uploading = uploadRecords.value.filter((r) => r.status === 'uploading')
  if (uploading.length === 0) return 0

  const totalProgress = uploading.reduce((sum, record) => sum + record.progress, 0)
  return Math.round(totalProgress / uploading.length)
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

// 删除单条记录
const deleteRecord = async (uploadId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条上传记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await window.electron.ipcRenderer.invoke('store:delete-upload', uploadId)
    await loadUploadRecords()
    ElMessage.success('删除成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除上传记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 清空所有记录
const clearUploadRecords = async () => {
  try {
    await ElMessageBox.confirm('确定要清空所有上传记录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await window.electron.ipcRenderer.invoke('store:delete-all-uploads')
    await loadUploadRecords()
    ElMessage.success('清空成功')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空上传记录失败:', error)
      ElMessage.error('清空失败')
    }
  }
}

// 加载上传记录
const loadUploadRecords = async () => {
  try {
    const records = await window.electron.ipcRenderer.invoke('store:get-uploads')
    records.forEach((record) => {
      if (record.status !== 'uploading') {
        uploadSpeeds.value.delete(record.id)
        lastChunkSizes.value.delete(record.id)
        lastUpdateTimes.value.delete(record.id)
      }
    })
    uploadRecords.value = records
  } catch (error) {
    console.error('加载上传记录失败:', error)
  }
}

// 重试上传
const retryUpload = async (record) => {
  try {
    await window.electron.ipcRenderer.invoke('ssh:retry-upload', {
      uploadId: record.id,
      connectionId: record.connection_id,
      localPath: record.file_path,
      remotePath: record.remote_path
    })
    ElMessage.success('开始重新上传')
  } catch (error) {
    console.error('重试上传失败:', error)
    ElMessage.error('重试上传失败: ' + error.message)
  }
}

// 监听上传进度更新
const handleUploadUpdate = (event, uploadInfo) => {
  const index = uploadRecords.value.findIndex((r) => r.id === uploadInfo.id)

  if (index !== -1) {
    const oldRecord = uploadRecords.value[index]
    const newRecord = {
      ...oldRecord,
      ...uploadInfo
    }

    if (oldRecord.progress !== newRecord.progress) {
      const now = Date.now()
      const lastTime = lastUpdateTimes.value.get(newRecord.id) || now
      const lastUploaded = lastChunkSizes.value.get(newRecord.id) || 0
      const currentUploaded = getUploadedSize(newRecord)
      const timeDiff = now - lastTime

      if (timeDiff > 0 && currentUploaded > lastUploaded) {
        const byteDiff = currentUploaded - lastUploaded
        const speed = (byteDiff * 1000) / timeDiff

        lastUpdateTimes.value.set(newRecord.id, now)
        lastChunkSizes.value.set(newRecord.id, currentUploaded)
        uploadSpeeds.value.set(newRecord.id, speed)
      }
    }

    uploadRecords.value[index] = newRecord
  } else {
    uploadRecords.value.unshift(uploadInfo)
    lastUpdateTimes.value.set(uploadInfo.id, Date.now())
    lastChunkSizes.value.set(uploadInfo.id, getUploadedSize(uploadInfo))
  }
}

onMounted(() => {
  loadUploadRecords()
  window.electron.ipcRenderer.on('upload-updated', handleUploadUpdate)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('upload-updated', handleUploadUpdate)
})
</script>

<style scoped>
.upload-manager {
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
}

.upload-button {
  position: relative;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-icon-wrapper {
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

.upload-badge :deep(.el-badge__content) {
  transform: scale(0.8);
}

.upload-list {
  max-height: 400px;
  display: flex;
  flex-direction: column;
}

.upload-header {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.upload-items {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.upload-item {
  padding: 8px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.upload-item:last-child {
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

.no-uploads {
  text-align: center;
  color: var(--el-text-color-secondary);
  padding: 20px;
}

:deep(.el-progress-bar__inner) {
  transition: width 0.3s ease;
}

:deep(.el-popover.upload-popover) {
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

.upload-item:hover .item-actions {
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

.upload-item.is-active {
  background-color: var(--el-color-primary-light-9);
}

.header-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.is-error {
  background-color: var(--el-color-danger-light-9);
}

.upload-progress {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-speed {
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