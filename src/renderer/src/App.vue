<script setup>
import { ref } from 'vue'

const startResize = (e) => {
  const resizer = e.target
  const sidebar = resizer.previousElementSibling
  let startX = e.clientX
  let startWidth = sidebar.offsetWidth

  const doDrag = (e) => {
    const newWidth = startWidth + e.clientX - startX
    if (newWidth > 100 && newWidth < 500) { // 限制最小和最大宽度
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

<template>
  <div class="container">
    <div class="sidebar">
      侧边栏
    </div>
    <div class="resizer" @mousedown="startResize"></div>
    <div class="main">
      <div class="top-bar">
        顶部栏
      </div>
      <div class="content">
        主要内容区域
      </div>
    </div>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #fff;
}

.sidebar {
  width: 200px;
  background: #f5f5f5;
  height: 100%;
  padding: 16px;
  overflow-y: auto;
  flex-shrink: 0;
}

.resizer {
  width: 4px;
  background: #e0e0e0;
  cursor: col-resize;
  transition: background 0.2s;
}

.resizer:hover, .resizer:active {
  background: #bdbdbd;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 标签栏 */
.top-bar {
  height: 60px;
  background: #b2a2a2;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  flex-shrink: 0;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

/* 自定义滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.2);
}

/* 防止文本被选中 */
.resizer, .top-bar {
  user-select: none;
}
</style>
