import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import EditorIpcService from '../services/EditorIpcService'
import { useServerStore } from './server'

export const useEditorStore = defineStore('editor', () => {
  const serverStore = useServerStore()
  
  // 状态
  const tabs = ref([])
  const activeTab = ref(null)
  const cursorPosition = ref('Ln 1, Col 1')
  const currentFileType = ref('Text')

  // 计算属性
  const currentTab = computed(() => 
    tabs.value.find(tab => tab.path === activeTab.value)
  )

  // 方法
  const openFile = async (fileInfo) => {
    // 如果标签页已存在，切换到该标签页
    if (tabs.value.some(tab => tab.path === fileInfo.path)) {
      switchTab(fileInfo.path)
      return
    }

    try {
      const content = await EditorIpcService.readFile(fileInfo.path)
      tabs.value.push({
        path: fileInfo.path,
        name: fileInfo.name,
        content,
        type: fileInfo.type
      })
      switchTab(fileInfo.path)
    } catch (error) {
      console.error('Failed to open file:', error)
      throw error
    }
  }

  const switchTab = (path) => {
    activeTab.value = path
  }

  const closeTab = (path) => {
    const index = tabs.value.findIndex(tab => tab.path === path)
    if (index === -1) return

    tabs.value.splice(index, 1)
    
    // 如果关闭的是当前标签页，切换到其他标签页
    if (path === activeTab.value) {
      activeTab.value = tabs.value[index] // 切换到下一个
        ? tabs.value[index].path
        : tabs.value[index - 1] // 或者上一个
          ? tabs.value[index - 1].path
          : null // 或者没有标签页了
    }
  }

  const saveCurrentFile = async () => {
    const tab = currentTab.value
    if (!tab) return

    try {
      await EditorIpcService.saveFile(tab.path, tab.content)
    } catch (error) {
      console.error('Failed to save file:', error)
      throw error
    }
  }

  const listFiles = async (path) => {
    try {
      return await serverStore.listFiles(path)
    } catch (error) {
      console.error('Failed to list files:', error)
      throw error
    }
  }

  const updateCursorPosition = (line, column) => {
    cursorPosition.value = `Ln ${line}, Col ${column}`
  }

  const updateFileType = (type) => {
    currentFileType.value = type
  }

  return {
    // 状态
    tabs,
    activeTab,
    cursorPosition,
    currentFileType,
    currentTab,

    // ��法
    openFile,
    switchTab,
    closeTab,
    saveCurrentFile,
    listFiles,
    updateCursorPosition,
    updateFileType
  }
}) 