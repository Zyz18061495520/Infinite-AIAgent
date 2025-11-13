<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBoolean } from '@/hooks'
import { createAgentApi, getAgentApi, updateAgentApi } from '@/service/api/agent'
import { useWorkspaceStore } from '@/store/workspace'
import type { Edge, Node } from '@vue-flow/core'
import WorkflowCanvas from './components/workflow/WorkflowCanvas.vue'
import AgentReleaseManager from '@/components/custom/AgentReleaseManager.vue'
import { Regex } from '@/constants/Regex'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 获取路由参数
const agentId = computed(() => route.query.id as string)
const isEdit = computed(() => !!agentId.value)

// 基本信息折叠状态（默认展开）
const basicInfoCollapsed = ref<string[]>(['basic'])

// 表单数据
const formData = ref({
  name: '',
  zh_name: '',
  description: '',
  prologue: '',
  leading_question: [] as string[],
})

// 过滤 name 输入，只允许字母、数字、下划线和连字符
function filterNameInput(value: string) {
  return value.split('').filter(char => /^[a-zA-Z0-9_-]$/.test(char)).join('')
}

// 处理 name 输入
function handleNameInput(value: string) {
  const filtered = filterNameInput(value)
  formData.value.name = filtered
}

// 工作流画布数据
const workflowData = ref<{ nodes: Node[], edges: Edge[] }>({
  nodes: [],
  edges: [],
})

// 画布组件引用
const canvasRef = ref<InstanceType<typeof WorkflowCanvas>>()

// 预览工作流
function handlePreview() {
  if (!formData.value.name) {
    window.$message.warning('请填写工作流名称')
    return
  }
  canvasRef.value?.showPreview()
}

