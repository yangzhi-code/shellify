<template>
  <div class="container">
    <div class="sidebar">
      <ServerStatus :connectionId="currentConnectionId" />
    </div>
    <div class="resizer" @mousedown="startResize"></div>
    <div class="main">
      <div class="top-bar">
        <!-- 连接文件夹 -->
        <div class="top-bar-left">
          <TabFolder />
        </div>
        <!-- 标签栏 -->
        <div class="top-bar-right">
          <TabBar />
        </div>
        <!-- 菜单 -->
        <div class="top-bar-menu">
          <TabMenu />
        </div>
      </div>
      <div class="content">
        <Terminal
          v-for="(item) in tabsStore.editableTabs" :key="item.id" 
          v-show="item.id === tabsStore.editableTabsValue"
          :connectionId = "item.id"
          :item = item
          @connected="handleTerminalConnected"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Sidebar from './components/sidebar.vue'
import Terminal from './components/Terminal.vue'
import TabBar from './components/TabBar.vue'
import TabMenu from './components/TabMenu.vue'
import TabFolder from './components/TabFolder.vue'
import ServerStatus from './components/ServerStatus.vue'
import { useTabsStore } from './store/terminalStore'
const tabsStore = useTabsStore()
const currentConnectionId = ref(null)

// 处理终端连接成功
const handleTerminalConnected = (connectionId) => {
  currentConnectionId.value = connectionId
}

// 处理侧边栏调整大小
const startResize = (e) => {
  const resizer = e.target
  const sidebar = resizer.previousElementSibling
  let startX = e.clientX
  let startWidth = sidebar.offsetWidth

  const doDrag = (e) => {
    const newWidth = startWidth + e.clientX - startX
    if (newWidth > 200 && newWidth < 500) {
      sidebar.style.width = newWidth + 'px'
    }
  }

  const stopDrag = () => {
    document.removeEventListener('mousemove', doDrag)
    document.removeEventListener('mouseup', stopDrag)
  }

  document.addEventListener('mousemove', doDrag)
  document.addEventListener('mouseup', stopDrag)
}
</script>
<style>
.container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #fff;
  overflow: hidden;
}
/* 标签栏 */
.top-bar {
  background: #dfcece;
  height: 30px;
  width: 100%;
  display: flex;
  flex-direction: row;
}
/* 添加连接位置 */
.top-bar-left {
  margin-left: auto;
}
/* 标签栏 */
.top-bar-right {
  height: 30px;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}

.sidebar {
  width: 200px;
  background: #f5f5f5;
  height: 100%;
  padding: 5px;
  overflow-y: auto;
  flex-shrink: 0;
  position: relative;
}

.resizer {
  width: 2px;
  background: #e0e0e0;
  cursor: col-resize;
  transition: background 0.2s;
}

.resizer:hover,
.resizer:active {
  background: #bdbdbd;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}

/* 防止文本被选中 */
.resizer,
.top-bar {
  user-select: none;
}

/* 终端显示区域 */
.content {
  flex: 1;
  position: relative;
  background: #000;
  color: #fff;
  display: flex;
  flex-direction: column;
  padding: 0;
}
.iconfont {
  transition: transform 0.2s ease, box-shadow 0.2s ease; /* 平滑过渡 */
}

.iconfont:active {
  transform: scale(0.9) translateY(-2px); /* 点击时缩小并上移 */
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1); /* 添加轻微阴影 */
}
/* 靠右 */
.tab-bar-menu {
  margin: 3px;
  padding: 2px;
  border-radius: 2px;
  margin-right: auto;
}

input {
  margin-top: 10px;
  padding: 5px;
  width: 100%;
  color: #fff;
  background: #333;
  border: none;
  outline: none;
}
</style>
