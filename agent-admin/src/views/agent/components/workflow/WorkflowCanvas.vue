<script setup lang="ts">
import { h, markRaw, onMounted, onUnmounted, ref, watch } from 'vue'
import { ConnectionMode, VueFlow } from '@vue-flow/core'
import type { Connection, Edge, EdgeChange, Node, NodeChange } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { getModelsApi } from '@/service/api/model'
import ToolSelectionModal from '../ToolSelectionModal.vue'
import { modelProviderOptions } from '@/constants/model'
import StartNode from './StartNode.vue'
import EndNode from './EndNode.vue'
import LLMNode from './LLMNode.vue'
import PurposeNode from './PurposeNode.vue'
import SqlNode from './SqlNode.vue'
import HttpNode from './HttpNode.vue'
import RagNode from './RagNode.vue'
import FaqNode from './FaqNode.vue'
import CodeNode from './CodeNode.vue'
import SwitchNode from './SwitchNode.vue'
import CodeEditor from '@/components/custom/Editor/CodeEditor.vue'
import RagSelectionModal from '../RagSelectionModal.vue'
import FaqSelectionModal from '../FaqSelectionModal.vue'
import PreviewDebug from '../PreviewDebug.vue'
import { Regex } from '@/constants/Regex'

const props = defineProps<{
  modelValue?: {
    nodes: Node[]
    edges: Edge[]
  }
  workflowFormData?: {
    name: string
    zh_name: string
    description: string
    prologue: string
    leading_question: string[]
  }
  onSave?: () => Promise<any>
}>()

const emit = defineEmits<{
  'update:modelValue': [data: { nodes: Node[], edges: Edge[] }]
  'change': [data: { nodes: Node[], edges: Edge[] }]
}>()

const nodes = ref<Node[]>(props.modelValue?.nodes || [])
const edges = ref<Edge[]>(props.modelValue?.edges || [])

// 显示节点类型菜单
const showNodeMenu = ref(false)
const menuRef = ref<HTMLElement>()

// 拖拽状态
const isDragging = ref(false)
const draggedNodeType = ref<string>('')
const vueFlowWrapper = ref<HTMLElement>()
const vueFlowInstance = ref<any>()
const isDraggingOverCanvas = ref(false)

// 节点配置抽屉
const showNodeConfigDrawer = ref(false)
const selectedNode = ref<Node | null>(null)
const toolModalRef = ref<InstanceType<typeof ToolSelectionModal> | null>(null)
const ragModalRef = ref<InstanceType<typeof RagSelectionModal> | null>(null)
const faqModalRef = ref<InstanceType<typeof FaqSelectionModal> | null>(null)

// 抽屉宽度与拖拽
const drawerWidth = ref(520)
const drawerMinWidth = 450
const drawerMaxWidth = 900
let isResizingDrawer = false
let resizeStartX = 0
let resizeStartWidth = 0

// 预览抽屉独立宽度与拖拽
const previewDrawerWidth = ref(520)
let isResizingPreview = false
let previewResizeStartX = 0
let previewResizeStartWidth = 0

function onDrawerResizeStart(e: MouseEvent) {
  isResizingDrawer = true
  resizeStartX = e.clientX
  resizeStartWidth = drawerWidth.value
  document.addEventListener('mousemove', onDrawerResizing)
  document.addEventListener('mouseup', onDrawerResizeEnd)
}

function onDrawerResizing(e: MouseEvent) {
  if (!isResizingDrawer)
    return
  // 抽屉贴右侧，拖动左缘；向左拖 => 变宽，向右拖 => 变窄
  const delta = resizeStartX - e.clientX
  let next = resizeStartWidth + delta
  if (next < drawerMinWidth)
    next = drawerMinWidth
  if (next > drawerMaxWidth)
    next = drawerMaxWidth
  drawerWidth.value = next
}

function onDrawerResizeEnd() {
  isResizingDrawer = false
  document.removeEventListener('mousemove', onDrawerResizing)
  document.removeEventListener('mouseup', onDrawerResizeEnd)
}

function onPreviewResizeStart(e: MouseEvent) {
  isResizingPreview = true
  previewResizeStartX = e.clientX
  previewResizeStartWidth = previewDrawerWidth.value
  document.addEventListener('mousemove', onPreviewResizing)
  document.addEventListener('mouseup', onPreviewResizeEnd)
}

function onPreviewResizing(e: MouseEvent) {
  if (!isResizingPreview)
    return
  const delta = previewResizeStartX - e.clientX
  let next = previewResizeStartWidth + delta
  if (next < drawerMinWidth)
    next = drawerMinWidth
  if (next > drawerMaxWidth)
    next = drawerMaxWidth
  previewDrawerWidth.value = next
}

function onPreviewResizeEnd() {
  isResizingPreview = false
  document.removeEventListener('mousemove', onPreviewResizing)
  document.removeEventListener('mouseup', onPreviewResizeEnd)
}

// 预览抽屉
const showPreviewDrawer = ref(false)

// 模型列表
const models = ref<any[]>([])
const selectedModelId = ref<string>('')

// 加载模型列表
async function loadModels() {
  try {
    const { isSuccess, data } = await getModelsApi({ enabled: true })
    if (isSuccess && data) {
      models.value = data
      // 如果当前节点有模型，设置选中的模型
      if (selectedNode.value?.data?.node_params?.model?.id) {
        selectedModelId.value = selectedNode.value.data.node_params.model.id
      }
      else if (selectedNode.value?.data?.node_params?.model?.provider) {
        // 尝试根据provider查找匹配的模型
        const currentSelectedNode = selectedNode.value
        if (currentSelectedNode) {
          const matchingModel = models.value.find(
            (m: any) => m.provider === currentSelectedNode.data.node_params.model.provider,
          )
          if (matchingModel) {
            selectedModelId.value = matchingModel.id
            // 同步模型的配置到节点
            selectModel(matchingModel.id)
          }
        }
      }
    }
  }
  catch {
    // 加载模型失败
  }
}

// 选择模型
function selectModel(id: string) {
  const model = models.value.find((m: any) => m.id === id)
  if (model && selectedNode.value) {
    selectedModelId.value = id
    if (!selectedNode.value.data.node_params) {
      selectedNode.value.data.node_params = {}
    }
    selectedNode.value.data.node_params.model = {
      id: model.id,
      name: model.name,
      model_name: model.modelName,
      provider: model.provider,
      api_key: model.apiKey,
      base_url: model.baseUrl,
      top_p: model.topP,
      max_tokens: model.maxTokens,
      temperature: model.temperature,
    }
  }
}

// 获取模型图标路径
function getProviderIconPath(provider: string) {
  const providerOption = modelProviderOptions.find(opt => opt.value === provider)
  return providerOption?.icon || ''
}

// 图标路径转换
function toIcon(path?: string) {
  return path || ''
}

// 为 SQL 工具的 input_params 补齐默认字段，支持递归
function normalizeSqlInputParams(params: any[]): any[] {
  if (!Array.isArray(params))
    return []
  return params.map((p: any) => {
    const next: any = { ...p }
    if (!('param_type' in next))
      next.param_type = 'static'
    if (!('value' in next))
      next.value = ''
    if (!('reference' in next))
      next.reference = []
    if (Array.isArray(next.children) && next.children.length > 0)
      next.children = normalizeSqlInputParams(next.children)
    return next
  })
}

// 过滤参数名输入，只允许字母、数字、下划线和连字符
// 使用 Regex.ParamName 的字符集规则：^[a-zA-Z0-9_-]+$
function filterParamNameInput(value: string) {
  return value.split('').filter(char => /^[a-zA-Z0-9_-]$/.test(char)).join('')
}

// 处理参数名输入
function handleParamNameInput(param: any, value: string) {
  // 只读参数（例如默认的 input）不允许修改
  if (param && (param.readonly === true || param.variable === 'input'))
    return
  const filtered = filterParamNameInput(value)
  param.variable = filtered
}

// 添加输入参数
function addInput() {
  if (!selectedNode.value)
    return
  if (!selectedNode.value.data.inputs) {
    selectedNode.value.data.inputs = []
  }
  selectedNode.value.data.inputs.push({
    variable: '',
    type: 'string',
    desc: '',
    value: '',
    children: [],
  })
}

// 删除输入参数
function removeInput(index: number) {
  if (selectedNode.value?.data.inputs) {
    selectedNode.value.data.inputs.splice(index, 1)
  }
}

// 输入参数展开状态管理
const expandedInputParams = ref<Set<number | string>>(new Set())

// 输出参数展开状态管理
const expandedOutputParams = ref<Set<number | string>>(new Set())

// SQL 参数展开状态管理（展示 input_params）
const expandedSqlParams = ref<Set<number | string>>(new Set())

// 切换输入参数展开状态
function toggleInputParamExpansion(index: number | string) {
  if (expandedInputParams.value.has(index)) {
    expandedInputParams.value.delete(index)
  }
  else {
    expandedInputParams.value.add(index)
  }
}

// 添加子输入参数
function addChildInputParam(parentIndex: number | string, isNestedChild = false) {
  if (isNestedChild) {
    // 处理嵌套子参数
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级
      const parent = selectedNode.value?.data.inputs?.[Number(parentIndex)]
      if (parent) {
        // 确保第二级参数有children属性
        if (!parent.children) {
          parent.children = []
        }
        const newChildIndex = parent.children.length
        parent.children.push({ variable: '', type: 'string', desc: '', value: '', children: [] })
        expandedInputParams.value.add(`${parentIndex}-${newChildIndex}`)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.inputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        // 确保第三级参数有children属性
        if (!secondLevelParent.children) {
          secondLevelParent.children = []
        }
        secondLevelParent.children.push({ variable: '', type: 'string', value: '', children: [] })
        expandedInputParams.value.add(parentIndex)
      }
    }
    else if (parentPath.length === 3) {
      // 第4级
      const [firstLevelIndex, secondLevelIndex, thirdLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.inputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children && secondLevelParent.children[thirdLevelIndex]) {
          const thirdLevelParent = secondLevelParent.children[thirdLevelIndex]
          // 确保第四级参数有children属性
          if (!thirdLevelParent.children) {
            thirdLevelParent.children = []
          }
          thirdLevelParent.children.push({ variable: '', type: 'string', value: '', children: [] })
          expandedInputParams.value.add(parentIndex)
        }
      }
    }
  }
  else {
    // 处理第1级子参数
    const parent = selectedNode.value?.data.inputs?.[Number(parentIndex)]
    if (parent) {
      // 确保父参数有children属性
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push({ variable: '', type: 'string', desc: '', value: '', children: [] })
      expandedInputParams.value.add(Number(parentIndex))
    }
  }
}

// 删除子输入参数
function removeChildInputParam(parentIndex: number | string, childIndex: number, isNestedChild = false) {
  if (isNestedChild) {
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级删除
      const parent = selectedNode.value?.data.inputs?.[Number(parentIndex)]
      if (parent && parent.children) {
        parent.children.splice(childIndex, 1)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级删除
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.inputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children) {
          secondLevelParent.children.splice(childIndex, 1)
        }
      }
    }
    else if (parentPath.length === 3) {
      // 第4级删除
      const [firstLevelIndex, secondLevelIndex, thirdLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.inputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children && secondLevelParent.children[thirdLevelIndex]) {
          const thirdLevelParent = secondLevelParent.children[thirdLevelIndex]
          if (thirdLevelParent.children) {
            thirdLevelParent.children.splice(childIndex, 1)
          }
        }
      }
    }
  }
  else {
    const parent = selectedNode.value?.data.inputs?.[Number(parentIndex)]
    if (parent && parent.children) {
      parent.children.splice(childIndex, 1)
    }
  }
}

// 判断是否可以添加子参数
function canAddChildInputParam(param: any, level: number): boolean {
  return (param.type === 'object' || param.type === 'array') && level < 4
}

// 判断是否有子参数
function hasInputChildren(param: any): boolean {
  return param.children && param.children.length > 0
}

// 获取展开键
function getInputExpansionKey(item: { param: any, index: number, parentIndex?: number | string, level: number }): number | string {
  if (item.parentIndex !== undefined) {
    return `${item.parentIndex}-${item.index}`
  }
  return item.index
}

// 根据层级获取参数类型选项
function getInputParamTypeOptions(level: number) {
  const baseOptions = [
    { label: 'reference', value: 'reference' },
    { label: 'string', value: 'string' },
    { label: 'integer', value: 'integer' },
    { label: 'float', value: 'float' },
    { label: 'bool', value: 'bool' },
  ]

  // 第4级（level >= 3）及以上的参数不允许选择 object/array
  if (level >= 3) {
    return baseOptions
  }

  // 第1-3级参数可以选择所有类型
  return [
    ...baseOptions,
    { label: 'object', value: 'object' },
    { label: 'array', value: 'array' },
  ]
}

