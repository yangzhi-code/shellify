<template>
  <div class="server-status">
    <!-- 基本信息 -->
    <div class="status-section">
      <div class="status-header">系统信息</div>
      <div class="status-item">
        <span class="label">IP地址</span>
        <span class="value highlight">{{ status.ip || '-' }}</span>
      </div>
      <div class="status-item">
        <span class="label">运行时间</span>
        <span class="value">{{ status.uptime }}</span>
      </div>
      <div class="status-item">
        <span class="label">系统负载</span>
        <span class="value">
          <el-tooltip placement="top">
            <template #content>
              <div class="load-tooltip">
                <div>1分钟: {{ status.load['1min'] }}</div>
                <div>5分钟: {{ status.load['5min'] }}</div>
                <div>15分钟: {{ status.load['15min'] }}</div>
              </div>
            </template>
            <span>{{ status.load['1min'] || '0.00' }}</span>
          </el-tooltip>
        </span>
      </div>
    </div>

    <!-- 资源使用 -->
    <div class="status-section">
      <!-- CPU和内存使用率 -->
      <div class="resource-group">
        <div class="resource-item">
          <div class="resource-label">
            <span class="resource-title">CPU</span>
            <span class="percentage" :style="{ color: getCpuTextColor(status.cpu) }">
              {{ status.cpu.toFixed(1) }}%
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress" 
              :style="{ 
                width: `${status.cpu}%`, 
                backgroundColor: getCpuColor(status.cpu),
                boxShadow: `0 0 6px ${getCpuColor(status.cpu)}`
              }"
            ></div>
          </div>
        </div>
        <div class="resource-item">
          <div class="resource-label">
            <span class="resource-title">内存</span>
            <span class="percentage" :style="{ color: getMemoryTextColor(status.memory.percentage) }">
              {{ status.memory.percentage }}%
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress" 
              :style="{ 
                width: `${status.memory.percentage}%`, 
                backgroundColor: getMemoryColor(status.memory.percentage),
                boxShadow: `0 0 6px ${getMemoryColor(status.memory.percentage)}`
              }"
            ></div>
          </div>
          <div class="memory-detail">
            已用: {{ status.memory.used }} / 总共: {{ status.memory.total }}
          </div>
        </div>
      </div>

      <!-- 网络流量 -->
      <div class="resource-item network-section">
        <div class="network-stats">
          <div class="network-item">
            <i class="iconfont icon-upload"></i>
            <span class="network-label">上传:</span>
            <span class="network-value">{{ status.network.upload }}</span>
          </div>
          <div class="network-item">
            <i class="iconfont icon-download"></i>
            <span class="network-label">下载:</span>
            <span class="network-value">{{ status.network.download }}</span>
          </div>
        </div>
        <NetworkChart
          :upload="status.network.upload"
          :download="status.network.download"
        />
      </div>
    </div>

    <!-- 磁盘使用 -->
    <div class="status-section disk-section">
      <div class="status-header">磁盘使用</div>
      <div class="disk-list">
        <div v-for="disk in status.disks" :key="disk.path" class="disk-item">
          <div class="disk-info">
            <span class="disk-path">{{ disk.path }}</span>
            <span class="disk-size" :style="{ color: getDiskTextColor(disk.percentage) }">
              {{ disk.percentage }}% ({{ disk.used }}/{{ disk.total }})
            </span>
          </div>
          <div class="progress-bar">
            <div 
              class="progress" 
              :style="{ 
                width: `${disk.percentage}%`, 
                backgroundColor: getDiskColor(disk.percentage),
                boxShadow: `0 0 6px ${getDiskColor(disk.percentage)}`
              }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import NetworkChart from './NetworkChart.vue'

const props = defineProps({
  connectionId: {
    type: String,
    required: true
  }
})

// 状态数据
const status = ref({
  ip: '',
  uptime: '',
  load: {
    '1min': '0.00',
    '5min': '0.00',
    '15min': '0.00'
  },
  cpu: 0,
  memory: {
    percentage: 0,
    used: '0GB',
    total: '0GB'
  },
  network: {
    upload: '0 KB/s',
    download: '0 KB/s'
  },
  disks: []
})

// 更新间隔（毫秒）
const UPDATE_INTERVAL = 2000

// 获取服务器状态
const fetchServerStatus = async () => {
  try {
    const response = await window.electron.ipcRenderer.invoke('get-server-status', props.connectionId)
    status.value = response
  } catch (error) {
    console.error('Failed to fetch server status:', error)
  }
}

// 颜色计算函数 - 进度条颜色
const getCpuColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

const getMemoryColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

const getDiskColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

// 文字颜色
const getCpuTextColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

const getMemoryTextColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

const getDiskTextColor = (value) => {
  if (value > 90) return '#ff4444'
  if (value > 70) return '#ffbb33'
  return '#00C851'
}

// 定时器
let statusTimer = null

onMounted(() => {
  fetchServerStatus() // 初始获取
  statusTimer = setInterval(fetchServerStatus, UPDATE_INTERVAL)
})

onUnmounted(() => {
  if (statusTimer) {
    clearInterval(statusTimer)
  }
})
</script>

<style scoped>
.server-status {
  padding: 8px;
  font-size: 12px;
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 移除滚动条 */
}

.status-section {
  margin-bottom: 8px;
  padding: 10px;
  background-color: #ffffff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  flex-shrink: 0; /* 防止压缩 */
}

.status-header {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 12px;
  color: #2c3e50;
  border-bottom: 2px solid #eee;
  padding-bottom: 6px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-size: 12px;
}

.label {
  color: #666;
  font-weight: 500;
}

.value {
  color: #2c3e50;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
}

.value.highlight {
  color: #409EFF;
  font-weight: 600;
}

.resource-item {
  margin-bottom: 15px;
}

.resource-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.resource-title {
  font-size: 12px;
  font-weight: 600;
  color: #2c3e50;
}

.percentage {
  font-size: 12px;
  font-weight: 600;
}

.progress-bar {
  height: 6px;
  background-color: #eee;
  border-radius: 4px;
  overflow: hidden;
}

.progress {
  height: 100%;
  transition: all 0.3s ease;
}

.memory-detail {
  font-size: 11px;
  color: #666;
  margin-top: 6px;
  text-align: right;
}

.network-stats {
  display: flex;
  justify-content: space-between;
  padding: 10px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.network-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}

.network-label {
  color: #666;
}

.network-value {
  color: #2c3e50;
  font-weight: 500;
}

.disk-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.disk-item {
  margin-bottom: 5px;
}

.disk-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  gap: 10px;
}

.disk-path {
  font-size: 12px;
  font-weight: 500;
  color: #2c3e50;
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-size {
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
}

/* 图标样式 */
.iconfont {
  font-size: 16px;
}

.icon-upload {
  color: #ff6b6b;
}

.icon-download {
  color: #4ecdc4;
}

.load-tooltip {
  text-align: left;
  line-height: 1.5;
}

/* 资源组布局 */
.resource-group {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.resource-group .resource-item {
  flex: 1;
  min-width: 0;
}

/* 网络部分 */
.network-section {
  height: 160px; /* 固定高度 */
}

/* 磁盘部分 */
.disk-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.disk-list {
  flex: 1;
  overflow-y: auto; /* 只有磁盘列表可以滚动 */
  padding-right: 4px;
}

/* 调整网络图表大小 */
:deep(.network-chart) {
  height: 100px;
}
</style> 