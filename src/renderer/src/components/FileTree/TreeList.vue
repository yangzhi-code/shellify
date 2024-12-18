<template>
  <div>
    <!-- 全局新增节点按钮 -->
    <button class="new-node-btn" @click="addNewNode">+ 根目录</button>
    <div style="height: 5px; background: #f0f0f0"></div>
    <!-- 渲染树节点 -->
    <div class="tree-container">
      <TreeNode
        v-for="node in treeData"
        :key="node.id"
        :node="node"
        @add-folder-node="handleAddFolderNode"
        @add-file-node="handleAddFileNode"
        @delete-node="handleDeleteNode"
        @updata-node="onUpdateNode"
        @close-dialog="closeDialog"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, toRaw } from 'vue'
import TreeNode from './TreeNode.vue'

// 树状数据
const treeData = reactive([
  {
    id: 1,
    name: '新建文件夹',
    type: 'folder',
    info:{},
    children: [
      {
        id: 2,
        name: 'centos7-4核8G',
        type: 'file',
        info:{},
        children: []
      }
    ]
  }
])
// 初始化数据
const init = () => {
  window.electron.ipcRenderer
    .invoke('get-connections')
    .then((response) => {
      console.log('获取连接数据成功', response)
      if (response.length === 0) return
      treeData.splice(0, treeData.length, ...response) // 更新数据
    })
    .catch((error) => {
      console.error('获取连接数据失败', error)
    })
}
init()
// 保存数据到本地存储
const saveTreeData = () => {
  const rawTreeData = toRaw(treeData) // 使用 toRaw 获取原始数据
  window.electron.ipcRenderer
    .invoke('save-connection', rawTreeData) // 传递原始数据
    .then((response) => {
      console.log('保存连接数据成功', response)
    })
    .catch((error) => {
      console.error('保存连接数据失败', error)
    })
}
// 事件发射器
const emit = defineEmits(['close-dialog'])

//关闭对话框
const closeDialog = () => {
  emit('close-dialog')
}
// 监听数据变化，保存到本地存储
watch(
  () => treeData,
  (newValue, oldValue) => {
    saveTreeData() // 数据发生变化时保存
  },
  { deep: true } // 深度监听，确保嵌套的子节点变化也会触发
)

// 新增根文件
const addNewNode = () => {
  treeData.push({ id: Date.now(), name: '新建文件', type: 'folder', children: [] })
}

// 添加文件夹子节点
const handleAddFolderNode = (parentId) => {
  const parent = findNode(treeData, parentId)
  if (parent) {
    if (!parent.children) parent.children = []
    parent.children.push({ id: Date.now(), name: '新建文件夹', type: 'folder', children: [] })
  }
}

// 添加文件节点
const handleAddFileNode = (parentId) => {
  const parent = findNode(treeData, parentId)
  if (parent) {
    if (!parent.children) parent.children = []
    parent.children.push({ id: Date.now(), name: 'linux', type: 'file',info:{}, children: [] })
  }
}
//修改文件节点
const onUpdateNode = (nodeId,info) => {
  const targetItem = treeData.find((item) => item.id === nodeId)
  if (targetItem) {
    targetItem.info = info
  }
  saveTreeData();
}

// 删除节点
const handleDeleteNode = (nodeId) => {
  deleteNode(treeData, nodeId)
}

// 查找节点
const findNode = (nodes, id) => {
  for (const node of nodes) {
    if (node.id === id) return node
    if (node.children) {
      const found = findNode(node.children, id)
      if (found) return found
    }
  }
  return null
}

// 递归删除节点
const deleteNode = (nodes, id) => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) {
      nodes.splice(i, 1)
      return true
    }
    if (nodes[i].children) {
      if (deleteNode(nodes[i].children, id)) return true
    }
  }
  return false
}
</script>

<style scoped>
.new-node-btn {
  margin-bottom: 3px;
  padding: 3px;
  background-color: #28c9b6;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}
.tree-container {
  height: 300px;
  overflow-y: auto; /* 使内容区域可以滚动 */
}
</style>
