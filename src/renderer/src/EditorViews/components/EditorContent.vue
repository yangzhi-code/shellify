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
import { ref, onMounted, watch, onUnmounted } from 'vue'
import { EditorView, lineNumbers } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { cpp } from '@codemirror/lang-cpp'
import { java } from '@codemirror/lang-java'
import { php } from '@codemirror/lang-php'
import { html } from '@codemirror/lang-html'
import { css } from '@codemirror/lang-css'
import { xml } from '@codemirror/lang-xml'
import { markdown } from '@codemirror/lang-markdown'
import { sql } from '@codemirror/lang-sql'
import { StreamLanguage } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { history } from '@codemirror/commands'
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { bracketMatching } from '@codemirror/language'
import { closeBrackets } from '@codemirror/autocomplete'
import { search, openSearchPanel } from '@codemirror/search'

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

// 根据文件名获取语言模式
const getLanguageExtension = (filename) => {
  // 移除路径，只保留文件名
  const basename = filename.split('/').pop()?.toLowerCase()

  // 根据扩展名判断
  const ext = basename.split('.').pop()?.toLowerCase()
  switch (ext) {
    // JavaScript 相关
    case 'js':
    case 'jsx':
    case 'ts':
    case 'tsx':
    case 'json':
      return javascript()

    // Python
    case 'py':
    case 'pyw':
      return python()

    // C/C++
    case 'c':
    case 'cpp':
    case 'h':
    case 'hpp':
      return cpp()

    // Java
    case 'java':
      return java()

    // Web
    case 'html':
    case 'htm':
      return html()
    case 'css':
    case 'scss':
    case 'less':
      return css()
    case 'xml':
    case 'svg':
      return xml()
    case 'php':
      return php()

    // 标记语言
    case 'md':
    case 'markdown':
      return markdown()

    // 数据库
    case 'sql':
      return sql()

    // 默认返回 null，使用普通文本模式
    default:
      return null
  }
}

// 创建编辑器实例
const createEditor = (tab) => {
  console.log('正在创建编辑器，标签信息:', tab)
  const el = editorRefs.value[tab.path]
  if (!el) {
    console.log('跳过编辑器创建:', { 
      hasElement: !!el, 
      hasEditor: editors.has(tab.path),
      tabContent: tab.content ? tab.content.length : 0
    })
    return
  }

  // 如果已存在编辑器实例，先销毁它
  if (editors.has(tab.path)) {
    console.log('销毁已存在的编辑器:', tab.path)
    editors.get(tab.path).destroy()
    editors.delete(tab.path)
  }

  // 清空容器
  el.innerHTML = ''

  // 准备扩展
  const extensions = [
    lineNumbers(),
    history(),
    indentOnInput(),
    bracketMatching(),
    closeBrackets(),
    syntaxHighlighting(defaultHighlightStyle),
    oneDark,
    search({
      top: true,
      caseSensitive: false
    }),
    EditorView.domEventHandlers({
      keydown: (event, view) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
          event.preventDefault()
          openSearchPanel(view)
          
          // 在搜索面板打开后进行中文化
          setTimeout(() => {
            const searchPanel = view.dom.querySelector('.cm-panel.cm-search')
            if (searchPanel) {
              // 替换按钮文本
              const buttons = searchPanel.querySelectorAll('button')
              buttons.forEach(button => {
                switch (button.textContent.toLowerCase()) {
                  case 'next': button.textContent = '下一个'; break
                  case 'previous': button.textContent = '上一个'; break
                  case 'all': button.textContent = '全部'; break
                  case 'replace': button.textContent = '替换'; break
                  case 'replace all': button.textContent = '全部替换'; break
                }
              })

              // 替换复选框标签文本
              const labels = searchPanel.querySelectorAll('label')
              labels.forEach(label => {
                const text = label.textContent.toLowerCase()
                if (text.includes('match case')) label.childNodes[1].textContent = '区分大小写'
                if (text.includes('regexp')) label.childNodes[1].textContent = '正则表达式'
                if (text.includes('by word')) label.childNodes[1].textContent = '全词匹配'
              })

              // 修改输入框占位符
              const inputs = searchPanel.querySelectorAll('input[type="text"]')
              inputs[0].placeholder = '查找...'
              if (inputs[1]) inputs[1].placeholder = '替换为...'
            }
          }, 10)
        }
      }
    })
  ]

  // 根据文件类型添加特定扩展
  if (!tab.binary) {
    const langExtension = getLanguageExtension(tab.path)
    if (langExtension) {
      extensions.push(langExtension)
    }
  } else {
    extensions.push(EditorState.readOnly.of(true))
  }

  // 添加主题和事件监听
  extensions.push(
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
        column: pos - line.from + 1,
        totalLines: update.state.doc.lines,
        totalChars: update.state.doc.length
      })
    })
  );

  // 创建编辑器状态
  const state = EditorState.create({
    doc: tab.content || '',
    extensions
  })

  console.log('创建编辑器，内容长度:', tab.content?.length || 0)
  const editor = new EditorView({
    state,
    parent: el
  })

  editors.set(tab.path, editor)
  console.log('编辑器创建完成，内容长度:', editor.state.doc.toString().length)

  // 初始化时发送光标位置和文档信息
  const pos = editor.state.selection.main.head
  const line = editor.state.doc.lineAt(pos)
  emit('cursor-change', {
    line: line.number,
    column: pos - line.from + 1,
    totalLines: editor.state.doc.lines,
    totalChars: editor.state.doc.length
  })
}

