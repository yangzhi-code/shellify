<template>
  <div class="editor-container">
    <div class="editor-header">
      <span>{{ fileInfo?.name }}</span>
    </div>
    <div class="editor-content">
      <!-- 这里后续会集成 CodeMirror -->
      <pre>{{ fileInfo?.path }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const fileInfo = ref(null)

onMounted(() => {
  window.electron.ipcRenderer.on('file-to-edit', (info) => {
    console.log('Received file info:', info)
    fileInfo.value = info
  })
})
</script>

<style>
.editor-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.editor-header {
  padding: 8px 16px;
  border-bottom: 1px solid #ddd;
  background: #f5f5f5;
}

.editor-content {
  flex: 1;
  padding: 16px;
  overflow: auto;
}
</style> 