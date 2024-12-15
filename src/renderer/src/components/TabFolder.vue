<!-- 连接文件夹 -->
<template>
  <div class="tab-folder">
    <div class="tab-folder-item">
      <i class="iconfont icon-a-wangluowenjianjiayuanchengwenjianjia" style="font-size: 20px; " @click="openNewTerminal"></i>
    </div>
  </div>
</template>
<script setup>
import { connectToServer } from '../api/sshApi'
//连接到服务器
const openNewTerminal = () => {
  const serverInfo = {
    host: '47.108.49.80',
    port: 22,
    username: 'root',
    password: '419199yZ'
  }
  //connectToServer(serverInfo,1)
}
</script>
<style scoped>
.tab-folder {
  width: 100%;
  height: 30px;
  background-color: #f0f0f0;
}
.tab-folder-item {
  width: 50px;
  height: 30px;
  background-color: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>