// 获取所有输入参数（包括子参数）
function getAllInputParams(): Array<{ param: any, index: number, parentIndex?: number | string, level: number }> {
  const result: Array<{ param: any, index: number, parentIndex?: number | string, level: number }> = []

  selectedNode.value?.data.inputs?.forEach((param: any, index: number) => {
    result.push({ param, index, level: 0 })

    if (expandedInputParams.value.has(index) && param.children) {
      param.children.forEach((child: any, childIndex: number) => {
        result.push({ param: child, index: childIndex, parentIndex: index, level: 1 })

        if (expandedInputParams.value.has(`${index}-${childIndex}`) && child.children) {
          child.children.forEach((grandChild: any, grandChildIndex: number) => {
            result.push({ param: grandChild, index: grandChildIndex, parentIndex: `${index}-${childIndex}`, level: 2 })

            // 支持第3层
            if (expandedInputParams.value.has(`${index}-${childIndex}-${grandChildIndex}`) && grandChild.children) {
              grandChild.children.forEach((greatGrandChild: any, greatGrandChildIndex: number) => {
                result.push({
                  param: greatGrandChild,
                  index: greatGrandChildIndex,
                  parentIndex: `${index}-${childIndex}-${grandChildIndex}`,
                  level: 3,
                })
              })
            }
          })
        }
      })
    }
  })

  return result
}

// 添加输出参数
function addOutput() {
  if (!selectedNode.value)
    return
  if (!selectedNode.value.data.outputs) {
    selectedNode.value.data.outputs = []
  }
  selectedNode.value.data.outputs.push({
    variable: '',
    type: 'string',
    desc: '',
    children: [],
  })
}

// 删除输出参数
function removeOutput(index: number) {
  if (selectedNode.value?.data.outputs) {
    selectedNode.value.data.outputs.splice(index, 1)
  }
}

// 切换输出参数展开状态
function toggleOutputParamExpansion(index: number | string) {
  if (expandedOutputParams.value.has(index)) {
    expandedOutputParams.value.delete(index)
  }
  else {
    expandedOutputParams.value.add(index)
  }
}

// 添加子输出参数
function addChildOutputParam(parentIndex: number | string, isNestedChild = false) {
  if (isNestedChild) {
    // 处理嵌套子参数
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级
      const parent = selectedNode.value?.data.outputs?.[Number(parentIndex)]
      if (parent) {
        // 确保第二级参数有children属性
        if (!parent.children) {
          parent.children = []
        }
        const newChildIndex = parent.children.length
        parent.children.push({ variable: '', type: 'string', desc: '', children: [] })
        expandedOutputParams.value.add(`${parentIndex}-${newChildIndex}`)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.outputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        // 确保第三级参数有children属性
        if (!secondLevelParent.children) {
          secondLevelParent.children = []
        }
        secondLevelParent.children.push({ variable: '', type: 'string', desc: '', children: [] })
        expandedOutputParams.value.add(parentIndex)
      }
    }
    else if (parentPath.length === 3) {
      // 第4级
      const [firstLevelIndex, secondLevelIndex, thirdLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.outputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children && secondLevelParent.children[thirdLevelIndex]) {
          const thirdLevelParent = secondLevelParent.children[thirdLevelIndex]
          // 确保第四级参数有children属性
          if (!thirdLevelParent.children) {
            thirdLevelParent.children = []
          }
          thirdLevelParent.children.push({ variable: '', type: 'string', desc: '', children: [] })
          expandedOutputParams.value.add(parentIndex)
        }
      }
    }
  }
  else {
    // 处理第1级子参数
    const parent = selectedNode.value?.data.outputs?.[Number(parentIndex)]
    if (parent) {
      // 确保父参数有children属性
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push({ variable: '', type: 'string', desc: '', children: [] })
      expandedOutputParams.value.add(Number(parentIndex))
    }
  }
}

// 删除子输出参数
function removeChildOutputParam(parentIndex: number | string, childIndex: number, isNestedChild = false) {
  if (isNestedChild) {
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级删除
      const parent = selectedNode.value?.data.outputs?.[Number(parentIndex)]
      if (parent && parent.children) {
        parent.children.splice(childIndex, 1)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级删除
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.outputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children) {
          secondLevelParent.children.splice(childIndex, 1)
        }
      }
    }
    else if (parentPath.length === 3) {
      // 第4级删除
      const [firstLevelIndex, secondLevelIndex, thirdLevelIndex] = parentPath.map(Number)
      const parent = selectedNode.value?.data.outputs?.[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children && secondLevelParent.children[thirdLevelIndex]) {
          const thirdLevelParent = secondLevelParent.children[thirdLevelIndex]
          if (thirdLevelParent.children) {
            thirdLevelParent.children.splice(childIndex, 1)
          }
        }
      }
    }
  }
  else {
    const parent = selectedNode.value?.data.outputs?.[Number(parentIndex)]
    if (parent && parent.children) {
      parent.children.splice(childIndex, 1)
    }
  }
}

// 判断是否可以添加子输出参数
function canAddChildOutputParam(param: any, level: number): boolean {
  return (param.type === 'object' || param.type === 'array') && level < 4
}

// 判断是否有子输出参数
function hasOutputChildren(param: any): boolean {
  return param.children && param.children.length > 0
}

// 获取所有输出参数（包括子参数）
function getAllOutputParams(): Array<{ param: any, index: number, parentIndex?: number | string, level: number }> {
  const result: Array<{ param: any, index: number, parentIndex?: number | string, level: number }> = []

  selectedNode.value?.data.outputs?.forEach((param: any, index: number) => {
    result.push({ param, index, level: 0 })

    if (expandedOutputParams.value.has(index) && param.children) {
      param.children.forEach((child: any, childIndex: number) => {
        result.push({ param: child, index: childIndex, parentIndex: index, level: 1 })

        if (expandedOutputParams.value.has(`${index}-${childIndex}`) && child.children) {
          child.children.forEach((grandChild: any, grandChildIndex: number) => {
            result.push({ param: grandChild, index: grandChildIndex, parentIndex: `${index}-${childIndex}`, level: 2 })

            // 支持第3层
            if (expandedOutputParams.value.has(`${index}-${childIndex}-${grandChildIndex}`) && grandChild.children) {
              grandChild.children.forEach((greatGrandChild: any, greatGrandChildIndex: number) => {
                result.push({
                  param: greatGrandChild,
                  index: greatGrandChildIndex,
                  parentIndex: `${index}-${childIndex}-${grandChildIndex}`,
                  level: 3,
                })
              })
            }
          })
        }
      })
    }
  })

  return result
}

// SQL：获取所有 input_params（包括子参数）
function getAllSqlInputParams(): Array<{ param: any, index: number, parentIndex?: number | string, level: number }> {
  const result: Array<{ param: any, index: number, parentIndex?: number | string, level: number }> = []
  const list = selectedNode.value?.data?.node_params?.config?.input_params
  if (!Array.isArray(list))
    return result

  list.forEach((param: any, index: number) => {
    result.push({ param, index, level: 0 })
    if (expandedSqlParams.value.has(index) && Array.isArray(param.children)) {
      param.children.forEach((child: any, childIndex: number) => {
        result.push({ param: child, index: childIndex, parentIndex: index, level: 1 })
        if (expandedSqlParams.value.has(`${index}-${childIndex}`) && Array.isArray(child.children)) {
          child.children.forEach((grandChild: any, grandChildIndex: number) => {
            result.push({ param: grandChild, index: grandChildIndex, parentIndex: `${index}-${childIndex}`, level: 2 })
            if (expandedSqlParams.value.has(`${index}-${childIndex}-${grandChildIndex}`) && Array.isArray(grandChild.children)) {
              grandChild.children.forEach((greatGrandChild: any, greatGrandChildIndex: number) => {
                result.push({ param: greatGrandChild, index: greatGrandChildIndex, parentIndex: `${index}-${childIndex}-${grandChildIndex}`, level: 3 })
              })
            }
          })
        }
      })
    }
  })
  return result
}

function getSqlExpansionKey(item: { param: any, index: number, parentIndex?: number | string, level: number }): number | string {
  if (item.parentIndex !== undefined)
    return `${item.parentIndex}-${item.index}`
  return item.index
}

function toggleSqlParamExpansion(index: number | string) {
  if (expandedSqlParams.value.has(index))
    expandedSqlParams.value.delete(index)
  else expandedSqlParams.value.add(index)
}

function hasSqlChildren(param: any): boolean {
  return Array.isArray(param?.children) && param.children.length > 0
}

// ===== Switch 条件分支：方法 =====
function ensureSwitchStruct() {
  if (!selectedNode.value)
    return
  if (!selectedNode.value.data.node_params)
    selectedNode.value.data.node_params = {}
  if (!Array.isArray((selectedNode.value as any).data.node_params.branches)) {
    ;(selectedNode.value as any).data.node_params.branches = [
      { id: generateId(), relation: 'all', statements: [] },
    ]
  }
}

function addBranch() {
  ensureSwitchStruct()
  ;(selectedNode.value as any).data.node_params.branches.push({ id: generateId(), relation: 'all', statements: [] })
}

function removeBranch(index: number) {
  ensureSwitchStruct()
  ;(selectedNode.value as any).data.node_params.branches.splice(index, 1)
}

function addStatement(branchIndex: number) {
  ensureSwitchStruct()
  const branch = (selectedNode.value as any).data.node_params.branches[branchIndex]
  if (!branch.statements)
    branch.statements = []
  branch.statements.push({
    var1: { type: 'reference', value: [] },
    var2: { type: 'string', value: '' },
    operator: 'include',
  })
}

function removeStatement(branchIndex: number, stmtIndex: number) {
  const branch = (selectedNode.value as any).data.node_params.branches?.[branchIndex]
  if (branch && Array.isArray(branch.statements))
    branch.statements.splice(stmtIndex, 1)
}

const switchOperatorOptions = [
  { label: '包含', value: 'include' },
  { label: '不包含', value: 'not_include' },
  { label: '开始是', value: 'start_with' },
  { label: '结束是', value: 'end_with' },
  { label: '是', value: 'is' },
  { label: '不是', value: 'is_not' },
]

const var2TypeOptions = [
  { label: 'string', value: 'string' },
  { label: 'integer', value: 'integer' },
  { label: 'float', value: 'float' },
  { label: 'bool', value: 'bool' },
  { label: 'reference', value: 'reference' },
]

// 获取输出参数展开键
function getOutputExpansionKey(item: { param: any, index: number, parentIndex?: number | string, level: number }): string {
  if (item.level === 0)
    return item.index.toString()
  if (item.level === 1 && item.parentIndex !== undefined)
    return `${item.parentIndex}-${item.index}`
  if (item.level === 2 && item.parentIndex !== undefined)
    return `${item.parentIndex}-${item.index}`
  if (item.level === 3 && item.parentIndex !== undefined)
    return `${item.parentIndex}-${item.index}`
  return ''
}

// （移除未使用的 getOutputParamTypeOptions）

// 获取可选择的输出参数（用于reference类型）
function getReferenceOptions() {
  const targetNodeId = selectedNode.value?.id
  if (!targetNodeId)
    return []

  // 递归函数：收集所有上游节点（包括直接指向的节点和所有向前追溯的节点）
  const collectUpstreamNodes = (nodeId: string, visited: Set<string>): Set<string> => {
    // 找到所有指向当前节点的边
    const incomingEdges = edges.value.filter(edge => edge.target === nodeId)
    
    // 对于每个直接指向的节点
    incomingEdges.forEach((edge) => {
      const sourceNodeId = edge.source
      if (sourceNodeId && !visited.has(sourceNodeId)) {
        // 添加到已访问集合
        visited.add(sourceNodeId)
        // 递归追溯该节点的上游节点
        collectUpstreamNodes(sourceNodeId, visited)
      }
    })

    return visited
  }

  // 收集所有上游节点（包括直接指向的节点和所有向前追溯的节点）
  const upstreamNodeIds = collectUpstreamNodes(targetNodeId, new Set<string>())

  // 收集所有可引用的节点输出
  const options: Array<{ label: string, value: string, children?: any[] }> = []

  upstreamNodeIds.forEach((nodeId) => {
    const sourceNode = nodes.value.find(n => n.id === nodeId)
    if (sourceNode) {
      const nodeOptions: Array<{ label: string, value: string }> = []

      // 如果源节点是开始节点（且确有连线指向当前节点），添加内置可引用项
      if (sourceNode.type === 'start') {
        nodeOptions.push({
          label: 'question',
          value: 'question',
        })
      }

      // 添加节点的所有输出参数
      // 确保value使用output.variable，用于级联选择器的第二级匹配
      if (sourceNode.data.outputs && Array.isArray(sourceNode.data.outputs)) {
        sourceNode.data.outputs.forEach((output: any) => {
          // 确保value是字符串类型，用于匹配
          const paramValue = output.variable || ''
          if (paramValue) {
            nodeOptions.push({
              label: paramValue, // 显示参数名
              value: paramValue, // 用于匹配的第二级值
            })
          }
        })
      }

      if (nodeOptions.length > 0) {
        // 第一级的value必须是节点ID（字符串类型），用于匹配级联选择器的第一级
        const nodeIdValue = sourceNode.id || ''
        const nodeLabel = (sourceNode.data && (sourceNode.data.name || sourceNode.data.label)) || sourceNode.label || '节点'

        options.push({
          label: nodeLabel, // 显示节点名称
          value: nodeIdValue, // 用于匹配的第一级值（节点ID）
          children: nodeOptions,
        })
      }
    }
  })

  return options
}

