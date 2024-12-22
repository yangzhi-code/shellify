<template>
  <div class="tab-menu">
    <DownloadManager />
    <UploadManager />
    <div class="tab-menu-item">
      <i class="iconfont icon-caidan" style="font-size: 20px;"></i>
      <i class="iconfont icon-shezhi" style="font-size: 20px; margin-left: 5px;margin-right: 5px"></i>
    </div>
  </div>
</template>

<script setup>
import DownloadManager from './DownloadManager.vue'
import UploadManager from './UploadManager.vue'
</script>

<style scoped>
.tab-menu {
  width: 100%;
  height: 30px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  padding: 0 8px;
}

.tab-menu-item {
  display: flex;
  align-items: center;
}
</style>