// 加载工作流详情
async function loadWorkflowDetail() {
  if (!agentId.value)
    return

  startLoading()
  try {
    const { isSuccess, data } = await getAgentApi(agentId.value)
    if (isSuccess && data) {
      // 填充表单数据
      formData.value.name = data.name || ''
      formData.value.zh_name = data.zh_name || ''
      formData.value.description = data.description || ''
      formData.value.prologue = data.prologue || ''
      formData.value.leading_question = Array.isArray(data.leading_question) ? data.leading_question : []

      // 生成UUID的工具函数
      function generateId(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0
          const v = c === 'x' ? r : (r & 0x3 | 0x8)
          return v.toString(16)
        })
      }

      // 加载 nodes 和 edges
      if (data.nodes) {
        const nodesArray = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes || {})
        workflowData.value.nodes = nodesArray.map((node: any) => {
          // 确保 switch 节点的分支都有 ID
          if (node.type === 'switch' && node.data?.node_params?.branches) {
            const branches = node.data.node_params.branches
            if (Array.isArray(branches)) {
              branches.forEach((branch: any) => {
                if (!branch.id) {
                  branch.id = generateId()
                }
              })
            }
          }
          return {
            id: node.id,
            type: node.type,
            position: node.position || { x: 0, y: 0 },
            data: node.data || {},
            label: node.label || node.title || node.data?.name || '',
          }
        })
      }

      if (data.edges) {
        const edgesArray = Array.isArray(data.edges) ? data.edges : Object.values(data.edges || {})

        // 构建节点映射，用于查找意图识别节点
        const nodeMapForLoad: Record<string, any> = {}
        workflowData.value.nodes.forEach((node: any) => {
          nodeMapForLoad[node.id] = node
          // 如果是意图识别节点，同时建立意图类型ID到节点ID的映射
          if (node.type === 'purpose' && node.data?.node_params?.categories) {
            const categories = node.data.node_params.categories
            if (Array.isArray(categories)) {
              categories.forEach((cat: any) => {
                if (cat.id) {
                  nodeMapForLoad[cat.id] = node
                }
              })
            }
          }
        })

        workflowData.value.edges = edgesArray.map((edge: any) => {
          let finalSource = edge.source
          // 对于意图识别节点和条件节点，sourceHandle 可能是意图类型ID或分支ID
          // 对于其他节点，sourceHandle 可能是 'null' 字符串，需要转换为 null
          let finalSourceHandle: string | null = null
          
          // 如果 sourceHandle 存在且不是 'null' 字符串，直接使用
          if (edge.sourceHandle && edge.sourceHandle !== 'null') {
            finalSourceHandle = edge.sourceHandle
          }

          // 首先检查 source 是否直接是节点ID
          const directNode = workflowData.value.nodes.find((n: any) => n.id === edge.source)

          if (directNode) {
            // source 是节点ID
            if (directNode.type === 'purpose') {
              // 如果是意图识别节点，sourceHandle 应该是意图类型ID
              // 如果 sourceHandle 为空，尝试从 edge ID 中解析
              if (!finalSourceHandle && edge.id && edge.id.startsWith(`${edge.source}-`)) {
                // 从 edge ID 中提取意图类型ID
                // 格式：${source}-${sourceHandle}-${target}-null
                const remainingId = edge.id.substring(edge.source.length + 1) // 跳过 source 和 '-'
                // 查找第一个匹配的意图类型ID（完整的UUID格式）
                const categories = directNode.data?.node_params?.categories
                if (Array.isArray(categories)) {
                  for (const category of categories) {
                    if (category.id && remainingId.startsWith(`${category.id}-`)) {
                      finalSourceHandle = category.id
                      break
                    }
                  }
                }
              }
              // 验证 finalSourceHandle 是否在节点的意图类型列表中
              if (finalSourceHandle) {
                const categories = directNode.data?.node_params?.categories
                if (Array.isArray(categories)) {
                  const isValid = categories.some((cat: any) => cat.id === finalSourceHandle)
                  if (!isValid) {
                    // 如果 sourceHandle 不在意图类型列表中，重置为 null
                    finalSourceHandle = null
                  }
                }
              }
            }
            else if (directNode.type === 'switch') {
              // 如果是条件节点，sourceHandle 应该是分支ID
              // 如果 sourceHandle 为空，尝试从 edge ID 中解析
              if (!finalSourceHandle && edge.id && edge.id.startsWith(`${edge.source}-`)) {
                // 从 edge ID 中提取分支ID
                // 格式：${source}-${sourceHandle}-${target}-null
                const remainingId = edge.id.substring(edge.source.length + 1) // 跳过 source 和 '-'
                // 查找第一个匹配的分支ID（完整的UUID格式）
                const branches = directNode.data?.node_params?.branches
                if (Array.isArray(branches)) {
                  for (const branch of branches) {
                    if (branch.id && remainingId.startsWith(`${branch.id}-`)) {
                      finalSourceHandle = branch.id
                      break
                    }
                  }
                }
              }
              // 验证 finalSourceHandle 是否在节点的分支列表中
              if (finalSourceHandle) {
                const branches = directNode.data?.node_params?.branches
                if (Array.isArray(branches)) {
                  const isValid = branches.some((branch: any) => branch.id === finalSourceHandle)
                  if (!isValid) {
                    // 如果 sourceHandle 不在分支列表中，重置为 null
                    finalSourceHandle = null
                  }
                }
              }
            }
            else {
              // 对于其他节点类型，sourceHandle 应该是 null
              finalSourceHandle = null
            }
          }
          else {
            // source 不是节点ID，可能是意图类型ID（旧数据格式，保存时被转换的）
            // 需要在所有意图识别节点中查找包含该意图类型ID的节点
            for (const node of workflowData.value.nodes) {
              if ((node as any).type === 'purpose' && (node as any).data?.node_params?.categories) {
                const categories = (node as any).data.node_params.categories
                const foundCategory = categories.find((cat: any) => cat.id === edge.source)
                if (foundCategory) {
                  // 找到了对应的意图识别节点
                  // source 转换为节点ID，sourceHandle 设置为意图类型ID
                  finalSource = (node as any).id
                  finalSourceHandle = foundCategory.id
                  break
                }
              }
            }
          }

          return {
            id: edge.id,
            source: finalSource,
            target: edge.target,
            // 将字符串 "null" 或空值转换为 null，确保 handle 正确处理
            // 对于意图识别节点和条件节点，sourceHandle 应该保持为意图类型ID或分支ID
            sourceHandle: finalSourceHandle,
            targetHandle: edge.targetHandle === 'null' || !edge.targetHandle ? null : edge.targetHandle,
            type: edge.type || 'default',
            data: edge.data || {},
            label: edge.label || '',
          }
        })
      }

      // 等待节点渲染完成后，更新节点内部状态（特别是意图识别节点和条件节点的动态连接点）
      await nextTick()
      // 多次调用 updateNodeInternals，确保动态连接点位置计算完成
      // 第一次：等待 DOM 渲染完成
      setTimeout(() => {
        canvasRef.value?.updateNodeInternals?.()
      }, 150)
      // 第二次：等待位置计算完成（PurposeNode 和 SwitchNode 内部的位置计算是异步的）
      setTimeout(() => {
        canvasRef.value?.updateNodeInternals?.()
      }, 300)
      // 第三次：最终确保所有连接点位置正确
      setTimeout(() => {
        canvasRef.value?.updateNodeInternals?.()
      }, 500)
    }
  }
  catch {
    window.$message.error('加载工作流详情失败')
  }
  finally {
    endLoading()
  }
}

