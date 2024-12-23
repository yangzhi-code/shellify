import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'

export const useTabsStore = defineStore('tabs', {
  state: () => ({
    editableTabsValue: 'initial-tab',
    editableTabs: [{
      id: 'initial-tab',
      info: {
        name: '新建终端',
        host: '',
        port: 22,
        username: '',
        password: ''
      },
      data: null
    }],
    activeConnectionId: null
  }),
  actions: {
    // 选择标签
    selectTab(id) {
      this.editableTabsValue = id
      const currentTab = this.editableTabs.find(tab => tab.id === id)
      this.activeConnectionId = currentTab?.data?.id || null
    },

    // 打开新终端
    openNewTerminal() {
      const newTabId = nanoid()
      this.editableTabs.push({
        id: newTabId,
        info: {
          name: '新建终端',
          host: '',
          port: 22,
          username: '',
          password: ''
        },
        data: null
      })
      this.editableTabsValue = newTabId
      this.activeConnectionId = null
    },

    // 删除标签
    deleteTabById(targetId) {
      const deleteIndex = this.editableTabs.findIndex(tab => tab.id === targetId)
      this.editableTabs = this.editableTabs.filter(tab => tab.id !== targetId)
      if (this.editableTabs.length > 0) {
        const nextTab = this.editableTabs.find(tab => tab.id > targetId)
        if (nextTab) {
          this.editableTabsValue = nextTab.id
        } else {
          const previousTab = this.editableTabs.reduce((prev, current) => {
            return current.id < targetId && current.id > (prev?.id || 0) ? current : prev
          }, null)
          if (previousTab) {
            this.editableTabsValue = previousTab.id
          } else {
            this.editableTabsValue = this.editableTabs[0].id
          }
        }
      }
      if (this.editableTabsValue === targetId) {
        const nextTab = this.editableTabs[0]
        this.activeConnectionId = nextTab?.data?.id || null
      }
    }
  }
})
