<template>
  <div class="editor-status-bar">
    <div class="status-item">{{ fileType }}</div>
    <div class="status-item">{{ cursorPosition }}</div>
  </div>
</template>

<script setup>
defineProps({
  fileType: {
    type: String,
    default: 'Text'
  },
  cursorPosition: {
    type: String,
    default: 'Ln 1, Col 1'
  }
})
</script>

<style scoped>
.editor-status-bar {
  height: 22px;
  padding: 0 8px;
  background: var(--el-bg-color-overlay);
  border-top: 1px solid var(--el-border-color-light);
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style> 