<template>
    <el-tabs
      v-model="editableTabsValue"
      type="card"
      editable
      class="demo-tabs"
      @edit="handleTabsEdit"
    >
      <!-- 动态渲染每个 tab -->
      <el-tab-pane
        v-for="tab in editableTabs"
        :key="tab.name"
        :label="tab.title"
        :name="tab.name"
      >
        <div class="tab-content">
          {{ tab.content }}
        </div>
      </el-tab-pane>
    </el-tabs>
  </template>
  
  <script lang="ts" setup>
  import { ref } from 'vue'
  import type { TabPaneName } from 'element-plus'
  
  let tabIndex = 2
  const editableTabsValue = ref('2') // 当前选中的 tab 名称
  const editableTabs = ref([
    {
      title: 'Tab 1',
      name: '1',
      content: 'Tab 1 content',
    },
    {
      title: 'Tab 2',
      name: '2',
      content: 'Tab 2 content',
    },
  ])
  
  const handleTabsEdit = (
    targetName: TabPaneName | undefined,
    action: 'remove' | 'add'
  ) => {
    if (action === 'add') {
      // 添加新 tab
      const newTabName = `${++tabIndex}`
      editableTabs.value.push({
        title: `New Tab ${newTabName}`,
        name: newTabName,
        content: `New Tab content ${newTabName}`,
      })
      editableTabsValue.value = newTabName
    } else if (action === 'remove') {
      // 删除 tab
      const tabs = editableTabs.value
      let activeName = editableTabsValue.value
      if (activeName === targetName) {
        tabs.forEach((tab, index) => {
          if (tab.name === targetName) {
            const nextTab = tabs[index + 1] || tabs[index - 1]
            if (nextTab) {
              activeName = nextTab.name
            }
          }
        })
      }
  
      editableTabsValue.value = activeName
      editableTabs.value = tabs.filter((tab) => tab.name !== targetName)
    }
  }
  </script>
  
  <style scoped>
  .demo-tabs {
    width: 100%;
  }
  
  .demo-tabs > .el-tabs__content {
    padding: 32px;
    color: #6b778c;
    font-size: 18px;
    font-weight: 600;
  }
  
  .tab-content {
    padding: 16px;
    background-color: #f5f7fa;
    border-radius: 4px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    min-height: 100px;
  }
  </style>
  