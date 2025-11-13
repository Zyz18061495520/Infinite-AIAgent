<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { NodeProps } from '@vue-flow/core'
import { modelProviderOptions } from '@/constants/model'

const props = defineProps<NodeProps>()
const nodeData = defineModel<any>('data', { required: true })

// 获取模型信息（名称优先使用模型名，图标按 provider 映射）
function getModelIcon() {
  const provider = nodeData.value?.node_params?.model?.provider
  const opt = provider ? modelProviderOptions.find(p => p.value === provider) : null
  return opt?.icon || ''
}

function getModelDisplayName() {
  const name = nodeData.value?.node_params?.model?.name || nodeData.value?.node_params?.model?.model_name
  return name || '未配置'
}

function hasModelConfigured() {
  return !!(nodeData.value?.node_params?.model?.name || nodeData.value?.node_params?.model?.model_name)
}

// 处理节点点击
function handleNodeClick() {
  // 通过事件发射器通知父组件打开配置面板
  if (props.id) {
    // 触发自定义事件
    const event = new CustomEvent('node-click', { detail: { nodeId: props.id, nodeType: 'llm' } })
    window.dispatchEvent(event)
  }
}
</script>

<template>
  <div class="llm-node" @click="handleNodeClick">
    <!-- 输入端口 -->
    <Handle
      id="input"
      type="target"
      :position="Position.Left"
      class="handle-input"
    />

    <!-- 顶部渐变背景 -->
    <div class="top-gradient-background" />

    <!-- 节点内容 -->
    <div class="node-content">
      <!-- Header -->
      <div class="node-header">
        <div class="icon-square llm">
          <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
            <circle cx="12" cy="8" r="2" />
            <path d="M8 21v-4h8v4M12 13v5" />
          </svg>
        </div>
        <span class="node-title">{{ nodeData.name || '大模型' }}</span>
        <!-- <div class="header-actions">
          <div class="action-btn">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path d="M3 2l10 6-10 6V2z" />
            </svg>
          </div>
          <div class="action-btn">
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <circle cx="8" cy="4" r="1" />
              <circle cx="8" cy="8" r="1" />
              <circle cx="8" cy="12" r="1" />
            </svg>
          </div>
        </div> -->
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

        <div class="section">
          <div class="section-label">
            模型
          </div>
          <div v-if="hasModelConfigured()" class="model-info">
            <img v-if="getModelIcon()" :src="getModelIcon()" class="model-icon-img" alt="模型图标">
            <span class="model-name">{{ getModelDisplayName() }}</span>
          </div>
          <div v-else class="placeholder">
            未配置模型
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
.llm-node {
  position: relative;
  min-width: 280px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  border: 2px solid transparent;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.llm-node:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 16px rgba(139, 92, 246, 0.2);
}

.llm-node {
  cursor: pointer;
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

.header-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.action-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.action-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
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

.icon-circle.blue {
  background: #3b82f6;
  color: white;
}

.icon-circle.green {
  background: #10b981;
  color: white;
}

.icon-circle.purple {
  background: #8b5cf6;
  color: white;
}
.icon-square {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px; /* 与新增节点气泡一致 */
  color: white;
}

.icon-square.llm {
  background: #3b82f6; /* 与新增节点气泡 LLM 颜色一致 */
}

.icon-circle.small {
  width: 20px;
  height: 20px;
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

.model-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.model-icon {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.model-icon-img {
  width: 20px;
  height: 20px;
  object-fit: contain;
  border-radius: 4px;
}

.model-name {
  font-size: 12px;
  color: #1f2937;
}

.add-button {
  position: absolute;
  right: 12px;
  top: 50px;
  cursor: pointer;
}

.handle-input {
  background: #374151;
  border: 2px solid white;
  width: 12px;
  height: 12px;
  opacity: 1;
  transition: all 0.2s ease;
  transform: scale(1);
  transform-origin: center;
}

.llm-node:hover .handle-input {
  transform: scale(1.3);
  background: #8b5cf6;
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

.llm-node:hover .handle-output {
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
