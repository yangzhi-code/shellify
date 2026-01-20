<!-- 连接标签组件 -->
<template>
  <div class="tab-bar">
    <!-- 使用 vuedraggable 绑定到 store 数据，确保数据为唯一来源，保留动画效果 -->
    <Draggable
      v-model="localTabs"
      item-key="id"
      :animation="150"
      ghost-class="sortable-ghost"
      handle=".tab-bar-item"
      class="tab-bar-list"
    >
      <template #item="{ element: item }">
        <div
          class="tab-bar-item"
          :class="{ active: item.id === tabsStore.editableTabsValue }"
          :key="item.id"
        >
          <div class="tab-bar-item-title" @click="tabsStore.selectTab(item.id)">
            {{ item.info.name }}
          </div>
          <i
            class="iconfont icon-shanchu iconfont-del"
            style="font-size: 10px"
            @click.stop="tabsStore.deleteTabById(item.id)"
            v-if="tabsStore.editableTabs.length>1"
          ></i>
        </div>
      </template>
    </Draggable>

    <!-- 添加连接（不在可排序元素内） -->
    <div class="tab-bar-add">
      <i class="iconfont icon-tianjia" @click="tabsStore.openNewTerminal()"></i>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useTabsStore } from '../stores/terminalStore'
import Draggable from 'vuedraggable'

const tabsStore = useTabsStore();

// 通过 computed getter/setter 把 vuedraggable 的 v-model 和 store 绑定
const localTabs = computed({
  get() {
    return tabsStore.editableTabs
  },
  set(v) {
    // 直接写回 store，保持唯一数据源
    tabsStore.editableTabs = v
  }
})

onMounted(() => {
  // debug: 输出当前 tabs 长度，帮助排查“标签不显示”的情况
  console.debug('TabBar mounted, tabs length=', localTabs.value?.length)
})

</script>
  
<style scoped>
.tab-bar {
  background-color: var(--tab-bar-bg);
  border-bottom: 1px solid var(--tab-bar-border);
  width: 100%;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
}
.tab-bar-list {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 6px;
  /* allow horizontal scrolling when tabs overflow */
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
}

/* Make each tab an inflexible item so they don't wrap/shrink inside the scroll container */
.tab-bar-list .tab-bar-item {
  flex: 0 0 auto;
}

/* WebKit scrollbar styling (horizontal scrollbar) */
.tab-bar-list::-webkit-scrollbar {
  height: 8px;
}
.tab-bar-list::-webkit-scrollbar-track {
  background: transparent;
}
.tab-bar-list::-webkit-scrollbar-thumb {
  background: rgba(0,0,0,0.12);
  border-radius: 4px;
}
.tab-bar-list::-webkit-scrollbar-thumb:hover {
  background: rgba(0,0,0,0.18);
}

/* Firefox scrollbar styling */
.tab-bar-list {
  scrollbar-width: thin;
  scrollbar-color: rgba(0,0,0,0.12) transparent;
}
/* 标签未选中状态 */
.tab-bar-item {
  margin: 3px;
  padding: 2px;
  border-radius: 2px;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-start;
  border: 1px solid var(--tab-bar-border);
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
/* 标签选中样式 */
.tab-bar-item.active {
  background-color: var(--tab-item-active-bg);
  color: var(--tab-item-active-text);
  border-color: var(--el-color-primary);
}

.tab-bar-item-title {
  font-size: 11px;
  font-weight: bold;
  color: var(--tab-item-text);
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
  color: var(--tab-item-text);
}

/* 激活状态的标签文字颜色 */
.tab-bar-item.active .tab-bar-item-title {
  color: var(--tab-item-active-text);
}

/* 添加按钮的颜色 */
.tab-bar-add .iconfont {
  color: var(--tab-item-text);
}

/* Sortable.js 拖拽样式 */
.sortable-ghost {
  opacity: 0.4;
  background-color: var(--el-color-primary-light-9) !important;
  border: 2px dashed var(--el-color-primary) !important;
}

.sortable-chosen {
  cursor: grabbing;
}

.sortable-drag {
  transform: rotate(5deg);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.tab-bar-item {
  user-select: none;
}

.tab-bar-item:hover {
  background-color: var(--tab-item-hover-bg);
}
</style>
  