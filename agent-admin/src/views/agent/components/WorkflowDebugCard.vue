<script setup lang="ts">
import { computed, ref } from 'vue'
import type { DebugData } from '@/utils/sse'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

interface Props {
  event: DebugData
}

const props = defineProps<Props>()

const expanded = ref(props.event.type === 'workflow_answer' || props.event.type === 'error')

// 节点类型到图标与背景色的映射（与新增节点气泡风格一致的简化版）
const nodeIconInfo = computed(() => {
  // 优先使用 type 字段，如果是 workflow_answer、error 或 transfer_to 则直接使用，否则使用 node_type 或 type
  const type = props.event.type === 'workflow_answer' || props.event.type === 'error' || props.event.type === 'transfer_to'
    ? props.event.type
    : (props.event.node_type || props.event.type)
  const map: Record<string, { bg: string, svg: { viewBox: string, path?: string, paths?: Array<{ tag: string, d?: string, cx?: string, cy?: string, r?: string }> } }> = {
    // 对齐 WorkflowCanvas 的 getNodeIcon & getNodeIconColor
    start: { bg: '#8b5cf6', svg: { viewBox: '0 0 24 24', path: 'M8 5v14l11-7z' } },
    end: { bg: '#8b5cf6', svg: { viewBox: '0 0 24 24', path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' } },
    llm: { bg: '#3b82f6', svg: { viewBox: '0 0 24 24', path: 'M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zm-4 13v-4h8v4M12 13v5' } },
    sql: { bg: '#0ea5e9', svg: { viewBox: '0 0 24 24', path: 'M4 6c0-1.1 3.6-2 8-2s8 .9 8 2-3.6 2-8 2-8-.9-8-2zm0 4c0 1.1 3.6 2 8 2s8-.9 8-2M4 14c0 1.1 3.6 2 8 2s8-.9 8-2' } },
    rag: { bg: '#22c55e', svg: { viewBox: '0 0 24 24', path: 'M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z' } },
    faq: { bg: '#f59e0b', svg: { viewBox: '0 0 24 24', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' } },
    code: { bg: '#8b5cf6', svg: { viewBox: '0 0 24 24', path: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z' } },
    tool: { bg: '#14b8a6', svg: { viewBox: '0 0 24 24', path: 'M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z' } },
    variable: { bg: '#64748b', svg: { viewBox: '0 0 24 24', path: 'M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z' } },
    ifelse: { bg: '#f97316', svg: { viewBox: '0 0 24 24', path: 'M4 11h7l3-3h6v2h-5l-3 3H4v-2zm0 6h16v2H4v-2z' } },
    supervisor: { bg: '#0ea5e9', svg: { viewBox: '0 0 24 24', path: 'M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5zm0 2c-5 0-9 2.5-9 5v3h18v-3c0-2.5-4-5-9-5z' } },
    // 最终答案使用绿色圆形对勾图标，表示完成/正确答案
    workflow_answer: { bg: '#22c55e', svg: { viewBox: '0 0 24 24', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' } },
    // 错误类型使用红色圆形X图标
    error: { bg: '#ef4444', svg: { viewBox: '0 0 24 24', paths: [{ tag: 'circle', cx: '12', cy: '12', r: '10' }, { tag: 'path', d: 'M15 9l-6 6M9 9l6 6' }] } },
    // 智能体选择使用绿色对勾图标，与工具执行结果风格一致
    transfer_to: { bg: '#22c55e', svg: { viewBox: '0 0 24 24', path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' } },
  }
  return map[type || 'llm'] || map.llm
})

const title = computed(() => {
  if (props.event.type === 'workflow_answer')
    return '最终答案'
  if (props.event.type === 'error')
    return '错误'
  if (props.event.type === 'transfer_to')
    return '智能体选择'
  return props.event.node_name || '节点'
})

function isJsonLike(value: any): boolean {
  if (value === null)
    return false
  if (typeof value === 'object')
    return true
  if (typeof value === 'string') {
    const s = value.trim()
    return (s.startsWith('{') && s.endsWith('}')) || (s.startsWith('[') && s.endsWith(']'))
  }
  return false
}

function tryParseJsonString(v: any): any {
  if (typeof v !== 'string')
    return v
  const text = v.trim()
  if (!isJsonLike(text) && !text.includes('\''))
    return v
  try { return JSON.parse(text) }
  catch {}
  // 尝试将单引号 JSON 转为双引号
  try {
    const normalized = text
      .replace(/"/g, '\\"') // 先转义已有双引号
      .replace(/'([^']*)'/g, '"$1"') // 将成对的单引号替换为双引号

    return JSON.parse(normalized)
  }
  catch {
    return v
  }
}

const parsedInput = computed(() => tryParseJsonString(props.event.input))

const parsedOutput = computed(() => tryParseJsonString(props.event.output))

function toggle() { expanded.value = !expanded.value }
</script>

<template>
  <!-- transfer_to 专用样式（完全复刻工具执行结果卡片结构） -->
  <div v-if="event.type === 'transfer_to'" class="p-3 rounded-lg bg-gray-100 text-gray-800">
    <div class="flex items-center gap-2 cursor-pointer" @click="toggle">
      <n-icon class="text-green-500">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
        </svg>
      </n-icon>
      <span class="text-sm font-medium text-green-600">{{ title }}</span>
      <div class="flex-1" />
      <n-icon class="text-gray-500">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" :style="{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </n-icon>
    </div>
    <div v-if="expanded" class="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
      <div class="wf-tag-container">
        <template v-if="event.tool_calls && event.tool_calls.length > 0">
          <n-tag
            v-for="(toolCall, index) in event.tool_calls"
            :key="index"
            size="small"
            type="success"
            round
          >
            {{ toolCall.name }}
          </n-tag>
        </template>
        <span v-else class="wf-text">未指定智能体</span>
      </div>
    </div>
  </div>

  <!-- 其他类型仍走通用样式 -->
  <div v-else class="wf-card">
    <div class="wf-card-header" @click="toggle">
      <div class="wf-icon" :style="{ background: nodeIconInfo.bg }">
        <svg :viewBox="nodeIconInfo.svg.viewBox" width="16" height="16" fill="currentColor">
          <template v-if="nodeIconInfo.svg.paths">
            <component
              :is="item.tag"
              v-for="(item, idx) in nodeIconInfo.svg.paths"
              :key="idx"
              v-bind="item.tag === 'path' ? { d: item.d } : { cx: item.cx, cy: item.cy, r: item.r }"
            />
          </template>
          <path v-else-if="nodeIconInfo.svg.path" :d="nodeIconInfo.svg.path" />
        </svg>
      </div>
      <div class="wf-title">
        {{ title }}
      </div>
      <div class="wf-spacer" />
      <n-icon class="text-gray-500">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor" :style="{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }">
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
        </svg>
      </n-icon>
    </div>

    <div v-if="expanded" class="wf-card-body">
      <!-- 错误类型显示 content -->
      <template v-if="event.type === 'error'">
        <div class="wf-section">
          <div class="wf-section-title">
            错误信息
          </div>
          <div v-if="isJsonLike(event.content)" class="wf-json">
            <VueJsonPretty :data="tryParseJsonString(event.content)" :show-length="true" :show-line-number="false" :show-icon="true" :deep="2" :deep-collapse="3" class="text-xs" />
          </div>
          <div v-else class="wf-text">
            {{ event.content }}
          </div>
        </div>
      </template>
      <!-- 其他类型显示输入和输出 -->
      <template v-else>
        <div class="wf-section">
          <div class="wf-section-title">
            输入
          </div>
          <div v-if="isJsonLike(event.input)" class="wf-json">
            <VueJsonPretty :data="parsedInput" :show-length="true" :show-line-number="false" :show-icon="true" :deep="2" :deep-collapse="3" class="text-xs" />
          </div>
          <div v-else class="wf-text">
            {{ event.input }}
          </div>
        </div>
        <div class="wf-section">
          <div class="wf-section-title">
            输出
          </div>
          <div v-if="isJsonLike(event.output)" class="wf-json">
            <VueJsonPretty :data="parsedOutput" :show-length="true" :show-line-number="false" :show-icon="true" :deep="2" :deep-collapse="3" class="text-xs" />
          </div>
          <div v-else class="wf-text">
            {{ event.output }}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.wf-card { width: 100%; background: #f3f4f6; border-radius: 10px;margin-bottom: 8px; }
.wf-card-plain { background: transparent; }
.wf-card-header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; }
.wf-icon { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #fff; }
.wf-title { font-size: 14px; font-weight: 600; color: #1f2937; }
.wf-spacer { flex: 1; }
.wf-card-body { padding: 12px; border-top: 1px solid #e5e7eb; background: #f8fafc; border-radius: 0 0 10px 10px; }
.wf-section { margin-bottom: 10px; }
.wf-section:last-child { margin-bottom: 0; }
.wf-section-title { font-size: 12px; color: #6b7280; margin-bottom: 6px; }
.wf-text { font-size: 13px; color: #111827; word-break: break-all; white-space: pre-wrap; }
.wf-json { background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 6px; padding: 8px; }
.wf-tag-container { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
</style>
