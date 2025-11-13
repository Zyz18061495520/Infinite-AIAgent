<script setup lang="ts">
import { computed, ref, shallowRef, watch } from 'vue'
import { useBoolean } from '@/hooks'
import { createToolApi, getDatabasesPageApi, testToolApi, updateToolApi } from '@/service'
import { useWorkspaceStore } from '@/store'
import { toolHttpConfigMethodOptions, toolInputParamLocationOptions, toolInputParamTypeOptions, toolTypeOptions } from '@/constants/tool'
import { Regex } from '@/constants/Regex'
import type { FormRules } from 'naive-ui'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const emit = defineEmits<{ success: [], open: [], close: [] }>()

type ModalType = 'add' | 'view' | 'edit'

const { bool: modalVisible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: testLoading, setTrue: startTest, setFalse: endTest } = useBoolean(false)
const { bool: testModalVisible, setTrue: showTestModal, setFalse: _hideTestModal } = useBoolean(false)

const workspaceStore = useWorkspaceStore()

const defaultToolType = toolTypeOptions[0]?.value || 'http'

const formDefault: Entity.Tool = {
  toolType: defaultToolType as any,
  name: '',
  description: '',
  inputParams: [],
  config: { method: 'GET', url: '', headers: {} } as any,
  isPublish: true,
}

const formModel = ref<Entity.Tool>({ ...formDefault })
const modalType = shallowRef<ModalType>('add')

const modalTitle = computed(() => ({ add: '新增工具', view: '查看工具', edit: '编辑工具' })[modalType.value])
const currentToolType = computed(() => formModel.value.toolType)

// 工具名称输入限制：只允许大小写字母、数字、下划线、中划线
function filterToolName(value: string) {
  return value.replace(/[^\w-]/g, '')
}

// 表单校验
const formRef = ref()
const rules: FormRules = {
  'name': { required: true, message: '请输入工具名称', trigger: ['blur', 'input'] },
  'description': { required: true, message: '请输入工具描述', trigger: ['blur', 'input'] },
  'inputParams': {
    trigger: ['blur', 'change'],
    validator: () => {
      const validateParam = (param: Entity.ToolInputParam, level = 0): string | null => {
        if (!param.name || !param.type || !param.location) {
          return `第${level + 1}级参数信息不完整`
        }
        // 验证参数名称格式
        if (!new RegExp(Regex.ParamName).test(param.name)) {
          return `第${level + 1}级参数名称只能包含大小写字母、数字、下划线、中划线`
        }
        // 递归验证子参数
        if (param.children && param.children.length > 0) {
          for (let i = 0; i < param.children.length; i++) {
            const childError = validateParam(param.children[i], level + 1)
            if (childError) {
              return childError
            }
          }
        }
        return null
      }

      const params = formModel.value.inputParams || []
      for (let i = 0; i < params.length; i++) {
        const error = validateParam(params[i])
        if (error) {
          return new Error(error)
        }
      }
      return true
    },
  },
  // HTTP 专有字段
  'config.method': {
    trigger: ['change'],
    validator: () => (formModel.value.toolType === 'http' && !(formModel.value.config as any).method) ? new Error('请选择请求方式') : true,
  },
  'config.url': {
    trigger: ['blur', 'input'],
    validator: () => (formModel.value.toolType === 'http' && !(formModel.value.config as any).url) ? new Error('请输入请求地址') : true,
  },
  // SQL 专有字段
  'config.database': {
    trigger: ['change', 'blur'],
    validator: () => (formModel.value.toolType === 'sql' && !(formModel.value.config as any).database) ? new Error('请选择数据库名') : true,
  },
  'config.user': {
    trigger: ['blur', 'input'],
    validator: () => (formModel.value.toolType === 'sql' && !(formModel.value.config as any).user) ? new Error('请输入数据库用户') : true,
  },
  'config.password': {
    trigger: ['blur', 'input'],
    validator: () => (formModel.value.toolType === 'sql' && !(formModel.value.config as any).password) ? new Error('请输入数据库密码') : true,
  },
  'config.sql': {
    trigger: ['blur', 'input'],
    validator: () => (formModel.value.toolType === 'sql' && !(formModel.value.config as any).sql) ? new Error('请输入 SQL') : true,
  },
}

