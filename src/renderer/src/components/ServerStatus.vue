<template>
  <div class="server-status">
    <!-- 基本信息 -->
    <div class="status-section">
      <div class="status-header">基本信息</div>
      <div class="status-item">
        <span class="label">公网IP</span>
        <span class="value highlight" @click="copyToClipboard(status.publicIp)">
          {{ shouldShowStats ? status.publicIp : '-' }}
        </span>
      </div>
      <div class="status-item">
        <span class="label">运行时间</span>
        <span class="value">{{ shouldShowStats ? status.uptime : '-' }}</span>
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
      <!-- CPU -->
      <div class="resource-item">
        <div class="resource-bar">
          <span class="resource-label">CPU</span>
          <div class="progress-bar">
            <div class="progress" :style="{ width: `${status.cpu}%`, backgroundColor: getCpuColor(status.cpu) }"></div>
            <span class="progress-text">{{ status.cpu.toFixed(1) }}%</span>
          </div>
        </div>
      </div>

      <!-- 内存 -->
      <div class="resource-item">
        <div class="resource-bar">
          <span class="resource-label">内存</span>
          <div class="progress-bar">
            <div class="progress" :style="{ width: `${status.memory.percentage}%`, backgroundColor: getMemoryColor(status.memory.percentage) }"></div>
            <span class="progress-text">
              {{ status.memory.percentage }}% ({{ status.memory.used }}/{{ status.memory.total }})
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 网络流量 -->
    <div class="status-section">
      <NetworkChart
        :upload="status.network.upload"
        :download="status.network.download"
        :interfaces="status.network.interfaces || []"
        @interface-change="handleInterfaceChange"
      />
    </div>

    <!-- 磁盘使用 -->
    <div class="status-section disk-section">
      <div class="status-header">磁盘使用</div>
      <div class="disk-list">
        <div v-for="disk in status.disks" :key="disk.mountPoint" class="resource-item">
          <div class="resource-bar">
            <span class="resource-label" :title="disk.mountPoint">{{ disk.mountPoint }}</span>
            <div class="progress-bar">
              <div 
                class="progress"
                :style="{ 
                  width: `${disk.percentage}%`,
                  backgroundColor: getDiskColor(disk.percentage)
                }"
              ></div>
              <span class="progress-text">
                {{ disk.percentage }}% ({{ disk.available }}/{{ disk.total }})
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import NetworkChart from './NetworkChart.vue'
import { useTabsStore } from '../stores/terminalStore'

const tabsStore = useTabsStore()

// 添加计算属性判断是否显示统计数据
const shouldShowStats = computed(() => {
  const currentTab = tabsStore.editableTabs.find(tab => tab.id === tabsStore.editableTabsValue)
  return currentTab?.data?.id != null
})

// 添加计算属性获取当前标签
const currentTab = computed(() => {
  const tab = tabsStore.editableTabs.find(tab => tab.id === tabsStore.editableTabsValue)
  // 如果有连接ID，立即获取一次数据
  if (tab?.data?.id) {
    shouldUpdate = true
    fetchServerStatus()
  }
  return tab
})