// 处理节点点击事件
async function handleNodeClick(event: CustomEvent) {
  const { nodeId } = event.detail
  selectedNode.value = nodes.value.find(n => n.id === nodeId) || null
  if (selectedNode.value) {
    // 打开节点配置抽屉，关闭预览抽屉以避免遮挡
    showNodeConfigDrawer.value = true
    if (showPreviewDrawer.value) {
      showPreviewDrawer.value = false
      if (isResizingPreview)
        onPreviewResizeEnd()
    }
    // 加载模型列表
    await loadModels()
    // 初始化节点参数
    initNodeParams()
  }
}

// 关闭配置抽屉
function closeNodeConfigDrawer() {
  showNodeConfigDrawer.value = false
  selectedNode.value = null
}

// 显示预览抽屉
function showPreview() {
  // 打开预览抽屉时关闭节点配置抽屉，避免遮挡
  showPreviewDrawer.value = true
  if (showNodeConfigDrawer.value) {
    showNodeConfigDrawer.value = false
    selectedNode.value = null
    if (isResizingDrawer)
      onDrawerResizeEnd()
  }
}

// 关闭预览抽屉
function closePreviewDrawer() {
  showPreviewDrawer.value = false
}

// 初始化节点参数
function initNodeParams() {
  if (!selectedNode.value)
    return

  // 按节点类型初始化 node_params
  if (!selectedNode.value.data.node_params) {
    if (selectedNode.value.type === 'llm') {
      selectedNode.value.data.node_params = {
        model: {
          provider: 'deepseek' | 'openai' | 'qwen' | 'ollama',
          api_key: '',
          base_url: '',
          top_p: 1,
          max_tokens: 4096,
          temperature: 1,
        },
        prompt: {
          user: '',
          system: '',
        },
        streaming: false,
      }
    }
    else if (selectedNode.value.type === 'purpose') {
      selectedNode.value.data.node_params = {
        model: {
          provider: 'deepseek' | 'openai' | 'qwen' | 'ollama',
          api_key: '',
          base_url: '',
          top_p: 1,
          max_tokens: 4096,
          temperature: 1,
        },
        categories: [],
      }
    }
    else if (selectedNode.value.type === 'sql') {
      selectedNode.value.data.node_params = {
        config: {
          type: 'sql',
          host: '',
          port: 3306,
          database: '',
          user: '',
          password: '',
          sql: '',
          name: 'SQL',
          input_params: [],
        },
      }
    }
    else if (selectedNode.value.type === 'http') {
      selectedNode.value.data.node_params = {
        config: {
          type: 'http',
          method: 'GET',
          url: '',
          headers: {},
          name: 'HTTP',
          input_params: [],
        },
      }
    }
    else if (selectedNode.value.type === 'rag') {
      selectedNode.value.data.node_params = {
        config: {
          type: 'rag',
          workspace_id: '',
          uploadIds: [],
          topK: 1,
          strategy: 'hybrid_search',
          input_params: [
            {
              children: [],
              name: 'query',
              description: '用户问题',
              location: 'body',
              type: 'string',
              required: false,
              param_type: 'static',
              value: '',
              reference: [],
            },
          ],
        },
      }
    }
    else if (selectedNode.value.type === 'faq') {
      selectedNode.value.data.node_params = {
        config: {
          type: 'faq',
          score_threshold: 0.8,
          top_k: 1,
          upload_id: [],
          collection_id: '',
          workspace_id: '',
          input_params: [
            {
              children: [],
              name: 'query',
              description: '用户问题',
              location: 'body',
              type: 'string',
              required: false,
              param_type: 'static',
              value: '',
              reference: [],
            },
          ],
        },
      }
    }
    else if (selectedNode.value.type === 'code') {
      selectedNode.value.data.node_params = {
        config: {
          type: 'code',
          code: '',
        },
      }
    }
    else if (selectedNode.value.type === 'switch') {
      selectedNode.value.data.node_params = {
        branches: [
          {
            id: generateId(),
            relation: 'all',
            statements: [],
          },
        ],
      }
    }
    else {
      selectedNode.value.data.node_params = {}
    }
  }

  // 确保 model 对象存在（仅 LLM 节点）
  if ((selectedNode.value.type === 'llm' || selectedNode.value.type === 'purpose') && !selectedNode.value.data.node_params.model) {
    selectedNode.value.data.node_params.model = {
      provider: 'deepseek' | 'openai' | 'qwen' | 'ollama',
      api_key: '',
      base_url: '',
      top_p: 1,
      max_tokens: 4096,
      temperature: 1,
    }
  }

  // 确保模型参数有默认值（仅 LLM）
  if ((selectedNode.value.type === 'llm' || selectedNode.value.type === 'purpose') && selectedNode.value.data.node_params.model) {
    if (!selectedNode.value.data.node_params.model.top_p) {
      selectedNode.value.data.node_params.model.top_p = 1
    }
    if (!selectedNode.value.data.node_params.model.max_tokens) {
      selectedNode.value.data.node_params.model.max_tokens = 4096
    }
    if (!selectedNode.value.data.node_params.model.temperature) {
      selectedNode.value.data.node_params.model.temperature = 1
    }
  }

  // 确保 prompt 存在（仅 LLM）
  if (selectedNode.value.type === 'llm') {
    if (!selectedNode.value.data.node_params.prompt) {
      selectedNode.value.data.node_params.prompt = {
        user: '',
        system: '',
      }
    }
  }

  // 确保 inputs 和 outputs 存在
  if (!selectedNode.value.data.inputs) {
    selectedNode.value.data.inputs = []
  }
  if (!selectedNode.value.data.outputs) {
    selectedNode.value.data.outputs = []
  }

  // LLM 和意图识别节点：如果 inputs 为空，添加默认的 input 输入参数
  if ((selectedNode.value.type === 'llm' || selectedNode.value.type === 'purpose') && selectedNode.value.data.inputs.length === 0) {
    selectedNode.value.data.inputs.push({
      variable: 'input',
      type: 'string',
      desc: '',
      value: '',
      children: [],
      readonly: true,
    })
  }

  // SQL 节点：规范化 input_params
  if (selectedNode.value.type === 'sql') {
    const cfg = selectedNode.value.data?.node_params?.config
    if (cfg) {
      cfg.input_params = normalizeSqlInputParams(Array.isArray(cfg.input_params) ? cfg.input_params : [])
    }
  }
  // HTTP 节点：规范化 input_params
  if (selectedNode.value.type === 'http') {
    const cfg = selectedNode.value.data?.node_params?.config
    if (cfg) {
      cfg.input_params = normalizeSqlInputParams(Array.isArray(cfg.input_params) ? cfg.input_params : [])
    }
  }
  // RAG 节点：规范化 input_params（仅固定 query）
  if (selectedNode.value.type === 'rag') {
    const cfg = selectedNode.value.data?.node_params?.config
    if (cfg) {
      cfg.input_params = normalizeSqlInputParams(Array.isArray(cfg.input_params) ? cfg.input_params : [])
    }
  }
  // FAQ 节点：规范化 input_params（仅固定 query）
  if (selectedNode.value.type === 'faq') {
    const cfg = selectedNode.value.data?.node_params?.config
    if (cfg) {
      cfg.input_params = normalizeSqlInputParams(Array.isArray(cfg.input_params) ? cfg.input_params : [])
    }
  }

  // 如果 LLM 节点有模型id，设置selectedModelId
  if (selectedNode.value && (selectedNode.value.type === 'llm' || selectedNode.value.type === 'purpose') && selectedNode.value.data.node_params.model?.id) {
    selectedModelId.value = selectedNode.value.data.node_params.model.id
  }
  else if (selectedNode.value && (selectedNode.value.type === 'llm' || selectedNode.value.type === 'purpose') && selectedNode.value.data.node_params.model?.provider) {
    // 尝试根据provider查找匹配的模型
    const currentSelectedNode = selectedNode.value
    if (currentSelectedNode) {
      const matchingModel = models.value.find(
        (m: any) => m.provider === currentSelectedNode.data.node_params.model.provider,
      )
      if (matchingModel) {
        selectedModelId.value = matchingModel.id
      }
    }
  }
}

// 点击外部关闭菜单
function handleClickOutside(event: MouseEvent) {
  const target = event.target as HTMLElement
  if (menuRef.value && !menuRef.value.contains(target)) {
    showNodeMenu.value = false
  }
}

// 监听选中节点的数据变化，自动保存
let saveTimer: NodeJS.Timeout | null = null
watch(() => selectedNode.value?.data, () => {
  if (selectedNode.value && showNodeConfigDrawer.value) {
    // 清除之前的定时器
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    // 延迟保存，避免频繁更新
    saveTimer = setTimeout(() => {
      syncData()
    }, 500)
  }
}, { deep: true })

// 监听意图识别节点的意图类型变化，删除已删除的意图类型相关的边
watch(() => selectedNode.value?.data?.node_params?.categories, (newCategories, oldCategories) => {
  if (!selectedNode.value || selectedNode.value.type !== 'purpose') {
    return
  }

  const newCategoryIds = new Set(
    (Array.isArray(newCategories) ? newCategories : []).map((c: any) => c?.id).filter(Boolean),
  )
  const oldCategoryIds = new Set(
    (Array.isArray(oldCategories) ? oldCategories : []).map((c: any) => c?.id).filter(Boolean),
  )

  // 找出被删除的意图类型ID
  const deletedCategoryIds = Array.from(oldCategoryIds).filter(id => !newCategoryIds.has(id))

  // 删除与被删除意图类型相关的边（通过 sourceHandle 匹配）
  if (deletedCategoryIds.length > 0) {
    edges.value = edges.value.filter((edge) => {
      // 如果边的 source 是意图识别节点，且 sourceHandle 是被删除的意图类型ID，则删除这条边
      return !(
        edge.source === selectedNode.value?.id
        && edge.sourceHandle
        && deletedCategoryIds.includes(edge.sourceHandle as string)
      )
    })
    syncData()
  }
}, { deep: true })

// 当节点名称变化时，同步顶层 label 与 title，以及 data.title（用于兼容）
watch(() => selectedNode.value?.data?.name, (val) => {
  if (selectedNode.value) {
    const nameVal = (val as string) || ''
    ;(selectedNode.value as any).label = nameVal
    ;(selectedNode.value as any).title = nameVal
    // 同时更新 data.title 以保持兼容性（某些节点可能使用 data.title）
    if (selectedNode.value.data) {
      selectedNode.value.data.title = nameVal
    }
  }
})

// 防止同步冲突的标志
const isInternalUpdate = ref(false)
let syncTimer: NodeJS.Timeout | null = null

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  window.addEventListener('node-click', handleNodeClick as any)
  // 修复历史数据里 switch 边缺少 sourceHandle 导致连线贴到右上角的问题
  normalizeSwitchEdges()
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
  window.removeEventListener('node-click', handleNodeClick as any)
  if (syncTimer) {
    clearTimeout(syncTimer)
  }
  if (saveTimer) {
    clearTimeout(saveTimer)
  }
  if (isResizingDrawer)
    onDrawerResizeEnd()
  if (isResizingPreview)
    onPreviewResizeEnd()
})

// 节点类型菜单配置
const nodeTypeMenuItems = [
  { type: 'start', label: '开始' },
  { type: 'llm', label: 'LLM' },
  { type: 'http', label: 'HTTP' },
  { type: 'sql', label: 'SQL' },
  { type: 'rag', label: 'RAG' },
  { type: 'faq', label: 'FAQ' },
  { type: 'code', label: 'Code' },
  { type: 'purpose', label: '意图识别' },
  { type: 'switch', label: 'Switch' },
  { type: 'end', label: '结束' },
]

// 监听外部数据变化
watch(() => props.modelValue, (val) => {
  // 如果是内部更新触发的，不需要同步
  if (isInternalUpdate.value) {
    isInternalUpdate.value = false
    return
  }

  if (val) {
    // 兼容对象(map)与数组两种结构，统一规范为数组
    const incomingNodes = (Array.isArray(val.nodes) ? val.nodes : Object.values(val.nodes || {})) as any[]
    const incomingEdges = (Array.isArray(val.edges) ? val.edges : Object.values(val.edges || {})) as any[]

    // 规范化 edges 的 handle 值：将字符串 "null" 转换为 null
    const normalizedEdges = incomingEdges.map((edge: any) => ({
      ...edge,
      sourceHandle: edge.sourceHandle === 'null' || !edge.sourceHandle ? null : edge.sourceHandle,
      targetHandle: edge.targetHandle === 'null' || !edge.targetHandle ? null : edge.targetHandle,
    }))

    nodes.value = incomingNodes
    edges.value = normalizedEdges
  }
}, { deep: true })

