<!-- 连接文件夹对话框 -->
<template>
  <!-- 弹窗容器 -->
  <el-dialog
    v-model="visible"
    draggable="true"
    custom-class="custom-dialog"
    title="连接管理器"
    width="550px"
    height="500px"
    @close="handleClose"
  >
    <!-- 菜单栏 -->
    <div class="menu-bar">
      <!-- 这里可以添加按钮或菜单项 -->
      <el-button size="small" type="primary">新建文件夹</el-button>
      <el-button size="small" type="success">新建连接</el-button>
    </div>
    <!-- 弹窗内容 -->
    <div class="file-content">
      <el-tree
        style="max-width: 500px"
        :data="treeData"
        show-checkbox
        node-key="id"
        default-expand-all
        :expand-on-click-node="false"
        :render-content="renderContent"
        @node-contextmenu="handleNodeRightClick"
      />
      <!-- 自定义右键菜单 -->
      <div
        v-if="menuVisible"
        :style="{ top: menuPosition.top + 'px', left: menuPosition.left + 'px' }"
        class="context-menu"
        @click="menuVisible = false"
      >
        <ul>
          <li @click="handleMenuAction('add')">添加子节点</li>
          <li @click="handleMenuAction('edit')">编辑</li>
          <li @click="handleMenuAction('delete')">删除</li>
        </ul>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed } from 'vue'

// 弹窗显示控制
const visible = defineModel('visible', { type: Boolean, default: false })

// 关闭事件
const handleClose = () => {
  console.log('对话框已关闭')
}

// 树数据
const treeData = ref([
  {
    id: 1,
    label: '文件夹1',
    children: [
      {
        id: 2,
        label: '连接1'
      },
      {
        id: 3,
        label: '连接2'
      }
    ]
  },
  {
    id: 4,
    label: '文件夹2',
    children: [
      {
        id: 5,
        label: '连接3'
      }
    ]
  }
])

// 右键菜单的状态和位置
const menuVisible = ref(false);
const menuPosition = ref({ top: 0, left: 0 });
const selectedNode = ref(null); // 当前右键点击的节点

// 右键事件处理
const handleNodeRightClick = (node, event) => {
  console.log('右键点击节点:', node)

  menuVisible.value = true;
  menuPosition.value = {
    top: event.clientY,
    left: event.clientX
  };
  selectedNode.value = node; // 记录当前选中的节点
};

// 菜单操作处理
const handleMenuAction = (action) => {
  console.log(`操作: ${action}`, selectedNode.value);
  menuVisible.value = false;

  switch (action) {
    case 'add':
      console.log('添加子节点到:', selectedNode.value);
      break;
    case 'edit':
      console.log('编辑节点:', selectedNode.value);
      break;
    case 'delete':
      console.log('删除节点:', selectedNode.value);
      break;
    default:
      break;
  }
};
</script>

<style scoped>
/* 菜单栏样式 */
.menu-bar {
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  gap: 10px;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border-bottom: 1px solid #ccc;
}

/* 内容样式 */
.file-content {
  padding: 10px;
  font-size: 14px;
}
/* 自定义弹窗整体高度 */
.custom-dialog {
  height: 600px; /* 设置弹窗高度 */
  max-height: 80vh; /* 可选：限制弹窗最大高度 */
}

/* 如果内容区域需要滚动 */
.custom-dialog .el-dialog__body {
  height: calc(100% - 60px); /* 弹窗总高度 - 标题和底部的高度 */
  overflow-y: auto;
}
</style>
