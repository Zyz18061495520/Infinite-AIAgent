<script setup lang="ts">
import { ref } from 'vue'
import { useBoolean } from '@/hooks'
import { createAgentApi } from '@/service/api/agent'
import { useWorkspaceStore } from '@/store/workspace'
import type { Edge, Node } from '@vue-flow/core'
import WorkflowCanvas from './workflow/WorkflowCanvas.vue'

const emit = defineEmits<{
  confirm: [workflow: any]
  cancel: []
}>()
const workspaceStore = useWorkspaceStore()
const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 基本信息折叠状态（默认展开）
const basicInfoCollapsed = ref<string[]>(['basic'])

// 表单数据
const formData = ref({
  name: '',
  zh_name: '',
  description: '',
})

// 工作流画布数据
const workflowData = ref<{ nodes: Node[], edges: Edge[] }>({
  nodes: [],
  edges: [],
})

// 画布组件引用
const canvasRef = ref<InstanceType<typeof WorkflowCanvas>>()

// 打开弹窗
function openModal() {
  formData.value = {
    name: '',
    zh_name: '',
    description: '',
  }
  workflowData.value = {
    nodes: [],
    edges: [],
  }
  basicInfoCollapsed.value = ['basic']
  showModal()
}

// 保存工作流
async function handleSave() {
  if (!formData.value.name.trim()) {
    window.$message.warning('请输入工作流名称')
    return
  }

  if (!formData.value.zh_name.trim()) {
    window.$message.warning('请输入工作流中文名称')
    return
  }

  if (!workspaceStore.workspaceId) {
    window.$message.error('请先选择工作空间')
    return
  }

  if (workflowData.value.nodes.length === 0) {
    window.$message.warning('请添加至少一个节点')
    return
  }

  // 保存前同步最新数据
  if (canvasRef.value) {
    const currentNodes = canvasRef.value.nodes
    const currentEdges = canvasRef.value.edges

    // 更新本地数据
    workflowData.value = {
      nodes: currentNodes,
      edges: currentEdges,
    }
  }

  startLoading()
  try {
    // 仅保留有效节点类型，过滤掉连接线等临时元素（type === 'default' 等）
    const validNodeTypes = new Set(['start', 'llm', 'http', 'sql', 'rag', 'faq', 'code', 'intent', 'switch', 'end'])

    // 先转换边为数组，并将 handle 固定为字符串 'null'
    const edgesArr = workflowData.value.edges.map(edge => ({
      id: edge.id,
      data: edge.data,
      type: edge.type,
      label: edge.label,
      source: edge.source,
      target: edge.target,
      sourceHandle: 'null',
      targetHandle: 'null',
    }))

    // 为所有节点补齐引用：按目标节点找第一条入边的 source
    const targetIdToFirstSourceId: Record<string, string> = {}
    edgesArr.forEach((e) => {
      if (!targetIdToFirstSourceId[e.target])
        targetIdToFirstSourceId[e.target] = e.source || ''
    })

    // 工具函数：递归规范化参数（inputs/outputs），修正 reference 值为 [sourceNodeId, variable]
    function normalizeParams(params: any[], sourceNodeId: string | undefined) {
      if (!Array.isArray(params))
        return params
      return params.map((p: any) => {
        const next: any = { ...p }
        if (next?.type === 'reference') {
          const val = next.value
          if (!Array.isArray(val)) {
            next.value = sourceNodeId ? [sourceNodeId, val] : ['', val]
          }
        }
        if (Array.isArray(next.children) && next.children.length > 0) {
          next.children = normalizeParams(next.children, sourceNodeId)
        }
        return next
      })
    }

    // 节点数据规范化：title->name，desc->description；end 节点移除 node_params；修正 reference 值（inputs/outputs）
    const nodesArr = workflowData.value.nodes
      .filter(node => validNodeTypes.has((node as any).type as string))
      .map((node) => {
        const rawData: any = (node as any).data || {}
        const normalizedData: any = {
          ...rawData,
          name: (rawData.name || rawData.title || (node as any).label || ''),
          description: rawData.desc || '',
        }

        // 修正 inputs 中的 reference 值
        const incomingSourceId = targetIdToFirstSourceId[(node as any).id]
        if (Array.isArray(normalizedData.inputs)) {
          normalizedData.inputs = normalizeParams(normalizedData.inputs, incomingSourceId)
        }

        // 结束节点不应包含 node_params
        if ((node as any).type === 'end' && normalizedData.node_params) {
          delete normalizedData.node_params
        }

        // 修正 outputs 中的 reference 值（结束节点常用）
        if (Array.isArray(normalizedData.outputs)) {
          const incomingId = targetIdToFirstSourceId[(node as any).id] || incomingSourceId
          normalizedData.outputs = normalizeParams(normalizedData.outputs, incomingId)
        }

        // SQL 节点：不依赖 inputs，保留 input_params 中用户编辑的 param_type/value/reference 原样传递

        // 保留 data.name，并与顶层 label/title 保持一致
        const nodeTitle = normalizedData.name || (node as any).label || ''
        normalizedData.name = nodeTitle
        // 移除 data 内部的 title 与 label 字段
        if (Object.prototype.hasOwnProperty.call(normalizedData, 'title'))
          delete normalizedData.title
        if (Object.prototype.hasOwnProperty.call(normalizedData, 'label'))
          delete normalizedData.label
        delete normalizedData.desc

        return {
          id: (node as any).id,
          data: normalizedData,
          type: (node as any).type,
          label: nodeTitle,
          title: nodeTitle,
        }
      })

    // 从第一个 LLM 节点提取模型信息以填充顶层 model
    const firstLLM = workflowData.value.nodes.find((n: any) => n.type === 'llm') as any
    const firstModel = firstLLM?.data?.node_params?.model || {}

    const payload = {
      workspace_id: workspaceStore.workspaceId,
      name: formData.value.name,
      zh_name: formData.value.zh_name || formData.value.name,
      description: formData.value.description,
      agent_type: 'workflow' as const,
      prologue: '',
      leading_question: [],
      self_prompt: '',
      model: {
        id: firstModel.id || '',
        provider: firstModel.provider || 'deepseek',
        model_name: firstModel.model_name || (firstLLM?.data?.title || ''),
        api_key: firstModel.api_key || '',
        base_url: firstModel.base_url || '',
        top_p: typeof firstModel.top_p === 'number' ? firstModel.top_p : 1,
        max_tokens: typeof firstModel.max_tokens === 'number' ? firstModel.max_tokens : 4096,
        temperature: typeof firstModel.temperature === 'number' ? firstModel.temperature : 0.7,
      },
      tool_list: [],
      rag_list: [],
      faq_list: [],
      variables: [],
      edges: edgesArr,
      nodes: nodesArr,
      agents: {},
      extra_json: {},
    }

    const { isSuccess, data } = await createAgentApi(payload)

    if (isSuccess && data) {
      window.$message.success('工作流创建成功')
      emit('confirm', data)
      hideModal()
    }
    else {
      window.$message.error('工作流创建失败')
    }
  }
  catch (error) {
    console.error('创建工作流失败:', error)
    window.$message.error('工作流创建失败')
  }
  finally {
    endLoading()
  }
}