// 统一保存方法：用于“保存”与“预览调试前保存”
async function saveWorkflow() {
  if (!formData.value.name) {
    throw new Error('请填写工作流名称')
  }

  if (!workspaceStore.workspaceId) {
    throw new Error('请先选择工作空间')
  }

  // 仅保留有效节点类型，过滤掉连接线等临时元素（type === 'default' 等）
  const validNodeTypes = new Set(['start', 'llm', 'http', 'sql', 'rag', 'faq', 'code', 'purpose', 'switch', 'end'])

  // 构建节点映射，用于查找节点类型
  const nodeMapForEdges: Record<string, any> = {}
  workflowData.value.nodes.forEach((node: any) => {
    nodeMapForEdges[node.id] = node
  })

  // 先转换边为数组
  // 对于意图识别节点，保持 source 为节点ID，sourceHandle 为意图类型ID
  // 对于条件节点，保持 source 为节点ID，sourceHandle 为分支ID
  // 对于其他节点，handle 统一设置为字符串 'null'
  const edgesArr = workflowData.value.edges.map((edge) => {
    const sourceNode = nodeMapForEdges[edge.source]
    const isPurposeNode = sourceNode?.type === 'purpose'
    const isSwitchNode = sourceNode?.type === 'switch'

    return {
      id: edge.id,
      source: edge.source, // 保持为节点ID
      target: edge.target,
      // 对于意图识别节点，sourceHandle 应该保持为意图类型ID
      // 对于条件节点，sourceHandle 应该保持为分支ID
      // 对于其他节点，设置为 'null'
      sourceHandle: (isPurposeNode || isSwitchNode) && (edge as any).sourceHandle ? (edge as any).sourceHandle : 'null',
      targetHandle: 'null',
      data: (edge as any).data || {},
    }
  })

  // 为所有节点补齐引用：按目标节点找第一条入边的 source
  const targetIdToFirstSourceId: Record<string, string> = {}
  edgesArr.forEach((e) => {
    if (!targetIdToFirstSourceId[e.target])
      targetIdToFirstSourceId[e.target] = e.source || ''
  })

  // 构建节点映射，用于查找节点和其输出参数
  const nodeMap: Record<string, any> = {}
  workflowData.value.nodes.forEach((node: any) => {
    if (validNodeTypes.has(node.type)) {
      nodeMap[node.id] = node
    }
  })

  // 工具函数：递归规范化参数（inputs/outputs），修正 reference 值为 [sourceNodeId, variable]
  function normalizeParams(params: any[], sourceNodeId: string | undefined, currentNodeId?: string) {
    if (!Array.isArray(params))
      return params
    return params.map((p: any) => {
      const next: any = { ...p }
      if (next?.type === 'reference') {
        const val = next.value
        if (!Array.isArray(val)) {
          // 如果是字符串，需要找到对应的节点ID
          if (sourceNodeId) {
            // 对于 inputs，直接使用传入的 sourceNodeId
            next.value = [sourceNodeId, val]
          }
          else if (currentNodeId) {
            // 对于 outputs，需要查找连接到当前节点的源节点
            // 找到所有指向当前节点的边
            const incomingEdges = edgesArr.filter(e => e.target === currentNodeId)
            // 尝试从这些源节点中找到对应的输出参数
            let foundNodeId = ''
            for (const edge of incomingEdges) {
              const sourceNode = nodeMap[edge.source]
              if (sourceNode) {
                // 检查 start 节点的隐式 question 输出
                if (sourceNode.type === 'start' && val === 'question') {
                  foundNodeId = edge.source
                  break
                }
                // 检查源节点的 outputs
                if (sourceNode.data?.outputs && Array.isArray(sourceNode.data.outputs)) {
                  const hasOutput = sourceNode.data.outputs.some((output: any) => output.variable === val)
                  if (hasOutput) {
                    foundNodeId = edge.source
                    break
                  }
                }
              }
            }
            next.value = foundNodeId ? [foundNodeId, val] : ['', val]
          }
          else {
            next.value = ['', val]
          }
        }
      }
      if (Array.isArray(next.children) && next.children.length > 0) {
        next.children = normalizeParams(next.children, sourceNodeId, currentNodeId)
      }
      return next
    })
  }

  // 节点数据规范化：确保 data.title、label、title 三者一致；修正 reference 值（inputs/outputs），确保 desc 字段正确
  const nodesArr = workflowData.value.nodes
    .filter(node => validNodeTypes.has((node as any).type as string))
    .map((node) => {
      const rawData: any = (node as any).data || {}
      const normalizedData: any = {
        ...rawData,
      }

      // 统一节点标题：优先 data.title，其次节点现有 label
      const nodeTitle = (normalizedData.name ?? (node as any).label) || ''
      normalizedData.name = nodeTitle

      // 移除 data 内部的 title 与 label 字段
      if (Object.prototype.hasOwnProperty.call(normalizedData, 'title'))
        delete normalizedData.title
      if (Object.prototype.hasOwnProperty.call(normalizedData, 'label'))
        delete normalizedData.label

      // 确保节点描述字段是 desc，不是 description
      // 如果存在 description 字段，将其值赋给 desc，然后删除 description
      if (normalizedData.description !== undefined) {
        if (normalizedData.desc === undefined) {
          normalizedData.desc = normalizedData.description
        }
        delete normalizedData.description
      }

      // 修正 inputs 中的 reference 值
      const incomingSourceId = targetIdToFirstSourceId[(node as any).id]
      if (Array.isArray(normalizedData.inputs)) {
        normalizedData.inputs = normalizeParams(normalizedData.inputs, incomingSourceId, (node as any).id)
      }

      // 修正 outputs 中的 reference 值（结束节点常用）
      // 注意：对于 outputs，需要查找连接到当前节点的源节点，所以传入 undefined 作为 sourceNodeId
      if (Array.isArray(normalizedData.outputs)) {
        normalizedData.outputs = normalizeParams(normalizedData.outputs, undefined, (node as any).id)
      }

      return {
        id: (node as any).id,
        type: (node as any).type,
        position: node.position,
        data: normalizedData,
        // 顶层同时包含 label 与 title，且与 data.name 一致
        label: nodeTitle,
        title: nodeTitle,
      }
    })

  // 选择第一个LLM作为默认模型
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
      model_name: firstModel.model_name || (firstLLM?.data?.name || ''),
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

  const { isSuccess, data } = isEdit.value
    ? await updateAgentApi(agentId.value, payload)
    : await createAgentApi(payload)
  if (!isSuccess) {
    throw new Error(isEdit.value ? '更新失败' : '保存失败')
  }

  return data
}

