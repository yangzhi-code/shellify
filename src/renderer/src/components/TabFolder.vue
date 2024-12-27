<!-- 连接文件夹 -->
<template>
  <div class="tab-folder">
    <div class="tab-folder-item">
      <i
        class="iconfont icon-a-wangluowenjianjiayuanchengwenjianjia"
        style="font-size: 20px"
        @click="openNewTerminal"
      ></i>
    </div>
    <div>
      <el-dialog
        v-model="visible"
        :draggable="true"
        custom-class="custom-dialog"
        title="连接管理器"
        width="550px"
        :align-center="true"
        :modal-class="'no-padding-dialog'"
        :lock-scroll="false"
        :append-to-body="true"
      >
        <TreeList @close-dialog="closedialog" />
      </el-dialog>
    </div>
  </div>
</template>
<script setup>
import TreeList from './FileTree/TreeList.vue'
import { ref } from 'vue'

// 弹窗显示控制
const visible = defineModel('visible', { type: Boolean, default: false })
// 关闭弹窗
const closedialog = () => {
  visible.value = false
}
//连接到服务器
const openNewTerminal = () => {
  visible.value = true
}

// 处理双击事件
const handleDblClick = (item) => {
  // 创建新标签
  tabsStore.openNewTerminal()
  // 获取最新创建的标签
  const newTab = tabsStore.editableTabs[tabsStore.editableTabs.length - 1]
  // 更新标签信息
  tabsStore.updateTabInfo(newTab.id, {
    name: item.name,
    host: item.host,
    port: item.port,
    username: item.username,
    password: item.password
  })
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

/* 防止弹窗影响布局 */
:deep(.no-padding-dialog) {
  overflow: hidden;
  .el-dialog {
    margin: 0 !important;
  }
}
</style>


