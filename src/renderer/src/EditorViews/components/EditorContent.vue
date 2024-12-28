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
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { syntaxHighlighting, defaultHighlightStyle, indentOnInput, bracketMatching, foldGutter } from '@codemirror/language'
import { lineNumbers } from '@codemirror/view'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { autocompletion } from '@codemirror/autocomplete'

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

  // 清空容器
  el.innerHTML = ''

  const state = EditorState.create({
    doc: tab.content,
    extensions: [
      lineNumbers(),
      history(),
      indentOnInput(),
      bracketMatching(),
      autocompletion(),
      foldGutter(),
      syntaxHighlighting(defaultHighlightStyle),
      defaultKeymap,
      historyKeymap,
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
      }),
      EditorView.domEventHandling({
        'keyup': (event, view) => {
          const pos = view.state.selection.main.head
          const line = view.state.doc.lineAt(pos)
          emit('cursor-change', {
            line: line.number,
            column: pos - line.from + 1
          })
        }
      })
    ]
  })

  const editor = new EditorView({
    state,
    parent: el
  })

  editors.set(tab.path, editor)
  console.log('Editor created for:', tab.path)
}

// 获取编辑器内容
const getContent = (path) => {
  const editor = editors.get(path)
  return editor ? editor.state.doc.toString() : ''
}

// 监听标签变化
watch(() => props.tabs, (newTabs) => {
  newTabs.forEach(tab => {
    if (!editors.has(tab.path)) {
      createEditor(tab)
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
  flex: 1;
  overflow: hidden;
  position: relative;
}

.editor-instance {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
}
</style> 