// 监听本地节点和边的变化，自动同步（使用防抖）
watch([nodes, edges], () => {
  // 清除之前的定时器
  if (syncTimer) {
    clearTimeout(syncTimer)
  }

  // 设置新的定时器，延迟300ms后同步
  syncTimer = setTimeout(() => {
    if (!isInternalUpdate.value) {
      const data = {
        nodes: Array.isArray(nodes.value) ? [...nodes.value] : Object.values(nodes.value || {}),
        edges: Array.isArray(edges.value) ? [...edges.value] : Object.values(edges.value || {}),
      } as any
      isInternalUpdate.value = true
      emit('update:modelValue', data)
      emit('change', data)
    }
  }, 300)
}, { deep: true })

// 手动同步数据的方法
function syncData() {
  // 在同步前规范化 Switch 边：确保使用具体的 sourceHandle
  normalizeSwitchEdges()

  const data = {
    nodes: Array.isArray(nodes.value) ? [...nodes.value] : Object.values(nodes.value || {}),
    edges: Array.isArray(edges.value) ? [...edges.value] : Object.values(edges.value || {}),
  } as any

  // 设置标志，防止 watch 触发回写
  isInternalUpdate.value = true

  emit('update:modelValue', data)
  emit('change', data)
}

// 规范化与 Switch 节点相关的边，避免未绑定具体连接点导致连线错位
function normalizeSwitchEdges() {
  try {
    const localNodes = (Array.isArray(nodes.value) ? nodes.value : Object.values(nodes.value || {})) as any[]
    edges.value = ((Array.isArray(edges.value) ? edges.value : Object.values(edges.value || {})) as any[]).map((e: any) => {
      const sourceNode = (localNodes as any[]).find((n: any) => n.id === e.source)
      if (sourceNode?.type === 'switch') {
        const branches = sourceNode?.data?.node_params?.branches
        const count = Array.isArray(branches) ? branches.length : 0
        if (!e.sourceHandle) {
          // 如果没有 sourceHandle，尝试从 edge ID 中解析分支ID
          if (e.id && e.id.startsWith(`${e.source}-`)) {
            const remainingId = e.id.substring(e.source.length + 1)
            // 查找匹配的分支ID
            for (const branch of branches || []) {
              if (branch.id && remainingId.startsWith(`${branch.id}-`)) {
                e.sourceHandle = branch.id
                return e
              }
            }
          }
          // 如果无法解析，使用第一个分支ID作为默认值
          if (count > 0 && branches && branches[0]?.id) {
            e.sourceHandle = branches[0].id
          }
        }
        else if (typeof e.sourceHandle === 'string' && e.sourceHandle.startsWith('out-')) {
          // 兼容旧数据格式：out-0, out-1 等，转换为分支ID
          const idx = Number(e.sourceHandle.replace('out-', ''))
          if (Number.isFinite(idx) && count > 0 && idx < count && branches && branches[idx]?.id) {
            e.sourceHandle = branches[idx].id
          }
          else if (Number.isFinite(idx) && count > 0 && idx >= count && branches && branches[count - 1]?.id) {
            // 如果索引超出范围，使用最后一个分支
            e.sourceHandle = branches[count - 1].id
          }
        }
        // 如果 sourceHandle 已经是分支ID，验证它是否仍然有效
        else if (e.sourceHandle && Array.isArray(branches)) {
          const branchExists = branches.some((b: any) => b.id === e.sourceHandle)
          if (!branchExists && count > 0 && branches[0]?.id) {
            // 如果分支ID不存在，使用第一个分支ID
            e.sourceHandle = branches[0].id
          }
        }
      }
      return e
    }) as any
  }
  catch {
    // 忽略规范化异常
  }
}

// 节点类型组件映射 - 使用 markRaw 防止组件被响应式化
const nodeTypes = {
  start: markRaw(StartNode),
  end: markRaw(EndNode),
  llm: markRaw(LLMNode),
  purpose: markRaw(PurposeNode),
  sql: markRaw(SqlNode),
  http: markRaw(HttpNode),
  rag: markRaw(RagNode),
  faq: markRaw(FaqNode),
  code: markRaw(CodeNode),
  switch: markRaw(SwitchNode as any),
}

// 处理连接
function handleConnect(connection: Connection) {
  if (!connection.source || !connection.target)
    return

  // 获取源节点信息，判断是否为意图识别节点或条件节点
  const sourceNode = nodes.value.find((n: any) => n.id === connection.source) as any
  const isPurposeNode = sourceNode?.type === 'purpose'
  const isSwitchNode = sourceNode?.type === 'switch'

  // 检查是否已存在相同的边
  const edgeExists = edges.value.some((edge) => {
    // 对于意图识别节点，需要特殊处理：使用 sourceHandle 来匹配
    if (isPurposeNode && connection.sourceHandle) {
      return edge.sourceHandle === connection.sourceHandle
        && edge.target === connection.target
        && edge.targetHandle === (connection.targetHandle || null)
    }
    // 对于条件节点，需要特殊处理：使用 sourceHandle（分支ID）来匹配
    if (isSwitchNode && connection.sourceHandle) {
      return edge.sourceHandle === connection.sourceHandle
        && edge.target === connection.target
        && edge.targetHandle === (connection.targetHandle || null)
    }
    // 其他节点按原来的逻辑匹配
    return edge.source === connection.source
      && edge.target === connection.target
      && edge.sourceHandle === (connection.sourceHandle || null)
      && edge.targetHandle === (connection.targetHandle || null)
  })

  if (edgeExists)
    return

  // 获取 targetHandle 的实际值，如果是 null 或 undefined，使用 'null' 字符串
  const targetHandleValue = connection.targetHandle || 'null'

  const newEdge: Edge = {
    // 对于意图识别节点，edge ID 格式：${意图识别节点ID}-${意图类型ID}-${目标节点ID}-null
    // 对于条件节点，edge ID 格式：${条件节点ID}-${分支ID}-${目标节点ID}-null
    // 其他节点使用标准格式：${source}-${sourceHandle}-${target}-${targetHandle}
    id: isPurposeNode && connection.sourceHandle
      ? `${connection.source}-${connection.sourceHandle}-${connection.target}-null`
      : isSwitchNode && connection.sourceHandle
        ? `${connection.source}-${connection.sourceHandle}-${connection.target}-null`
        : `${connection.source}-${connection.sourceHandle || 'null'}-${connection.target}-${targetHandleValue}`,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle || null, // 对于意图识别节点是意图类型ID，对于条件节点是分支ID
    targetHandle: connection.targetHandle || null,
    type: 'default',
    data: {},
    label: '',
  }

  edges.value.push(newEdge)
  // 同步数据
  syncData()
}

// 处理节点变化
function handleNodesChange(changes: NodeChange[]) {
  let needSync = false

  // 处理节点删除
  changes.forEach((change) => {
    if (change.type === 'remove') {
      const nodeId = change.id
      // 删除与该节点相关的所有边
      edges.value = edges.value.filter(
        edge => edge.source !== nodeId && edge.target !== nodeId,
      )
      needSync = true
    }
  })

  // 只在有重要变化时同步（删除节点会影响边）
  if (needSync) {
    normalizeSwitchEdges()
    syncData()
  }
}

// 处理边变化
function handleEdgesChange(changes: EdgeChange[]) {
  let needSync = false

  // 处理边删除
  changes.forEach((change) => {
    if (change.type === 'remove') {
      edges.value = edges.value.filter(edge => edge.id !== change.id)
      needSync = true
    }
  })

  // 只在边被删除时同步
  if (needSync) {
    normalizeSwitchEdges()
    syncData()
  }
}

// 生成唯一 ID（UUID格式）
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 添加节点
function handleAddNode(type: string) {
  const newNode: Node = {
    id: generateId(),
    type,
    position: { x: Math.random() * 300 + 400, y: Math.random() * 200 + 200 },
    data: getDefaultNodeData(type),
    label: getNodeLabel(type),
  }

  nodes.value.push(newNode)
  showNodeMenu.value = false

  // 同步数据
  syncData()

  // 自动适应视图
  setTimeout(() => {
    // 触发视图适配
  }, 100)
}

// 处理拖拽开始
function handleDragStart(event: DragEvent, nodeType: string) {
  if (!event.dataTransfer)
    return

  isDragging.value = true
  draggedNodeType.value = nodeType
  event.dataTransfer.effectAllowed = 'move'

  // 设置拖拽时的视觉效果
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/vue-flow-node-type', nodeType)
    const dt = event.dataTransfer
    const image = document.createElement('div')
    image.innerHTML = `<div style="width: 100px; height: 40px; background: white; border: 2px solid #8b5cf6; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: #8b5cf6;">正在拖拽 ${getNodeLabel(nodeType)}</div>`
    image.style.position = 'absolute'
    image.style.top = '-1000px'
    document.body.appendChild(image)
    dt.setDragImage(image, 0, 0)
    setTimeout(() => document.body.removeChild(image), 0)
  }
}

// 处理拖拽结束
function handleDragEnd() {
  isDragging.value = false
  draggedNodeType.value = ''
}

// 处理画布拖拽进入
function handleCanvasDragOver(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()
  isDraggingOverCanvas.value = true
}

// 处理画布拖拽离开
function handleCanvasDragLeave() {
  isDraggingOverCanvas.value = false
}

// 处理画布放置
function handleCanvasDrop(event: DragEvent) {
  event.preventDefault()
  event.stopPropagation()

  if (!event.dataTransfer || !draggedNodeType.value || !vueFlowInstance.value)
    return

  const nodeType = event.dataTransfer.getData('application/vue-flow-node-type')
  if (!nodeType)
    return

  // 获取相对于画布的位置，需要考虑 viewport 的缩放和平移
  const point = vueFlowInstance.value.screenToFlowCoordinate({
    x: event.clientX,
    y: event.clientY,
  })

  // 创建新节点
  const newNode: Node = {
    id: generateId(),
    type: nodeType,
    position: point,
    data: getDefaultNodeData(nodeType),
    label: getNodeLabel(nodeType),
  }

  nodes.value.push(newNode)
  isDragging.value = false
  draggedNodeType.value = ''
  isDraggingOverCanvas.value = false
  showNodeMenu.value = false

  // 同步数据
  syncData()
}

// 处理画布准备好
function handlePaneReady(event: any) {
  vueFlowInstance.value = event
}

function getNodeLabel(type: string): string {
  const labelMap: Record<string, string> = {
    start: '开始',
    llm: 'LLM',
    http: 'HTTP',
    sql: 'SQL',
    rag: 'RAG',
    faq: 'FAQ',
    code: 'Code',
    purpose: '意图识别',
    switch: 'Switch',
    end: '结束',
  }
  return labelMap[type] || type
}

