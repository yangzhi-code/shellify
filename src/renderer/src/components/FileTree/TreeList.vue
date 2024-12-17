<template>
  <div>
    <!-- 全局新增节点按钮 -->
    <button class="new-node-btn" @click="addNewNode">+ New Treenode</button>
    <div style="height: 5px; background: #f0f0f0;"></div>
    <!-- 渲染树节点 -->
    <div class="tree-container">
      <TreeNode
        v-for="node in treeData"
        :key="node.id"
        :node="node"
        @add-node="handleAddNode"
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
    name: 'Node 1',
    children: [{ id: 2, name: 'new child node', children: [] }]
  },
  { id: 3, name: 'Node 2', disabled: true },
  { id: 4, name: 'Node 3', children: [] },
  { id: 5, name: 'new node' }
])

// 新增全局节点
const addNewNode = () => {
  treeData.push({ id: Date.now(), name: 'new node', children: [] })
}

// 添加子节点
const handleAddNode = (parentId) => {
  const parent = findNode(treeData, parentId)
  if (parent) {
    if (!parent.children) parent.children = []
    parent.children.push({ id: Date.now(), name: 'new child node', children: [] })
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
  padding: 5px 10px;
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
