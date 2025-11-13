<script setup lang="ts">
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
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
    const event = new CustomEvent('node-click', { detail: { nodeId: props.id, nodeType: 'switch' } })
    window.dispatchEvent(event)
  }
}

function getBranchTitle(index: number) {
  const total = Array.isArray(nodeData.value?.node_params?.branches) ? nodeData.value.node_params.branches.length : 0
  if (index === 0)
    return '如果'
  if (index === total - 1)
    return '否则'
  return '否则如果'
}

function getBranchDesc(idx: number) {
  const len = Number(nodeData.value?.node_params?.branches?.[idx]?.statements?.length || 0)
  return `${len} 个条件`
}

function branches() {
  return Array.isArray(nodeData.value?.node_params?.branches) ? nodeData.value.node_params.branches : []
}

// 右侧连接点需与每个分支行垂直对齐，故需计算行的中心位置
const branchRefs = ref<Record<number, HTMLElement | null>>({})
const handleTops = ref<number[]>([])

function setBranchRef(index: number, el: Element | ComponentPublicInstance | null) {
  branchRefs.value[index] = (el as HTMLElement) || null
}

function computeHandlePositions() {
  nextTick(() => {
    const tops: number[] = []
    const rows = branchRefs.value
    const keys = Object.keys(rows)
    for (const k of keys) {
      const idx = Number(k)
      const el = rows[idx]
      if (el) {
        const rect = (el as HTMLElement).getBoundingClientRect()
        const parent = (el as HTMLElement).closest('.switch-node') as HTMLElement | null
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

watch(() => branches().map((b: any) => b.id + (b.relation || '')), () => {
  computeHandlePositions()
})
</script>

<template>
  <div class="switch-node" @click="handleNodeClick">
    <Handle id="input" type="target" :position="Position.Left" class="handle-input" />

    <div class="top-gradient-background" />

    <div class="node-content">
      <div class="node-header">
        <div class="icon-square switch">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z" />
          </svg>
        </div>
        <span class="node-title">{{ nodeData.name || '条件分支' }}</span>
      </div>

      <div class="node-body">
        <div
          v-for="(branch, idx) in branches()"
          :key="branch.id || `b-${idx}`"
          :ref="(el) => setBranchRef(idx, el)"
          class="branch-row"
        >
          <span class="branch-title">{{ getBranchTitle(idx) }}</span>
          <span class="branch-desc">{{ getBranchDesc(idx) }}</span>
        </div>
        <div v-if="branches().length === 0" class="placeholder">
          未配置分支
        </div>
      </div>
    </div>

    <!-- 右侧输出端口：与每个分支行垂直对齐，定位在外层卡片右边缘 -->
    <Handle
      v-for="(branch, idx) in branches()"
      :id="(branch && branch.id) || String(idx)"
      :key="(branch && branch.id) || idx"
      type="source"
      :position="Position.Right"
      class="handle-output"
      :style="{ top: `${handleTops[idx] || 0}px`, transform: 'translateY(-50%)' }"
    />
  </div>
</template>

<style scoped>
.switch-node {
  position: relative;
  min-width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}
.switch-node:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
}
.node-content { padding: 16px; overflow: hidden; }
.node-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
.icon-square { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: white; }
.icon-square.switch { background: #06b6d4; }
.node-title { font-size: 14px; font-weight: 500; color: #1f2937; flex: 1; }
.node-body { display: flex; flex-direction: column; gap: 6px; }
.branch-row { display: flex; align-items: center; justify-content: space-between; background: #f9fafb; border-radius: 6px; padding: 6px 10px; }
.branch-title { font-size: 12px; color: #6b7280; }
.branch-desc { font-size: 12px; color: #374151; }
.placeholder { font-size: 12px; color: #9ca3af; }
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
.switch-node:hover .handle-input,
.switch-node:hover .handle-output {
  transform: scale(1.3);
  background: #8b5cf6;
}
.top-gradient-background { position: absolute; top: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to bottom, rgba(128, 0, 128, 0.1), transparent); border-radius: 12px 12px 0 0; pointer-events: none; z-index: 1; }
</style>