// 数据库下拉（用于 SQL 配置）
const dbPage = ref({ pageNum: 1, pageSize: 100 })
const dbOptions = ref<{ label: string, value: string, raw: any }[]>([])
const selectedDbKey = ref<string | null>(null)
function buildDbKey(db: any) {
  return db?.id ?? `${db?.dbUser}:${db?.dbPassword}/@${db?.dbHost}:${db?.dbPort}/${db?.dbDatabase}`
}
function buildDbKeyFromConfig(cfg: any) {
  return `${cfg?.user}:${cfg?.password}/@${cfg?.host}:${cfg?.port}/${cfg?.database}`
}
function buildDbKeyFromConfigLoose(cfg: any) {
  return `${cfg?.user}/@${cfg?.host}:${cfg?.port}/${cfg?.database}`
}
async function loadDatabases() {
  const { isSuccess, data } = await getDatabasesPageApi({ pageNum: dbPage.value.pageNum, pageSize: dbPage.value.pageSize })
  if (isSuccess && data) {
    const list = data.list || []
    dbOptions.value = list.map((db: any) => ({
      label: db.dbDatabase || db.name || `${db.dbHost}:${db.dbPort}`,
      value: buildDbKey(db),
      raw: db,
    }))
    // 根据现有 config 尝试预选数据库
    const cfg: any = (formModel.value as any).config || {}
    if (formModel.value.toolType === 'sql' && cfg?.database) {
      const strictKey = cfg?.id ?? buildDbKeyFromConfig(cfg)
      const looseKey = buildDbKeyFromConfigLoose(cfg)
      const found = dbOptions.value.find(o => o.value === strictKey)
        || dbOptions.value.find(o => buildDbKeyFromConfig({
          user: o.raw?.dbUser,
          password: o.raw?.dbPassword,
          host: o.raw?.dbHost,
          port: o.raw?.dbPort,
          database: o.raw?.dbDatabase,
        }) === strictKey)
        || dbOptions.value.find(o => buildDbKeyFromConfigLoose({
          user: o.raw?.dbUser,
          host: o.raw?.dbHost,
          port: o.raw?.dbPort,
          database: o.raw?.dbDatabase,
        }) === looseKey)
      selectedDbKey.value = found?.value ?? null
    }
  }
}

// headers 编辑（HTTP）
function headersToArray(headers: Record<string, string>) {
  return Object.entries(headers || {}).map(([k, v]) => ({ key: k, value: v }))
}
function arrayToHeaders(arr: { key: string, value: string }[]) {
  const obj: Record<string, string> = {}
  arr.forEach(({ key, value }) => {
    if (key)
      obj[key] = value
  })
  return obj
}
const headerRows = ref<{ key: string, value: string }[]>(headersToArray((formModel.value.config as any)?.headers || {}))

watch(() => (formModel.value.toolType), (tp) => {
  if (tp === 'sql') {
    const current: any = (formModel.value as any).config
    // 仅在当前不是 SQL 配置时重置默认
    if (!current || current?.sql === undefined) {
      const cfg: Entity.ToolSqlConfig = { host: '', port: 3306, database: '', user: '', password: '', sql: '' }
      ;(formModel.value as any).config = cfg
    }
    loadDatabases()
  }
  else {
    const current: any = (formModel.value as any).config
    // 仅在当前不是 HTTP 配置时重置默认
    if (!current || current?.method === undefined) {
      const cfg: Entity.ToolHttpConfig = { method: 'GET', url: '', headers: {} }
      ;(formModel.value as any).config = cfg
    }
    // 同步一次 headerRows，避免双向递归
    headerRows.value = headersToArray(((formModel.value as any).config as any)?.headers || {})
  }
})

// inputParams 编辑
function addParam() {
  formModel.value.inputParams.push({ name: '', location: 'query', type: 'string', description: '', required: false, children: [] })
}
function removeParam(index: number) {
  formModel.value.inputParams.splice(index, 1)
}

// 多级嵌套参数相关功能
const expandedParams = ref<Set<number | string>>(new Set())

function toggleParamExpansion(index: number | string) {
  if (expandedParams.value.has(index)) {
    expandedParams.value.delete(index)
  }
  else {
    expandedParams.value.add(index)
  }
}