// 获取编辑器内容
const getContent = (path) => {
  const editor = editors.get(path)
  return editor ? editor.state.doc.toString() : ''
}

// 监听标签变化，包括内容更新
watch(() => props.tabs, (newTabs) => {
  console.log('标签变化，检查更新...')

  // 清理已关闭标签页的编辑器实例
  const currentPaths = new Set(newTabs.map(tab => tab.path))
  for (const [path, editor] of editors.entries()) {
    if (!currentPaths.has(path)) {
      console.log('清理已关闭标签页的编辑器:', path)
      editor.destroy()
      editors.delete(path)
      delete editorRefs.value[path]
    }
  }

  newTabs.forEach(tab => {
    console.log('处理标签:', tab)
    if (!tab || !tab.path) {
      console.warn('无效的标签:', tab)
      return
    }

    if (!editors.has(tab.path)) {
      console.log('为新标签创建编辑器:', tab.path)
      createEditor(tab)
    } else {
      const editor = editors.get(tab.path)
      const currentContent = editor.state.doc.toString()
      console.log('内容比较:', {
        path: tab.path,
        currentLength: currentContent?.length || 0,
        newLength: tab.content?.length || 0,
        isDifferent: tab.content !== currentContent
      })
      if (tab.content !== undefined && tab.content !== currentContent) {
        console.log('更新内容:', tab.path)
        editor.dispatch({
          changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: tab.content || ''
          }
        })
      }
    }
  })
}, { deep: true, immediate: true })

// 监听激活标签变化
watch(() => props.activeTab, (newPath, oldPath) => {
  console.log('活动标签变化:', { newPath, oldPath })
  if (!newPath) return

  if (oldPath) {
    const oldEl = editorRefs.value[oldPath]
    if (oldEl) oldEl.style.display = 'none'
  }

  const newEl = editorRefs.value[newPath]
  console.log('新元素路径:', newPath, newEl)
  if (newEl) {
    newEl.style.display = 'block'
    if (!editors.has(newPath)) {
      const tab = props.tabs.find(t => t.path === newPath)
      if (tab) {
        console.log('为新激活的标签创建编辑器')
        createEditor(tab)
      }
    }
    // 切换标签页时更新光标位置
    const editor = editors.get(newPath)
    if (editor) {
      const pos = editor.state.selection.main.head
      const line = editor.state.doc.lineAt(pos)
      emit('cursor-change', {
        line: line.number,
        column: pos - line.from + 1,
        totalLines: editor.state.doc.lines,
        totalChars: editor.state.doc.length
      })
    }
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

// 组件卸载时清理所有编辑器实例
onUnmounted(() => {
  console.log('Cleaning up all editors')
  for (const editor of editors.values()) {
    editor.destroy()
  }
  editors.clear()
  editorRefs.value = {}
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
}

:deep(.cm-gutters) {
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
  min-height: 100%;
  padding: 0;
}

:deep(.cm-activeLineGutter) {
  background: transparent;
}

:deep(.cm-line) {
  padding: 0 4px 0 4px;
}

:deep(.cm-content) {
  min-height: 100%;
  padding: 0;
}

/* 搜索面板样式 */
:deep(.cm-searchMatch) {
  background-color: var(--el-color-primary-light-8);
  border: 1px solid var(--el-color-primary-light-5);
}

:deep(.cm-searchMatch-selected) {
  background-color: var(--el-color-primary-light-5);
}

:deep(.cm-panel.cm-search) {
  background-color: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
  font-family: var(--el-font-family);
  padding: 8px;
}

:deep(.cm-search input[type="text"]) {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-primary);
  height: 28px;
  padding: 0 8px;
  width: 200px;
  font-size: 12px;
}

:deep(.cm-search input[type="text"]:focus) {
  border-color: var(--el-color-primary);
  outline: none;
}

:deep(.cm-search button) {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  background: var(--el-bg-color-overlay);
  color: var(--el-text-color-primary);
  padding: 4px 12px;
  margin: 0 4px;
  font-size: 12px;
  height: 28px;
  line-height: 1;
  cursor: pointer;
}

:deep(.cm-search button:hover) {
  border-color: var(--el-color-primary);
  color: var(--el-color-primary);
}

:deep(.cm-search label) {
  color: var(--el-text-color-regular);
  font-size: 12px;
  margin: 0 8px;
  user-select: none;
}

:deep(.cm-search input[type="checkbox"]) {
  margin-right: 4px;
  vertical-align: middle;
}

:deep(.cm-search .cm-button[name="close"]) {
  color: var(--el-text-color-secondary);
  font-size: 16px;
  padding: 4px;
  border: none;
}

:deep(.cm-search .cm-button[name="close"]:hover) {
  color: var(--el-text-color-primary);
}

:deep(.cm-panel.cm-search) {
  gap: 8px;
  align-items: center;
}
</style> 