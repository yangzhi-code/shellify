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
      try {
        const { host, port, username, password } = tab.info
        const connectionId = await window.electron.ipcRenderer.invoke('connect-ssh', {
          host,
          port,
          username,
          password
        })
        tab.data = { id: connectionId }
        this.activeConnectionId = connectionId
      } catch (error) {
        console.error('Failed to connect:', error)
        ElMessage.error('连接失败：' + error.message)
      }
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
