<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

const props = defineProps<NodeProps>()
const nodeData = defineModel<any>('data', { required: true })

function handleNodeClick() {
  if (props.id) {
    const event = new CustomEvent('node-click', { detail: { nodeId: props.id, nodeType: 'code' } })
    window.dispatchEvent(event)
  }
}

function hasCodeConfigured() {
  return !!nodeData.value?.node_params?.config?.code
}
</script>

<template>
  <div class="code-node" @click="handleNodeClick">
    <Handle id="input" type="target" :position="Position.Left" class="handle-input" />

    <div class="top-gradient-background" />

    <div class="node-content">
      <div class="node-header">
        <div class="icon-square code">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z" />
          </svg>
        </div>
        <span class="node-title">{{ nodeData.name || 'Code' }}</span>
      </div>

      <div class="node-body">
        <div class="section">
          <div class="section-label">
            输入
          </div>
          <div class="tags-container">
            <span v-for="(input, idx) in nodeData.inputs || []" :key="idx" class="tag light-purple">
              {{ input.variable }}
            </span>
            <span v-if="!nodeData.inputs || nodeData.inputs.length === 0" class="placeholder">未配置输入</span>
          </div>
        </div>

        <div class="section">
          <div class="section-label">
            代码
          </div>
          <div class="tags-container">
            <span v-if="hasCodeConfigured()" class="tag light-purple">已配置</span>
            <span v-else class="placeholder">未配置</span>
          </div>
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
    </div>

    <Handle id="output" type="source" :position="Position.Right" class="handle-output" />
  </div>
</template>

<style scoped>
.code-node {
  position: relative;
  min-width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
}

.code-node:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
}

.node-content {
  padding: 16px;
  overflow: hidden;
}

.node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.icon-square {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: white;
}

.icon-square.code {
  background: #ef4444;
}

.node-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  flex: 1;
}

.node-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.section-label {
  font-size: 12px;
  color: #6b7280;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tag {
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  background: #f3f4f6;
  color: #4b5563;
}

.tag.light-purple {
  background: #ede9fe;
  color: #6d28d9;
}

.placeholder {
  font-size: 12px;
  color: #9ca3af;
}

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

.code-node:hover .handle-input,
.code-node:hover .handle-output {
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
