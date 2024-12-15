<template>
  <div class="tab-bar">
    <!-- 标签列表 -->
    <div class="tab-bar-item" v-for="item in editableTabs" 
    :class="{ active: item.id === editableTabsValue }"
    :key="item.id">
      <div
        class="tab-bar-item-title"
        @click="selectTab(item.id)"
      >
        {{ item.title }}
      </div>
      <i
        class="iconfont icon-shanchu iconfont-del"
        style="font-size: 10px"
        @click="deleteTabById(item.id)"
      ></i>
    </div>
    <!-- 添加连接 -->
    <div class="tab-bar-add">
      <i class="iconfont icon-tianjia" @click="openNewTerminal"></i>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

// 当前选中的 tab id
const editableTabsValue = ref(1)
// 标签列表
const editableTabs = ref([
  {
    id: 1,
    title: 'linux',
    type: 'ssh',
    ip: '192.168.1.1',
    port: '22'
  },
  {
    id: 2,
    title: 'windows',
    type: 'rdp',
    ip: '192.168.1.1',
    port: '3389'
  }
])
// 创建新连接
const openNewTerminal = () => {
  // 每次调用时重新计算最大 id
  const maxId = Math.max(...editableTabs.value.map((tab) => tab.id), 0) // 如果数组为空，则最大值为 0
  const newTab = {
    id: maxId + 1,
    title: '新标签页',
    type: null,
    ip: null,
    port: null
  }
  editableTabs.value.push(newTab) // 添加新项到列表
}

// 选择标签
const selectTab = (id) => {
  editableTabsValue.value = id
}

//删除标签
const deleteTabById = (idToDelete) => {
  editableTabs.value = editableTabs.value.filter((tab) => tab.id !== idToDelete)
}
</script>
  
<style scoped>
.tab-bar {
  background-color: #f0f0f0;
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}
.tab-bar-item {
  margin: 3px;
  padding: 2px;
  border-radius: 2px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;

  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
/* 标签选中样式 */
.tab-bar-item.active {
  background-color: #4caf50; /* 填充颜色 */
  color: white;
  border-color: #4caf50; /* 选中边框颜色 */
}

.tab-bar-item-title {
  font-size: 12px;
  font-weight: bold;
  color: #333;
  padding-left: 2px;
  padding-right: 2px;
  text-align: center;
}
.tab-bar-add {
  margin: 3px;
  padding: 2px;
  border-radius: 2px;
}
.iconfont-del {
  padding-left: 5px;
}
</style>
  