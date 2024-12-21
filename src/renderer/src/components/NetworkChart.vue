<template>
  <div class="network-chart">
    <v-chart class="chart" :option="chartOption" autoresize />
  </div>
</template>

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
    default: '0 MB/s'
  },
  download: {
    type: String,
    required: false,
    default: '0 MB/s'
  }
})

// 先声明常量
const MAX_DATA_POINTS = 30 // 显示最近30个数据点

// 然后再使用常量初始化数据
const uploadData = ref(new Array(MAX_DATA_POINTS).fill(0))
const downloadData = ref(new Array(MAX_DATA_POINTS).fill(0))
const timeData = ref([])

// 将速度字符串转换为数值（MB/s）
const parseSpeed = (speedStr) => {
  const value = parseFloat(speedStr)
  if (speedStr.includes('KB/s')) return value / 1024
  if (speedStr.includes('B/s')) return value / 1024 / 1024
  return value // 经是 MB/s
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

// 图表配置
const chartOption = ref({
  animation: false,
  grid: {
    top: 20,
    right: 20,
    bottom: 20,
    left: 40
  },
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      return params.map(param => {
        return `${param.seriesName}: ${param.value.toFixed(2)} MB/s`
      }).join('<br/>')
    }
  },
  legend: {
    data: ['上传', '下载'],
    textStyle: {
      color: '#666',
      fontSize: 10
    }
  },
  xAxis: {
    type: 'category',
    data: timeData,
    axisLabel: {
      show: false
    },
    axisLine: {
      lineStyle: {
        color: '#ddd'
      }
    }
  },
  yAxis: {
    type: 'value',
    name: 'MB/s',
    nameTextStyle: {
      fontSize: 10
    },
    axisLabel: {
      fontSize: 10
    },
    splitLine: {
      lineStyle: {
        color: '#eee'
      }
    }
  },
  series: [
    {
      name: '上传',
      type: 'line',
      data: uploadData,
      showSymbol: false,
      lineStyle: {
        width: 1,
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
            { offset: 0, color: 'rgba(255,107,107,0.3)' },
            { offset: 1, color: 'rgba(255,107,107,0.1)' }
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
        width: 1,
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
            { offset: 0, color: 'rgba(78,205,196,0.3)' },
            { offset: 1, color: 'rgba(78,205,196,0.1)' }
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

  // 如果没有连接，使用 0 值
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
</script>

<style scoped>
.network-chart {
  width: 100%;
  height: 100px;
  margin-top: 4px;
}

.chart {
  width: 100%;
  height: 100%;
}
</style> 