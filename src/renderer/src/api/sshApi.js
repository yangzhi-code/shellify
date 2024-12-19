import { ref } from 'vue'
import { useTabsStore } from '../store/terminalStore'
const tabsStore = useTabsStore();
// 连接到ssh服务器
export const connectToServer = (serverInfo,id) => {
    window.electron.ipcRenderer
      .invoke('new-connection', serverInfo)
      .then((response) => {
        console.log(response)
        tabsStore.editableTabs.find(item => item.id === id).data = response
      })
      .catch((error) => {
        console.error('连接失败', error)
      })
  }