function getNodeIcon(type: string) {
  const icons: Record<string, any> = {
    start: {
      viewBox: '0 0 24 24',
      path: 'M8 5v14l11-7z',
    },
    llm: {
      viewBox: '0 0 24 24',
      paths: [
        { tag: 'circle', cx: '12', cy: '8', r: '2' },
        { tag: 'path', d: 'M8 21v-4h8v4M12 13v5' },
      ],
    },
    http: {
      viewBox: '0 0 24 24',
      paths: [
        { tag: 'path', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
        { tag: 'path', d: 'M8 12l2 2 4-4' },
      ],
    },
    sql: {
      viewBox: '0 0 24 24',
      path: 'M21 2v2H3V2h18M8 10v8H6v-8h2m6 0v8h-2v-8h2m6 0v8h-2v-8h2M3 22h18v-2H3v2M21 7v2H3V7h18',
    },
    rag: {
      viewBox: '0 0 24 24',
      path: 'M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z',
    },
    faq: {
      viewBox: '0 0 24 24',
      paths: [
        { tag: 'path', d: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z' },
        { tag: 'circle', cx: '12', cy: '9', r: '1' },
        { tag: 'path', d: 'M11 13h2v4h-2z' },
      ],
    },
    code: {
      viewBox: '0 0 24 24',
      path: 'M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0L19.2 12l-4.6-4.6L16 6l6 6-6 6-1.4-1.4z',
    },
    purpose: {
      viewBox: '0 0 24 24',
      path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
    },
    switch: {
      viewBox: '0 0 24 24',
      path: 'M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z',
    },
    end: {
      viewBox: '0 0 24 24',
      path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    },
  }
  return icons[type] || icons.llm
}

function getNodeIconColor(type: string): string {
  const colorMap: Record<string, string> = {
    start: '#8b5cf6',
    llm: '#3b82f6',
    http: '#10b981',
    sql: '#f59e0b',
    rag: '#8b5cf6',
    faq: '#6366f1',
    code: '#ef4444',
    purpose: '#8b5cf6',
    switch: '#06b6d4',
    end: '#8b5cf6',
  }
  return colorMap[type] || '#8b5cf6'
}

function getDefaultNodeData(type: string) {
  const baseData = {
    name: getNodeLabel(type),
    desc: '',
  }

  switch (type) {
    case 'start':
      return {
        ...baseData,
        desc: '工作流的开始节点',
        inputs: [
          {
            variable: 'question',
            type: 'string',
            value: '',
            children: [],
          },
        ],
      }
    case 'end':
      return {
        ...baseData,
        desc: '工作流的最终节点',
        outputs: [],
      }
    case 'llm':
      return {
        ...baseData,
        name: '大模型',
        desc: '大语言模型',
        inputs: [
          {
            variable: 'input',
            type: 'string',
            desc: '',
            value: '',
            children: [],
            readonly: true,
          },
        ],
        outputs: [],
        node_params: {
          model: {
            provider: '',
            api_key: '',
            base_url: '',
            top_p: 1,
            max_tokens: 4096,
            temperature: 1,
          },
          prompt: {
            user: '',
            system: '',
          },
          streaming: false,
        },
      }
    case 'purpose':
      return {
        ...baseData,
        name: '意图识别',
        desc: '使用自然语言描述不同的意图实现运行分支选择',
        inputs: [
          {
            variable: 'input',
            type: 'string',
            desc: '',
            value: '',
            children: [],
            readonly: true,
          },
        ],
        outputs: [],
        node_params: {
          model: {
            provider: '',
            api_key: '',
            base_url: '',
            top_p: 1,
            max_tokens: 4096,
            temperature: 1,
          },
          categories: [],
        },
      }
    case 'sql':
      return {
        ...baseData,
        name: 'SQL',
        desc: 'SQL 工具',
        inputs: [],
        outputs: [],
        node_params: {
          config: {
            type: 'sql',
            host: '',
            port: '',
            database: '',
            user: '',
            password: '',
            sql: '',
            name: '',
            input_params: [],
          },
        },
      }
    case 'http':
      return {
        ...baseData,
        name: 'HTTP',
        desc: 'HTTP 工具',
        inputs: [],
        outputs: [],
        node_params: {
          config: {
            type: 'http',
            method: '',
            url: '',
            headers: {},
            name: '',
            input_params: [],
          },
        },
      }
    case 'rag':
      return {
        ...baseData,
        name: 'RAG',
        desc: 'RAG 工具',
        inputs: [],
        outputs: [],
        node_params: {
          config: {
            type: 'rag',
            workspace_id: '',
            uploadIds: [],
            topK: 1,
            strategy: 'hybrid_search',
            input_params: [
              {
                children: [],
                name: 'query',
                description: '用户问题',
                location: 'body',
                type: 'string',
                required: false,
                param_type: 'static',
                value: '',
                reference: [],
              },
            ],
          },
        },
      }
    case 'faq':
      return {
        ...baseData,
        title: 'FAQ',
        desc: 'FAQ 工具',
        inputs: [],
        outputs: [],
        node_params: {
          config: {
            type: 'faq',
            score_threshold: 0.8,
            top_k: 1,
            upload_id: [],
            collection_id: '',
            workspace_id: '',
            input_params: [
              {
                children: [],
                name: 'query',
                description: '用户问题',
                location: 'body',
                type: 'string',
                required: false,
                param_type: 'static',
                value: '',
                reference: [],
              },
            ],
          },
        },
      }
    case 'switch':
      return {
        ...baseData,
        name: '条件分支',
        desc: '通过设置判断条件实现运行分支选择',
        inputs: [],
        outputs: [],
        node_params: {
          branches: [
            {
              id: generateId(),
              relation: 'all',
              statements: [],
            },
          ],
        },
      }
    case 'code':
      return {
        ...baseData,
        title: 'Code',
        desc: '代码执行',
        inputs: [],
        outputs: [],
        node_params: {
          config: {
            type: 'code',
            code: '',
          },
        },
      }
    default:
      return {
        ...baseData,
        inputs: [],
        outputs: [],
      }
  }
}

// 更新节点内部状态（用于动态连接点的位置更新）
function updateNodeInternals() {
  if (vueFlowInstance.value) {
    vueFlowInstance.value.updateNodeInternals()
  }
}

// 暴露节点类型映射和同步方法
defineExpose({
  nodeTypes,
  syncData,
  nodes,
  edges,
  showPreview,
  updateNodeInternals,
})
</script>

<template>
  <div ref="vueFlowWrapper" class="workflow-canvas-container" :class="{ 'dragging-over': isDraggingOverCanvas }">
    <VueFlow
      v-model="nodes"
      v-model:edges="edges"
      :node-types="nodeTypes"
      :fit-view-on-init="false"
      :connection-mode="ConnectionMode.Loose"
      :connection-radius="200"
      :default-viewport="{ x: 0, y: 0, zoom: 1 }"
      :snap-to-grid="false"
      :prevent-scrolling="false"
      :pan-on-scroll="true"
      delete-key-code="Backspace"
      :select-nodes-on-drag="false"
      :nodes-draggable="true"
      :edges-updatable="true"
      @connect="handleConnect"
      @nodes-change="handleNodesChange"
      @edges-change="handleEdgesChange"
      @dragover="handleCanvasDragOver"
      @dragleave="handleCanvasDragLeave"
      @drop="handleCanvasDrop"
      @pane-ready="handlePaneReady"
    >
      <!-- 点状网格背景 -->
      <Background
        pattern-color="#9ca3af"
        :pattern-size="20"
        :gap="24"
      />
    </VueFlow>

    <!-- 新增节点按钮 -->
    <div ref="menuRef" class="add-node-card" @click="showNodeMenu = !showNodeMenu">
      <n-button
        type="primary"
        size="small"
        class="add-node-btn"
      >
        <template #icon>
          <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path d="M8 3v10M3 8h10" stroke="currentColor" stroke-width="2" />
          </svg>
        </template>
        新增节点
      </n-button>

      <!-- 节点类型菜单 -->
      <Transition name="fade">
        <div v-if="showNodeMenu" class="node-type-menu">
          <!-- 小箭头 -->
          <div class="menu-arrow" />

          <div class="menu-content">
            <div
              v-for="(node, index) in nodeTypeMenuItems"
              :key="index"
              class="node-type-item"
              :class="{ dragging: isDragging && draggedNodeType === node.type }"
              :draggable="true"
              @click.stop="handleAddNode(node.type)"
              @dragstart="handleDragStart($event, node.type)"
              @dragend="handleDragEnd"
            >
              <div class="node-type-icon" :style="{ background: getNodeIconColor(node.type) }">
                <svg :viewBox="getNodeIcon(node.type).viewBox" width="20" height="20" fill="currentColor">
                  <path v-if="getNodeIcon(node.type).path" :d="getNodeIcon(node.type).path" />
                  <template v-else>
                    <component :is="item.tag" v-for="(item, idx) in getNodeIcon(node.type).paths" :key="idx" v-bind="item" />
                  </template>
                </svg>
              </div>
              <span class="node-type-name">{{ node.label }}</span>
            </div>
          </div>
        </div>
      </Transition>
    </div>

    <!-- 预览抽屉 -->
    <Transition name="slide-fade">
      <div v-if="showPreviewDrawer" class="node-config-drawer preview-drawer" :style="{ width: `${previewDrawerWidth}px` }">
        <!-- 左侧拖拽手柄（预览） -->
        <div class="drawer-resize-handle" @mousedown.prevent="onPreviewResizeStart" />
        <div class="drawer-header">
          <span style="font-size: 16px; font-weight: 600; color: #1f2937; flex: 1;">预览调试</span>
          <n-button quaternary size="small" circle @click="closePreviewDrawer">
            <template #icon>
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M12.854 3.646a.5.5 0 0 0-.708 0L8 7.793 3.854 3.646a.5.5 0 0 0-.708.708L7.293 8.5 3.146 12.646a.5.5 0 0 0 .708.708L8 9.207l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 8.5l4.147-4.146a.5.5 0 0 0 0-.708z" />
              </svg>
            </template>
          </n-button>
        </div>
        <div class="drawer-content">
          <PreviewDebug
            v-if="props.workflowFormData && props.onSave"
            :name="props.workflowFormData.name"
            :zh_name="props.workflowFormData.zh_name"
            :description="props.workflowFormData.description"
            :prologue="props.workflowFormData.prologue"
            :leading_question="props.workflowFormData.leading_question"
            agent-type="workflow"
            :on-save="props.onSave"
          />
        </div>
      </div>
    </Transition>

    <!-- 节点配置抽屉 -->
    <Transition name="slide-fade">
      <div v-if="showNodeConfigDrawer && selectedNode" class="node-config-drawer" :style="{ width: `${drawerWidth}px` }">
        <!-- 左侧拖拽手柄 -->
        <div class="drawer-resize-handle" @mousedown.prevent="onDrawerResizeStart" />
        <div class="drawer-header">
          <template v-if="selectedNode.type === 'end'">
            <span style="font-size: 14px; color: #1f2937; flex: 1;">结束</span>
          </template>
          <template v-else>
            <n-input
              v-model:value="selectedNode.data.name"
              placeholder="节点名称"
              size="small"
              style="flex: 1;"
            />
          </template>
          <n-button quaternary size="small" circle @click="closeNodeConfigDrawer">
            <template #icon>
              <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                <path d="M12.854 3.646a.5.5 0 0 0-.708 0L8 7.793 3.854 3.646a.5.5 0 0 0-.708.708L7.293 8.5 3.146 12.646a.5.5 0 0 0 .708.708L8 9.207l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 8.5l4.147-4.146a.5.5 0 0 0 0-.708z" />
              </svg>
            </template>
          </n-button>
        </div>
        <div class="drawer-content">
          <n-collapse>
            <!-- 节点描述 -->
            <n-collapse-item title="节点描述" name="1">
              <n-input
                v-model:value="selectedNode.data.desc"
                type="textarea"
                placeholder="请输入节点描述"
                :rows="3"
                size="small"
              />
            </n-collapse-item>

            <!-- 输入参数（SQL、HTTP、RAG、FAQ、END、SWITCH 节点不需要） -->
            <n-collapse-item v-if="selectedNode.type !== 'sql' && selectedNode.type !== 'http' && selectedNode.type !== 'rag' && selectedNode.type !== 'faq' && selectedNode.type !== 'end' && selectedNode.type !== 'switch'" title="输入参数" name="4">
              <div class="config-section">
                <n-button tertiary style="margin-bottom: 12px;" @click="addInput">
                  <template #icon>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                    </svg>
                  </template>
                  新增参数
                </n-button>

                <div class="input-params-list">
                  <template v-for="item in getAllInputParams()" :key="`${item.parentIndex || 'root'}-${item.index}`">
                    <div
                      class="input-param-item"
                      :class="{ nested: item.level > 0 }"
                      :style="{ marginLeft: `${item.level * 16}px` }"
                    >
                      <div class="param-row">
                        <!-- 展开/收起按钮 -->
                        <div class="expand-btn">
                          <template v-if="item.param.children && item.param.children.length > 0">
                            <n-button
                              text
                              size="small"
                              @click="toggleInputParamExpansion(getInputExpansionKey(item))"
                            >
                              <template #icon>
                                <svg v-if="expandedInputParams.has(getInputExpansionKey(item))" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                </svg>
                                <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                </svg>
                              </template>
                            </n-button>
                          </template>
                          <span v-else style="width: 14px; display: inline-block;" />
                        </div>

                        <!-- 参数名 -->
                        <n-input
                          :value="item.param.variable"
                          placeholder="参数名（仅支持字母、数字、下划线和连字符）"
                          size="small"
                          class="flex-1"
                          :disabled="item.param?.readonly === true || item.param?.variable === 'input'"
                          @update:value="(val) => handleParamNameInput(item.param, val)"
                        />

                        <!-- 参数类型 -->
                        <n-select
                          v-model:value="item.param.type"
                          :options="getInputParamTypeOptions(item.level)"
                          size="small"
                          class="flex-1"
                        />

                        <!-- 参数值 -->
                        <div class="param-value-inline flex-1">
                          <template v-if="item.param.type === 'reference'">
                            <n-cascader
                              placement="bottom-end"
                              :value="Array.isArray(item.param.value) && item.param.value.length === 2 ? item.param.value[1] : item.param.value"
                              :options="getReferenceOptions() as any"
                              placeholder="参数值"
                              size="small"
                              check-strategy="child"
                              @update:value="(_: any, __: any, path: any[]) => {
                                // 级联选择器的第三个参数path是选项对象数组，需要提取value属性保存完整路径 [节点id, 参数名]
                                item.param.value = Array.isArray(path) ? path.map((p: any) => p.value) : []
                              }"
                            />
                          </template>
                          <template v-else>
                            <n-input
                              v-model:value="item.param.value"
                              placeholder="参数值"
                              type="text"
                              size="small"
                            />
                          </template>
                        </div>

                        <!-- 参数描述 -->
                        <n-input
                          v-model:value="item.param.desc"
                          placeholder="参数描述"
                          size="small"
                          class="flex-1"
                        />

                        <!-- 操作按钮 -->
                        <div class="flex items-center">
                          <!-- 添加子参数按钮 -->
                          <n-tooltip v-if="canAddChildInputParam(item.param, item.level)" trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="primary"
                                @click="addChildInputParam(item.parentIndex !== undefined ? getInputExpansionKey(item) : item.index, item.parentIndex !== undefined)"
                              >
                                <template #icon>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
                                  </svg>
                                </template>
                              </n-button>
                            </template>
                            {{ item.param.type === 'object' ? '添加对象属性' : '添加数组元素' }}
                          </n-tooltip>

                          <!-- 删除按钮 -->
                          <n-tooltip trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="error"
                                @click="item.parentIndex !== undefined ? removeChildInputParam(item.parentIndex, item.index, typeof item.parentIndex === 'string') : removeInput(item.index)"
                              >
                                <template #icon>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                  </svg>
                                </template>
                              </n-button>
                            </template>
                            {{ hasInputChildren(item.param) ? '删除参数及其所有子参数' : '删除参数' }}
                          </n-tooltip>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </n-collapse-item>

            <!-- Code（仅 Code 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'code'" title="Code" name="code-panel">
              <div class="config-section">
                <CodeEditor
                  v-model="selectedNode.data.node_params.config.code"
                  language="python"
                />
              </div>
            </n-collapse-item>

            <!-- 条件分支（仅 Switch 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'switch'" title="条件分支" name="switch-branches">
              <div class="config-section">
                <!-- 节点描述已在通用面板 -->

                <n-button tertiary style="margin-bottom: 12px;" @click="addBranch">
                  <template #icon>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                    </svg>
                  </template>
                  新增分支
                </n-button>

                <div v-for="(branch, bIdx) in (selectedNode as any).data.node_params?.branches || []" :key="branch.id" class="input-param-item" style="padding: 10px 10px 8px; border-left: 3px solid #e5e7eb;">
                  <div class="param-row" style="align-items: center; margin-bottom: 6px;">
                    <span class="label" style="width: 64px; color: #6b7280;">{{ bIdx === 0 ? '如果' : (bIdx === (((selectedNode as any).data.node_params?.branches?.length || 0) - 1) ? '否则' : '否则如果') }}</span>
                    <n-select
                      v-if="branch.statements?.length"
                      v-model:value="branch.relation"
                      :options="[{ label: '且', value: 'all' }, { label: '或', value: 'or' }]"
                      size="small"
                      style="width: 100px; margin-right: 8px;"
                    />
                    <n-button text size="small" type="error" @click="removeBranch(bIdx)">
                      <template #icon>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                      </template>
                    </n-button>
                  </div>

                  <!-- 条件列表 -->
                  <div v-for="(stmt, sIdx) in (branch.statements || [])" :key="sIdx" class="param-row" style="position: relative;">
                    <!-- 引用参数（var1 固定 reference） -->
                    <n-cascader
                      :value="Array.isArray(stmt.var1.value) && stmt.var1.value.length === 2 ? stmt.var1.value[1] : stmt.var1.value"
                      placement="bottom-end"
                      :options="getReferenceOptions() as any"
                      placeholder="引用参数"
                      check-strategy="child"
                      size="small"
                      style="width: 130px;"
                      @update:value="(_: any, __: any, path: any[]) => {
                        // 级联选择器的第三个参数path是选项对象数组，需要提取value属性保存完整路径 [节点id, 参数名]
                        stmt.var1.value = Array.isArray(path) ? path.map((p: any) => p.value) : []
                      }"
                    />

                    <!-- 操作符 -->
                    <n-select
                      v-model:value="stmt.operator"
                      :options="switchOperatorOptions"
                      size="small"
                      style="width: 130px;"
                    />

                    <!-- 比较值类型 -->
                    <n-select
                      v-model:value="stmt.var2.type"
                      :options="var2TypeOptions"
                      size="small"
                      style="width: 80px;"
                    />

                    <!-- 比较值输入 -->
                    <div class="param-value-inline" style="width: 130px;">
                      <template v-if="stmt.var2.type === 'reference'">
                        <n-cascader
                          :value="Array.isArray(stmt.var2.value) && stmt.var2.value.length === 2 ? stmt.var2.value[1] : stmt.var2.value"
                          placement="bottom-end"
                          :options="getReferenceOptions() as any"
                          placeholder="选择引用"
                          size="small"
                          check-strategy="child"
                          @update:value="(_: any, __: any, path: any[]) => {
                            // 级联选择器的第三个参数path是选项对象数组，需要提取value属性保存完整路径 [节点id, 参数名]
                            stmt.var2.value = Array.isArray(path) ? path.map((p: any) => p.value) : []
                          }"
                        />
                      </template>
                      <template v-else-if="stmt.var2.type === 'bool'">
                        <n-switch v-model:value="stmt.var2.value" size="small" />
                      </template>
                      <template v-else>
                        <n-input v-model:value="stmt.var2.value" placeholder="比较值" size="small" />
                      </template>
                    </div>

                    <n-button text size="small" type="error" @click="removeStatement(bIdx, sIdx)">
                      <template #icon>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                      </template>
                    </n-button>
                  </div>

                  <n-button tertiary size="small" style="margin-top: 6px;" @click="addStatement(bIdx)">
                    <template #icon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                    </template>
                    添加条件
                  </n-button>
                </div>
              </div>
            </n-collapse-item>

            <!-- RAG 工具（仅 RAG 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'rag'" title="RAG工具" name="rag-tool">
              <div class="config-section">
                <!-- 未选择时：大号虚线卡片作为触发器 -->
                <div v-if="!selectedNode.data?.node_params?.config || !selectedNode.data?.node_params?.config?.workspace_id">
                  <div
                    class="dashed-select-card"
                    @click="() => (ragModalRef as any)?.openModal([], [])"
                  >
                    <div class="dashed-card-inner">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                      <div class="title">
                        选择RAG
                      </div>
                      <div class="desc">
                        从RAG库中选择一个 RAG
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 已选择时：展示已选RAG信息 -->
                <div v-else>
                  <n-card :bordered="true" size="small" class="selected-tool-card" content-style="padding: 12px;">
                    <div class="selected-tool p-3">
                      <div class="info">
                        <div class="name">
                          {{ selectedNode.data?.node_params?.config?.name || 'RAG' }}
                        </div>
                        <div v-if="selectedNode.data?.node_params?.config?.description" class="desc">
                          {{ selectedNode.data.node_params.config.description }}
                        </div>
                      </div>
                      <div class="actions">
                        <n-button size="small" secondary round @click="() => (ragModalRef as any)?.openModal([], [])">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" /></svg>
                          </template>
                          更换
                        </n-button>
                        <n-button size="small" quaternary type="error" round @click="() => { (selectedNode as any).data.name = ''; (selectedNode as any).data.node_params.config = { type: 'rag', workspace_id: '', uploadIds: [], topK: 1, strategy: 'hybrid_search', name: '', description: '', input_params: [{ children: [], name: 'query', description: '用户问题', location: 'body', type: 'string', required: false, param_type: 'static', value: '', reference: [] }] } }">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </template>
                          删除
                        </n-button>
                      </div>
                    </div>
                  </n-card>

                  <!-- 参数配置：仅固定 query -->
                  <div class="config-section" style="margin-top: 12px;">
                    <div class="config-item" style="padding: 0; background: transparent; border: none;">
                      <span class="label">参数配置</span>
                    </div>
                    <div class="input-params-list">
                      <div class="input-param-item">
                        <div class="param-row">
                          <span style="width: 14px; display: inline-block;" />
                          <n-input value="query" size="small" disabled style="width: 140px; margin-right: 8px;" />
                          <n-select
                            v-model:value="(selectedNode as any).data.node_params.config.input_params[0].param_type"
                            :options="[
                              { label: 'static', value: 'static' },
                              { label: 'reference', value: 'reference' },
                            ]"
                            size="small"
                            style="width: 120px; margin-right: 8px;"
                          />
                          <div class="param-value-inline">
                            <div v-if="(selectedNode as any).data.node_params.config.input_params[0].param_type === 'reference'">
                              <n-cascader
                                placement="bottom-end"
                                :value="Array.isArray((selectedNode as any).data.node_params.config.input_params[0].reference) ? (selectedNode as any).data.node_params.config.input_params[0].reference[1] : (selectedNode as any).data.node_params.config.input_params[0].reference"
                                :options="getReferenceOptions() as any"
                                placeholder="参数值"
                                size="small"
                                check-strategy="child"
                                style="width: 180px;"
                                @update:value="(_: any, __: any, path: any[]) => { (selectedNode as any).data.node_params.config.input_params[0].reference = Array.isArray(path) ? path.map((p: any) => p.value) : [] }"
                              />
                            </div>
                            <div v-else>
                              <n-input v-model:value="(selectedNode as any).data.node_params.config.input_params[0].value" placeholder="请输入参数值" size="small" style="width: 180px;" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-collapse-item>

            <!-- FAQ 工具（仅 FAQ 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'faq'" title="FAQ工具" name="faq-tool">
              <div class="config-section">
                <!-- 未选择时：大号虚线卡片作为触发器 -->
                <div v-if="!selectedNode.data?.node_params?.config || !selectedNode.data?.node_params?.config?.collection_id">
                  <div
                    class="dashed-select-card"
                    @click="() => (faqModalRef as any)?.openModal([], [])"
                  >
                    <div class="dashed-card-inner">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                      <div class="title">
                        选择FAQ集合
                      </div>
                      <div class="desc">
                        从FAQ库中选择一个 FAQ 集合
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 已选择时：展示已选FAQ集合信息 -->
                <div v-else>
                  <n-card :bordered="true" size="small" class="selected-tool-card" content-style="padding: 12px;">
                    <div class="selected-tool p-3">
                      <div class="info">
                        <div class="name">
                          {{ selectedNode.data?.node_params?.config?.name || 'FAQ' }}
                        </div>
                        <div v-if="selectedNode.data?.node_params?.config?.collectionName" class="desc">
                          {{ selectedNode.data.node_params.config.collectionName }}
                        </div>
                      </div>
                      <div class="actions">
                        <n-button size="small" secondary round @click="() => (faqModalRef as any)?.openModal([], [])">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" /></svg>
                          </template>
                          更换
                        </n-button>
                        <n-button size="small" quaternary type="error" round @click="() => { (selectedNode as any).data.name = ''; (selectedNode as any).data.node_params.config = { type: 'faq', score_threshold: 0.8, top_k: 1, upload_id: [], collection_id: '', workspace_id: '', collectionName: '', input_params: [{ children: [], name: 'query', description: '用户问题', location: 'body', type: 'string', required: false, param_type: 'static', value: '', reference: [] }] } }">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </template>
                          删除
                        </n-button>
                      </div>
                    </div>
                  </n-card>

                  <!-- 参数配置：仅固定 query -->
                  <div class="config-section" style="margin-top: 12px;">
                    <div class="config-item" style="padding: 0; background: transparent; border: none;">
                      <span class="label">参数配置</span>
                    </div>
                    <div class="input-params-list">
                      <div class="input-param-item">
                        <div class="param-row">
                          <span style="width: 14px; display: inline-block;" />
                          <n-input value="query" size="small" disabled style="width: 140px; margin-right: 8px;" />
                          <n-select
                            v-model:value="(selectedNode as any).data.node_params.config.input_params[0].param_type"
                            :options="[
                              { label: 'static', value: 'static' },
                              { label: 'reference', value: 'reference' },
                            ]"
                            size="small"
                            style="width: 120px; margin-right: 8px;"
                          />
                          <div class="param-value-inline">
                            <div v-if="(selectedNode as any).data.node_params.config.input_params[0].param_type === 'reference'">
                              <n-cascader
                                placement="bottom-end"
                                :value="Array.isArray((selectedNode as any).data.node_params.config.input_params[0].reference) ? (selectedNode as any).data.node_params.config.input_params[0].reference[1] : (selectedNode as any).data.node_params.config.input_params[0].reference"
                                :options="getReferenceOptions() as any"
                                placeholder="参数值"
                                size="small"
                                check-strategy="child"
                                style="width: 180px;"
                                @update:value="(_: any, __: any, path: any[]) => { (selectedNode as any).data.node_params.config.input_params[0].reference = Array.isArray(path) ? path.map((p: any) => p.value) : [] }"
                              />
                            </div>
                            <div v-else>
                              <n-input v-model:value="(selectedNode as any).data.node_params.config.input_params[0].value" placeholder="请输入参数值" size="small" style="width: 180px;" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </n-collapse-item>

            <!-- 模型选择器（LLM、Purpose） -->
            <n-collapse-item v-if="selectedNode.type === 'llm' || selectedNode.type === 'purpose'" title="模型" name="2">
              <div class="config-section">
                <!-- 模型选择 -->
                <div class="config-form-item">
                  <span class="label">选择模型</span>
                  <n-select
                    v-model:value="selectedModelId"
                    :options="models.map((m: any) => ({
                      label: m.name,
                      value: m.id,
                      provider: m.provider,
                    }))"
                    placeholder="选择模型"
                    :render-label="(option: any) => {
                      if (!option || !option.provider) return h('span', null, '选择模型')
                      const iconPath = getProviderIconPath(option.provider)
                      if (!iconPath) return h('span', null, option.label)
                      return h('div', { style: 'display: flex; align-items: center; gap: 8px;' }, [
                        h('img', {
                          src: toIcon(iconPath),
                          style: 'width: 16px; height: 16px; object-fit: contain;',
                          onError: (e: any) => {
                            e.target.style.display = 'none'
                          },
                        }),
                        h('span', null, option.label),
                      ])
                    }"
                    @update:value="selectModel"
                  />
                </div>

                <!-- Top P -->
                <div v-if="selectedNode.data.node_params?.model" class="config-form-item">
                  <span class="label">Top P</span>
                  <n-slider
                    v-model:value="selectedNode.data.node_params.model.top_p"
                    :step="0.1"
                    :min="0"
                    :max="1"
                    :format-tooltip="(v: number) => v.toFixed(1)"
                    style="width: 100%;"
                  />
                </div>

                <!-- Max Tokens -->
                <div v-if="selectedNode.data.node_params?.model" class="config-form-item">
                  <span class="label">Max Tokens</span>
                  <n-input-number
                    v-model:value="selectedNode.data.node_params.model.max_tokens"
                    :min="1"
                    style="width: 100%;"
                  />
                </div>

                <!-- Temperature -->
                <div v-if="selectedNode.data.node_params?.model" class="config-form-item">
                  <span class="label">Temperature</span>
                  <n-slider
                    v-model:value="selectedNode.data.node_params.model.temperature"
                    :step="0.1"
                    :min="0"
                    :max="1"
                    :format-tooltip="(v: number) => v.toFixed(1)"
                    style="width: 100%;"
                  />
                </div>
              </div>
            </n-collapse-item>

            <!-- 提示词（仅 LLM） -->
            <n-collapse-item v-if="selectedNode.type === 'llm'" title="提示词" name="3">
              <n-input
                v-if="selectedNode.data.node_params?.prompt"
                v-model:value="selectedNode.data.node_params.prompt.user"
                type="textarea"
                placeholder="请输入提示词"
                :rows="5"
                size="small"
              />
            </n-collapse-item>

            <!-- SQL 工具（仅 SQL 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'sql'" title="SQL工具" name="sql-tool">
              <div class="config-section">
                <!-- 未选择时：大号虚线卡片作为触发器 -->
                <div v-if="!selectedNode.data?.node_params?.config || !selectedNode.data?.node_params?.config?.database">
                  <div
                    class="dashed-select-card"
                    @click="() => (toolModalRef as any)?.openModal([], [], { type: 'sql', single: true })"
                  >
                    <div class="dashed-card-inner">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                      <div class="title">
                        选择SQL工具
                      </div>
                      <div class="desc">
                        从工具库中选择一个 SQL 工具
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 已选择时：展示已选工具信息 -->
                <div v-else>
                  <n-card :bordered="true" size="small" class="selected-tool-card" content-style="padding: 12px;">
                    <div class="selected-tool p-3">
                      <div class="info">
                        <div class="name">
                          {{ selectedNode.data?.name || 'SQL' }}
                        </div>
                        <div v-if="selectedNode.data?.node_params?.config?.description" class="desc">
                          {{ selectedNode.data.node_params.config.description }}
                        </div>
                      </div>
                      <div class="actions">
                        <n-button size="small" secondary round @click="() => (toolModalRef as any)?.openModal([], [], { type: 'sql', single: true })">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" /></svg>
                          </template>
                          更换
                        </n-button>
                        <n-button size="small" quaternary type="error" round @click="() => { (selectedNode as any).data.name = ''; (selectedNode as any).data.node_params.config = { type: 'sql', host: '', port: 3306, database: '', user: '', password: '', sql: '', description: '', name: '', input_params: [] } }">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </template>
                          删除
                        </n-button>
                      </div>
                    </div>
                  </n-card>

                  <!-- 参数配置：展示 input_params -->
                  <div class="config-section" style="margin-top: 12px;">
                    <div class="config-item" style="padding: 0; background: transparent; border: none;">
                      <span class="label">参数配置</span>
                    </div>
                    <div class="input-params-list">
                      <template v-for="item in getAllSqlInputParams()" :key="`${item.parentIndex || 'root'}-${item.index}`">
                        <div class="input-param-item" :class="{ nested: item.level > 0 }" :style="{ marginLeft: `${item.level * 16}px` }">
                          <div class="param-row">
                            <!-- 展开/收起按钮 -->
                            <div class="expand-btn">
                              <template v-if="hasSqlChildren(item.param)">
                                <n-button text size="small" @click="toggleSqlParamExpansion(getSqlExpansionKey(item))">
                                  <template #icon>
                                    <svg v-if="expandedSqlParams.has(getSqlExpansionKey(item))" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                    </svg>
                                    <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                    </svg>
                                  </template>
                                </n-button>
                              </template>
                              <span v-else style="width: 14px; display: inline-block;" />
                            </div>

                            <!-- 参数名（不可编辑） -->
                            <n-input :value="item.param.name" size="small" disabled style="width: 140px; margin-right: 8px;" />

                            <!-- 参数类型（static/reference） -->
                            <n-select
                              v-model:value="item.param.param_type"
                              :options="[
                                { label: 'static', value: 'static' },
                                { label: 'reference', value: 'reference' },
                              ]"
                              size="small"
                              style="width: 120px; margin-right: 8px;"
                            />

                            <!-- 值或引用选择器 -->
                            <div class="param-value-inline">
                              <div v-if="item.param.param_type === 'reference'">
                                <n-cascader
                                  placement="bottom-end"
                                  :value="Array.isArray(item.param.reference) ? item.param.reference[1] : item.param.reference"
                                  :options="getReferenceOptions() as any"
                                  placeholder="参数值"
                                  size="small"
                                  check-strategy="child"
                                  style="width: 180px;"
                                  @update:value="(_: any, __: any, path: any[]) => { item.param.reference = Array.isArray(path) ? path.map((p: any) => p.value) : [] }"
                                />
                              </div>
                              <div v-else>
                                <n-input v-model:value="item.param.value" placeholder="请输入参数值" size="small" style="width: 180px;" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </n-collapse-item>

            <!-- HTTP 工具（仅 HTTP 节点） -->
            <n-collapse-item v-if="selectedNode.type === 'http'" title="HTTP工具" name="http-tool">
              <div class="config-section">
                <!-- 未选择时：大号虚线卡片作为触发器 -->
                <div v-if="!selectedNode.data?.node_params?.config || !selectedNode.data?.node_params?.config?.url">
                  <div
                    class="dashed-select-card"
                    @click="() => (toolModalRef as any)?.openModal([], [], { type: 'http', single: true })"
                  >
                    <div class="dashed-card-inner">
                      <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
                        <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                      </svg>
                      <div class="title">
                        选择HTTP工具
                      </div>
                      <div class="desc">
                        从工具库中选择一个 HTTP 工具
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 已选择时：展示已选工具信息 -->
                <div v-else>
                  <n-card :bordered="true" size="small" class="selected-tool-card" content-style="padding: 12px;">
                    <div class="selected-tool p-3">
                      <div class="info">
                        <div class="name">
                          {{ selectedNode.data.node_params.config.name || 'HTTP' }}
                        </div>
                        <div v-if="selectedNode.data?.node_params?.config?.description" class="desc">
                          {{ selectedNode.data.node_params.config.description }}
                        </div>
                      </div>
                      <div class="actions">
                        <n-button size="small" secondary round @click="() => (toolModalRef as any)?.openModal([], [], { type: 'http', single: true })">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.33H5v-.92l9.06-9.06.92.92L5.92 19.58zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" /></svg>
                          </template>
                          更换
                        </n-button>
                        <n-button size="small" quaternary type="error" round @click="() => { (selectedNode as any).data.name = ''; (selectedNode as any).data.node_params.config = { type: 'http', method: 'GET', url: '', headers: {}, description: '', name: '', input_params: [] } }">
                          <template #icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>
                          </template>
                          删除
                        </n-button>
                      </div>
                    </div>
                  </n-card>

                  <!-- 参数配置：展示 input_params -->
                  <div class="config-section" style="margin-top: 12px;">
                    <div class="config-item" style="padding: 0; background: transparent; border: none;">
                      <span class="label">参数配置</span>
                    </div>
                    <div class="input-params-list">
                      <template v-for="item in getAllSqlInputParams()" :key="`${item.parentIndex || 'root'}-${item.index}`">
                        <div class="input-param-item" :class="{ nested: item.level > 0 }" :style="{ marginLeft: `${item.level * 16}px` }">
                          <div class="param-row">
                            <!-- 展开/收起按钮 -->
                            <div class="expand-btn">
                              <template v-if="hasSqlChildren(item.param)">
                                <n-button text size="small" @click="toggleSqlParamExpansion(getSqlExpansionKey(item))">
                                  <template #icon>
                                    <svg v-if="expandedSqlParams.has(getSqlExpansionKey(item))" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                    </svg>
                                    <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                    </svg>
                                  </template>
                                </n-button>
                              </template>
                              <span v-else style="width: 14px; display: inline-block;" />
                            </div>

                            <!-- 参数名（不可编辑） -->
                            <n-input :value="item.param.name" size="small" disabled style="width: 140px; margin-right: 8px;" />

                            <!-- 参数类型（static/reference） -->
                            <n-select
                              v-model:value="item.param.param_type"
                              :options="[
                                { label: 'static', value: 'static' },
                                { label: 'reference', value: 'reference' },
                              ]"
                              size="small"
                              style="width: 120px; margin-right: 8px;"
                            />

                            <!-- 值或引用选择器 -->
                            <div class="param-value-inline">
                              <div v-if="item.param.param_type === 'reference'">
                                <n-cascader
                                  placement="bottom-end"
                                  :value="Array.isArray(item.param.reference) ? item.param.reference[1] : item.param.reference"
                                  :options="getReferenceOptions() as any"
                                  placeholder="参数值"
                                  size="small"
                                  check-strategy="child"
                                  style="width: 180px;"
                                  @update:value="(_: any, __: any, path: any[]) => { item.param.reference = Array.isArray(path) ? path.map((p: any) => p.value) : [] }"
                                />
                              </div>
                              <div v-else>
                                <n-input v-model:value="item.param.value" placeholder="请输入参数值" size="small" style="width: 180px;" />
                              </div>
                            </div>
                          </div>
                        </div>
                      </template>
                    </div>
                  </div>
                </div>
              </div>
            </n-collapse-item>

            <!-- 意图类型（仅 Purpose） -->
            <n-collapse-item v-if="selectedNode.type === 'purpose'" title="意图类型" name="purpose-categories">
              <div class="config-section">
                <n-dynamic-input
                  v-model:value="(selectedNode as any).data.node_params.categories"
                  :on-create="() => ({ id: generateId(), content: '' })"
                >
                  <template #default="{ value }">
                    <div class="param-row" style="display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0;">
                      <n-input v-model:value="value.content" placeholder="请输入意图描述" size="medium" style="flex: 1; min-width: 0;" />
                    </div>
                  </template>
                </n-dynamic-input>
              </div>
            </n-collapse-item>

            <!-- 输出参数（Purpose 与 Switch 不支持） -->
            <n-collapse-item v-if="selectedNode.type !== 'purpose' && selectedNode.type !== 'switch'" title="输出参数" name="5">
              <div class="config-section">
                <n-button tertiary style="margin-bottom: 12px;" @click="addOutput">
                  <template #icon>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
                    </svg>
                  </template>
                  新增参数
                </n-button>

                <div class="input-params-list">
                  <template v-for="item in getAllOutputParams()" :key="`${item.parentIndex || 'root'}-${item.index}`">
                    <div
                      class="input-param-item"
                      :class="{ nested: item.level > 0 }"
                      :style="{ marginLeft: `${item.level * 16}px` }"
                    >
                      <div class="param-row">
                        <!-- 展开/收起按钮 -->
                        <div class="expand-btn">
                          <template v-if="item.param.children && item.param.children.length > 0">
                            <n-button
                              text
                              size="small"
                              @click="toggleOutputParamExpansion(getOutputExpansionKey(item))"
                            >
                              <template #icon>
                                <svg v-if="expandedOutputParams.has(getOutputExpansionKey(item))" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                </svg>
                                <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                  <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                </svg>
                              </template>
                            </n-button>
                          </template>
                          <span v-else style="width: 14px; display: inline-block;" />
                        </div>

                        <!-- 参数名 -->
                        <n-input
                          :value="item.param.variable"
                          placeholder="参数名（仅支持字母、数字、下划线和连字符）"
                          size="small"
                          class="flex-1"
                          @update:value="(val) => handleParamNameInput(item.param, val)"
                        />

                        <!-- 参数类型 -->
                        <n-select
                          v-model:value="item.param.type"
                          :options="getInputParamTypeOptions(item.level)"
                          size="small"
                          class="flex-1"
                        />

                        <!-- 参数值 -->
                        <div class="param-value-inline flex-1">
                          <template v-if="item.param.type === 'reference'">
                            <n-cascader
                              placement="bottom-end"
                              :value="Array.isArray(item.param.value) && item.param.value.length === 2 ? item.param.value[1] : item.param.value"
                              :options="getReferenceOptions() as any"
                              placeholder="参数值"
                              size="small"
                              check-strategy="child"
                              style="width: 120px;"
                              @update:value="(_: any, __: any, path: any[]) => {
                                // 级联选择器的第三个参数path是选项对象数组，需要提取value属性保存完整路径 [节点id, 参数名]
                                item.param.value = Array.isArray(path) ? path.map((p: any) => p.value) : []
                              }"
                            />
                          </template>
                          <template v-else>
                            <n-input
                              v-model:value="item.param.value"
                              placeholder="参数值"
                              type="text"
                              size="small"
                            />
                          </template>
                        </div>

                        <!-- 参数描述 -->
                        <n-input
                          v-model:value="item.param.desc"
                          placeholder="参数描述"
                          size="small"
                          class="flex-1"
                        />

                        <!-- 操作按钮 -->
                        <div class="flex items-center">
                          <!-- 添加子参数按钮 -->
                          <n-tooltip v-if="canAddChildOutputParam(item.param, item.level)" trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="primary"
                                @click="addChildOutputParam(item.parentIndex !== undefined ? getOutputExpansionKey(item) : item.index, item.parentIndex !== undefined)"
                              >
                                <template #icon>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
                                  </svg>
                                </template>
                              </n-button>
                            </template>
                            {{ item.param.type === 'object' ? '添加对象属性' : '添加数组元素' }}
                          </n-tooltip>

                          <!-- 删除按钮 -->
                          <n-tooltip trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="error"
                                @click="item.parentIndex !== undefined ? removeChildOutputParam(item.parentIndex, item.index, typeof item.parentIndex === 'string') : removeOutput(item.index)"
                              >
                                <template #icon>
                                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                  </svg>
                                </template>
                              </n-button>
                            </template>
                            {{ hasOutputChildren(item.param) ? '删除参数及其所有子参数' : '删除参数' }}
                          </n-tooltip>
                        </div>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </div>
      </div>
    </Transition>
    <!-- 工具选择弹窗挂载在此 -->
    <ToolSelectionModal
      ref="toolModalRef"
      @confirm="(tools: any[]) => {
        if (!selectedNode || !tools || tools.length === 0) return
        const tool = tools[0]
        const cfg: any = tool?.config || {}
        // 不修改节点名称，保持原有名称
        if (!(selectedNode as any).data.node_params) {
          ;(selectedNode as any).data.node_params = {}
        }
        // 根据节点类型和工具类型处理不同的配置
        if (selectedNode.type === 'sql' || tool.toolType === 'sql') {
          ;(selectedNode as any).data.node_params.config = {
            type: 'sql',
            host: cfg.host || '',
            port: Number(cfg.port) || 3306,
            database: cfg.database || '',
            user: cfg.user || '',
            password: cfg.password || '',
            sql: cfg.sql || '',
            description: tool?.description || '',
            name: tool?.name || '', // 保存SQL工具名称，用于在节点卡片中显示
            input_params: normalizeSqlInputParams(
              Array.isArray(tool?.inputParams) ? JSON.parse(JSON.stringify(tool.inputParams)) : [],
            ),
          }
        }
        else if (selectedNode.type === 'http' || tool.toolType === 'http') {
          ;(selectedNode as any).data.node_params.config = {
            type: 'http',
            method: cfg.method || 'GET',
            url: cfg.url || '',
            headers: cfg.headers || {},
            description: tool?.description || '',
            name: tool?.name || '', // 保存HTTP工具名称，用于在节点卡片中显示
            input_params: normalizeSqlInputParams(
              Array.isArray(tool?.inputParams) ? JSON.parse(JSON.stringify(tool.inputParams)) : [],
            ),
          }
        }
      }"
    />
    <!-- RAG 选择弹窗挂载在此 -->
    <RagSelectionModal
      ref="ragModalRef"
      @confirm="(rags: any[]) => {
        if (!selectedNode || !rags || rags.length === 0) return
        const rag = rags[0]
        // 不修改节点名称，保持默认名称
        if (!(selectedNode as any).data.node_params) {
          ;(selectedNode as any).data.node_params = {}
        }
        const cfg = (selectedNode as any).data.node_params.config || {}
        ;(selectedNode as any).data.node_params.config = {
          ...cfg,
          type: 'rag',
          workspace_id: rag?.workspaceId || rag?.workspace_id || '',
          uploadIds: (() => {
            const single = rag?.uploadId || rag?.upload_id
            if (Array.isArray(rag?.uploadIds)) return rag.uploadIds
            if (Array.isArray(rag?.upload_ids)) return rag.upload_ids
            return single ? [single] : []
          })(),
          topK: 1,
          strategy: 'hybrid_search',
          name: rag?.name || '', // 保存RAG工具名称，用于在卡片中显示
          description: rag?.description || '', // 保存RAG描述，用于在卡片中显示
          input_params: Array.isArray(cfg.input_params) && cfg.input_params.length > 0 ? cfg.input_params : [
            {
              children: [],
              name: 'query',
              description: '用户问题',
              location: 'body',
              type: 'string',
              required: false,
              param_type: 'static',
              value: '',
              reference: [],
            },
          ],
        }
      }"
    />
    <!-- FAQ 选择弹窗挂载在此 -->
    <FaqSelectionModal
      ref="faqModalRef"
      @confirm="(collections: any[]) => {
        if (!selectedNode || !collections || collections.length === 0) return
        const collection = collections[0]
        // 不修改节点名称，保持默认名称
        if (!(selectedNode as any).data.node_params) {
          ;(selectedNode as any).data.node_params = {}
        }
        const cfg = (selectedNode as any).data.node_params.config || {}
        ;(selectedNode as any).data.node_params.config = {
          ...cfg,
          type: 'faq',
          score_threshold: 0.8,
          top_k: 1,
          upload_id: [],
          collection_id: collection?.id || '',
          name: collection?.name || '',
          collectionName: collection?.collectionName || '',
          workspace_id: collection?.workspaceId || collection?.workspace_id || '',
          input_params: Array.isArray(cfg.input_params) && cfg.input_params.length > 0 ? cfg.input_params : [
            {
              children: [],
              name: 'query',
              description: '用户问题',
              location: 'body',
              type: 'string',
              required: false,
              param_type: 'static',
              value: '',
              reference: [],
            },
          ],
        }
      }"
    />
  </div>
