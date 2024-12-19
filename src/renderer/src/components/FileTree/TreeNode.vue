<template>
  <div
    :class="['tree-node', { disabled: node.disabled, 'drag-disabled': node.dragDisabled }]"
    @click.stop="handleClick"
    @dblclick="handleDoubleClick"
    draggable="true"
  >
    <div class="tree-node-content">
      <div class="node-header">
        <!-- 只有当有子节点时才显示倒三角按钮 -->
        <div class="toggle-container">
          <button
            v-if="node.children && node.children.length"
            @click.stop="toggleChildren"
            class="toggle-btn"
          >
            {{ isChildrenVisible ? '▼' : '▶' }}
          </button>
        </div>

        <!-- 文件夹图标 -->
        <div v-if="node.type === 'folder'">
          <i class="folder-icon">📁</i>
          <span>{{ node.name }}</span>
        </div>
        <!-- 文件图标 -->
        <div v-if="node.type === 'file'">
          <i class="folder-icon">📄</i>
          <span>{{ node.info.name }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="node-actions">
          <!-- 添加文件夹 按钮 -->
          <button v-if="node.type === 'folder'" @click.stop="addfolder">📁</button>
          <!-- 添加文件 按钮 -->
          <button v-if="node.type === 'folder'" @click.stop="addFile">➕</button>
          <button @click.stop="editNode">✏️</button>
          <button @click.stop="deleteNode">🗑️</button>
        </div>
        <!-- 服务器配置对话框 -->
        <div>
          <!-- 弹窗容器 -->
          <el-dialog
            v-model="visible"
            title="编辑"
            width="400px"
            :align-center="true"
          >
            <ServerConfigDialog :node="node" @updata-node="updateNode"></ServerConfigDialog>
          </el-dialog>
        </div>
      </div>

      <!-- 节点内容 -->
      <div>
        <span v-if="node.disabled" class="status">disabled</span>
        <span v-if="node.dragDisabled" class="status">drag disabled</span>
      </div>
    </div>

    <!-- 子节点纵向展示 -->
    <div class="children" v-if="isChildrenVisible && node.children && node.children.length">
      <div class="child-node" v-for="child in node.children" :key="child.id">
        <TreeNode
          :node="child"
          @add-folder-node="onAddFolderNode"
          @add-file-node="onAddFileNode"
          @delete-node="onDeleteNode"
          @updata-node="onupdateNode"
          @close-dialog="oncloseDialog"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ServerConfigDialog from './ServerConfigDialog.vue'
import { useTabsStore } from '../../store/terminalStore'
const tabsStore = useTabsStore();
// 弹窗显示控制
const visible = defineModel('visible', { type: Boolean, default: false })

// 接收父组件传递的节点数据
const props = defineProps({
  node: { type: Object, required: true }
})

// 事件发射器
const emit = defineEmits(['add-folder-node', 'add-file-node', 'delete-node', 'updata-node','close-dialog'])

// 控制子节点是否可见的变量
const isChildrenVisible = ref(false)

// 点击节点事件
const handleClick = () => {
  console.log(`点击节点: ${props.node.name}`)
}

//双击节点事件  
const handleDoubleClick = () => {
  if (props.node.type === 'folder') {
    return
  }
  // 保存一个终端窗口
  tabsStore.fileOpenNewTerminal(props.node)
  emit('close-dialog')

}

// 添加文件夹子节点
const addfolder = () => {
  // 在添加子节点后，展开子节点
  if (!isChildrenVisible.value) {
    isChildrenVisible.value = true
  }
  emit('add-folder-node', props.node.id)
}
// 添加文件节点
const addFile = () => {
  // 在添加子节点后，展开子节点
  if (!isChildrenVisible.value) {
    isChildrenVisible.value = true
  }
  emit('add-file-node', props.node.id)
}
//更新节点
const updateNode = (formData) => {
  emit('updata-node',props.node.id,formData)
  visible.value = false
}

// 编辑节点
const editNode = () => {
  visible.value = true
}

// 删除节点
const deleteNode = () => {
  emit('delete-node', props.node.id)
}

// 切换子节点的显示和隐藏
const toggleChildren = () => {
  isChildrenVisible.value = !isChildrenVisible.value
}

// 文件夹子节点操作传递
const onAddFolderNode = (id) => emit('add-folder-node', id)
// 文件子节点操作传递
const onAddFileNode = (id) => emit('add-file-node', id)
const onDeleteNode = (id) => emit('delete-node', id)
const onupdateNode = (id,formData) => emit('updata-node', id,formData)

const oncloseDialog = () => emit('close-dialog')
</script>

<style scoped>
.toggle-container {
  width: 15px;
}
.tree-node-content {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  margin-top: 4px;
  margin-bottom: 4px;
  box-sizing: border-box; /* 确保padding不会影响宽高 */
}

/* 鼠标悬停时的样式 */
.tree-node-content:hover {
  background-color: #d3d3d3; /* 灰色背景 */
}

.tree-node {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.tree-node.disabled {
  color: white;
}

.node-header {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  width: 100%;
}

.folder-icon {
  margin-right: 8px;
  font-style: normal;
  transform: none;
  font-size: 15px;
}

.node-actions {
  display: flex;
  justify-content: flex-start;
  visibility: hidden; /* 默认隐藏 */
  opacity: 0; /* 初始透明度为0 */
  transition: opacity 0.3s ease, visibility 0.3s ease; /* 平滑过渡 */
}

.tree-node-content:hover .node-actions {
  visibility: visible; /* 悬停时显示 */
  opacity: 1; /* 悬停时透明度为1 */
}

.node-actions button {
  margin: 0;
  background: none;
  border: none;
  cursor: pointer;
}

.status {
  font-style: italic;
  margin-left: 10px;
}

.children {
  display: flex;
  flex-direction: column;
  margin-left: 15px;
}

.child-node {
  margin-right: 15px;
}

/* 倒三角按钮样式 */
.toggle-btn {
  font-size: 14px; /* 变小 */
  color: gray; /* 灰色 */
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 8px;
  padding: 0;
  text-align: center;
}
</style>