// 点击右上角保存
async function handleSave() {
  if (!formData.value.name) {
    window.$message.warning('请填写工作流名称')
    return
  }

  try {
    startLoading()
    const data = await saveWorkflow()
    if (data) {
      window.$message.success(isEdit.value ? '工作流更新成功' : '工作流创建成功')

      if (isEdit.value) {
        // 编辑模式：停留在当前页面
        // 不需要做任何跳转
      }
      else {
        // 新增模式：跳转到编辑页面
        if (data.id) {
          router.replace(`/workflow/edit?id=${data.id}`)
        }
        else {
          // 如果API没有返回ID，返回上一页
          router.back()
        }
      }
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

function handleWorkflowChange(data: { nodes: Node[], edges: Edge[] }) {
  workflowData.value = data
}

function goBack() {
  // 判断是否在页面栈顶
  // 如果是新打开的窗口（history.length <= 1），重定向到智能体列表
  // 否则正常返回上一页
  if (window.history.length <= 1) {
    router.replace('/agent')
  }
  else {
    router.back()
  }
}

onMounted(async () => {
  // 确保工作空间加载
  if (workspaceStore.workspaces.length === 0) {
    await workspaceStore.getWorkspaces()
  }

  // 如果是编辑模式，加载工作流详情
  if (isEdit.value) {
    await loadWorkflowDetail()
  }
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部工具栏 -->
    <div class="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200 relative z-10">
      <div class="flex items-center gap-4">
        <n-button quaternary @click="goBack">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </n-icon>
          </template>
          返回
        </n-button>
        <div class="text-lg font-semibold">
          {{ isEdit ? '编辑工作流' : '新增工作流' }}
        </div>
      </div>
      <div class="flex items-center gap-2">
        <AgentReleaseManager :agent-id="agentId as any" />
        <n-button @click="handlePreview">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
            </n-icon>
          </template>
          预览
        </n-button>
        <n-button type="primary" :loading="loading" @click="handleSave">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z" />
              </svg>
            </n-icon>
          </template>
          保存
        </n-button>
      </div>
    </div>

    <!-- 页面主体 -->
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
                  <n-input
                    :value="formData.name"
                    placeholder="请输入工作流名称（仅支持字母、数字、下划线和连字符）"
                    @update:value="handleNameInput"
                  />
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
        <WorkflowCanvas
          ref="canvasRef"
          v-model="workflowData"
          :workflow-form-data="formData"
          :on-save="saveWorkflow"
          @change="handleWorkflowChange"
        />
      </div>
    </div>
  </div>
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

/* 折叠面板header样式调整 */
/* 确保折叠面板的箭头在最右侧 */
.floating-panel :deep(.n-collapse) {
  border: none !important;
}

.floating-panel :deep(.n-collapse-item) {
  border: none !important;
}

.floating-panel :deep(.n-collapse-item__header) {
  padding: 16px !important;
  font-size: 15px !important;
  font-weight: 600 !important;
  display: flex !important;
  flex-direction: row !important;
  justify-content: flex-start !important;
  align-items: center !important;
  gap: 8px !important;
}

.floating-panel :deep(.n-collapse-item__header-main) {
  flex: 1 !important;
  order: 1 !important;
}

.floating-panel :deep(.n-collapse-item__header-extra),
.floating-panel :deep(.n-collapse-item-arrow) {
  order: 999 !important;
  margin-left: auto !important;
  flex-shrink: 0 !important;
}

.floating-panel :deep(.n-collapse-item__header-extra) {
  display: none !important;
}

.floating-panel :deep(.n-collapse-item__content-inner) {
  padding: 0 !important;
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
