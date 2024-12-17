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
      />
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import TreeNode from './TreeNode.vue'

// 树状数据
const treeData = reactive([
  {
    id: 1,
    name: '阿里云服务器',
    type: 'folder',
    children: [{ id: 2, name: 'centos7-4核8G', type: 'file', children: [] }]
  },
  { id: 3, name: '本地服务器', type: 'folder' }
])

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
    parent.children.push({ id: Date.now(), name: 'linux', type: 'file', children: [] })
  }
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
