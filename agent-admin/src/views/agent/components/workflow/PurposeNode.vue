<script setup lang="ts">
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import { modelProviderOptions } from '@/constants/model'
import { nextTick, onMounted, ref, watch } from 'vue'

const props = defineProps<NodeProps>()
// 声明 VueFlow 传递的事件，避免警告
defineEmits<{
  updateNodeInternals: []
}>()

const nodeData = defineModel<any>('data', { required: true })
const { updateNodeInternals } = useVueFlow()

function handleNodeClick() {
  if (props.id) {
    const event = new CustomEvent('node-click', { detail: { nodeId: props.id, nodeType: 'purpose' } })
    window.dispatchEvent(event)
  }
}

function getModelIcon() {
  const hasId = !!nodeData.value?.node_params?.model?.id
  if (!hasId)
    return ''
  const provider = nodeData.value?.node_params?.model?.provider
  const opt = provider ? modelProviderOptions.find(p => p.value === provider) : null
  return opt?.icon || ''
}

function getModelDisplayName() {
  const hasId = !!nodeData.value?.node_params?.model?.id
  if (!hasId)
    return '未配置'
  const name = nodeData.value?.node_params?.model?.name || nodeData.value?.node_params?.model?.model_name
  return name || '未配置'
}

function hasSelectedModel() {
  return !!nodeData.value?.node_params?.model?.id
}

function categories() {
  return Array.isArray(nodeData.value?.node_params?.categories) ? nodeData.value.node_params.categories : []
}

// 右侧连接点需与每个意图行垂直对齐，故需计算行的中心位置
const rowRefs = ref<Record<number, HTMLElement | null>>({})
const handleTops = ref<number[]>([])

function setRowRef(index: number, el: Element | ComponentPublicInstance | null) {
  rowRefs.value[index] = (el as HTMLElement) || null
}

function computeHandlePositions() {
  nextTick(() => {
    const tops: number[] = []
    const rows = rowRefs.value
    const keys = Object.keys(rows)
    for (const k of keys) {
      const idx = Number(k)
      const el = rows[idx]
      if (el) {
        const rect = (el as HTMLElement).getBoundingClientRect()
        const parent = (el as HTMLElement).closest('.purpose-node') as HTMLElement | null
        if (parent) {
          const parentRect = parent.getBoundingClientRect()
          const V_OFFSET = 0 // 移除偏移，使用精确计算
          const centerY = rect.top - parentRect.top + rect.height / 2 + V_OFFSET
          tops[idx] = centerY
        }
      }
    }
    handleTops.value = tops
    // 位置计算完成后，更新节点内部状态
    nextTick(() => {
      if (props.id && updateNodeInternals) {
        updateNodeInternals(props.id)
      }
    })
  })
}

onMounted(() => {
  computeHandlePositions()
})

watch(() => categories().map((c: any) => c.id + (c.content || '')), () => {
  computeHandlePositions()
})
</script>

<template>
  <div class="purpose-node" @click="handleNodeClick">
    <!-- 输入端口：左侧中间 -->
    <Handle
      id="input"
      type="target"
      :position="Position.Left"
      class="handle-input"
    />
    <div class="top-gradient-background" />

    <div class="node-content">
      <div class="node-header">
        <div class="icon-square purple">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
        </div>
        <span class="node-title">{{ nodeData.name || '意图识别' }}</span>
      </div>

      <div class="node-body">
        <div class="section">
          <div class="section-label">
            输入
          </div>
          <div class="tags-container">
            <span v-for="(input, idx) in nodeData.inputs || []" :key="idx" class="tag light-purple">{{ input.variable }}</span>
            <span v-if="!nodeData.inputs || nodeData.inputs.length === 0" class="placeholder">未配置输入</span>
          </div>
        </div>

        <div class="section">
          <div class="section-label">
            模型
          </div>
          <div v-if="hasSelectedModel()" class="model-info">
            <img v-if="getModelIcon()" :src="getModelIcon()" class="model-icon-img" alt="模型图标">
            <span class="model-name">{{ getModelDisplayName() }}</span>
          </div>
          <div v-else class="placeholder">
            未配置模型
          </div>
        </div>

        <div class="section">
          <div class="section-label">
            意图类型
          </div>
          <div class="intent-list">
            <div v-for="(c, idx) in categories()" :key="c.id || idx" :ref="(el) => setRowRef(idx, el)" class="intent-item">
              <span class="intent-text">{{ c.content || '' }}</span>
            </div>
            <span v-if="categories().length === 0" class="placeholder">未配置意图类型</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧输出端口：与每个意图行垂直对齐，定位在外层卡片右边缘 -->
    <Handle
      v-for="(c, idx) in categories()"
      :id="(c && c.id) || String(idx)"
      :key="(c && c.id) || idx"
      type="source"
      :position="Position.Right"
      class="handle-output"
      :style="{ top: `${handleTops[idx] || 0}px`, transform: 'translateY(-50%)' }"
    />
  </div>
</template>

<style scoped>
.purpose-node {
  position: relative;
  min-width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.purpose-node:hover { border-color: #8b5cf6; box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2); }
.node-content { padding: 16px; }
.node-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.icon-circle { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; }
.icon-circle.purple { background: #8b5cf6; }
.icon-square { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: #fff; }
.icon-square.purple { background: #8b5cf6; }
.node-title { font-size: 14px; color: #111827; font-weight: 600; }
.node-body { display: flex; flex-direction: column; gap: 12px; }
.section { display: flex; flex-direction: column; gap: 8px; }
.section-label { font-size: 12px; color: #6b7280; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { padding: 4px 8px; border-radius: 6px; font-size: 12px; }
.tag.light-purple { background: #f5f3ff; color: #6d28d9; }
.placeholder { color: #9ca3af; font-size: 12px; }
.model-info { display: flex; align-items: center; gap: 8px; }
.model-icon-img { width: 16px; height: 16px; object-fit: contain; }
.intent-list { display: flex; flex-direction: column; gap: 8px; position: relative; }
.intent-item { position: relative; padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }
.intent-text { font-size: 12px; color: #1f2937; }
.handle-input,
.handle-output {
  background: #374151;
  border: 2px solid white;
  width: 12px;
  height: 12px;
  opacity: 1;
  transition: all 0.2s ease;
  transform: scale(1);
  transform-origin: center;
}

.handle-output {
  right: -6px;
  position: absolute;
}
.purpose-node:hover .handle-input,
.purpose-node:hover .handle-output {
  transform: scale(1.3);
  background: #8b5cf6;
}
.top-gradient-background { position: absolute; top: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to bottom, rgba(128, 0, 128, 0.1), transparent); border-radius: 12px 12px 0 0; pointer-events: none; z-index: 1; }
</style>
