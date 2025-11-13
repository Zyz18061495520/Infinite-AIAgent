<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import '@/utils/monaco'
import * as monaco from 'monaco-editor/esm/vs/editor/editor.api'

const props = withDefaults(defineProps<{
  modelValue: string
  language?: string
  height?: string
  theme?: 'light' | 'dark'
}>(), {
  language: 'python',
  height: '280px',
  theme: 'light',
})

const emit = defineEmits<{ 'update:modelValue': [val: string] }>()

const containerRef = ref<HTMLElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null
let resizeObserver: ResizeObserver | null = null
// 用于跟踪编辑器当前的值，避免循环更新
let currentEditorValue = ''
// 标记是否正在由编辑器内部更新，防止循环
let isInternalUpdate = false

function initMonaco() {
  if (containerRef.value && !editor) {
    currentEditorValue = props.modelValue || ''

    editor = monaco.editor.create(containerRef.value, {
      value: currentEditorValue,
      language: props.language,
      automaticLayout: true,
      theme: props.theme === 'dark' ? 'vs-dark' : 'vs',
      minimap: { enabled: false },
      fontSize: 13,
      fontFamily: 'Consolas, "Courier New", monospace',
      fontLigatures: true,
      lineNumbers: 'on',
      lineNumbersMinChars: 2,
      lineDecorationsWidth: 8,
      glyphMargin: false,
      folding: false,
      smoothScrolling: true,
      cursorSmoothCaretAnimation: 'on',
      roundedSelection: true,
      scrollBeyondLastLine: false,
      renderWhitespace: 'selection',
      wordWrap: 'on',
    })

    // 监听内容变化
    editor.onDidChangeModelContent(() => {
      if (!editor || isInternalUpdate) {
        return
      }

      const newValue = editor.getValue() ?? ''
      // 只有当值真正改变时才更新
      if (newValue !== currentEditorValue) {
        currentEditorValue = newValue
        isInternalUpdate = true
        emit('update:modelValue', newValue)
        // 使用 setTimeout 确保 watch 在下一个事件循环中执行时能看到 isInternalUpdate 标志
        setTimeout(() => {
          isInternalUpdate = false
        }, 0)
      }
    })

    // 确保编辑器容器能够正常接收键盘事件
    // 在捕获阶段监听键盘事件，确保空格键不会被父组件（如 VueFlow）拦截
    if (containerRef.value) {
      const handleKeyDown = (e: KeyboardEvent) => {
        // 如果按的是空格键
        if (e.key === ' ' || e.code === 'Space') {
          const editorDom = editor?.getDomNode()
          // 检查焦点是否在编辑器内
          if (editorDom) {
            const activeElement = document.activeElement
            // 如果焦点在编辑器内部，阻止事件冒泡，防止父组件拦截
            if (editorDom.contains(activeElement) || editorDom === activeElement) {
              e.stopPropagation()
            }
          }
        }
      }

      const handleKeyUp = (e: KeyboardEvent) => {
        // 同样处理 keyup 事件
        if (e.key === ' ' || e.code === 'Space') {
          const editorDom = editor?.getDomNode()
          if (editorDom) {
            const activeElement = document.activeElement
            if (editorDom.contains(activeElement) || editorDom === activeElement) {
              e.stopPropagation()
            }
          }
        }
      }

      // 使用捕获阶段，确保先于其他监听器处理
      containerRef.value.addEventListener('keydown', handleKeyDown, true)
      containerRef.value.addEventListener('keyup', handleKeyUp, true)

      // 在组件卸载时清理（保存清理函数引用）
      const cleanup = () => {
        if (containerRef.value) {
          containerRef.value.removeEventListener('keydown', handleKeyDown, true)
          containerRef.value.removeEventListener('keyup', handleKeyUp, true)
        }
      }

      // 保存清理函数，在 onBeforeUnmount 中调用
      if (typeof (containerRef.value as any).__codeEditorCleanup === 'undefined') {
        (containerRef.value as any).__codeEditorCleanup = cleanup
      }
    }

    // 监听容器尺寸，及时触发布局
    if (window && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => editor?.layout())
      resizeObserver.observe(containerRef.value)
    }
  }
}

onMounted(() => {
  initMonaco()
})

onBeforeUnmount(() => {
  // 清理键盘事件监听器
  if (containerRef.value && (containerRef.value as any).__codeEditorCleanup) {
    (containerRef.value as any).__codeEditorCleanup()
    delete (containerRef.value as any).__codeEditorCleanup
  }

  if (editor) {
    editor.dispose?.()
    editor = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

// 监听外部 modelValue 变化，只在真正需要时更新编辑器
watch(() => props.modelValue, (newValue) => {
  // 如果更新来自编辑器自身，跳过处理
  if (isInternalUpdate) {
    return
  }

  if (!editor || typeof newValue !== 'string') {
    return
  }

  const editorValue = editor.getValue() ?? ''

  // 只有当外部值真正不同时才更新编辑器
  if (editorValue !== newValue) {
    // 保存光标位置和选择状态
    const position = editor.getPosition()
    const selections = editor.getSelections()
    const scrollTop = editor.getScrollTop()
    const scrollLeft = editor.getScrollLeft()

    // 更新编辑器值
    currentEditorValue = newValue
    isInternalUpdate = true
    editor.setValue(newValue)

    // 恢复光标位置
    if (position) {
      try {
        const model = editor.getModel()
        if (model) {
          const maxLine = model.getLineCount()
          const lineNumber = Math.min(position.lineNumber, maxLine)
          const maxColumn = model.getLineMaxColumn(lineNumber)
          const column = Math.min(position.column, maxColumn)
          editor.setPosition({ lineNumber, column })
        }
        if (selections && selections.length > 0) {
          editor.setSelections(selections)
        }
      }
      catch {
        // 位置无效时忽略
      }
    }

    // 恢复滚动位置
    editor.setScrollTop(scrollTop)
    editor.setScrollLeft(scrollLeft)

    // 重置标志
    setTimeout(() => {
      isInternalUpdate = false
    }, 0)
  }
}, { flush: 'post' })

// 响应语言切换
watch(() => props.language, (lang) => {
  if (editor && typeof lang === 'string') {
    monaco.editor.setModelLanguage(editor.getModel()!, lang)
  }
})

// 响应主题切换
watch(() => props.theme, (t) => {
  monaco.editor.setTheme(t === 'dark' ? 'vs-dark' : 'vs')
})
</script>

<template>
  <div
    :style="{
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      overflow: 'hidden',
      height,
      background: theme === 'dark' ? '#1f2937' : '#ffffff',
    }"
  >
    <div ref="containerRef" :style="{ width: '100%', height: '100%' }" />
  </div>
</template>

<style scoped>
/* 确保编辑器容器可以接收键盘事件 */
div {
  outline: none;
}
</style>
