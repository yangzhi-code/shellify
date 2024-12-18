<!-- 连接文件夹 -->
<template>
  <div class="tab-folder">
    <div class="tab-folder-item">
      <i class="iconfont icon-a-wangluowenjianjiayuanchengwenjianjia" style="font-size: 20px; " @click="openNewTerminal"></i>
      
    </div>
    <div>
      <!-- 弹窗容器 -->
      <el-dialog
        v-model="visible"
        :draggable="true"
        custom-class="custom-dialog"
        title="连接管理器"
        width="550px"
        :align-center="true"
      >
        <TreeList/>
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import TreeList from './FileTree/TreeList.vue'
import { ref } from 'vue'

// 弹窗显示控制
const visible = defineModel('visible', { type: Boolean, default: false })
//连接到服务器
const openNewTerminal = () => {
  const serverInfo = {
    host: '208.99.44.183',
    port: 22,
    username: 'root',
    password: '419199yZ'
  }

  visible.value = true
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


