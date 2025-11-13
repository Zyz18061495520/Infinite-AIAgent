<script setup lang="ts">
import { computed, h, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useBoolean } from '@/hooks'
import { useWorkspaceStore } from '@/store/workspace'
import { getModelsApi } from '@/service/api/model'
import { getToolsPageApi } from '@/service/api/tool'
import { getRagListApi } from '@/service/api/rag'
import { getFaqCollectionsApi } from '@/service/api/faq'
import { createAgentApi, debugAgentApi, getAgentApi, updateAgentApi } from '@/service/api/agent'
import type { DebugData } from '@/utils/sse'
import { handleSSEStream } from '@/utils/sse'
import MarkDownEditor from '@/components/custom/Editor/MarkDownEditor/index.vue'
import ToolSelectionModal from './components/ToolSelectionModal.vue'
import RagSelectionModal from './components/RagSelectionModal.vue'
import FaqSelectionModal from './components/FaqSelectionModal.vue'
import McpSelectionModal from './components/McpSelectionModal.vue'
import WorkflowSelectionModal from './components/WorkflowSelectionModal.vue'
import PromptTemplateSelectionModal from './components/PromptTemplateSelectionModal.vue'
import DebugDataDisplay from './components/DebugDataDisplay.vue'
import PreviewDebug from './components/PreviewDebug.vue'
import AgentReleaseManager from '@/components/custom/AgentReleaseManager.vue'
import SupervisorOrgChart from './components/SupervisorOrgChart.vue'
import { modelProviderOptions } from '@/constants/model'
import { Regex } from '@/constants/Regex'

const router = useRouter()
const workspaceStore = useWorkspaceStore()
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 获取路由参数
const route = useRoute()
const agentId = computed(() => route.query.id as string)
const agentType = computed(() => route.query.type as string)
const isEdit = computed(() => !!agentId.value)
const isFromTypeSelection = computed(() => !!agentType.value)
const isAgentTypeDisabled = computed(() => isEdit.value || isFromTypeSelection.value)

// 表单数据
const formData = ref({
  name: '',
  zh_name: '',
  description: '',
  agent_type: 'single' as 'single' | 'workflow' | 'supervisor',
  prologue: '',
  leading_question: [] as string[],
  self_prompt: '',
  run_mode: 'react' as 'react' | 'plan_execute',
  model: {
    id: '',
    provider: 'deepseek' as 'deepseek' | 'openai' | 'qwen' | 'ollama',
    model_name: '',
    api_key: '',
    base_url: '',
    top_p: 1,
    max_tokens: 4096,
    temperature: 0.7,
  },
  tool_list: [] as any[],
  rag_list: [] as any[],
  faq_list: [] as any[],
  mcp_list: [] as any[],
  workflow_list: [] as any[],
  variables: [] as Array<{ name: string, description: string, value: string }>,
  edges: {},
  nodes: {},
  agents: {},
  extra_json: {},
})

// 过滤 name 输入，只允许字母、数字、下划线和连字符
// 使用 Regex.ParamName 的字符集规则：^[a-zA-Z0-9_-]+$
function filterNameInput(value: string) {
  return value.split('').filter(char => /^[a-zA-Z0-9_-]$/.test(char)).join('')
}

// 处理 name 输入
function handleNameInput(value: string) {
  const filtered = filterNameInput(value)
  formData.value.name = filtered
}

// 模型列表
const models = ref<Entity.Model[]>([])
const selectedModel = ref<Entity.Model | null>(null)
const selectedModelId = ref<string>('')

// 工具、RAG、FAQ列表
const tools = ref<Entity.Tool[]>([])
const rags = ref<any[]>([])
const faqs = ref<any[]>([])

// 弹窗引用
const toolModalRef = ref<InstanceType<typeof ToolSelectionModal> | null>(null)
const ragModalRef = ref<InstanceType<typeof RagSelectionModal> | null>(null)
const faqModalRef = ref<InstanceType<typeof FaqSelectionModal> | null>(null)
const mcpModalRef = ref<InstanceType<typeof McpSelectionModal> | null>(null)
const workflowModalRef = ref<InstanceType<typeof WorkflowSelectionModal> | null>(null)
const promptTemplateModalRef = ref<InstanceType<typeof PromptTemplateSelectionModal> | null>(null)

// 多智能体的子智能体列表
const selectedAgents = ref<Array<{
  id: string
  name: string
  zh_name: string
  description?: string
  agent_type?: string
}>>([])

