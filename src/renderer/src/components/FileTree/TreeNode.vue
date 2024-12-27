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
            title="连接"
            width="400px"
            :modal-append-to-body="false"
            :append-to-body="true"
            :lock-scroll="false"
            :align-center="true"
          >
            <ServerConfigDialog 
              :node="currentEditNode" 
              @update-node="updateNode"
              @cancel="handleCancel"
            ></ServerConfigDialog>
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
          @update-node="onupdateNode"
          @close-dialog="oncloseDialog"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import ServerConfigDialog from './ServerConfigDialog.vue'
import { useTabsStore } from '../../stores/terminalStore'
const tabsStore = useTabsStore();
// 弹窗显示控制
const visible = defineModel('visible', { type: Boolean, default: false })

// 接收父组件传递的节点数据
const props = defineProps({
  node: { type: Object, required: true }
})

// 事件发射器
const emit = defineEmits(['add-folder-node', 'add-file-node', 'delete-node', 'update-node','close-dialog'])

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
  // 创建新标签
  tabsStore.openNewTerminal()
  // 获取最新创建的标签
  const newTab = tabsStore.editableTabs[tabsStore.editableTabs.length - 1]
  // 更新标签信息
  tabsStore.updateTabInfo(newTab.id, props.node.info)
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

// 添加一个响应式量来存储当前编辑的节点
const currentEditNode = ref(null)

// 添加一个标记来区分是新增还是编辑
const isNewNode = ref(false)

// 添加文件节点
const addFile = () => {
  // 标记为新增操作
  isNewNode.value = true
  // 创建一个新的空节点对象用于单显示
  currentEditNode.value = {
    type: 'file',
    info: { name: '新连接' }
  }
  // 显示编辑对话框
  visible.value = true
}

// 编辑节点
const editNode = () => {
  // 标记为编辑操作
  isNewNode.value = false
  // 编辑现有节点时，复制一份节点数据
  currentEditNode.value = { ...props.node }
  visible.value = true
}

// 更新节点
const updateNode = (formData) => {
  if (isNewNode.value) {
    // 如果是新增节点，则调用添加逻辑
    emit('add-file-node', props.node.id, formData)
  } else {
    // 如果是编辑节点，则调用更新逻辑
    emit('update-node', currentEditNode.value.id, formData)
  }
  visible.value = false
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
const onupdateNode = (id,formData) => emit('update-node', id,formData)

const oncloseDialog = () => emit('close-dialog')

// 添加取消处理函数
const handleCancel = () => {
  visible.value = false
}
</script>

<style scoped>
.toggle-container {
  flex-shrink: 0;
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
  padding-right: calc(100% - 99%); /* 预留滚动条宽度 */
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
  white-space: nowrap;  /* 防止换行 */
  overflow: hidden;     /* 超出部分隐藏 */
}

/* 文件夹和文件名称容器 */
.node-header > div {
  flex-shrink: 0;      /* 防止压缩 */
  display: flex;
  align-items: center;
}

/* 文件名称 */
.node-header span {
  overflow: hidden;
  text-overflow: ellipsis;  /* 超出显示省略号 */
  white-space: nowrap;
}

/* 操作按钮容器 */
.node-actions {
  margin-left: auto;    /* 推到最右边 */
  flex-shrink: 0;       /* 防止压缩 */
}

/* 确保图标不会被压缩 */
.folder-icon {
  flex-shrink: 0;       /* 保持不压缩 */
  margin-right: 8px;    /* 保持右边距 */
  font-style: normal;   /* 防止斜体 */
  font-size: 15px;      /* 设置大小 */
  display: inline-flex; /* 确保图标对齐 */
  align-items: center;  /* 垂直居中 */
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

:deep(.el-overlay) {
  overflow: hidden;
  position: fixed;
}

:deep(.el-dialog) {
  margin: 15vh auto !important;
}
</style>
