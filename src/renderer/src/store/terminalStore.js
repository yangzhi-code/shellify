import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTabsStore = defineStore('tabs', () => {
  // 定义响应式数据
  const editableTabsValue = ref(1)
  const editableTabs = ref([
    { id: 1, title: '新建标签', type: 'ssh', ip: '192.168.1.1', port: '22', data: null }
  ])

  // 选择标签
  const selectTab = (id) => {
    editableTabsValue.value = id
  }

  // 创建新连接标签
  const openNewTerminal = () => {
    const maxId = Math.max(...editableTabs.value.map((tab) => tab.id), 0)
    const newTab = {
      id: maxId + 1,
      title: '新标签页',
      type: null,
      ip: null,
      port: null,
      data: null
    }
    editableTabs.value.push(newTab)
    selectTab(newTab.id)
  }

  // 删除标签
  const deleteTabById = (idToDelete) => {
    // 找到要删除标签的索引
    const deleteIndex = editableTabs.value.findIndex(tab => tab.id === idToDelete);

    // 删除指定标签
    editableTabs.value = editableTabs.value.filter(tab => tab.id !== idToDelete);

    // 如果还有剩余标签
    if (editableTabs.value.length > 0) {
      // 找到比删除 id 大的标签
      const nextTab = editableTabs.value.find(tab => tab.id > idToDelete);

      if (nextTab) {
        // 如果找到比删除 id 大的标签，就选中它
        editableTabsValue.value = nextTab.id;
      } else {
        // 如果没有比删除 id 大的标签，选中比它小的最大标签
        const previousTab = editableTabs.value.reduce((prev, current) => {
          return current.id < idToDelete && current.id > (prev?.id || 0) ? current : prev;
        }, null);

        if (previousTab) {
          editableTabsValue.value = previousTab.id;
        } else {
          // 如果没有找到合适的标签，选中剩余的第一个标签
          editableTabsValue.value = editableTabs.value[0].id;
        }
      }
    }
  };


  // 返回状态和操作函数
  return {
    editableTabsValue,
    editableTabs,
    selectTab,
    openNewTerminal,
    deleteTabById
  }
})
