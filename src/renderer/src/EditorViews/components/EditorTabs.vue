<template>
  <div class="editor-tabs">
    <el-tabs
      :model-value="activeTab"
      @update:model-value="$emit('switch', $event)"
      type="card"
      closable
      @tab-remove="handleClose"
    >
      <el-tab-pane
        v-for="tab in tabs"
        :key="tab.path"
        :label="tab.name"
        :name="tab.path"
      />
    </el-tabs>
  </div>
</template>

<script setup>
defineProps({
  tabs: {
    type: Array,
    default: () => []
  },
  activeTab: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['switch', 'close'])

const handleClose = (path) => {
  emit('close', path)
}
</script>

<style scoped>
.editor-tabs {
  border-bottom: 1px solid var(--el-border-color-light);
}

:deep(.el-tabs__header) {
  margin: 0;
}
</style> 