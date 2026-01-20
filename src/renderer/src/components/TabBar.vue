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
    /* 修正：用 --app- 前缀的变量 */

    border-bottom: 1px solid var(--app-tab-bar-border);
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
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
  }
  
  .tab-bar-list .tab-bar-item {
    flex: 0 0 auto;
  }
  
  /* 滚动条样式适配主题 */
  .tab-bar-list::-webkit-scrollbar {
    height: 8px;
  }
  .tab-bar-list::-webkit-scrollbar-track {
    background: transparent;
  }
  .tab-bar-list::-webkit-scrollbar-thumb {
    /* 滚动条颜色适配主题 */
    background: var(--app-component-border);
    border-radius: 4px;
  }
  .tab-bar-list::-webkit-scrollbar-thumb:hover {
    background: var(--app-text-regular);
  }
  .tab-bar-list {
    scrollbar-width: thin;
    scrollbar-color: var(--app-component-border) transparent;
  }
  
  /* 标签未选中状态（补充默认背景） */
  .tab-bar-item {
    margin: 3px;
    padding: 2px 8px; /* 增加左右内边距，更美观 */
    border-radius: 4px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    border: 1px solid var(--app-tab-bar-border);
    /* 新增：默认背景色 */
    background-color: var(--app-tab-item-bg);
    cursor: pointer;
    transition: all 0.2s ease; /* 简化过渡属性 */
  }
  
  /* 标签选中样式（强化区分度） */
  .tab-bar-item.active {
    background-color: var(--app-tab-item-active-bg);
    color: var(--app-tab-item-active-text);
    border-color: var(--app-primary);
    /* 新增：选中时加轻微阴影，突出层级 */
    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  }
  
  .tab-bar-item-title {
    font-size: 11px;
    font-weight: 500; /* 降低粗度，更舒适 */
    color: var(--app-tab-item-text);
    padding: 0 4px; /* 调整内边距 */
    text-align: center;
  }
  
  .tab-bar-add {
    margin: 3px;
    padding: 2px 8px;
    border-radius: 4px;
    /* 新增：添加按钮hover效果 */
    cursor: pointer;
    transition: background-color 0.2s ease;
  }
  
  .iconfont-del {
    padding-left: 5px;
    color: var(--app-tab-item-text);
    /* 新增：删除按钮hover色 */
    transition: color 0.2s ease;
  }
  .tab-bar-item:hover .iconfont-del {
    color: var(--app-primary);
  }
  
  /* 激活状态的标签文字颜色（冗余，可删，因为 .active 已设置 color） */
  /* .tab-bar-item.active .tab-bar-item-title {
    color: var(--app-tab-item-active-text);
  } */
  
  /* 添加按钮的颜色 + hover效果 */
  .tab-bar-add .iconfont {
    color: var(--app-tab-item-text);
    transition: color 0.2s ease;
  }
  .tab-bar-add:hover {
    background-color: var(--app-tab-item-hover-bg);
  }
  .tab-bar-add:hover .iconfont {
    color: var(--app-primary);
  }
  
  /* Sortable.js 拖拽样式（适配主题） */
  .sortable-ghost {
    opacity: 0.6; /* 提高透明度，更清晰 */
    background-color: var(--app-tab-item-hover-bg) !important;
    border: 2px dashed var(--app-primary) !important;
  }
  
  .sortable-chosen {
    cursor: grabbing;
  }
  
  .sortable-drag {
    transform: rotate(1deg); /* 降低旋转角度，更自然 */
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  }
  
  .tab-bar-item {
    user-select: none;
  }
  
  /* 标签hover样式（和默认/选中状态区分） */
  .tab-bar-item:hover {
    background-color: var(--app-tab-item-hover-bg);
    border-color: var(--app-primary-light-7, var(--app-primary)); /* 兼容Element主色浅色调 */
  }
  </style>