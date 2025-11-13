<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'

defineProps<NodeProps>()
const nodeData = defineModel<any>('data', { required: true })
</script>

<template>
  <div class="start-node">
    <!-- 开始节点只有输出端口，没有输入端口 -->

    <!-- 顶部渐变背景 -->
    <div class="top-gradient-background" />

    <!-- 节点内容 -->
    <div class="node-content">
      <!-- Header -->
      <div class="node-header">
        <div class="icon-circle purple">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        <span class="node-title">开始</span>
      </div>

      <!-- Body -->
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
      </div>
    </div>

    <!-- 输出端口 -->
    <Handle
      id="output"
      type="source"
      :position="Position.Right"
      class="handle-output"
    />
  </div>
</template>

<style scoped>
.start-node {
  position: relative;
  min-width: 250px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.start-node:hover {
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

.icon-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-circle.purple {
  background: #8b5cf6;
  color: white;
}

.icon-circle.small {
  width: 20px;
  height: 20px;
}

.node-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
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

.add-button {
  position: absolute;
  right: 12px;
  top: 50px;
  cursor: pointer;
}

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

.start-node:hover .handle-output {
  transform: scale(1.3);
  background: #8b5cf6;
}

/* 顶部渐变背景 */
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
