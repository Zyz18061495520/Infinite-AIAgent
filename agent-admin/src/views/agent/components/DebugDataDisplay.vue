<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { DebugData } from '@/utils/sse'
import { marked } from 'marked'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

interface Props {
  debugData: DebugData
}

interface Emits {
  (e: 'confirmParams', params: Record<string, any>): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 工具展开状态
const isToolExpanded = ref(false)

// 参数确认状态
const isParamsConfirming = ref(false)

// 参数确认展开状态
const isParamsExpanded = ref(true) // 默认展开

// 工具结果展开状态
const isToolResultExpanded = ref(false) // 默认收起

// plan 展开状态
const isPlanExpanded = ref(true) // 默认展开

// act 展开状态
const isActExpanded = ref(false) // 默认收起

// 解析参数确认的content
const parsedParams = computed(() => {
  if (props.debugData.type === 'params_confirm' && props.debugData.content) {
    try {
      let content = props.debugData.content

      // 如果content是字符串且包含单引号，先尝试替换为双引号
      if (typeof content === 'string') {
        // 处理单引号字典格式："{'key': 'value'}" -> "{"key": "value"}"
        content = content.replace(/'/g, '"')
      }

      const result = JSON.parse(content)
      return result
    }
    catch (error) {
      console.warn('解析参数失败:', error, '原始content:', props.debugData.content)
      return {}
    }
  }
  return {}
})

// 可编辑的参数
const editableParams = ref<Record<string, any>>({})

// 监听参数变化，同步到可编辑参数
watch(parsedParams, (newParams) => {
  editableParams.value = { ...newParams }
}, { immediate: true })

// 解析工具输出结果（支持JSON与纯文本，并处理双重转义与Unicode转义）
const parsedToolOutput = computed<any>(() => {
  if (props.debugData.type !== 'tool_result' || props.debugData.tool_output == null)
    return null

  let output: any = props.debugData.tool_output

  // 若是字符串，尽量解码一次（去掉外层引号和转义）
  if (typeof output === 'string') {
    try {
      // 先尝试去除一层JSON转义
      output = JSON.parse(output)
    }
    catch {}
  }

  // 再尝试将字符串内容解析为JSON对象/数组；若失败则保留字符串本身
  if (typeof output === 'string') {
    try {
      const maybeJson = JSON.parse(output)
      return maybeJson
    }
    catch {
      return output // 纯文本（已完成Unicode解码），直接返回字符串
    }
  }

  return output
})

// 确认参数
function confirmParams() {
  isParamsConfirming.value = true
  emit('confirmParams', editableParams.value)
}

// 切换工具展开状态
function toggleToolExpanded() {
  isToolExpanded.value = !isToolExpanded.value
}

// 切换参数确认展开状态
function toggleParamsExpanded() {
  isParamsExpanded.value = !isParamsExpanded.value
}

// 切换工具结果展开状态
function toggleToolResultExpanded() {
  isToolResultExpanded.value = !isToolResultExpanded.value
}

// 切换 plan 展开状态
function togglePlanExpanded() {
  isPlanExpanded.value = !isPlanExpanded.value
}

// 切换 act 展开状态
function toggleActExpanded() {
  isActExpanded.value = !isActExpanded.value
}

// 解析 Markdown 内容
const parsedMarkdownContent = computed(() => {
  if (props.debugData.type === 'ai' && props.debugData.content) {
    return marked(props.debugData.content)
  }
  return ''
})

// 判断 act 类型是否有 response
const hasActResponse = computed(() => {
  if (props.debugData.type === 'act' && props.debugData.tool_calls && props.debugData.tool_calls.length > 0) {
    const toolCall = props.debugData.tool_calls[0]
    return toolCall.args && toolCall.args.action && toolCall.args.action.response
  }
  return false
})

// 获取 act 类型的 response 内容（Markdown 格式）
const actResponseContent = computed(() => {
  if (hasActResponse.value && props.debugData.tool_calls && props.debugData.tool_calls.length > 0) {
    const toolCall = props.debugData.tool_calls[0]
    const response = toolCall.args?.action?.response
    if (response) {
      return marked(response)
    }
  }
  return ''
})

// 监听 hasActResponse，如果是总结类型（有 response），默认展开
watch(hasActResponse, (newVal) => {
  if (newVal) {
    isActExpanded.value = true
  }
}, { immediate: true })
</script>

<template>
  <div class="debug-data-display">
    <!-- AI思考过程 -->
    <div v-if="debugData.type === 'ai'" class="ai-thinking">
      <div class="p-3 rounded-lg bg-gray-100 text-gray-800 markdown-content">
        <div v-html="parsedMarkdownContent" />
      </div>
    </div>

    <!-- 工具调用 -->
    <div v-else-if="debugData.type === 'tool_choose'" class="tool-selection">
      <div class="bg-green-50 border border-green-200 rounded-lg p-3">
        <div
          v-if="debugData.tool_calls && debugData.tool_calls.length > 0"
          class="flex items-center gap-2 cursor-pointer"
          @click="toggleToolExpanded"
        >
          <n-icon class="text-green-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-green-600">工具调用</span>
          <div class="flex-1" />
          <n-icon class="text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              :style="{ transform: isToolExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </n-icon>
        </div>

        <div v-if="debugData.tool_calls && debugData.tool_calls.length > 0">
          <div v-if="isToolExpanded" class="mt-2">
            <span class="text-sm font-medium text-gray-700">工具名称:</span>
            <div class="flex flex-wrap gap-2 mt-1">
              <n-tag v-for="(tool, index) in debugData.tool_calls" :key="index" size="small" type="success">
                {{ tool.name }}
              </n-tag>
            </div>
          </div>
        </div>
        <div v-else class="flex items-center gap-2">
          <n-icon class="text-green-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-green-600">工具调用</span>
          <span class="text-sm text-green-700">未选择任何工具</span>
        </div>
      </div>
    </div>

    <!-- 参数确认 -->
    <div v-else-if="debugData.type === 'params_confirm'" class="params-confirmation">
      <div class="p-3 rounded-lg bg-gray-100 text-gray-800">
        <div class="flex items-center gap-2 cursor-pointer" @click="toggleParamsExpanded">
          <n-icon class="text-yellow-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-yellow-600">参数确认</span>
          <div class="flex-1" />
          <n-icon class="text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              :style="{ transform: isParamsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </n-icon>
        </div>
        <div v-if="isParamsExpanded" class="space-y-3 mt-3">
          <div v-if="Object.keys(parsedParams).length === 0" class="text-sm text-gray-500">
            暂无参数需要确认
          </div>
          <div v-for="(_, key) in parsedParams" :key="key" class="flex items-center gap-2">
            <label class="text-sm font-medium text-gray-700 min-w-0 flex-shrink-0">{{ key }}:</label>
            <n-input
              v-model:value="editableParams[key]"
              size="small"
              class="flex-1"
              :disabled="isParamsConfirming"
            />
          </div>
          <div class="flex gap-2 mt-4">
            <n-button
              v-if="!isParamsConfirming"
              size="small"
              type="primary"
              @click="confirmParams"
            >
              确认参数
            </n-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 工具执行结果 -->
    <div v-else-if="debugData.type === 'tool_result'" class="tool-result">
      <div class="p-3 rounded-lg bg-gray-100 text-gray-800">
        <div class="flex items-center gap-2 cursor-pointer" @click="toggleToolResultExpanded">
          <n-icon class="text-green-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-green-600">工具执行结果</span>
          <div class="flex-1" />
          <n-icon class="text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              :style="{ transform: isToolResultExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </n-icon>
        </div>
        <div v-if="isToolResultExpanded" class="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <div class="mb-2">
            <span class="text-sm font-medium text-gray-700">工具名称:</span>
            <n-tag size="small" type="success" class="ml-2">
              {{ debugData.name }}
            </n-tag>
          </div>
          <div v-if="parsedToolOutput" class="mt-2">
            <span class="text-sm font-medium text-gray-700">执行结果:</span>
            <div class="mt-2">
              <template v-if="typeof parsedToolOutput === 'string'">
                <div class="text-sm text-gray-800 break-all whitespace-pre-wrap">{{ parsedToolOutput }}</div>
              </template>
              <template v-else>
                <VueJsonPretty
                  :data="parsedToolOutput"
                  :show-length="true"
                  :show-line-number="false"
                  :show-icon="true"
                  :deep="2"
                  :deep-collapse="3"
                  class="text-xs"
                />
              </template>
            </div>
          </div>
          <div v-else class="text-sm text-green-700">
            执行完成，无返回数据
          </div>
        </div>
      </div>
    </div>

    <!-- 制定任务规划 (plan) -->
    <div v-else-if="debugData.type === 'plan'" class="plan-result">
      <div class="p-3 rounded-lg bg-gray-100 text-gray-800">
        <div class="flex items-center gap-2 cursor-pointer" @click="togglePlanExpanded">
          <n-icon class="text-green-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-green-600">制定任务规划</span>
          <div class="flex-1" />
          <n-icon class="text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              :style="{ transform: isPlanExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </n-icon>
        </div>
        <div v-if="isPlanExpanded && debugData.tool_calls && debugData.tool_calls.length > 0" class="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <div v-for="(toolCall, index) in debugData.tool_calls" :key="index" class="mb-3 last:mb-0">
            <div class="mb-2">
              <span class="text-sm font-medium text-gray-700">工具名称:</span>
              <n-tag size="small" type="success" class="ml-2">
                {{ toolCall.name }}
              </n-tag>
            </div>
            <div v-if="toolCall.args && toolCall.args.steps && Array.isArray(toolCall.args.steps)" class="mt-2">
              <span class="text-sm font-medium text-gray-700">任务步骤:</span>
              <ul class="mt-2 space-y-1">
                <li v-for="(step, stepIndex) in toolCall.args.steps" :key="stepIndex" class="text-sm text-gray-800 flex items-start">
                  <span class="text-green-500 mr-2 mt-0.5">•</span>
                  <span>{{ step }}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 行动 (act) -->
    <div v-else-if="debugData.type === 'act'" class="act-result">
      <div class="p-3 rounded-lg bg-gray-100 text-gray-800">
        <div class="flex items-center gap-2 cursor-pointer" @click="toggleActExpanded">
          <n-icon class="text-green-500">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </n-icon>
          <span class="text-sm font-medium text-green-600">{{ hasActResponse ? '总结' : '行动' }}</span>
          <div class="flex-1" />
          <n-icon class="text-gray-500">
            <svg
              viewBox="0 0 24 24"
              width="12"
              height="12"
              fill="currentColor"
              :style="{ transform: isActExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }"
            >
              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
            </svg>
          </n-icon>
        </div>
        <div v-if="isActExpanded && debugData.tool_calls && debugData.tool_calls.length > 0" class="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <!-- 如果有 response，显示 response 内容 -->
          <div v-if="hasActResponse" class="markdown-content">
            <div v-html="actResponseContent" />
          </div>
          <!-- 如果有 steps，显示步骤列表 -->
          <div v-else>
            <div v-for="(toolCall, index) in debugData.tool_calls" :key="index" class="mb-3 last:mb-0">
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-700">工具名称:</span>
                <n-tag size="small" type="success" class="ml-2">
                  {{ toolCall.name }}
                </n-tag>
              </div>
              <div v-if="toolCall.args && toolCall.args.action && toolCall.args.action.steps && Array.isArray(toolCall.args.action.steps)" class="mt-2">
                <span class="text-sm font-medium text-gray-700">行动步骤:</span>
                <ul class="mt-2 space-y-1">
                  <li v-for="(step, stepIndex) in toolCall.args.action.steps" :key="stepIndex" class="text-sm text-gray-800 flex items-start">
                    <span class="text-green-500 mr-2 mt-0.5">•</span>
                    <span>{{ step }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.debug-data-display {
  width: 100%;
}

.ai-thinking,
.tool-selection,
.params-confirmation,
.tool-result,
.plan-result,
.act-result {
  margin-bottom: 4px;
}

.ai-thinking:last-child,
.tool-selection:last-child,
.params-confirmation:last-child,
.tool-result:last-child,
.plan-result:last-child,
.act-result:last-child {
  margin-bottom: 0;
}

/* Loading动画样式 */
.loading-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-dots span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #9ca3af;
  animation: loading-dots 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes loading-dots {
  0%, 80%, 100% {
    background-color: #e5e7eb;
    transform: scale(0.8);
  }
  40% {
    background-color: #6b7280;
    transform: scale(1);
  }
}

/* Markdown 内容样式 */
.markdown-content {
  line-height: 1.6;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4),
.markdown-content :deep(h5),
.markdown-content :deep(h6) {
  margin-top: 0.8em;
  margin-bottom: 0.3em;
  font-weight: 600;
  color: #374151;
}

.markdown-content :deep(h1) {
  font-size: 1.5em;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 0.3em;
}

.markdown-content :deep(h2) {
  font-size: 1.3em;
}

.markdown-content :deep(h3) {
  font-size: 1.1em;
}

.markdown-content :deep(p) {
  margin-bottom: 0.5em;
  color: #374151;
}

.markdown-content :deep(code) {
  background-color: #f3f4f6;
  padding: 0.2em 0.4em;
  border-radius: 0.25rem;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 0.875em;
}

.markdown-content :deep(pre) {
  background-color: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 0.8rem;
  overflow-x: auto;
  margin: 0.4em 0;
}

.markdown-content :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}

.markdown-content :deep(blockquote) {
  border-left: 4px solid #d1d5db;
  padding-left: 0.8rem;
  margin: 0.4em 0;
  color: #6b7280;
  font-style: italic;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
  margin: 0.4em 0;
  padding-left: 1.5em;
}

.markdown-content :deep(li) {
  margin: 0.1em 0;
}

.markdown-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 0.4em 0;
}

.markdown-content :deep(th),
.markdown-content :deep(td) {
  border: 1px solid #d1d5db;
  padding: 0.4rem;
  text-align: left;
}

.markdown-content :deep(th) {
  background-color: #f9fafb;
  font-weight: 600;
}

.markdown-content :deep(a) {
  color: #3b82f6;
  text-decoration: underline;
}

.markdown-content :deep(a:hover) {
  color: #1d4ed8;
}

.markdown-content :deep(strong) {
  font-weight: 600;
}

.markdown-content :deep(em) {
  font-style: italic;
}
</style>
