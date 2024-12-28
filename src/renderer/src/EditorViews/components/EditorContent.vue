<template>
  <div class="editor-content">
    <div
      v-for="tab in tabs"
      :key="tab.path"
      :class="['editor-instance', { active: activeTab === tab.path }]"
      :ref="el => { if (el) editorRefs[tab.path] = el }"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { EditorView, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { history } from '@codemirror/commands'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'

const props = defineProps({
  tabs: {
    type: Array,
    required: true
  },
  activeTab: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['cursor-change', 'content-change'])

const editorRefs = ref({})
const editors = new Map()

// 创建编辑器实例
const createEditor = (tab) => {
  const el = editorRefs.value[tab.path]
  if (!el || editors.has(tab.path)) return

  console.log('Creating editor for tab:', {
    path: tab.path,
    contentLength: tab.content ? tab.content.length : 0,
    contentPreview: tab.content ? tab.content.substring(0, 100) : 'empty'
  })

  // 清空容器
  el.innerHTML = ''

  // 使用独立的扩展组合
  const extensions = [
    lineNumbers(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    syntaxHighlighting(defaultHighlightStyle),
    javascript(),
    oneDark,
    EditorView.theme({
      '&': {
        height: '100%',
        fontSize: '14px'
      },
      '.cm-scroller': {
        fontFamily: 'Consolas, "Courier New", monospace'
      }
    }),
    EditorView.updateListener.of(update => {
      if (update.docChanged) {
        emit('content-change', tab.path, update.state.doc.toString())
      }
      const pos = update.state.selection.main.head
      const line = update.state.doc.lineAt(pos)
      emit('cursor-change', {
        line: line.number,
        column: pos - line.from + 1
      })
    })
  ]

  const state = EditorState.create({
    doc: tab.content || '',
    extensions
  })

  const editor = new EditorView({
    state,
    parent: el
  })

  editors.set(tab.path, editor)
  console.log('Editor created successfully for:', tab.path)
}

// 获取编辑器内容
const getContent = (path) => {
  const editor = editors.get(path)
  return editor ? editor.state.doc.toString() : ''
}

// 监听标签变化，包括内容更新
watch(() => props.tabs, (newTabs) => {
  console.log('Tabs changed, checking for updates...')
  newTabs.forEach(tab => {
    if (!editors.has(tab.path)) {
      console.log('Creating new editor for:', tab.path)
      createEditor(tab)
    } else if (tab.content !== editors.get(tab.path).state.doc.toString()) {
      console.log('Updating content for:', tab.path)
      const editor = editors.get(tab.path)
      editor.dispatch({
        changes: {
          from: 0,
          to: editor.state.doc.length,
          insert: tab.content || ''
        }
      })
    }
  })
}, { deep: true })

// 监听激活标签变化
watch(() => props.activeTab, (newPath, oldPath) => {
  if (oldPath) {
    const oldEl = editorRefs.value[oldPath]
    if (oldEl) oldEl.style.display = 'none'
  }
  if (newPath) {
    const newEl = editorRefs.value[newPath]
    if (newEl) newEl.style.display = 'block'
  }
})

// 确保在组件挂载后创建编辑器
onMounted(() => {
  if (props.tabs.length > 0 && props.activeTab) {
    const tab = props.tabs.find(t => t.path === props.activeTab)
    if (tab) {
      createEditor(tab)
    }
  }
})

defineExpose({
  getContent
})
</script>

<style scoped>
.editor-content {
  height: 100%;
  background: var(--el-bg-color);
}

.editor-instance {
  height: 100%;
  display: none;
}

.editor-instance.active {
  display: block;
}

:deep(.cm-editor) {
  height: 100%;
}

:deep(.cm-scroller) {
  font-family: 'Consolas', 'Monaco', monospace;
  padding: 4px 0;
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

:deep(.cm-activeLineGutter) {
  background: transparent;
}

:deep(.cm-line) {
  padding: 0 4px 0 8px;
}
</style> 