</template>

<style scoped>
.workflow-canvas-container {
  width: 100%;
  height: 100%;
  background: #f8f8f8;
  position: relative;
  transition: all 0.2s ease;
}

.workflow-canvas-container.dragging-over {
  background: #f0f4ff;
  box-shadow: inset 0 0 20px rgba(139, 92, 246, 0.1);
}

/* 新增节点卡片 */
.add-node-card {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: white;
  border-radius: 12px;
  padding: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  cursor: pointer;
}

.add-node-btn {
  height: 32px;
}

/* 节点类型菜单 */
.node-type-menu {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  transform: translateX(-50%);
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  min-width: 320px;
  padding-bottom: 8px;
}

/* 小箭头 */
.menu-arrow {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid white;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

/* 菜单内容 */
.menu-content {
  padding: 12px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.node-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  border-radius: 8px;
  cursor: grab;
  transition: all 0.2s ease;
  user-select: none;
}

.node-type-item:hover {
  background: #f5f5f5;
}

.node-type-item:active {
  cursor: grabbing;
}

.node-type-item.dragging {
  opacity: 0.5;
  cursor: grabbing;
  background: #e5e7eb;
}

.node-type-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  color: white;
}

.node-type-name {
  font-size: 14px;
  color: #1f2937;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.2s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

/* 节点配置抽屉 */
.node-config-drawer {
  position: absolute;
  right: 10px;
  top: 10px;
  bottom: 10px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 100;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer-resize-handle {
  position: absolute;
  left: 0;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
}
.drawer-resize-handle:hover {
  background: rgba(139, 92, 246, 0.12);
}

/* 预览抽屉 z-index 更高，确保显示在节点配置抽屉之上 */
.preview-drawer {
  z-index: 101;
}

.drawer-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.drawer-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.config-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.config-item {
  display: flex;
  justify-content: space-between;
  padding: 8px;
  background: #f9fafb;
  border-radius: 4px;
}

.config-item .label {
  font-size: 14px;
  color: #1f2937;
}

.config-item .value {
  font-size: 14px;
  color: #6b7280;
}

.config-form-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.config-form-item .label {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
}

.param-item {
  padding: 12px;
  background: #f9fafb;
  border-radius: 6px;
  margin-bottom: 12px;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.param-value {
  margin-top: 8px;
}

/* 输入参数紧凑布局样式 */
.input-params-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-param-item {
  background: #f9fafb;
  border-radius: 6px;
  padding: 10px 4px 2px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
}

.input-param-item:hover {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.input-param-item.nested {
  background: #f8f9fa;
  border-left: 3px solid #8b5cf6;
}

.input-param-item.nested:hover {
  background: #f0f1f2;
}

.param-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
}

.param-value {
  margin-top: 4px;
}

.param-value-inline {
  display: flex;
  align-items: center;
}

/* 抽屉动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease;
}

.slide-fade-leave-active {
  transition: all 0.3s ease;
}

.slide-fade-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-fade-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>

<style>
/* Coze 风格的连线样式 */
.vue-flow__edge-path {
  stroke: #8b5cf6;
  stroke-width: 3;
  transition: stroke 0.2s ease;
}

.vue-flow__edge:hover .vue-flow__edge-path {
  stroke: #7c3aed;
  stroke-width: 4;
}

.vue-flow__edge.selected .vue-flow__edge-path {
  stroke: #7c3aed;
  stroke-width: 4;
}

.vue-flow__edge-text {
  fill: #6b7280;
  font-size: 12px;
}

/* 连接点样式 */
.vue-flow__handle {
  width: 12px;
  height: 12px;
  background: #8b5cf6;
  border: 2px solid white;
  border-radius: 50%;
  box-sizing: border-box;
  position: absolute;
}

/* 确保连接点中心位于节点边缘 */
.vue-flow__handle-top {
  top: -6px;
  left: 50%;
  margin-left: -6px;
}

.vue-flow__handle-right {
  right: -6px;
  top: 50%;
  margin-top: -6px;
}

.vue-flow__handle-bottom {
  bottom: -6px;
  left: 50%;
  margin-left: -6px;
}

.vue-flow__handle-left {
  left: -6px;
  top: 50%;
  margin-top: -6px;
}

.vue-flow__handle-connecting {
  background: #8b5cf6;
}

.vue-flow__handle-valid {
  background: #10b981;
}

.vue-flow__handle.invalid {
  background: #ef4444;
}

/* 节点选中状态 - 完全移除额外的边框 */
.vue-flow__node.selected {
  outline: none !important;
}

.vue-flow__node.selected .vue-flow__node-wrapper {
  outline: none !important;
}

/* 节点交互效果 - 优化性能，只对边框和阴影添加动画 */
.vue-flow__node * {
  transition: none;
}

.vue-flow__node {
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

/* 点状网格背景 */
.vue-flow__background {
  background: #f8f8f8;
}

/* 删除边的控件 */
.vue-flow__edge-delete {
  fill: #ef4444;
  cursor: pointer;
  transition: all 0.2s ease;
}

.vue-flow__edge-delete:hover {
  fill: #dc2626;
  transform: scale(1.2);
}
/* SQL 工具选择大卡片 */
.dashed-select-card {
  border: 1.5px dashed #d1d5db;
  border-radius: 8px;
  padding: 24px;
  cursor: pointer;
  background: #fafafa;
  transition: all 0.2s ease;
}
.dashed-select-card:hover {
  border-color: #8b5cf6;
  background: #f9f5ff;
}
.dashed-card-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #6b7280;
}
.dashed-card-inner .title {
  font-size: 14px;
  color: #1f2937;
  font-weight: 500;
}
.dashed-card-inner .desc {
  font-size: 12px;
  color: #6b7280;
}

/* 已选工具卡片 */
.selected-tool-card {
  background: #fafafa;
}
.selected-tool {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.selected-tool .info .name {
  font-size: 14px;
  color: #111827;
  font-weight: 600;
}
.selected-tool .info .desc {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}
.selected-tool .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