function addChildParam(parentIndex: number | string, isNestedChild = false) {
  if (isNestedChild) {
    // 处理嵌套子参数（第2级或第3级）
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级：parentIndex 是第1级的索引
      const parent = formModel.value.inputParams[Number(parentIndex)]
      if (parent && parent.children) {
        const newChildIndex = parent.children.length
        parent.children.push({ name: '', location: 'query', type: 'string', description: '', required: false, children: [] })
        expandedParams.value.add(`${parentIndex}-${newChildIndex}`)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级：parentIndex 是 "firstIndex-secondIndex"（B添加子参数）
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = formModel.value.inputParams[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children) {
          secondLevelParent.children.push({ name: '', location: 'query', type: 'string', description: '', required: false, children: [] })
          // 展开B，让新添加的子参数显示出来
          expandedParams.value.add(parentIndex)
        }
      }
    }
    else if (parentPath.length === 3) {
      // 第4级：parentIndex 是 "firstIndex-secondIndex-thirdIndex"（C添加子参数）
      const [firstLevelIndex, secondLevelIndex, thirdLevelIndex] = parentPath.map(Number)
      const parent = formModel.value.inputParams[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children && secondLevelParent.children[thirdLevelIndex]) {
          const thirdLevelParent = secondLevelParent.children[thirdLevelIndex]
          if (thirdLevelParent.children) {
            thirdLevelParent.children.push({ name: '', location: 'query', type: 'string', description: '', required: false, children: [] })
            // 展开C，让新添加的子参数显示出来
            expandedParams.value.add(parentIndex)
          }
        }
      }
    }
  }
  else {
    // 处理第1级子参数
    const parent = formModel.value.inputParams[Number(parentIndex)]
    if (parent && parent.children) {
      parent.children.push({ name: '', location: 'query', type: 'string', description: '', required: false, children: [] })
      expandedParams.value.add(Number(parentIndex))
    }
  }
}

function removeChildParam(parentIndex: number | string, childIndex: number, isNestedChild = false) {
  if (isNestedChild) {
    const parentPath = parentIndex.toString().split('-')
    if (parentPath.length === 1) {
      // 第2级删除
      const parent = formModel.value.inputParams[Number(parentIndex)]
      if (parent && parent.children) {
        parent.children.splice(childIndex, 1)
      }
    }
    else if (parentPath.length === 2) {
      // 第3级删除
      const [firstLevelIndex, secondLevelIndex] = parentPath.map(Number)
      const parent = formModel.value.inputParams[firstLevelIndex]
      if (parent && parent.children && parent.children[secondLevelIndex]) {
        const secondLevelParent = parent.children[secondLevelIndex]
        if (secondLevelParent.children) {
          secondLevelParent.children.splice(childIndex, 1)
        }
      }
    }
  }
  else {
    const parent = formModel.value.inputParams[Number(parentIndex)]
    if (parent && parent.children) {
      parent.children.splice(childIndex, 1)
    }
  }
}

function canAddChildParam(param: Entity.ToolInputParam, level: number): boolean {
  return (param.type === 'object' || param.type === 'array') && level < 3
}

function canDeleteParam(_param: Entity.ToolInputParam, _level: number): boolean {
  // 所有参数都可以删除，但如果有子参数，删除时会同时删除所有子参数
  return true
}

function hasChildren(param: Entity.ToolInputParam): boolean {
  return param.children && param.children.length > 0
}

function getTypeOptionsByLevel(level: number) {
  const base = toolInputParamTypeOptions
  // 第4层（level===3）的参数不允许选择 object/array
  if (level >= 3)
    return base.filter(o => o.value !== 'object' && o.value !== 'array')
  return base
}

function getExpansionKey(item: { param: Entity.ToolInputParam, index: number, parentIndex?: number | string, level: number }): number | string {
  if (item.parentIndex !== undefined) {
    // 对于有父级的参数，展开键应该是 "父级索引-当前索引"
    return `${item.parentIndex}-${item.index}`
  }
  return item.index
}

