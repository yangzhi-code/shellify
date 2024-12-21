<template>
  <div class="terminal-layout">
    <!-- 布局切换按钮 -->
    <div class="layout-switcher">
      <el-button-group>
        <el-button 
          :type="layoutMode === 'terminal' ? 'primary' : 'default'"
          @click="layoutMode = 'terminal'"
          size="small"
        >
          <el-icon><Monitor /></el-icon>
        </el-button>
        <el-button 
          :type="layoutMode === 'split' ? 'primary' : 'default'"
          @click="layoutMode = 'split'"
          size="small"
        >
          <el-icon><CopyDocument /></el-icon>
        </el-button>
        <el-button 
          :type="layoutMode === 'file' ? 'primary' : 'default'"
          @click="layoutMode = 'file'"
          size="small"
        >
          <el-icon><Folder /></el-icon>
        </el-button>
      </el-button-group>
    </div>

    <!-- 内容区域 -->
    <div class="content-area" :class="layoutMode">
      <div class="terminal-area">
        <Terminal :item="item" @connected="handleConnected" />
      </div>
      <div class="file-area">
        <FileManager 
          v-if="item.data?.id"
          :connectionId="item.data.id"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { Monitor, CopyDocument, Folder } from '@element-plus/icons-vue'
import Terminal from './Terminal.vue'
import FileManager from './FileManager.vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['connected'])

// 布局模式：terminal(仅终端)、split(终端和文件)、file(仅文件)
const layoutMode = ref('terminal')

// 处理终端连接成功
const handleConnected = (connectionId) => {
  emit('connected', connectionId)
}
</script>

<style scoped>
.terminal-layout {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.layout-switcher {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 100;
  background-color: rgba(0, 0, 0, 0.6);
  padding: 4px;
  border-radius: 4px;
}

.content-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
}

/* 仅终端模式 */
.content-area.terminal .terminal-area {
  height: 100%;
}

.content-area.terminal .file-area {
  display: none;
}

/* 分屏模式 */
.content-area.split {
  flex-direction: column;
  overflow: hidden;
}

.content-area.split .terminal-area {
  flex: 1;
  min-height: 0;
}

.content-area.split .file-area {
  flex: 1;
  min-height: 0;
  border-top: 1px solid #333;
}

/* 仅文件模式 */
.content-area.file .terminal-area {
  display: none;
}

.content-area.file .file-area {
  height: 100%;
}

.terminal-area {
  position: relative;
  background-color: #1e1e1e;
  transition: height 0.3s ease;
  min-height: 0;
}

.file-area {
  position: relative;
  background-color: #fff;
  transition: height 0.3s ease;
  overflow: auto;
  min-height: 0;
}
</style> 