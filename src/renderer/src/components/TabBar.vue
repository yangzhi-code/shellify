<template>
    <div class="tab-bar">
        <div class="tab-bar-item" v-for="item in editableTabs" :key="item.id">
            <div class="tab-bar-item-title">{{ item.title }}</div>
        </div>
       <!-- 添加连接位置 -->
       <div class="tab-bar-add">
        <i class="iconfont icon-tianjia"></i>
       </div>
    </div>
</template>

<script setup>
import { ref } from 'vue'

// 当前选中的 tab id
const editableTabsValue = ref('2')
// 标签列表
const editableTabs = ref([
  {
    id: '1',
    title: 'linux'
  },
  {
    id: '2',
    title: 'windows'
  }
])
</script>
  
<style scoped>
.tab-bar {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
}
.tab-bar-item {
  margin: 3px;   
  padding: 2px;
  background-color: #b5c1d6;
  border-radius: 2px;
}
.tab-bar-item-title {
  font-size: 12px;
  font-weight: bold;
  color: #333;
}
.tab-bar-add {
  margin: 3px;   
  padding: 2px;
  border-radius: 2px;
}
</style>
  