// 处理工作流数据变化
function handleWorkflowChange(data: { nodes: Node[], edges: Edge[] }) {
  workflowData.value = data
}

// 取消
function handleCancel() {
  emit('cancel')
  hideModal()
}

// 暴露方法
defineExpose({
  openModal,
})
</script>

<template>
  <n-modal
    v-model:show="visible"
    :mask-closable="false"
    preset="card"
    class="workflow-maintain-modal"
    :bordered="false"
    :closable="false"
    :close-on-esc="false"
    :style="{ width: '100vw', height: '100vh', maxWidth: 'none', margin: '0', top: 0 }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <div class="text-lg font-semibold">
          新增工作流
        </div>
        <div class="flex items-center gap-2">
          <n-button
            type="primary"
            :loading="loading"
            @click="handleSave"
          >
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
                </svg>
              </n-icon>
            </template>
            保存
          </n-button>
          <n-button quaternary @click="handleCancel">
            <template #icon>
              <n-icon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </n-icon>
            </template>
          </n-button>
        </div>
      </div>
    </template>

    <div class="workflow-content">
      <!-- 悬浮的基本信息面板 -->
      <div class="floating-panel">
        <n-collapse v-model:expanded-names="basicInfoCollapsed" arrow-placement="right">
          <n-collapse-item name="basic">
            <template #header>
              基本信息
            </template>

            <div class="form-content">
              <n-form :model="formData" label-placement="top" size="small">
                <n-form-item label="工作流名称">
                  <n-input v-model:value="formData.name" placeholder="请输入工作流名称" />
                </n-form-item>

                <n-form-item label="工作流中文名称">
                  <n-input v-model:value="formData.zh_name" placeholder="请输入工作流中文名称" />
                </n-form-item>

                <n-form-item label="工作流描述">
                  <n-input
                    v-model:value="formData.description"
                    type="textarea"
                    placeholder="请输入工作流描述"
                    :rows="3"
                  />
                </n-form-item>
              </n-form>
            </div>
          </n-collapse-item>
        </n-collapse>
      </div>

      <!-- 主要内容区域 -->
      <div class="main-content">
        <WorkflowCanvas ref="canvasRef" v-model="workflowData" @change="handleWorkflowChange" />
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.workflow-content {
  position: relative;
  flex: 1;
  overflow: hidden;
  background: #f5f5f5;
}

/* 悬浮面板 */
.floating-panel {
  position: absolute;
  top: 10px;
  left: 10px;
  width: 300px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
  overflow: hidden;
}

.form-content {
  padding: 16px;
}

/* 主要内容区域 */
.main-content {
  height: 100%;
  overflow: hidden;
}
</style>

<style>
/* 使用全局样式来覆盖 n-modal 和 n-card 的样式 */
.workflow-maintain-modal .n-modal__content {
  height: 100vh !important;
}

.workflow-maintain-modal .n-card {
  height: 100% !important;
  display: flex !important;
  flex-direction: column !important;
}

.workflow-maintain-modal .n-card__content {
  padding: 0 !important;
  flex: 1 !important;
  display: flex !important;
  flex-direction: column !important;
  overflow: hidden !important;
  min-height: 0 !important;
}

.workflow-maintain-modal .n-card__header {
  padding: 16px 24px !important;
  border-bottom: 1px solid var(--n-divider-color) !important;
  flex-shrink: 0 !important;
}

/* 确保折叠面板的箭头在最右侧 */
.workflow-maintain-modal .floating-panel .n-collapse {
  border: none !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item {
  border: none !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item__header {
  padding: 16px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: 8px !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item__header-main {
  flex: 1 !important;
  order: 1 !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item__header-extra,
.workflow-maintain-modal .floating-panel .n-collapse-item-arrow {
  order: 999 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item__header-extra {
  display: none !important;
}

.workflow-maintain-modal .floating-panel .n-collapse-item__content-inner {
  padding: 0 !important;
}
</style>