function getAllParams(): Array<{ param: Entity.ToolInputParam, index: number, parentIndex?: number | string, level: number }> {
  const result: Array<{ param: Entity.ToolInputParam, index: number, parentIndex?: number | string, level: number }> = []

  formModel.value.inputParams.forEach((param, index) => {
    result.push({ param, index, level: 0 })

    if (expandedParams.value.has(index) && param.children) {
      param.children.forEach((child, childIndex) => {
        result.push({ param: child, index: childIndex, parentIndex: index, level: 1 })

        if (expandedParams.value.has(`${index}-${childIndex}`) && child.children) {
          child.children.forEach((grandChild, grandChildIndex) => {
            result.push({ param: grandChild, index: grandChildIndex, parentIndex: `${index}-${childIndex}`, level: 2 })

            // 支持第3层（C 的子项）渲染
            if (expandedParams.value.has(`${index}-${childIndex}-${grandChildIndex}`) && grandChild.children) {
              grandChild.children.forEach((greatGrandChild, greatGrandChildIndex) => {
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

// 参数名称输入限制：只允许大小写字母、数字、下划线、中划线
function filterParamName(value: string) {
  return value.replace(/[^\w-]/g, '')
}

watch(headerRows, (rows) => {
  if ((formModel.value.config as any) && (formModel.value.toolType === 'http')) {
    ;(formModel.value.config as any).headers = arrayToHeaders(rows)
  }
}, { deep: true })

// 监听表单变化，更新 canTest
watch(() => formModel.value, () => {
  checkCanTest()
}, { deep: true })

async function openModal(type: ModalType = 'add', data?: Entity.Tool) {
  emit('open')
  modalType.value = type
  showModal()
  if (type === 'add') {
    // 全量重置，避免沿用上一次的 inputParams / config 引用
    formModel.value = {
      toolType: defaultToolType as any,
      name: '',
      description: '',
      inputParams: [],
      config: { method: 'GET', url: '', headers: {} } as any,
      isPublish: true,
    }
    // 清空展开状态，避免继承上一次展开记录
    expandedParams.value = new Set()
  }
  else if (data) {
    formModel.value = JSON.parse(JSON.stringify(data))
  }
  // 初始化 headerRows
  headerRows.value = headersToArray(((formModel.value.config as any)?.headers) || {})
  // 初始化 canTest 状态
  await checkCanTest()
  if (formModel.value.toolType === 'sql') {
    await loadDatabases()
    // 再次根据 config 计算预选数据库值
    const cfg: any = (formModel.value as any).config
    if (cfg) {
      const strictKey = cfg?.id ?? buildDbKeyFromConfig(cfg)
      const looseKey = buildDbKeyFromConfigLoose(cfg)
      const found = dbOptions.value.find(o => o.value === strictKey)
        || dbOptions.value.find(o => buildDbKeyFromConfig({
          user: o.raw?.dbUser,
          password: o.raw?.dbPassword,
          host: o.raw?.dbHost,
          port: o.raw?.dbPort,
          database: o.raw?.dbDatabase,
        }) === strictKey)
        || dbOptions.value.find(o => buildDbKeyFromConfigLoose({
          user: o.raw?.dbUser,
          host: o.raw?.dbHost,
          port: o.raw?.dbPort,
          database: o.raw?.dbDatabase,
        }) === looseKey)
      selectedDbKey.value = found?.value ?? null
    }
  }
}

function closeModal() {
  hideModal()
  endLoading()
  emit('close')
}

async function submitModal() {
  await formRef.value?.validate()
  const handlers: Record<ModalType, () => Promise<boolean>> = {
    async add() {
      const { isSuccess } = await createToolApi({ ...formModel.value })
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      if (!formModel.value.id)
        return false
      const { isSuccess } = await updateToolApi(formModel.value.id, { ...formModel.value })
      if (isSuccess) {
        window.$message.success('编辑成功')
        emit('success')
      }
      return isSuccess
    },
    async view() { return true },
  }
  startLoading()
  await handlers[modalType.value]() && closeModal()
}

// 根据工具类型获取图标 SVG（与工具列表卡片风格一致）
function getToolTypeIcon(toolType: 'http' | 'sql', id?: string) {
  const uniqueId = id || Math.random().toString(36).substr(2, 9)
  const httpGradientId = `httpGradient-${uniqueId}`
  const sqlGradientId = `sqlGradient-${uniqueId}`

  if (toolType === 'http') {
    return `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="${httpGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#34d399;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#${httpGradientId})" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#${httpGradientId})"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <circle cx="35" cy="35" r="3" fill="white"/>
        <circle cx="65" cy="35" r="3" fill="white"/>
        <circle cx="35" cy="65" r="3" fill="white"/>
        <circle cx="65" cy="65" r="3" fill="white"/>
        <circle cx="50" cy="50" r="5" fill="url(#${httpGradientId})"/>
        <line x1="35" y1="35" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="65" y1="35" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="35" y1="65" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="65" y1="65" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <circle cx="50" cy="50" r="2" fill="white"/>
      </svg>
    `
  }
  else {
    return `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="${sqlGradientId}" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#fbbf24;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#${sqlGradientId})" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#${sqlGradientId})"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <rect x="38" y="40" width="24" height="20" rx="2" fill="url(#${sqlGradientId})" opacity="0.2"/>
        <rect x="38" y="40" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <rect x="38" y="48" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <rect x="38" y="56" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <line x1="46" y1="40" x2="46" y2="60" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="54" y1="40" x2="54" y2="60" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="38" y1="46" x2="62" y2="46" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="38" y1="54" x2="62" y2="54" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `
  }
}

// 是否可以测试（表单校验通过）
const canTest = ref(false)
async function checkCanTest() {
  try {
    await formRef.value?.validate()
    canTest.value = true
  }
  catch {
    canTest.value = false
  }
}

// 测试参数值（用于测试弹框中的输入，使用路径作为key避免重复）
const testParamValues = ref<Record<string, any>>({})

// 测试弹框中展开的参数（用于 object 类型的折叠展开）
const expandedTestParams = ref<Set<string>>(new Set())

// 测试结果
const testResult = ref<any>(null)

// 生成参数的唯一key（使用路径）
function getParamKey(param: Entity.ToolInputParam, parentPath: string = ''): string {
  return parentPath ? `${parentPath}.${param.name}` : param.name
}

// 递归处理参数，为每个参数添加 value 字段
function prepareTestParams(params: Entity.ToolInputParam[], parentPath: string = ''): any[] {
  return params.map((param) => {
    const paramKey = getParamKey(param, parentPath)
    const value = testParamValues.value[paramKey] !== undefined ? testParamValues.value[paramKey] : ''

    const result: any = {
      name: param.name,
      description: param.description,
      type: param.type,
      location: param.location,
      required: param.required,
      value,
      children: [],
    }

    // 递归处理子参数
    if (param.children && param.children.length > 0) {
      const currentPath = paramKey
      result.children = prepareTestParams(param.children, currentPath)
    }

    return result
  })
}

// 打开测试弹框
async function openTestModal() {
  // 先校验表单
  await checkCanTest()
  if (!canTest.value) {
    return
  }

  // 初始化测试参数值
  testParamValues.value = {}
  // 初始化展开状态（默认展开所有 object 类型）
  expandedTestParams.value = new Set()
  // 清空测试结果
  testResult.value = null
  function initParamValues(params: Entity.ToolInputParam[], parentPath: string = '') {
    params.forEach((param) => {
      const paramKey = getParamKey(param, parentPath)
      // 只有非 object/array 类型才需要初始化值
      if (param.type !== 'object' && param.type !== 'array') {
        testParamValues.value[paramKey] = ''
      }
      // 如果是 object 类型，默认展开
      if (param.type === 'object' && param.children && param.children.length > 0) {
        expandedTestParams.value.add(paramKey)
      }
      if (param.children && param.children.length > 0) {
        initParamValues(param.children, paramKey)
      }
    })
  }
  initParamValues(formModel.value.inputParams)

  showTestModal()
}

// 执行测试
async function handleTest() {
  if (!canTest.value)
    return

  startTest()
  try {
    const testParams = prepareTestParams(formModel.value.inputParams)

    const payload = {
      name: formModel.value.name,
      description: formModel.value.description,
      toolType: formModel.value.toolType,
      config: formModel.value.config,
      inputParams: testParams,
      workspaceId: workspaceStore.workspaceId,
    }

    const { isSuccess, data } = await testToolApi(payload)
    if (isSuccess) {
      window.$message.success('测试成功')
      // 保存测试结果用于展示
      testResult.value = data
      // 测试成功后不关闭弹框
    }
  }
  catch (error: any) {
    window.$message.error(error?.message || '测试失败')
  }
  finally {
    endTest()
  }
}

// 获取所有测试参数（支持折叠展开，用于测试弹框展示）
function getAllTestParams(): Array<{ param: Entity.ToolInputParam, paramKey: string, level: number }> {
  const result: Array<{ param: Entity.ToolInputParam, paramKey: string, level: number }> = []

  function addParams(params: Entity.ToolInputParam[], parentPath: string = '', level: number = 0) {
    params.forEach((param) => {
      const paramKey = getParamKey(param, parentPath)
      result.push({ param, paramKey, level })

      // 如果是 object 或 array 类型，且有子参数，且已展开，则递归添加子参数
      if ((param.type === 'object' || param.type === 'array') && param.children && param.children.length > 0) {
        if (expandedTestParams.value.has(paramKey)) {
          addParams(param.children, paramKey, level + 1)
        }
      }
      // 如果不是 object/array 类型，但有子参数，也需要递归添加（虽然这种情况应该不存在）
      else if (param.children && param.children.length > 0) {
        addParams(param.children, paramKey, level + 1)
      }
    })
  }

  addParams(formModel.value.inputParams)

  return result
}

// 切换测试参数的展开/折叠状态
function toggleTestParamExpand(paramKey: string) {
  if (expandedTestParams.value.has(paramKey)) {
    expandedTestParams.value.delete(paramKey)
  }
  else {
    expandedTestParams.value.add(paramKey)
  }
}

// 检查参数是否展开（用于模板）
function isTestParamExpanded(paramKey: string): boolean {
  return expandedTestParams.value.has(paramKey)
}

// 注意：rules 已在文件上方定义，避免重复声明

defineExpose({ openModal })
</script>

<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" :title="modalTitle" :style="{ width: '1040px' }" :segmented="{ content: true, action: true }">
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="120" :disabled="modalType === 'view'">
      <n-grid :cols="1" :x-gap="16">
        <n-form-item-grid-item :span="1" label="工具类型" path="toolType">
          <n-grid :cols="4" :x-gap="16" :y-gap="16">
            <n-gi v-for="option in toolTypeOptions" :key="option.value" :span="1">
              <div
                class="tool-type-card"
                :class="{
                  'tool-type-card-selected': formModel.toolType === option.value,
                  'tool-type-card-disabled': modalType === 'view',
                }"
                @click="modalType !== 'view' && (formModel.toolType = option.value as any)"
              >
                <div class="tool-type-card-inner">
                  <div class="tool-type-icon-wrapper" v-html="getToolTypeIcon(option.value as 'http' | 'sql', option.value)" />
                  <div class="tool-type-label">
                    {{ option.label }}
                  </div>
                  <div v-if="formModel.toolType === option.value" class="tool-type-check">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                </div>
              </div>
            </n-gi>
          </n-grid>
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="工具名称" path="name">
          <n-input v-model:value="(formModel as any).name" placeholder="请输入工具名称" @input="(value: string) => { (formModel as any).name = filterToolName(value) }" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="工具描述" path="description">
          <n-input v-model:value="(formModel as any).description" type="textarea" placeholder="请输入工具描述" />
        </n-form-item-grid-item>

        <!-- 输入参数 inputParams -->
        <n-form-item-grid-item :span="1" label="输入参数" path="inputParams">
          <div class="w-full">
            <n-space vertical class="w-full">
              <n-button tertiary @click="addParam">
                <template #icon>
                  <n-icon>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
                  </n-icon>
                </template>
                新增参数
              </n-button>
              <n-table :single-line="false" :bordered="false" :show-header="true">
                <thead>
                  <tr>
                    <th>
                      名称
                    </th>
                    <th style="width: 180px">
                      描述
                    </th>
                    <th style="width: 120px">
                      类型
                    </th>
                    <th style="width: 120px">
                      传入方法
                    </th>
                    <th style="width: 80px">
                      必填
                    </th>
                    <th style="width: 100px">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <template v-for="item in getAllParams()" :key="`${item.parentIndex || 'root'}-${item.index}`">
                    <tr :style="{ backgroundColor: item.level > 0 ? '#f8f9fa' : '' }">
                      <td>
                        <div :style="{ paddingLeft: `${item.level * 20}px`, display: 'flex', alignItems: 'center', gap: '8px' }">
                          <template v-if="item.param.children && item.param.children.length > 0">
                            <n-button
                              text
                              size="small"
                              @click="toggleParamExpansion(getExpansionKey(item))"
                            >
                              <template #icon>
                                <n-icon>
                                  <svg v-if="expandedParams.has(getExpansionKey(item))" viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                                  </svg>
                                  <svg v-else viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z" />
                                  </svg>
                                </n-icon>
                              </template>
                            </n-button>
                          </template>
                          <span v-else style="width: 14px; display: inline-block;" />
                          <n-input
                            v-model:value="item.param.name"
                            placeholder="参数名"
                            @input="(value: string) => { item.param.name = filterParamName(value) }"
                          />
                        </div>
                      </td>
                      <td><n-input v-model:value="item.param.description" placeholder="参数描述" /></td>
                      <td><n-select v-model:value="item.param.type" :options="getTypeOptionsByLevel(item.level)" /></td>
                      <td><n-select v-model:value="item.param.location" :options="toolInputParamLocationOptions" /></td>
                      <td><n-switch v-model:value="item.param.required" /></td>
                      <td>
                        <n-space size="small">
                          <!-- 添加子参数按钮 -->
                          <n-tooltip v-if="canAddChildParam(item.param, item.level)" trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="primary"
                                @click="addChildParam(item.parentIndex !== undefined ? getExpansionKey(item) : item.index, item.parentIndex !== undefined)"
                              >
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M14 10H3v2h11v-2zm0-4H3v2h11V6zm4 8v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zM3 16h7v-2H3v2z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </template>
                            {{ item.param.type === 'object' ? '添加对象属性' : '添加数组元素' }}
                          </n-tooltip>

                          <!-- 删除按钮 -->
                          <n-tooltip v-if="canDeleteParam(item.param, item.level)" trigger="hover">
                            <template #trigger>
                              <n-button
                                text
                                size="small"
                                type="error"
                                @click="item.parentIndex !== undefined ? removeChildParam(item.parentIndex, item.index, typeof item.parentIndex === 'string') : removeParam(item.index)"
                              >
                                <template #icon>
                                  <n-icon>
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                    </svg>
                                  </n-icon>
                                </template>
                              </n-button>
                            </template>
                            {{ hasChildren(item.param) ? '删除参数及其所有子参数' : '删除参数' }}
                          </n-tooltip>
                        </n-space>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </n-table>
            </n-space>
          </div>
        </n-form-item-grid-item>

        <!-- HTTP 配置 -->
        <template v-if="currentToolType === 'http'">
          <n-form-item-grid-item key="http-method" :span="1" label="请求方式" path="config.method">
            <n-select v-model:value="(formModel.config as any).method" :options="toolHttpConfigMethodOptions" />
          </n-form-item-grid-item>
          <n-form-item-grid-item key="http-url" :span="1" label="请求地址" path="config.url" :show-require-mark="formModel.toolType === 'http'">
            <n-input v-model:value="(formModel.config as any).url" placeholder="https://api.example.com" />
          </n-form-item-grid-item>
          <n-form-item-grid-item key="http-headers" :span="1" label="请求头" path="config.headers">
            <n-dynamic-input v-model:value="headerRows" preset="pair" key-placeholder="Key" value-placeholder="Value" />
          </n-form-item-grid-item>
        </template>

        <!-- SQL 配置 -->
        <template v-if="currentToolType === 'sql'">
          <n-form-item-grid-item key="sql-database" :span="1" label="数据库" path="config.database" :show-require-mark="formModel.toolType === 'sql'">
            <n-select
              v-model:value="selectedDbKey"
              :options="dbOptions" value-field="value" label-field="label" placeholder="请选择数据库" clearable filterable
              @update:value="(val) => {
                const found = dbOptions.find(o => o.value === val)
                if (found) {
                  const raw = (found as any).raw
                  ;(formModel.config as any).host = raw.dbHost
                  ;(formModel.config as any).port = Number(raw.dbPort)
                  ;(formModel.config as any).database = raw.dbDatabase
                  ;(formModel.config as any).user = raw.dbUser
                  ;(formModel.config as any).password = raw.dbPassword
                }
                else {
                  ;(formModel.config as any).host = ''
                  ;(formModel.config as any).port = 3306
                  ;(formModel.config as any).database = ''
                  ;(formModel.config as any).user = ''
                  ;(formModel.config as any).password = ''
                }
              }"
            />
          </n-form-item-grid-item>
          <n-form-item-grid-item :span="1" label="SQL" path="config.sql" :show-require-mark="formModel.toolType === 'sql'">
            <n-input v-model:value="(formModel.config as any).sql" type="textarea" placeholder="请输入 SQL" :autosize="{ minRows: 6 }" />
          </n-form-item-grid-item>
        </template>
      </n-grid>
    </n-form>
    <template #action>
      <div class="flex justify-between items-center">
        <n-button tertiary :disabled="!canTest || modalType === 'view'" :loading="testLoading" @click="openTestModal">
          测试
        </n-button>
        <n-space>
          <n-button @click="closeModal">
            取消
          </n-button>
          <n-button type="primary" :loading="submitLoading" @click="submitModal">
            提交
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>

  <!-- 测试弹框 -->
  <n-modal
    v-model:show="testModalVisible"
    :mask-closable="false"
    preset="card"
    title="工具测试"
    :style="{ width: '800px' }"
    :segmented="{ content: true }"
  >
    <div class="space-y-3">
      <n-form label-placement="left" :label-width="100">
        <n-table :single-line="false" :bordered="false" :show-header="true">
          <thead>
            <tr>
              <th style="width: 150px">
                名称
              </th>
              <th style="width: 200px">
                描述
              </th>
              <th style="width: 100px">
                类型
              </th>
              <th style="width: 80px">
                是否必填
              </th>
              <th>值</th>
            </tr>
          </thead>
          <tbody>
            <template v-for="item in getAllTestParams()" :key="item.paramKey">
              <tr :style="{ backgroundColor: item.level > 0 ? '#f8f9fa' : '' }">
                <td>
                  <div :style="{ paddingLeft: `${item.level * 20}px` }" class="flex items-center gap-1">
                    <template v-if="(item.param.type === 'object' || item.param.type === 'array') && item.param.children && item.param.children.length > 0">
                      <n-button
                        text
                        size="small"
                        @click="toggleTestParamExpand(item.paramKey)"
                      >
                        <template #icon>
                          <n-icon>
                            <svg v-if="isTestParamExpanded(item.paramKey)" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z" />
                            </svg>
                            <svg v-else viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                              <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z" />
                            </svg>
                          </n-icon>
                        </template>
                      </n-button>
                    </template>
                    <span>{{ item.param.name }}</span>
                  </div>
                </td>
                <td>{{ item.param.description || '--' }}</td>
                <td>{{ item.param.type }}</td>
                <td>
                  <n-tag v-if="item.param.required" type="error" size="small">
                    必填
                  </n-tag>
                  <n-tag v-else type="default" size="small">
                    选填
                  </n-tag>
                </td>
                <td>
                  <n-input
                    v-if="item.param.type !== 'object' && item.param.type !== 'array'"
                    v-model:value="testParamValues[item.paramKey]"
                    :placeholder="`请输入${item.param.name}的值`"
                    style="width: 100%"
                  />
                  <span v-else class="text-gray-400 text-sm">--</span>
                </td>
              </tr>
            </template>
            <tr v-if="getAllTestParams().length === 0">
              <td colspan="5" class="text-center text-gray-400">
                暂无输入参数
              </td>
            </tr>
          </tbody>
        </n-table>
      </n-form>

      <!-- 按钮区域 -->
      <div>
        <n-button type="primary" :loading="testLoading" @click="handleTest">
          测试
        </n-button>
      </div>

      <!-- 测试结果展示 -->
      <div v-if="testResult !== null">
        <div class="mb-2">
          <span class="text-sm font-medium text-gray-700">测试结果：</span>
        </div>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
          <template v-if="typeof testResult === 'string'">
            <div class="text-sm text-gray-800 break-all whitespace-pre-wrap">
              {{ testResult }}
            </div>
          </template>
          <template v-else>
            <VueJsonPretty
              :data="testResult"
              :show-length="true"
              :show-line-number="false"
              :show-icon="true"
              :deep="3"
              :deep-collapse="4"
              class="text-xs"
            />
          </template>
        </div>
      </div>
    </div>
  </n-modal>
</template>

<style scoped>
.tool-type-card {
  position: relative;
  cursor: pointer;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 110px;
}

.tool-type-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #8b5cf6, #9d78f7);
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tool-type-card:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  transform: translateY(-2px);
}

.tool-type-card:hover::before {
  transform: scaleX(1);
}

.tool-type-card-selected {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3), 0 2px 10px rgba(139, 92, 246, 0.2);
}

.tool-type-card-selected::before {
  transform: scaleX(1);
}

.tool-type-card-selected:hover {
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35), 0 4px 12px rgba(139, 92, 246, 0.25);
  transform: translateY(-2px);
}

.tool-type-card-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: #f9fafb;
}

.tool-type-card-disabled:hover {
  border-color: #e5e7eb;
  box-shadow: none;
  transform: none;
}

.tool-type-card-disabled::before {
  display: none;
}

.tool-type-card-inner {
  position: relative;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}

.tool-type-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.tool-type-card:hover .tool-type-icon-wrapper {
  background: rgba(139, 92, 246, 0.1);
  transform: scale(1.05);
}

.tool-type-card-selected .tool-type-icon-wrapper {
  background: rgba(139, 92, 246, 0.12);
}

.tool-type-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  transition: color 0.3s ease;
}

.tool-type-card-selected .tool-type-label {
  color: #8b5cf6;
  font-weight: 600;
}

.tool-type-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #8b5cf6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: checkIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

@keyframes checkIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
