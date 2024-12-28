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
  display: flex;
  align-items: center;
  height: 100%;
  overflow-x: auto;
  overflow-y: hidden;
}

.tab {
  height: 100%;
  padding: 0 10px;
  min-width: 120px;
  max-width: 200px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  cursor: pointer;
  user-select: none;
}

.tab.active {
  background: var(--el-bg-color);
  border-top: 2px solid var(--el-color-primary);
}

.tab:hover:not(.active) {
  background: var(--el-fill-color-light);
}

.tab-close {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
}

.tab-close:hover {
  background: var(--el-fill-color);
}
</style> 