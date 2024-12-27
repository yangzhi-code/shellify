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
          <span v-if="!isRenaming">{{ node.name }}</span>
          <input
            v-else
            ref="renameInput"
            v-model="newName"
            @blur="finishRename"
            @keyup.enter="finishRename"
            @keyup.esc="cancelRename"
            class="rename-input"
          />
        </div>
        <!-- 文件图标 -->
        <div v-if="node.type === 'file'">
          <i class="folder-icon">📄</i>
          <span>{{ node.info.name }}</span>
        </div>

        <!-- 操作按钮 -->
        <div class="node-actions">
          <!-- 添加文件夹按钮 -->
          <button v-if="node.type === 'folder'" @click.stop="addfolder">📁</button>
          <!-- 添加文件按钮 -->
          <button v-if="node.type === 'folder'" @click.stop="addFile">➕</button>
          <!-- 重命名按钮 - 仅文件夹显示 -->
          <button v-if="node.type === 'folder'" @click.stop="startRename">✏️</button>
          <!-- 编辑按钮 - 仅文件显示 -->
          <button v-if="node.type === 'file'" @click.stop="editNode">✏️</button>
          <!-- 删除按钮 -->
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
import { ref, nextTick } from 'vue'
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
  // 在添加子节点后，展开节点
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

// 添加重命名相关的响应式变量
const isRenaming = ref(false)
const newName = ref('')
const renameInput = ref(null)

// 开始重命名
const startRename = () => {
  isRenaming.value = true
  newName.value = props.node.name
  // 等待 DOM 更新后聚焦输入框
  nextTick(() => {
    renameInput.value?.focus()
  })
}

// 完成重命名
const finishRename = () => {
  if (newName.value && newName.value !== props.node.name) {
    // 使用现有的更新节点逻辑，只更新名称
    emit('update-node', props.node.id, { ...props.node, name: newName.value })
  }
  isRenaming.value = false
}

// 取消重命名
const cancelRename = () => {
  isRenaming.value = false
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
  box-sizing: border-box;
  padding-right: calc(100% - 99%);
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
  white-space: nowrap;
  overflow: hidden;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background-color 0.2s ease;
  height: 32px;
  box-sizing: border-box;
}

.node-header:hover {
  background-color: var(--el-fill-color-light);
}

/* 文件夹和文件名称容器 */
.node-header > div {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  height: 24px; /* 固定高度 */
}

/* 文件名称 */
.node-header span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  color: var(--el-text-color-primary);
  margin-right: 8px;
  line-height: 24px; /* 与输入框高度一致 */
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
  font-size: 14px;      /* 设置大小 */
  display: inline-flex; /* 确保图标对齐 */
  align-items: center;  /* 垂直居中 */
  color: var(--el-text-color-secondary);
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin: 0 2px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  color: var(--el-text-color-secondary);
}

.node-actions button:hover {
  background-color: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
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
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: none;
  border: none;
  cursor: pointer;
  margin-right: 8px;
  padding: 0;
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.toggle-btn:hover {
  color: var(--el-color-primary);
}

:deep(.el-overlay) {
  overflow: hidden;
  position: fixed;
}

:deep(.el-dialog) {
  margin: 15vh auto !important;
}

/* 重命名输入框样式 */
.rename-input {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  padding: 0 8px;
  font-size: 12px;
  height: 24px;
  width: 140px;
  outline: none;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
  transition: all 0.2s ease;
  margin: 0; /* 移除外边距 */
  line-height: 24px; /* 确保文字垂直居中 */
  box-sizing: border-box; /* 确保padding不会增加实际高度 */
}

.rename-input:focus {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}
</style>
