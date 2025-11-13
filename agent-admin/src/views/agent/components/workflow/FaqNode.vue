<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
const nodeData = defineModel<any>('data', { required: true })

function handleNodeClick() {
  if (props.id) {
    const event = new CustomEvent('node-click', { detail: { nodeId: props.id, nodeType: 'faq' } })
    window.dispatchEvent(event)
  }
}
</script>

<template>
  <div class="faq-node" @click="handleNodeClick">
    <div class="top-gradient-background" />
    <div class="node-header">
      <div class="icon-circle faq">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
        </svg>
      </div>
      <span class="node-title">{{ nodeData.name || 'FAQ' }}</span>
    </div>

    <div class="node-body">
      <div class="section">
        <div class="section-label">
          FAQ
        </div>
        <div class="tags-container">
          <span v-if="nodeData.node_params?.config?.name" class="tag light-purple">{{ nodeData.node_params.config.name }}</span>
          <span v-else class="placeholder">未配置FAQ</span>
        </div>
      </div>

      <div class="section">
        <div class="section-label">
          <!-- 不展示输入 -->
        </div>
        <div class="tags-container" />
      </div>

      <div class="section">
        <div class="section-label">
          输出
        </div>
        <div class="tags-container">
          <span v-for="(output, idx) in nodeData.outputs || []" :key="idx" class="tag light-purple">
            {{ output.variable }}
          </span>
          <span v-if="!nodeData.outputs || nodeData.outputs.length === 0" class="placeholder">未配置输出</span>
        </div>
      </div>
    </div>

    <Handle id="input" type="target" :position="Position.Left" class="handle-input" />
    <Handle id="output" type="source" :position="Position.Right" class="handle-output" />
  </div>
</template>

<style scoped>
.faq-node {
  position: relative;
  min-width: 260px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.faq-node:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 0 16px;
}

.icon-circle {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: white;
}
.icon-circle.faq { background: #6366f1; }

.node-title { font-size: 14px; font-weight: 600; color: #1f2937; }

.node-body { padding: 12px 16px 16px; }
.section { display: flex; flex-direction: column; gap: 6px; }
.section-label { font-size: 12px; color: #6b7280; }
.tags-container { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { padding: 4px 10px; border-radius: 6px; font-size: 12px; background: #f3f4f6; color: #4b5563; }
.tag.light-purple { background: #ede9fe; color: #6d28d9; }
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

.faq-node:hover .handle-input,
.faq-node:hover .handle-output {
  transform: scale(1.3);
  background: #8b5cf6;
}

.top-gradient-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 40px;
  background: linear-gradient(to bottom, rgba(128, 0, 128, 0.1), transparent);
  border-radius: 12px 12px 0 0;
  pointer-events: none;
  z-index: 1;
}
</style>
