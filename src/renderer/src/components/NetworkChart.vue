<template>
  <div class="network-chart">
    <div class="chart-header">
      <div class="speed-info">
        <div class="speed-item">
          <span class="arrow upload">↑</span>
          <span>{{ formatSpeed(upload) }}</span>
          <span class="arrow download">↓</span>
          <span>{{ formatSpeed(download) }}</span>
        </div>
      </div>
      <div v-if="interfaces.length > 0" class="interface-selector">
        <span class="current-interface">{{ selectedInterface }}</span>
        <div class="dropdown-trigger" @click="showDropdown = !showDropdown">
          <i class="arrow-down"></i>
        </div>
        <div v-if="showDropdown" class="interface-dropdown">
          <div
            v-for="iface in interfaces"
            :key="iface.name"
            class="dropdown-item"
            :class="{ active: iface.name === selectedInterface }"
            @click="selectInterface(iface.name)"
          >
            {{ iface.name }}
          </div>
        </div>
      </div>
    </div>
    <div class="chart-container">
      <v-chart class="chart" :option="chartOption" autoresize />
    </div>
  </div>
</template>

<style scoped>
.network-chart {
  width: 100%;
  height: 160px;
  background: var(--el-bg-color);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.speed-info {
  display: flex;
  gap: 16px;
}

.speed-item {
  display: flex;
  align-items: self-start;
  gap: 2px;
  font-size: 11px;
  color: #666;
  font-family: monospace;
}

.interface-selector {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #666;
  cursor: pointer;
  user-select: none;
}

.current-interface {
  font-family: monospace;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  padding: 2px;
}

.arrow-down {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 4px solid #666;
  transition: transform 0.2s;
}

.interface-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #eee;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.dropdown-item {
  padding: 6px 12px;
  white-space: nowrap;
  transition: background-color 0.2s;
}

.dropdown-item:hover {
  background-color: #f5f5f5;
}

.dropdown-item.active {
  color: #409EFF;
  background-color: #ecf5ff;
}

.chart-container {
  height: calc(100% - 20px);
  position: relative;
}

.chart {
  width: 100%;
  height: 100%;
}

.arrow {
  font-weight: bold;
}

.arrow.upload {
  color: #ff6b6b;
}

.arrow.download {
  color: #4ecdc4;
}
</style>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import VChart from 'vue-echarts'
import { use } from 'echarts/core'
import { LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

// 注册必要的组件
use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
])

const props = defineProps({
  upload: {
    type: String,
    required: false,
    default: '0 KB/s'
  },
  download: {
    type: String,
    required: false,
    default: '0 KB/s'
  },
  interfaces: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['interface-change'])

const selectedInterface = ref('')

const handleInterfaceChange = () => {
  emit('interface-change', selectedInterface.value)
}

// 监听接口列表变化，自动选择第一个接口
watch(() => props.interfaces, (newInterfaces) => {
  if (newInterfaces && newInterfaces.length > 0) {
    // 如果当前选择的接口不在列表中，选择第一个接口
    if (!newInterfaces.find(iface => iface.name === selectedInterface.value)) {
      selectedInterface.value = newInterfaces[0].name
      handleInterfaceChange()
    }
  }
}, { immediate: true })

// 先声明常量
const MAX_DATA_POINTS = 30 // 显示最近30个数据点

// 然后再使用常量初始化数据
const uploadData = ref(new Array(MAX_DATA_POINTS).fill(0))
const downloadData = ref(new Array(MAX_DATA_POINTS).fill(0))
const timeData = ref([])

// 将速度字符串转换为数值（统一转换为 KB/s）
const parseSpeed = (speedStr) => {
  const value = parseFloat(speedStr)
  const unit = speedStr.split(' ')[1] // 获取单位部分
  if (unit === 'B/s') return value / 1024
  if (unit === 'MB/s') return value * 1024
  return value // KB/s
}

// 初始化时间数据
const initTimeData = () => {
  const now = new Date()
  const times = []
  for (let i = 0; i < MAX_DATA_POINTS; i++) {
    const time = new Date(now - (MAX_DATA_POINTS - i - 1) * 1000)
    times.push(time.toLocaleTimeString('zh-CN', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }))
  }
  timeData.value = times
}

// 初始化时间数据
initTimeData()

