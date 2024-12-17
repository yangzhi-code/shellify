<template>
    <div>
      <button @click="addNode">Add Node</button>
      <vue-tree-list
        @click="onClick"
        @change-name="onChangeName"
        @delete-node="onDel"
        @add-node="onAddNode"
        :model="data"
        default-tree-node-name="new node"
        default-leaf-node-name="new leaf"
        v-bind:default-expanded="false"
      >
        <template v-slot:leafNameDisplay="slotProps">
          <span>
            {{ slotProps.model.name }} <span class="muted">#{{ slotProps.model.id }}</span>
          </span>
        </template>
        <span class="icon" slot="addTreeNodeIcon">📂</span>
        <span class="icon" slot="addLeafNodeIcon">＋</span>
        <span class="icon" slot="editNodeIcon">📃</span>
        <span class="icon" slot="delNodeIcon">✂️</span>
        <span class="icon" slot="leafNodeIcon">🍃</span>
        <span class="icon" slot="treeNodeIcon">🌲</span>
      </vue-tree-list>
      <button @click="getNewTree">Get new tree</button>
      <pre>{{ newTree }}</pre>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue'
  import { VueTreeList, Tree, TreeNode } from 'vue-tree-list'
  
  const newTree = ref({})
  const data = ref(
    new Tree([
      {
        name: 'Node 1',
        id: 1,
        pid: 0,
        dragDisabled: true,
        addTreeNodeDisabled: true,
        addLeafNodeDisabled: true,
        editNodeDisabled: true,
        delNodeDisabled: true,
        children: [
          {
            name: 'Node 1-2',
            id: 2,
            isLeaf: true,
            pid: 1
          }
        ]
      },
      {
        name: 'Node 2',
        id: 3,
        pid: 0,
        disabled: true
      },
      {
        name: 'Node 3',
        id: 4,
        pid: 0
      }
    ])
  )
  
  function onDel(node) {
    console.log(node)
    node.remove()
  }
  
  function onChangeName(params) {
    console.log(params)
  }
  
  function onAddNode(params) {
    console.log(params)
  }
  
  function onClick(params) {
    console.log(params)
  }
  
  function addNode() {
    const node = new TreeNode({ name: 'new node', isLeaf: false })
    if (!data.value.children) data.value.children = []
    data.value.addChildren(node)
  }
  
  function getNewTree() {
    function _dfs(oldNode) {
      const newNode = {}
      for (const k in oldNode) {
        if (k !== 'children' && k !== 'parent') {
          newNode[k] = oldNode[k]
        }
      }
      if (oldNode.children && oldNode.children.length > 0) {
        newNode.children = []
        for (let i = 0, len = oldNode.children.length; i < len; i++) {
          newNode.children.push(_dfs(oldNode.children[i]))
        }
      }
      return newNode
    }
    newTree.value = _dfs(data.value)
  }
  </script>
  
  <style lang="less">
  .vtl {
    .vtl-drag-disabled {
      background-color: #d0cfcf;
      &:hover {
        background-color: #d0cfcf;
      }
    }
    .vtl-disabled {
      background-color: #d0cfcf;
    }
  }
  
  .icon {
    &:hover {
      cursor: pointer;
    }
  }
  
  .muted {
    color: gray;
    font-size: 80%;
  }
  
  </style>
  