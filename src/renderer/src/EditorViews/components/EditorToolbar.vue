<template>
  <div class="editor-toolbar">
    <el-button-group>
      <el-button size="small" @click="handleSave">
        保存
      </el-button>
    </el-button-group>
  </div>
</template>

<script setup>

const emit = defineEmits(['save'])

const handleSave = () => {
  emit('save')
}
</script>

<style scoped>
.editor-toolbar {
  padding: 8px;
  border-bottom: 1px solid var(--el-border-color-light);
  background: var(--el-bg-color-overlay);
}
</style> 