// 格式化显示的速度（保留小数）
const formatSpeed = (speedStr) => {
  const value = parseFloat(speedStr)
  const unit = speedStr.split(' ')[1]
  if (unit === 'B/s') return `${(value/1024).toFixed(1)}K`
  if (unit === 'MB/s') return `${value.toFixed(1)}M`
  return `${value.toFixed(1)}K`
}

// 格式化图表Y轴的值（去掉小数）
const formatYAxis = (value) => {
  if (value >= 1024) {
    return `${Math.floor(value/1024)}M`
  }
  return `${Math.floor(value)}K`
}

// 修改图表配置
const chartOption = ref({
  animation: false,
  grid: {
    top: 15,
    right: 5,
    bottom: 20,
    left: 1,
    containLabel: true
  },
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      return params.map(param => {
        const value = param.value
        if (value >= 1024) {
          return `${param.seriesName}: ${Math.floor(value/1024)}M/s`
        }
        return `${param.seriesName}: ${Math.floor(value)}K/s`
      }).join('<br/>')
    }
  },
  xAxis: {
    type: 'category',
    data: timeData,
    axisLabel: {
      fontSize: 10,
      color: '#999',
      interval: Math.floor(MAX_DATA_POINTS / 3)
    }
  },
  yAxis: {
    type: 'value',
    name: '',
    nameTextStyle: {
      fontSize: 10,
      color: '#999'
    },
    axisLabel: {
      fontSize: 10,
      color: '#999',
      formatter: formatYAxis
    },
    splitNumber: 3,
    min: 0,
    max: function(value) {
      const maxValue = Math.max(...uploadData.value, ...downloadData.value);
      // 确保最小刻度为 1KB/s
      if (maxValue < 1) return 1;
      // 根据最大值动态调整刻度范围
      if (maxValue < 100) return Math.ceil(maxValue * 1.5);
      if (maxValue < 1024) return Math.ceil(maxValue * 1.2);
      return Math.ceil(maxValue * 1.1);
    },
    splitLine: {
      lineStyle: {
        color: '#f5f5f5'
      }
    },
    axisLine: {
      show: true,
      lineStyle: {
        color: '#eee'
      }
    },
    axisTick: {
      show: true
    }
  },
  series: [
    {
      name: '上传',
      type: 'line',
      data: uploadData,
      showSymbol: false,
      lineStyle: {
        width: 1.5,
        color: '#ff6b6b'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(255,107,107,0.1)' },
            { offset: 1, color: 'rgba(255,107,107,0.01)' }
          ]
        }
      },
      smooth: true
    },
    {
      name: '下载',
      type: 'line',
      data: downloadData,
      showSymbol: false,
      lineStyle: {
        width: 1.5,
        color: '#4ecdc4'
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(78,205,196,0.1)' },
            { offset: 1, color: 'rgba(78,205,196,0.01)' }
          ]
        }
      },
      smooth: true
    }
  ]
})

// 更新数据
const updateData = () => {
  const now = new Date()
  const timeStr = now.toLocaleTimeString('zh-CN', { 
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })

  // 如果没有接，使用 0 值
  const uploadSpeed = props.upload ? parseSpeed(props.upload) : 0
  const downloadSpeed = props.download ? parseSpeed(props.download) : 0

  uploadData.value.push(uploadSpeed)
  downloadData.value.push(downloadSpeed)
  timeData.value.push(timeStr)

  // 保持固定数量的数据点
  if (uploadData.value.length > MAX_DATA_POINTS) {
    uploadData.value.shift()
    downloadData.value.shift()
    timeData.value.shift()
  }

  // 更新图表数据
  chartOption.value = {
    ...chartOption.value,
    xAxis: {
      ...chartOption.value.xAxis,
      data: timeData.value
    },
    series: [
      {
        ...chartOption.value.series[0],
        data: uploadData.value
      },
      {
        ...chartOption.value.series[1],
        data: downloadData.value
      }
    ]
  }
}

// 监听数据变化
watch([() => props.upload, () => props.download], () => {
  updateData()
})

// 初始化图表数据
onMounted(() => {
  updateData()
})

const showDropdown = ref(false)

// 选择网卡
const selectInterface = (ifaceName) => {
  selectedInterface.value = ifaceName
  showDropdown.value = false
  handleInterfaceChange()
}

// 点击外部关闭下拉菜单
onMounted(() => {
  document.addEventListener('click', (e) => {
    const selector = document.querySelector('.interface-selector')
    if (selector && !selector.contains(e.target)) {
      showDropdown.value = false
    }
  })
})
</script> 