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
        @update-node="handleUpdateNode"
        @close-dialog="closeDialog"
      />
    </div>
  </div>
</template>

<script setup>
import { reactive, watch, toRaw } from 'vue'
import { ElMessageBox } from 'element-plus'
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
const init = async () => {
  try {
    const response = await window.electron.ipcRenderer.invoke('get-connections')
    console.log('获取连接数据成功', response)
    if (response && Array.isArray(response)) {
      // 清空现有数据并添加新数据
      treeData.splice(0, treeData.length, ...response)
    }
  } catch (error) {
    console.error('获取连接数据失败', error)
  }
}
init()
// 保存数据到本地存储
const saveTreeData = async () => {
  try {
    // 深拷贝并清理数据
    const cleanData = JSON.parse(JSON.stringify(toRaw(treeData)))
    
    // 递归清理每个节点的不必要或不能序列化的数据
    const cleanNode = (node) => {
      // 只保留必要的字段
      const cleanedNode = {
        id: node.id,
        type: node.type,
        info: {
          name: node.info?.name || '',
          host: node.info?.host || '',
          port: node.info?.port || 22,
          username: node.info?.username || '',
          password: node.info?.password || '',
          authMethod: node.info?.authMethod || 'password',
          privateKey: node.info?.privateKey || '',
          passphrase: node.info?.passphrase || '',
          encoding: node.info?.encoding || 'utf8',
          remark: node.info?.remark || ''
        }
      }
      
      // 如果有子节点，递归处理
      if (node.children && Array.isArray(node.children)) {
        cleanedNode.children = node.children.map(child => cleanNode(child))
      }

      return cleanedNode
    }

    // 清理所有节点
    const cleanedTreeData = cleanData.map(node => cleanNode(node))
    console.log('清理后的树状数据', cleanedTreeData)
    // 保存清理后的数据
    await window.electron.ipcRenderer.invoke('save-connection', cleanedTreeData)
    console.log('保存连接数据成功')
  } catch (error) {
    console.error('保存连接数据失败:', error)
    ElMessage.error('保存连接数据失败')
  }
}
// 事件发射器
const emit = defineEmits(['close-dialog'])

//关闭对话框
const closeDialog = () => {
  emit('close-dialog')
}
// 监数据变化，保存到本地存储
watch(
  () => treeData,
  (newValue, oldValue) => {
    console.log('文件树数据发生变化', newValue, oldValue)
    saveTreeData() // 数据发生变化时保存
  },
  { deep: true } // 深度监听，确保嵌套的子节点变化也会触发
)

// 新增根文件
const addNewNode = () => {
  treeData.push({ 
    id: Date.now(), 
    type: 'folder',
    info: {
      name: '新建文件夹'
    },
    children: [] 
  })
}

// 添加文件夹子节点
const handleAddFolderNode = (parentId) => {
  const parent = findNode(treeData, parentId)
  if (parent) {
    if (!parent.children) parent.children = []
    parent.children.push({ 
      id: Date.now(), 
      type: 'folder',
      info: {
        name: '新建文件夹'
      }, 
      children: [] 
    })
  }
}

// 添加连接节点
const handleAddFileNode = async (parentId, formData) => {
  try {
    console.log('添加连接节点', parentId, formData)
    const parent = findNode(treeData, parentId)
    console.log('找到的父节点', parent)
    if (parent) {
      if (!parent.children) parent.children = []
      // 创建新节点时确保数据结构正确
      const newNode = {
        id: Date.now(),
        type: 'file',
        info: {
          name: formData.name,
          host: formData.host,
          port: formData.port,
          username: formData.username,
          password: formData.password,
          authMethod: formData.authMethod,
          privateKey: formData.privateKey,
          passphrase: formData.passphrase,
          encoding: formData.encoding,
          remark: formData.remark
        },
        children: []
      }
      parent.children.push(newNode)
      await saveTreeData()
    }
  } catch (error) {
    console.error('添加连接节点失败:', error)
    ElMessage.error('添加连接失败')
  }
}
// 递归查找和更新节点
const findAndUpdateNode = (nodes, id, info) => {
  for (const node of nodes) {
    if (node.id === id) {
      node.info = info
      return true
    }
    if (node.children && node.children.length) {
      if (findAndUpdateNode(node.children, id, info)) {
        return true
      }
    }
  }
  return false
}

// 处理节点更新
const handleUpdateNode = (id, updatedNode) => {
  try {
    const updateNodeInTree = (nodes) => {
      for (let i = 0; i < nodes.length; i++) {
        if (nodes[i].id === id) {
          if (updatedNode.type === 'folder') {
            nodes[i].info = updatedNode.info
          } else {
            nodes[i].info = updatedNode.info
          }
          return true
        }
        if (nodes[i].children && nodes[i].children.length > 0) {
          if (updateNodeInTree(nodes[i].children)) {
            return true
          }
        }
      }
      return false
    }

    const updated = updateNodeInTree(treeData)
    if (updated) {
      saveTreeData()
    }
  } catch (error) {
    console.error('更新节点失败:', error)
  }
}

// 删除节点
const handleDeleteNode = async (nodeId) => {
  // 找到要删除的节点
  const node = findNode(treeData, nodeId)
  if (!node) return

  try {
    // 显示确认对话框
    await ElMessageBox.confirm(
      `确定要删除${node.type === 'folder' ? '文件夹' : '连接'} "${node.type === 'folder' ? node.info.name : node.info.name}" 吗？`,
      '删除确认',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
        draggable: true,
        closeOnClickModal: false,
        modalAppendToBody: false,
        appendToBody: true,
        lockScroll: false
      }
    )
    
    // 用户确认后执行删除
    deleteNode(treeData, nodeId)
  } catch {
    // 用户取消删除，不做任何操作
    console.log('取消删除')
  }
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

// 更新节点
const updateNode = (id, updatedNode) => {
  const updateNodeInTree = (nodes) => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) {
        if (updatedNode.type === 'folder') {
          nodes[i].name = updatedNode.name
        } else {
          nodes[i].info = updatedNode
        }
        return true
      }
      if (nodes[i].children && nodes[i].children.length > 0) {
        if (updateNodeInTree(nodes[i].children)) {
          return true
        }
      }
    }
    return false
  }

  updateNodeInTree(treeData)
  saveTreeData()
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

/* 添加确认对话框的样式控制 */
:deep(.el-overlay) {
  overflow: hidden;
  position: fixed;
}

:deep(.el-message-box) {
  margin: 15vh auto !important;
  border-radius: 8px;
}
</style>
