

// 连接到ssh服务器
export const connectToServer = (serverInfo,id) => {
    window.electron.ipcRenderer
      .invoke('new-connection', serverInfo)
      .then((response) => {
        console.log(response)
        tabsStore.editableTabs.find(item => item.id === 1).data = response
      })
      .catch((error) => {
        console.error('连接失败', error)
      })
  }