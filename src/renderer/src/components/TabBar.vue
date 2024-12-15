<!-- 连接标签组件 -->
<template>
  <div class="tab-bar">
    <!-- 标签列表 -->
    <div
      class="tab-bar-item"
      v-for="item in tabsStore.editableTabs"
      :class="{ active: item.id === tabsStore.editableTabsValue }"
      :key="item.id"
    >
      <div class="tab-bar-item-title" @click="tabsStore.selectTab(item.id)">
        {{ item.title }}
      </div>
      <i
        class="iconfont icon-shanchu iconfont-del"
        style="font-size: 10px"
        @click="tabsStore.deleteTabById(item.id)" 
        v-if="tabsStore.editableTabs.length>1"
      ></i>
    </div>
    <!-- 添加连接 -->
    <div class="tab-bar-add">
      <i class="iconfont icon-tianjia" @click="tabsStore.openNewTerminal()"></i>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useTabsStore } from '../store/terminalStore'

const tabsStore = useTabsStore();

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
  font-size: 11px;
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
  