// 状态数据
const status = ref({
  publicIp: '',
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

// 添加一个标志来追踪组件是否应该更新
let shouldUpdate = true

// 重置状态数据的函数
const resetStatus = () => {
  console.log("重置状态数据")
  shouldUpdate = false  // 设置标志为 false
  status.value = {
    publicIp: '',
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
      download: '0 KB/s',
      interfaces: []
    },
    disks: []
  }
}

// 获取服务器状态
const fetchServerStatus = async () => {
  // 只有在有连接ID且应该显示统计时才获取状态
  if (!currentTab.value?.data?.id || !shouldShowStats.value) {
    resetStatus()
    return
  }

  try {
    const response = await window.electron.ipcRenderer.invoke(
      'get-server-status',
      currentTab.value.data.id
    )
    // 只有当 shouldUpdate 为 true 时才更新状态
    if (shouldUpdate) {
      status.value = response
    }
  } catch (error) {
    console.warn('获取服务器状态失败:', error)
    // 如果是连接不存在的错误，重置状态
    if (error.message?.includes('找不到连接')) {
      resetStatus()
    }
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

// 清理定时器的函数
const clearStatusTimer = () => {
  if (statusTimer) {
    clearInterval(statusTimer)
    statusTimer = null
  }
}

// 修改监听逻辑，同时监听标签切换和连接状态
watch(
  [currentTab, shouldShowStats],
  () => {
    // 先清理定时器和重置状态
    clearStatusTimer()
    resetStatus()
    
    // 如果是空标签或者没有连接，直接返��
    if (!currentTab.value?.data?.id || !shouldShowStats.value) {
      return
    }
    
    shouldUpdate = true  // 重新启用更新
    // 如果有新的连接ID且应该显示统计，则启动新的定时器
    fetchServerStatus()
    statusTimer = setInterval(fetchServerStatus, UPDATE_INTERVAL)
  },
  {
    immediate: true
  }
)

onMounted(() => {
  clearStatusTimer()
})

onUnmounted(() => {
  clearStatusTimer()
  shouldUpdate = false  // 确保组件卸载时不会更新
})

// 处理网卡切换
const handleInterfaceChange = (interfaceName) => {
  if (status.value.network.interfaces) {
    const selectedIface = status.value.network.interfaces.find(
      iface => iface.name === interfaceName
    )
    if (selectedIface) {
      status.value.network.upload = selectedIface.upload
      status.value.network.download = selectedIface.download
    }
  }
}

// 添加复制到剪贴板的函数
const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
    console.error('复制失败:', err)
  }
}
</script>

<style scoped>
.server-status {
  padding: 6px;
  font-size: 11px;
  height: 100%;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.status-section {
  margin-bottom: 6px;
  padding: 8px;
  background-color: #ffffff;
  border-radius: 6px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  flex-shrink: 0;
}

.status-header {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  color: #2c3e50;
  border-bottom: 1px solid #eee;
  padding-bottom: 4px;
}

.status-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 11px;
}

.label {
  color: #666;
}

.value {
  color: #2c3e50;
  min-width: 40px;
  text-align: right;
}

.value.highlight {
  color: #409eff;
}

.resource-item {
  margin-bottom: 8px;
}

.resource-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.resource-label {
  font-size: 11px;
  color: #666;
  width: 35px; /* 固定标签宽度 */
}

.progress-bar {
  flex: 1;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

.progress {
  height: 100%;
  background-color: #4ecdc4;
  transition: width 0.3s ease;
  border-radius: 2px;

}

.progress-text {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 11px;
  font-family: monospace;
  white-space: nowrap;
  z-index: 1;
}

/* 当进度超过特定值时，文字颜色改为白色 */
.progress[style*="width: 2"] ~ .progress-text,
.progress[style*="width: 3"] ~ .progress-text,
.progress[style*="width: 4"] ~ .progress-text,
.progress[style*="width: 5"] ~ .progress-text,
.progress[style*="width: 6"] ~ .progress-text,
.progress[style*="width: 7"] ~ .progress-text,
.progress[style*="width: 8"] ~ .progress-text,
.progress[style*="width: 9"] ~ .progress-text {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

.network-stats {
  display: flex;
  justify-content: space-between;
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
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 4px;
}

.disk-item {
  margin-bottom: 8px;
}

.disk-item .resource-bar {
  display: flex;
  align-items: center;
  gap: 8px;
}

.disk-item .resource-label {
  font-size: 11px;
  color: #666;
  width: 120px; /* 磁盘路径需要更宽一些 */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-item .progress-bar {
  flex: 1;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

.disk-item .progress {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 2px;
  min-width: 20px;
}

.disk-item .progress-text {
  position: absolute;
  left: 8px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
  font-size: 11px;
  font-family: monospace;
  white-space: nowrap;
  z-index: 1;
}

/* 当进度超过特定值时，文字颜色改为白色 */
.disk-item .progress[style*="width: 2"] ~ .progress-text,
.disk-item .progress[style*="width: 3"] ~ .progress-text,
.disk-item .progress[style*="width: 4"] ~ .progress-text,
.disk-item .progress[style*="width: 5"] ~ .progress-text,
.disk-item .progress[style*="width: 6"] ~ .progress-text,
.disk-item .progress[style*="width: 7"] ~ .progress-text,
.disk-item .progress[style*="width: 8"] ~ .progress-text,
.disk-item .progress[style*="width: 9"] ~ .progress-text {
  color: #fff;
  text-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
}

/* 移除旧的磁盘样式 */
.disk-mount,
.disk-progress,
.disk-progress-bar,
.disk-usage-text,
.disk-usage,
.disk-info,
.disk-size {
  display: none;
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
  height: 140px;
}

/* 磁盘部分 */
.disk-section {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}

.disk-list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.disk-list .resource-item {
  width: 100%;
  margin: 0;
}

.disk-list .resource-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.disk-list .resource-label {
  flex: 0 0 30px;
  min-width: 0;
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-list .progress-bar {
  flex: 1;
  min-width: 150px;
  height: 20px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: visible;
  position: relative;
}

/* 移除所有旧的磁盘相关样式 */
.disk-mount,
.disk-progress,
.disk-progress-bar,
.disk-usage-text,
.disk-usage,
.disk-info,
.disk-size,
.disk-details,
.disk-device {
  display: none;
}

/* 调整网络图表大小 */
:deep(.network-chart) {
  height: 120px;
}

.network-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  padding: 0 4px;
}

.interface-select {
  font-size: 12px;
  padding: 2px 4px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: #f5f5f5;
}

.network-stats {
  background-color: #1e1e1e;
  border-radius: 4px;
  padding: 8px;
}

.network-speed {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

.speed-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.speed-label {
  color: #fff;
  font-size: 14px;
  font-weight: bold;
}

.speed-value {
  color: #fff;
  font-size: 12px;
}

.disk-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.disk-device {
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-mount {
  font-size: 11px;
  color: #999;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-section {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.disk-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px;
}

.disk-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  gap: 12px;
}

.disk-mount {
  flex: 0 0 120px;
  font-size: 11px;
  color: #666;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.disk-usage {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
}

.disk-progress {
  flex: 1;
  height: 4px;
  background-color: #f0f0f0;
  border-radius: 2px;
  overflow: hidden;
}

.disk-progress-bar {
  height: 100%;
  transition: width 0.3s ease;
}

.disk-info {
  flex: 0 0 120px;
  text-align: right;
  font-size: 11px;
  color: #666;
  font-family: monospace;
}

.disk-size {
  white-space: nowrap;
}

.value-with-copy {
  display: flex;
  align-items: center;
  gap: 4px;
}

.copy-btn {
  font-size: 10px;
  padding: 1px 4px;
  background: #f0f0f0;
  border: 1px solid #ddd;
  border-radius: 3px;
  cursor: pointer;
  color: #666;
  line-height: 1;
  height: 16px;
}

.copy-btn:hover {
  background: #e0e0e0;
}

.copy-btn:active {
  background: #d0d0d0;
}
</style> 