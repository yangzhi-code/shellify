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
    // 添加更新标签信息的方法
    updateTabInfo(id, info) {
      const tab = this.editableTabs.find(tab => tab.id === id)
      if (tab) {
        tab.info = {
          ...tab.info,
          ...info
        }
        // 如果有连接信息，自动连接
        if (info.host && info.username) {
          this.connectToServer(tab)
        }
      }
    },

    // 添加连接服务器的方法
    async connectToServer(tab) {
      console.log('咳咳咳', tab)
      
    },

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
    async deleteTabById(targetId) {
      const tab = this.editableTabs.find(tab => tab.id === targetId)

      // 如果标签有连接数据，先断开连接
      if (tab?.data?.id) {
        try {
          // 触发一个事件通知需要清理的组件
          window.electron.ipcRenderer.send('cleanup-connection', tab.data.id)
          // 等待清理完成
          await new Promise(resolve => setTimeout(resolve, 100))
        } catch (error) {
          console.warn('清理连接资源时出错:', error)
        }
      }

      const deleteIndex = this.editableTabs.findIndex(tab => tab.id === targetId)
      this.editableTabs = this.editableTabs.filter(tab => tab.id !== targetId)

      // 更新选中的标签
      if (this.editableTabs.length > 0) {
        if (this.editableTabsValue === targetId) {
          const nextTab = this.editableTabs[deleteIndex] || this.editableTabs[deleteIndex - 1]
          this.editableTabsValue = nextTab.id
          this.activeConnectionId = nextTab?.data?.id || null
        }
      } else {
        this.editableTabsValue = ''
        this.activeConnectionId = null
      }
    },

    // 重新排序标签
    reorderTabs(oldIndex, newIndex) {
      const tabs = [...this.editableTabs]
      const [movedTab] = tabs.splice(oldIndex, 1)
      tabs.splice(newIndex, 0, movedTab)
      this.editableTabs = tabs
    }
  }
})