// 渲染智能体类型图标
function renderAgentTypeIcon(iconType: string) {
  const iconMap = {
    single: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="singleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#singleGradient)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#singleGradient)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <circle cx="50" cy="50" r="12" fill="url(#singleGradient)"/>
        <circle cx="45" cy="45" r="2" fill="white"/>
        <circle cx="55" cy="45" r="2" fill="white"/>
        <circle cx="45" cy="55" r="2" fill="white"/>
        <circle cx="55" cy="55" r="2" fill="white"/>
        <circle cx="50" cy="50" r="2" fill="white"/>
        <line x1="45" y1="45" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="55" y1="45" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="45" y1="55" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="55" y1="55" x2="50" y2="50" stroke="white" stroke-width="1"/>
      </svg>
    `,
    workflow: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="workflowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#workflowGradient)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#workflowGradient)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <rect x="35" y="40" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <rect x="50" y="40" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <rect x="42" y="55" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <path d="M47 44 L50 44 L48 42 L48 46 Z" fill="url(#workflowGradient)"/>
        <path d="M56 48 L56 52 L58 50 L54 50 Z" fill="url(#workflowGradient)"/>
        <path d="M48 58 L45 58 L47 56 L47 60 Z" fill="url(#workflowGradient)"/>
      </svg>
    `,
    supervisor: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="supervisorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#supervisorGradient)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#supervisorGradient)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <rect x="45" y="45" width="10" height="10" rx="2" fill="url(#supervisorGradient)"/>
        <rect x="35" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="59" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="35" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="59" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <line x1="50" y1="50" x2="38" y2="38" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="38" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="38" y2="62" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="62" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
      </svg>
    `,
  }
  return iconMap[iconType as keyof typeof iconMap] || iconMap.single
}

// 智能体类型选项
const agentTypeOptions: Array<{
  label: string
  value: string
  icon: () => any
}> = [
  {
    label: '单智能体',
    value: 'single',
    icon: () => h('div', {
      innerHTML: renderAgentTypeIcon('single'),
      style: 'width: 20px; height: 20px; display: inline-block; margin-right: 8px;',
    }),
  },
  {
    label: '工作流',
    value: 'workflow',
    icon: () => h('div', {
      innerHTML: renderAgentTypeIcon('workflow'),
      style: 'width: 20px; height: 20px; display: inline-block; margin-right: 8px;',
    }),
  },
  {
    label: '多智能体',
    value: 'supervisor',
    icon: () => h('div', {
      innerHTML: renderAgentTypeIcon('supervisor'),
      style: 'width: 20px; height: 20px; display: inline-block; margin-right: 8px;',
    }),
  },
]

// 计算属性
const workspaceId = computed(() => workspaceStore.workspaceId)

// 多智能体模式下的分割面板比例
const isSupervisor = computed(() => formData.value.agent_type === 'supervisor')
// 左侧面板：多智能体模式下使用最小值 0.25（等于min），其他模式使用默认值 0.33
const leftSplitSize = computed(() => isSupervisor.value ? 0.25 : 0.33)
// 中间 vs 右侧面板：多智能体模式下中间使用最大值 0.7（等于max），其他模式使用默认值 0.5
const middleSplitSize = computed(() => isSupervisor.value ? 0.7 : 0.5)

// 图标路径转换函数
function toIcon(path?: string) {
  return path || ''
}

// 获取供应商图标路径
function getProviderIconPath(provider: string) {
  const providerOption = modelProviderOptions.find(opt => opt.value === provider)
  return providerOption?.icon || ''
}

// 监听工作空间变化
watch(() => workspaceStore.workspaceId, (newWorkspaceId) => {
  if (newWorkspaceId) {
    // 工作空间已更新
  }
}, { immediate: true })

// 监听模型列表变化，同步选中的模型对象
watch(() => models.value, (newModels) => {
  if (newModels.length > 0 && selectedModelId.value && !selectedModel.value) {
    const model = newModels.find(m => m.id === selectedModelId.value)
    if (model) {
      selectedModel.value = model
    }
    else {
      // 当前选择的模型在可选列表中不存在（可能被删除），清空选择，显示占位
      selectedModel.value = null
      selectedModelId.value = ''
    }
  }
}, { immediate: true })

// 加载智能体详情
async function loadAgentDetail() {
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
      formData.value.agent_type = data.agent_type || 'single'
      formData.value.prologue = data.prologue || ''
      formData.value.leading_question = data.leading_question || []
      formData.value.self_prompt = data.self_prompt || ''
      formData.value.run_mode = data.run_mode || 'react'

      // 填充模型信息
      if (data.model) {
        formData.value.model.id = data.model.id || ''
        formData.value.model.provider = data.model.provider || 'deepseek'
        formData.value.model.model_name = data.model.model_name || ''
        formData.value.model.api_key = data.model.api_key || ''
        formData.value.model.base_url = data.model.base_url || ''
        formData.value.model.top_p = data.model.top_p || 1
        formData.value.model.max_tokens = data.model.max_tokens || 4096
        formData.value.model.temperature = data.model.temperature || 0.7

        // 设置选中的模型
        if (data.model.id) {
          selectedModelId.value = data.model.id
          // 立即查找并设置选中的模型对象
          const model = models.value.find(m => m.id === data.model.id)
          if (model) {
            selectedModel.value = model
          }
          else {
            // 该模型已不在可选项中，清空选择，避免显示原始 id 字符串
            selectedModel.value = null
            selectedModelId.value = ''
          }
        }
      }

      // 填充工具、RAG、FAQ列表
      if (data.tool_list) {
        // 解析工具列表（HTTP和SQL类型）
        const toolItems = data.tool_list.filter((item: any) => {
          // 支持多种可能的type字段名
          const itemType = item.type || item.toolType || item.tool_type
          return itemType === 'http' || itemType === 'sql'
        })

        formData.value.tool_list = toolItems.map((item: any) => {
          const itemType = item.type || item.toolType || item.tool_type
          return {
            id: item.id,
            name: item.name || item.question || '', // 支持多种name字段
            description: item.description || item.answer || '',
            toolType: itemType,
            inputParams: item.input_params || item.inputParams || [],
            config: item.config || {},
            interrupt_before: item.interrupt_before === true,
          }
        })

        // 解析RAG列表
        const ragItems = data.tool_list.filter((item: any) => item.type === 'rag')
        formData.value.rag_list = ragItems.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          uploadIds: item.config?.uploadIds || [],
        }))

        // 解析FAQ集合列表
        const faqItems = data.tool_list.filter((item: any) => {
          const itemType = item.type || item.toolType || item.tool_type
          return itemType === 'faq'
        })

        formData.value.faq_list = faqItems.map((item: any) => ({
          id: item.id,
          name: item.name || '', // 集合的name字段
          collectionName: item.description || '', // 集合的描述字段
          userId: item.userId || '',
          workspaceId: item.workspaceId || '',
          createTime: item.createTime || Date.now(),
          updateTime: item.updateTime || Date.now(),
        }))

        // 解析工作流列表
        const workflowItems = data.tool_list.filter((item: any) => {
          const itemType = item.type || item.toolType || item.tool_type
          return itemType === 'workflow'
        })

        formData.value.workflow_list = workflowItems.map((item: any) => {
          // 如果 config 中包含完整的工作流对象（有 id 和 name），使用它
          // 否则使用基本字段构建工作流对象
          const isFullWorkflowObject = item.config
            && typeof item.config === 'object'
            && item.config.id
            && item.config.name
            && !item.config.workflow_id // 确保不是旧的格式

          const workflowObj = isFullWorkflowObject
            ? item.config
            : {
                id: item.id || item.config?.workflow_id || '',
                name: item.name || '',
                description: item.description || '',
                agent_type: 'workflow',
                model: item.model || {},
                create_time: item.create_time || '',
                is_publish: item.is_publish || false,
              }
          return workflowObj
        })
      }

      // 解析MCP列表（从extra_json中获取）
      if (data.extra_json && data.extra_json.mcp_server) {
        formData.value.mcp_list = data.extra_json.mcp_server.map((mcp: any) => ({
          id: mcp.id || '',
          name: mcp.name || '',
          description: mcp.description || '',
          url: mcp.url || '',
          type: mcp.type || '',
          authorization: mcp.authorization || '',
        }))
      }
      else {
        formData.value.mcp_list = []
      }

      // 填充变量列表
      if (data.variables) {
        formData.value.variables = data.variables
      }
      else {
        formData.value.variables = []
      }

      // 填充多智能体的子智能体列表
      if (data.agents && typeof data.agents === 'object') {
        // agents 可能是一个对象，需要转换为数组
        const agentsObj = data.agents
        selectedAgents.value = Object.values(agentsObj).map((agent: any) => ({
          id: agent.id || '',
          name: agent.name || '',
          zh_name: agent.zh_name || '',
          description: agent.description || '',
          agent_type: agent.agent_type || 'single',
        }))
      }
      else if (Array.isArray(data.agents)) {
        selectedAgents.value = data.agents.map((agent: any) => ({
          id: agent.id || '',
          name: agent.name || '',
          zh_name: agent.zh_name || '',
          description: agent.description || '',
          agent_type: agent.agent_type || 'single',
        }))
      }
      else {
        selectedAgents.value = []
      }
    }
  }
  catch {
    window.$message.error('加载智能体详情失败')
  }
  finally {
    endLoading()
  }
}

// 加载模型列表
async function loadModels() {
  try {
    const { isSuccess, data } = await getModelsApi({ enabled: true })
    if (isSuccess && data) {
      models.value = data
    }
  }
  catch {
    // 加载模型失败
  }
}

// 加载工具列表
async function loadTools() {
  try {
    const { isSuccess, data } = await getToolsPageApi({
      isPublish: true,
      pageNum: 1,
      pageSize: 100,
    })
    if (isSuccess && data) {
      tools.value = data.list || []
    }
  }
  catch {
    // 加载工具失败
  }
}

// 加载RAG列表
async function loadRags() {
  try {
    const { isSuccess, data } = await getRagListApi({
      page_num: 1,
      page_size: 100,
    })
    if (isSuccess && data) {
      rags.value = data.list || []
    }
  }
  catch {
    // 加载RAG失败
  }
}

// 加载FAQ列表
async function loadFaqs() {
  try {
    const { isSuccess, data } = await getFaqCollectionsApi()
    if (isSuccess && data) {
      faqs.value = data
    }
  }
  catch {
    // 加载FAQ失败
  }
}

// 选择模型
function selectModel(model: Entity.Model) {
  selectedModel.value = model
  selectedModelId.value = model.id || ''
  formData.value.model = {
    id: model.id || '',
    provider: model.provider,
    model_name: model.modelName,
    api_key: model.apiKey,
    base_url: model.baseUrl,
    top_p: model.topP,
    max_tokens: model.maxTokens,
    temperature: model.temperature,
  }
}

// 打开工具选择弹窗
function openToolSelection() {
  // 从已加载的工具列表中查找匹配的工具对象
  const selectedTools = formData.value.tool_list.map((tool) => {
    const fullTool = tools.value.find(t => t.id === tool.id)
    return fullTool || tool // 如果找不到完整工具对象，使用解析的工具数据
  })
  toolModalRef.value?.openModal([], selectedTools)
}

// 打开RAG选择弹窗
function openRagSelection() {
  ;(ragModalRef.value as any)?.openModal([], formData.value.rag_list)
}

// 打开FAQ选择弹窗（按集合选择）
function openFaqSelection() {
  const selectedCollections = formData.value.faq_list.map((col: any) => ({
    id: col.id,
    name: col.name || '',
    collectionName: col.collectionName || col.description || '',
    userId: col.userId || '',
    workspaceId: col.workspaceId || '',
    createTime: col.createTime || Date.now(),
    updateTime: col.updateTime || Date.now(),
  }))
  ;(faqModalRef.value as any)?.openModal([], selectedCollections)
}

// 打开MCP选择弹窗
function openMcpSelection() {
  ;(mcpModalRef.value as any)?.openModal([], formData.value.mcp_list)
}

// 打开工作流选择弹窗
function openWorkflowSelection() {
  ;(workflowModalRef.value as any)?.openModal(formData.value.workflow_list)
}

// 打开提示词模板选择弹窗
function openPromptTemplateSelection() {
  promptTemplateModalRef.value?.openModal()
}

// 处理提示词模板选择结果
function handlePromptTemplateSelection(content: string) {
  formData.value.self_prompt = content
}

// 处理工具选择结果
function handleToolSelection(selectedTools: any[]) {
  // 确保每个工具都有 interrupt_before 属性，默认为 false，只有明确为 true 时才为 true
  formData.value.tool_list = selectedTools.map(tool => ({
    ...tool,
    interrupt_before: tool.interrupt_before === true,
  }))
}

// 处理RAG选择结果
function handleRagSelection(selectedRags: any[]) {
  formData.value.rag_list = selectedRags
}

// 处理FAQ集合选择结果
function handleFaqSelection(selectedCollections: any[]) {
  formData.value.faq_list = selectedCollections
}

// 处理MCP选择结果
function handleMcpSelection(selectedMcps: any[]) {
  formData.value.mcp_list = selectedMcps
}

// 处理工作流选择结果
function handleWorkflowSelection(selectedWorkflows: any[]) {
  formData.value.workflow_list = selectedWorkflows
}

// 移除工具
function removeTool(index: number) {
  formData.value.tool_list.splice(index, 1)
}

// 移除RAG
function removeRag(index: number) {
  formData.value.rag_list.splice(index, 1)
}

// 移除FAQ
function removeFaq(index: number) {
  formData.value.faq_list.splice(index, 1)
}

// 移除MCP
function removeMcp(index: number) {
  formData.value.mcp_list.splice(index, 1)
}

// 移除工作流
function removeWorkflow(index: number) {
  formData.value.workflow_list.splice(index, 1)
}

// 创建新变量
function createVariable() {
  return {
    name: '',
    description: '',
    value: '',
  }
}

// 保存智能体用于调试（不跳转页面）
async function saveAgentForDebug() {
  if (!workspaceId.value) {
    throw new Error('请先选择工作空间')
  }

  if (!formData.value.name.trim()) {
    throw new Error('请输入智能体名称')
  }

  if (!formData.value.zh_name.trim()) {
    throw new Error('请输入智能体中文名称')
  }

  if (!selectedModel.value) {
    throw new Error('请选择模型')
  }

  // 构建extra_json，包含MCP服务器信息
  const extraJson = {
    mcp_server: formData.value.mcp_list.map(mcp => ({
      id: mcp.id,
      authorization: mcp.authorization || '',
      description: mcp.description || '',
      name: mcp.name || '',
      type: mcp.type || '',
      url: mcp.url || '',
    })),
  }

  const payload = {
    workspace_id: workspaceId.value,
    name: formData.value.name,
    zh_name: formData.value.zh_name,
    description: formData.value.description,
    agent_type: formData.value.agent_type,
    prologue: formData.value.prologue,
    leading_question: formData.value.leading_question,
    self_prompt: formData.value.self_prompt,
    model: {
      id: selectedModel.value?.id || '',
      provider: formData.value.model.provider,
      name: selectedModel.value?.name || '',
      model_name: selectedModel.value?.modelName || '',
      api_key: formData.value.model.api_key,
      base_url: formData.value.model.base_url,
      top_p: formData.value.model.top_p,
      max_tokens: formData.value.model.max_tokens,
      temperature: formData.value.model.temperature,
    },
    tool_list: buildToolList(),
    rag_list: [],
    faq_list: [],
    variables: formData.value.variables,
    edges: {},
    nodes: {},
    agents: formData.value.agent_type === 'supervisor'
      ? await Promise.all(selectedAgents.value.map(async (agent: any) => {
          // 如果 agent 对象已经有完整的字段（如 model），直接返回
          // 否则通过 API 获取完整的智能体详情
          if ((agent as any).model || (agent as any).tool_list !== undefined) {
            return agent
          }
          try {
            const { isSuccess, data } = await getAgentApi(agent.id)
            if (isSuccess && data) {
              return data
            }
            return agent
          }
          catch {
            return agent
          }
        }))
      : [],
    extra_json: extraJson,
  }

  const { isSuccess, data } = isEdit.value
    ? await updateAgentApi(agentId.value, payload)
    : await createAgentApi(payload)

  if (!isSuccess) {
    throw new Error(isEdit.value ? '更新失败' : '保存失败')
  }

  return data
}

// 构建工具列表
function buildToolList() {
  const toolList: any[] = []

  // 添加选择的工具
  formData.value.tool_list.forEach((tool) => {
    toolList.push({
      id: tool.id,
      name: tool.name,
      description: tool.description,
      type: tool.toolType,
      return_direct: true,
      interrupt_before: tool.interrupt_before === true,
      input_params: tool.inputParams || [],
      config: tool.config || {},
    })
  })

  // 添加选择的RAG
  formData.value.rag_list.forEach((rag) => {
    // 获取uploadId，支持多种字段名：uploadId、upload_id（单个值）或uploadIds、upload_ids（数组）
    const getUploadId = () => {
      const single = rag?.uploadId || rag?.upload_id
      if (single) {
        // 如果是单个值，直接返回数组格式
        return [String(single)]
      }
      // 如果是数组，取第一个元素
      if (Array.isArray(rag?.uploadIds) && rag.uploadIds.length > 0) {
        return [String(rag.uploadIds[0])]
      }
      if (Array.isArray(rag?.upload_ids) && rag.upload_ids.length > 0) {
        return [String(rag.upload_ids[0])]
      }
      return []
    }

    toolList.push({
      id: rag.id,
      name: rag.name,
      description: rag.description,
      type: 'rag',
      return_direct: true,
      interrupt_before: false,
      input_params: [
        {
          name: 'query',
          location: 'body',
          type: 'string',
          description: '用户问题',
          required: false,
          children: [],
        },
      ],
      config: {
        workspace_id: workspaceId.value,
        uploadIds: getUploadId(),
        topK: 1,
        strategy: 'hybrid_search',
      },
    })
  })

  // 添加选择的FAQ集合（按集合提交）
  formData.value.faq_list.forEach((col: any) => {
    toolList.push({
      id: col.id,
      name: col.name,
      description: col.collectionName,
      type: 'faq',
      return_direct: true,
      interrupt_before: false,
      input_params: [
        {
          name: 'query',
          location: 'body',
          type: 'string',
          description: '用户问题',
          required: false,
          children: [],
        },
      ],
      config: {
        score_threshold: 0.8,
        top_k: 1,
        upload_id: [],
        collection_id: col.id,
        workspace_id: workspaceId.value,
      },
    })
  })

  // 添加选择的工作流
  formData.value.workflow_list.forEach((workflow) => {
    toolList.push({
      id: workflow.id, // 工作流的id
      return_direct: false, // 固定
      interrupt_before: false, // 固定
      input_params: [ // 固定写死这个
        {
          children: [],
          name: 'query',
          description: '用户问题',
          location: 'body',
          type: 'string',
          required: false,
        },
      ],
      name: workflow.name, // 工作流的name
      description: workflow.description || '', // 工作流的描述
      type: 'workflow',
      config: workflow, // 这里传选择的工作流的整个对象
    })
  })

  return toolList
}

// 保存智能体
async function saveAgent() {
  // 验证必填字段
  const validationErrors: string[] = []

  if (!workspaceId.value) {
    validationErrors.push('请先选择工作空间')
  }

  if (!formData.value.name.trim()) {
    validationErrors.push('请输入智能体名称')
  }

  if (!formData.value.zh_name.trim()) {
    validationErrors.push('请输入智能体中文名称')
  }

  if (!selectedModel.value) {
    validationErrors.push('请选择模型')
  }

  // 如果有验证错误，显示所有错误信息
  if (validationErrors.length > 0) {
    window.$message.error(validationErrors.join('；'))
    return
  }

  startLoading()
  try {
    // 构建extra_json，包含MCP服务器信息
    const extraJson = {
      mcp_server: formData.value.mcp_list.map(mcp => ({
        id: mcp.id,
        authorization: mcp.authorization || '',
        description: mcp.description || '',
        name: mcp.name || '',
        type: mcp.type || '',
        url: mcp.url || '',
      })),
    }

    const payload = {
      workspace_id: workspaceId.value!,
      name: formData.value.name,
      zh_name: formData.value.zh_name,
      description: formData.value.description,
      agent_type: formData.value.agent_type,
      prologue: formData.value.prologue,
      leading_question: formData.value.leading_question,
      self_prompt: formData.value.self_prompt,
      model: {
        id: selectedModel.value?.id || '',
        provider: formData.value.model.provider,
        model_name: selectedModel.value?.modelName || '',
        api_key: formData.value.model.api_key,
        base_url: formData.value.model.base_url,
        top_p: formData.value.model.top_p,
        max_tokens: formData.value.model.max_tokens,
        temperature: formData.value.model.temperature,
      },
      tool_list: buildToolList(),
      rag_list: [],
      faq_list: [],
      variables: formData.value.variables,
      edges: {},
      nodes: {},
      agents: formData.value.agent_type === 'supervisor'
        ? await Promise.all(selectedAgents.value.map(async (agent: any) => {
            // 如果 agent 对象已经有完整的字段（如 model），直接返回
            // 否则通过 API 获取完整的智能体详情
            if (agent.model || agent.tool_list !== undefined) {
              return agent
            }
            try {
              const { isSuccess, data } = await getAgentApi(agent.id)
              if (isSuccess && data) {
                return data
              }
              return agent
            }
            catch {
              return agent
            }
          }))
        : [],
      extra_json: extraJson,
    }

    const { isSuccess, data } = isEdit.value
      ? await updateAgentApi(agentId.value, payload)
      : await createAgentApi(payload)

    if (isSuccess) {
      window.$message.success(isEdit.value ? '更新成功' : '保存成功')

      if (isEdit.value) {
        // 编辑模式：停留在当前页面
        // 不需要做任何跳转
      }
      else {
        // 新增模式：跳转到编辑页面
        if (data && data.id) {
          router.replace(`/agent/edit?id=${data.id}`)
        }
        else {
          // 如果API没有返回ID，返回上一页
          router.back()
        }
      }
    }
    else {
      window.$message.error(isEdit.value ? '更新失败' : '保存失败')
    }
  }
  catch {
    window.$message.error('保存失败')
  }
  finally {
    endLoading()
  }
}

// 返回上一页
function goBack() {
  router.back()
}

// 初始化
onMounted(async () => {
  // 确保工作空间已加载
  if (workspaceStore.workspaces.length === 0) {
    await workspaceStore.getWorkspaces()
  }

  // 如果是从类型选择弹框进入，设置智能体类型
  if (isFromTypeSelection.value && agentType.value) {
    formData.value.agent_type = agentType.value as 'single' | 'workflow' | 'supervisor'
  }

  // 先加载模型列表
  await loadModels()

  // 如果是编辑模式，再加载智能体详情
  if (isEdit.value) {
    await loadAgentDetail()
  }

  await Promise.all([
    loadTools(),
    loadRags(),
    loadFaqs(),
  ])
})
</script>

<template>
  <div class="h-screen flex flex-col bg-gray-50">
    <!-- 顶部操作栏 -->
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

        <span class="text-lg font-medium">
          {{ isEdit ? '编辑智能体' : '新增智能体' }}
        </span>
      </div>

      <div class="flex items-center gap-2">
        <AgentReleaseManager :agent-id="agentId as any" />
        <n-button type="primary" :loading="loading" @click="saveAgent">
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

    <!-- 主要内容区域 -->
    <div class="flex-1 overflow-hidden">
      <n-split :key="`left-split-${formData.agent_type}`" direction="horizontal" :default-size="leftSplitSize" :min="0.25" :max="0.4" :resize-trigger-size="1">
        <!-- 左侧：智能体信息 -->
        <template #1>
          <div class="h-full bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
            <h3 class="text-lg font-semibold mb-4">
              智能体信息
            </h3>

            <n-collapse :default-expanded-names="['basic_info']" class="mb-4" bordered>
              <!-- 基本信息 -->
              <n-collapse-item title="基本信息" name="basic_info">
                <n-form :model="formData" label-placement="top">
                  <n-form-item label="智能体名称">
                    <n-input
                      :value="formData.name"
                      placeholder="请输入智能体名称（仅支持字母、数字、下划线和连字符）"
                      @update:value="handleNameInput"
                    />
                  </n-form-item>

                  <n-form-item label="智能体中文名称">
                    <n-input v-model:value="formData.zh_name" placeholder="请输入智能体中文名称" />
                  </n-form-item>

                  <n-form-item label="智能体描述">
                    <n-input
                      v-model:value="formData.description"
                      type="textarea"
                      placeholder="请输入智能体描述"
                      :rows="3"
                    />
                  </n-form-item>
                </n-form>
              </n-collapse-item>

              <!-- 提示词 -->
              <n-collapse-item title="提示词" name="prompt">
                <template #header-extra>
                  <div @click.stop>
                    <n-button size="small" quaternary @click="openPromptTemplateSelection">
                      从模板导入
                    </n-button>
                  </div>
                </template>
                <MarkDownEditor v-model="formData.self_prompt" />
              </n-collapse-item>

              <!-- 模型 -->
              <n-collapse-item title="模型" name="model">
                <template #header-extra>
                  <div @click.stop>
                    <n-select
                      v-model:value="selectedModelId"
                      :options="models.map(m => ({
                        label: m.name,
                        value: m.id,
                        provider: m.provider,
                      }))"
                      placeholder="选择模型"
                      style="width: 200px"
                      clearable
                      :fallback-option="false"
                      :render-label="(option: any) => {
                        if (!option || !option.provider) {
                          return h('span', { class: 'text-gray-400' }, '选择模型')
                        }
                        const iconPath = getProviderIconPath(option.provider)
                        if (!iconPath) {
                          return h('span', null, option.label)
                        }
                        return h('div', { class: 'flex items-center gap-8px' }, [
                          h('img', {
                            src: toIcon(iconPath),
                            style: 'width:16px;height:16px;object-fit:contain',
                            onError: (e: any) => {
                              e.target.style.display = 'none'
                            },
                          }),
                          h('span', null, option.label),
                        ])
                      }"
                      @update:value="(id) => selectModel(models.find(m => m.id === id)!)"
                    />
                  </div>
                </template>

                <n-form :model="formData.model" label-placement="top">
                  <n-form-item label="Top P">
                    <n-slider v-model:value="formData.model.top_p" :step="0.1" :min="0" :max="1" :format-tooltip="(v:number) => v.toFixed(1)" />
                  </n-form-item>
                  <n-form-item label="Max Tokens">
                    <n-input-number v-model:value="formData.model.max_tokens" :min="1" />
                  </n-form-item>
                  <n-form-item label="Temperature">
                    <n-slider v-model:value="formData.model.temperature" :step="0.1" :min="0" :max="2" :format-tooltip="(v:number) => v.toFixed(1)" />
                  </n-form-item>
                </n-form>
              </n-collapse-item>

              <!-- 开场白 -->
              <n-collapse-item title="开场白" name="prologue">
                <n-input
                  v-model:value="formData.prologue"
                  type="textarea"
                  placeholder="请输入开场白"
                  :rows="3"
                />
              </n-collapse-item>

              <!-- 引导提问 -->
              <n-collapse-item title="引导提问" name="leading_question">
                <n-dynamic-input
                  v-model:value="formData.leading_question"
                  placeholder="请输入引导问题"
                />
              </n-collapse-item>

              <!-- 参数 -->
              <n-collapse-item title="参数" name="variables">
                <n-dynamic-input
                  v-model:value="formData.variables"
                  placeholder="请输入参数"
                  :on-create="createVariable"
                >
                  <template #default="{ value }">
                    <div class="flex items-center gap-2">
                      <n-input
                        v-model:value="value.name"
                        placeholder="名称"
                        size="small"
                        class="flex-1"
                      />
                      <n-input
                        v-model:value="value.description"
                        placeholder="描述"
                        size="small"
                        class="flex-1"
                      />
                      <n-input
                        v-model:value="value.value"
                        placeholder="值"
                        size="small"
                        class="flex-1"
                      />
                    </div>
                  </template>
                </n-dynamic-input>
              </n-collapse-item>
            </n-collapse>
          </div>
        </template>

        <!-- 中间和右侧区域 -->
        <template #2>
          <n-split :key="`middle-split-${formData.agent_type}`" direction="horizontal" :default-size="middleSplitSize" :min="0.25" :max="0.7" :resize-trigger-size="1">
            <!-- 中间：编排模块或多智能体配置 -->
            <template #1>
              <!-- 多智能体配置 -->
              <div v-if="formData.agent_type === 'supervisor'" class="h-full bg-gray-50 border-r border-gray-200 p-6 overflow-hidden">
                <SupervisorOrgChart
                  :current-agent="{
                    name: formData.name,
                    zh_name: formData.zh_name,
                    description: formData.description,
                  }"
                  :selected-agents="selectedAgents"
                  @update:selected-agents="(agents) => { selectedAgents = agents }"
                />
              </div>
              <!-- 编排模块 -->
              <div v-else class="h-full bg-gray-50 border-r border-gray-200 p-6 overflow-y-auto">
                <h3 class="text-lg font-semibold mb-4">
                  编排
                </h3>

                <!-- 技能 -->
                <div class="mb-6">
                  <h4 class="text-base font-semibold mb-4">
                    技能
                  </h4>

                  <!-- 工作流 -->
                  <n-collapse class="mb-4" bordered accordion>
                    <n-collapse-item title="工作流" name="workflow">
                      <template #header-extra>
                        <div @click.stop>
                          <n-button size="small" quaternary @click="openWorkflowSelection">
                            <template #icon>
                              <n-icon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                                </svg>
                              </n-icon>
                            </template>
                          </n-button>
                        </div>
                      </template>

                      <div v-if="formData.workflow_list.length === 0" class="text-gray-500 py-2">
                        暂无选择的工作流
                      </div>
                      <div v-else class="space-y-2">
                        <n-card
                          v-for="(workflow, index) in formData.workflow_list"
                          :key="workflow.id"
                          size="small"
                          :bordered="true"
                          class="shadow-sm"
                        >
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-medium">{{ workflow.name }}</span>
                              </div>
                              <n-button size="small" quaternary type="error" @click="removeWorkflow(index)">
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </div>
                            <!-- 工作流描述 -->
                            <div v-if="workflow.description" class="text-xs text-gray-500 line-clamp-2">
                              {{ workflow.description }}
                            </div>
                          </div>
                        </n-card>
                      </div>
                    </n-collapse-item>
                  </n-collapse>
                </div>

                <!-- 知识 -->
                <div class="mb-6">
                  <h4 class="text-base font-semibold mb-4">
                    知识
                  </h4>

                  <!-- 知识模块折叠面板组 -->
                  <n-collapse class="mb-4" bordered accordion>
                    <!-- 工具 -->
                    <n-collapse-item title="工具" name="tools">
                      <template #header-extra>
                        <div @click.stop>
                          <n-button size="small" quaternary @click="openToolSelection">
                            <template #icon>
                              <n-icon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                                </svg>
                              </n-icon>
                            </template>
                          </n-button>
                        </div>
                      </template>

                      <div v-if="formData.tool_list.length === 0" class="text-gray-500 py-2">
                        暂无选择的工具
                      </div>
                      <div v-else class="space-y-2">
                        <n-card
                          v-for="(tool, index) in formData.tool_list"
                          :key="tool.id"
                          size="small"
                          :bordered="true"
                          class="shadow-sm"
                        >
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-medium">{{ tool.name }}</span>
                                <n-tag size="small" round :type="tool.toolType === 'http' ? 'info' : 'warning'">
                                  {{ tool.toolType.toUpperCase() }}
                                </n-tag>
                              </div>
                              <div class="flex items-center gap-1">
                                <!-- HTTP类型工具的配置按钮 -->
                                <n-popover
                                  v-if="tool.toolType === 'http'"
                                  trigger="hover"
                                  placement="top"
                                >
                                  <template #trigger>
                                    <n-button size="small" quaternary @click.stop>
                                      <template #icon>
                                        <n-icon>
                                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                            <path d="M12 15.5C10.067 15.5 8.5 13.933 8.5 12S10.067 8.5 12 8.5 15.5 10.067 15.5 12 13.933 15.5 12 15.5M19.43 12.97c.04-.32.07-.64.07-.97 0-.33-.03-.65-.07-.97l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.65.07.97l-2.11 1.66c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.59 1.69-.98l2.49 1.01c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66z" />
                                          </svg>
                                        </n-icon>
                                      </template>
                                    </n-button>
                                  </template>
                                  <div class="p-2">
                                    <div class="flex items-center gap-2">
                                      <span class="text-sm">执行前手动确认参数</span>
                                      <n-switch
                                        v-model:value="tool.interrupt_before"
                                        size="small"
                                      />
                                    </div>
                                  </div>
                                </n-popover>
                                <!-- 移除按钮 -->
                                <n-button size="small" quaternary type="error" @click="removeTool(index)">
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
                            <!-- 工具描述 -->
                            <div v-if="tool.description" class="text-xs text-gray-500 line-clamp-2">
                              {{ tool.description }}
                            </div>
                          </div>
                        </n-card>
                      </div>
                    </n-collapse-item>

                    <!-- RAG -->
                    <n-collapse-item title="RAG" name="rag">
                      <template #header-extra>
                        <div @click.stop>
                          <n-button size="small" quaternary @click="openRagSelection">
                            <template #icon>
                              <n-icon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                                </svg>
                              </n-icon>
                            </template>
                          </n-button>
                        </div>
                      </template>

                      <div v-if="formData.rag_list.length === 0" class="text-gray-500 py-2">
                        暂无选择的RAG
                      </div>
                      <div v-else class="space-y-2">
                        <n-card
                          v-for="(rag, index) in formData.rag_list"
                          :key="rag.id"
                          size="small"
                          :bordered="true"
                          class="shadow-sm"
                        >
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-medium">{{ rag.name }}</span>
                              </div>
                              <n-button size="small" quaternary type="error" @click="removeRag(index)">
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </div>
                            <!-- RAG描述 -->
                            <div v-if="rag.description" class="text-xs text-gray-500 line-clamp-2">
                              {{ rag.description }}
                            </div>
                          </div>
                        </n-card>
                      </div>
                    </n-collapse-item>

                    <!-- FAQ -->
                    <n-collapse-item title="FAQ" name="faq">
                      <template #header-extra>
                        <div @click.stop>
                          <n-button size="small" quaternary @click="openFaqSelection">
                            <template #icon>
                              <n-icon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                                </svg>
                              </n-icon>
                            </template>
                          </n-button>
                        </div>
                      </template>

                      <div v-if="formData.faq_list.length === 0" class="text-gray-500 py-2">
                        暂无选择的FAQ集合
                      </div>
                      <div v-else class="space-y-2">
                        <n-card
                          v-for="(collection, index) in formData.faq_list"
                          :key="collection.id"
                          size="small"
                          :bordered="true"
                          class="shadow-sm"
                        >
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-medium">{{ collection.name || collection.collectionName }}</span>
                              </div>
                              <n-button size="small" quaternary type="error" @click="removeFaq(index)">
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </div>
                            <!-- FAQ集合描述 -->
                            <div v-if="collection.collectionName" class="text-xs text-gray-500 line-clamp-2">
                              {{ collection.collectionName }}
                            </div>
                          </div>
                        </n-card>
                      </div>
                    </n-collapse-item>

                    <!-- MCP -->
                    <n-collapse-item title="MCP" name="mcp">
                      <template #header-extra>
                        <div @click.stop>
                          <n-button size="small" quaternary @click="openMcpSelection">
                            <template #icon>
                              <n-icon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                  <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                                </svg>
                              </n-icon>
                            </template>
                          </n-button>
                        </div>
                      </template>

                      <div v-if="formData.mcp_list.length === 0" class="text-gray-500 py-2">
                        暂无选择的MCP
                      </div>
                      <div v-else class="space-y-2">
                        <n-card
                          v-for="(mcp, index) in formData.mcp_list"
                          :key="mcp.id"
                          size="small"
                          :bordered="true"
                          class="shadow-sm"
                        >
                          <div class="space-y-2">
                            <div class="flex items-center justify-between">
                              <div class="flex items-center gap-2">
                                <span class="text-sm font-medium">{{ mcp.name }}</span>
                                <n-tag size="small" round type="info">
                                  {{ mcp.type }}
                                </n-tag>
                              </div>
                              <n-button size="small" quaternary type="error" @click="removeMcp(index)">
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </div>
                            <!-- MCP描述 -->
                            <div v-if="mcp.description" class="text-xs text-gray-500 line-clamp-2">
                              {{ mcp.description }}
                            </div>
                          </div>
                        </n-card>
                      </div>
                    </n-collapse-item>
                  </n-collapse>
                </div>
              </div>
            </template>

            <!-- 右侧：预览调试 -->
            <template #2>
              <div class="h-full bg-white p-6 flex flex-col overflow-hidden">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold">
                    预览调试
                  </h3>
                  <template v-if="formData.agent_type === 'single'">
                    <div class="flex items-center gap-2">
                      <span>运行模式：</span>
                      <n-select
                        v-model:value="formData.run_mode"
                        :options="[
                          { label: 'React模式', value: 'react' },
                          { label: 'PlanExecute模式', value: 'plan_execute' },
                        ]"
                        style="width: 160px"
                      />
                    </div>
                  </template>
                </div>
                <div class="flex-1 overflow-y-auto">
                  <PreviewDebug
                    :name="formData.name"
                    :zh-name="formData.zh_name"
                    :description="formData.description"
                    :prologue="formData.prologue"
                    :leading-question="formData.leading_question"
                    :agent-type="formData.agent_type"
                    :run-mode="formData.agent_type === 'single' ? formData.run_mode : undefined"
                    :on-save="saveAgentForDebug"
                  />
                </div>
              </div>
            </template>
          </n-split>
        </template>
      </n-split>
    </div>

    <!-- 选择弹窗 -->
    <ToolSelectionModal ref="toolModalRef" @confirm="handleToolSelection" />
    <RagSelectionModal ref="ragModalRef" @confirm="handleRagSelection" />
    <FaqSelectionModal ref="faqModalRef" @confirm="handleFaqSelection" />
    <McpSelectionModal ref="mcpModalRef" @success="handleMcpSelection" />
    <WorkflowSelectionModal ref="workflowModalRef" @confirm="handleWorkflowSelection" />
    <PromptTemplateSelectionModal ref="promptTemplateModalRef" @confirm="handlePromptTemplateSelection" />
  </div>
</template>

<style scoped>
.nova-card {
  box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  transition: box-shadow 0.15s ease-in-out;
}

.nova-card:hover {
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
}

/* 确保折叠面板有分割线 */
:deep(.n-collapse-item) {
  border-bottom: 1px solid var(--n-border-color);
}

:deep(.n-collapse-item:last-child) {
  border-bottom: none;
}
</style>
