<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { copyAppstoreAgentToWorkspace, copyAppstoreToolToWorkspace, getAppstoreAgentsPageApi, getAppstoreToolsPageApi } from '@/service/api/appstore'
import { useWorkspaceStore } from '@/store/workspace'
import { toolTypeOptions } from '@/constants/tool'

defineOptions({ name: 'Appstore' })

const activeTab = ref<'agent' | 'tool'>('agent')

// 通用分页与查询
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)

// agent 筛选
const agentFilters = ref({
  name: '',
  agentType: '',
})

// tool 筛选
const toolFilters = ref({
  name: '',
  toolType: '',
})

const agentList = ref<any[]>([])
const toolList = ref<any[]>([])
const copyModalVisible = ref(false)
const copyType = ref<'agent' | 'tool'>('agent')
const copyTargetId = ref('')
const selectedWorkspaceId = ref('')
const workspaceStore = useWorkspaceStore()

// 智能体类型选项
const agentTypeOptions = [
  { label: '全部', value: '' },
  { label: '单智能体', value: 'single' },
  { label: '工作流', value: 'workflow' },
  { label: '多智能体', value: 'supervisor' },
]

// 工具类型选项（包含全部）
const toolTypeSelectOptions = [
  { label: '全部', value: '' },
  ...toolTypeOptions,
]

async function fetchAgents() {
  loading.value = true
  try {
    const { isSuccess, data } = await getAppstoreAgentsPageApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      name: agentFilters.value.name || undefined,
      agentType: agentFilters.value.agentType || undefined,
    })
    if (isSuccess && data) {
      agentList.value = (data.list || data.records) || []
      total.value = data.pagination?.total || data.total || 0
    }
    else {
      agentList.value = []
      total.value = 0
    }
  }
  finally {
    loading.value = false
  }
}

async function fetchTools() {
  loading.value = true
  try {
    const { isSuccess, data } = await getAppstoreToolsPageApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      name: toolFilters.value.name || undefined,
      toolType: toolFilters.value.toolType || undefined,
    })
    if (isSuccess && data) {
      toolList.value = (data.list || data.records) || []
      total.value = data.pagination?.total || data.total || 0
    }
    else {
      toolList.value = []
      total.value = 0
    }
  }
  finally {
    loading.value = false
  }
}

function handleAgentSearch() {
  pageNum.value = 1
  fetchAgents()
}

function handleAgentClear() {
  agentFilters.value.name = ''
  agentFilters.value.agentType = ''
  pageNum.value = 1
  fetchAgents()
}

function handleToolSearch() {
  pageNum.value = 1
  fetchTools()
}

function handleToolClear() {
  toolFilters.value.name = ''
  toolFilters.value.toolType = ''
  pageNum.value = 1
  fetchTools()
}

function handleTabChange(val: string) {
  activeTab.value = val as any
  pageNum.value = 1
  if (activeTab.value === 'agent')
    fetchAgents()
  else
    fetchTools()
}

onMounted(() => {
  fetchAgents()
})

// 当工作空间切换时，自动刷新当前 Tab 列表，确保请求头带上 Workspace-Id
watch(
  () => workspaceStore.workspaceId,
  () => {
    pageNum.value = 1
    if (activeTab.value === 'agent')
      fetchAgents()
    else
      fetchTools()
  },
)

function openCopyModal(type: 'agent' | 'tool', id: string) {
  copyType.value = type
  copyTargetId.value = id
  selectedWorkspaceId.value = workspaceStore.workspaceId || undefined as any
  if (workspaceStore.workspaces.length === 0)
    workspaceStore.getWorkspaces()
  copyModalVisible.value = true
}

async function submitCopy() {
  if (!selectedWorkspaceId.value) {
    window.$message.warning('请选择工作空间')
    return
  }
  const prevId = workspaceStore.workspaceId
  // 临时切换 Workspace-Id 注入到请求头
  ;(workspaceStore as any).workspaceId = selectedWorkspaceId.value
  try {
    const api = copyType.value === 'agent' ? copyAppstoreAgentToWorkspace : copyAppstoreToolToWorkspace
    const { isSuccess } = await api(copyTargetId.value)
    if (isSuccess)
      window.$message.success('复制成功')
    else
      window.$message.error('复制失败')
  }
  catch {
    window.$message.error('复制失败')
  }
  finally {
    ;(workspaceStore as any).workspaceId = prevId
    copyModalVisible.value = false
  }
}

// 根据工具类型获取图标 SVG（与智能体类型图标风格一致）
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
            <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#${httpGradientId})" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#${httpGradientId})"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <!-- HTTP 网络连接图标 - 使用白色元素 -->
        <circle cx="35" cy="35" r="3" fill="white"/>
        <circle cx="65" cy="35" r="3" fill="white"/>
        <circle cx="35" cy="65" r="3" fill="white"/>
        <circle cx="65" cy="65" r="3" fill="white"/>
        <circle cx="50" cy="50" r="5" fill="url(#${httpGradientId})"/>
        <!-- 连接线表示网络传输 -->
        <line x1="35" y1="35" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="65" y1="35" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="35" y1="65" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="65" y1="65" x2="50" y2="50" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <!-- 中心装饰点 -->
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
            <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#${sqlGradientId})" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#${sqlGradientId})"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <!-- SQL 数据库表格图标 - 使用白色线条和渐变填充 -->
        <rect x="38" y="40" width="24" height="20" rx="2" fill="url(#${sqlGradientId})" opacity="0.2"/>
        <!-- 表格行 -->
        <rect x="38" y="40" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <rect x="38" y="48" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <rect x="38" y="56" width="24" height="6" rx="1" fill="url(#${sqlGradientId})"/>
        <!-- 表格列分隔线 - 使用白色线条 -->
        <line x1="46" y1="40" x2="46" y2="60" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="54" y1="40" x2="54" y2="60" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <!-- 表格行分隔线 - 使用白色线条 -->
        <line x1="38" y1="46" x2="62" y2="46" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
        <line x1="38" y1="54" x2="62" y2="54" stroke="white" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `
  }
}

// 渲染智能体类型图标
function renderAgentTypeIcon(iconType: string) {
  const iconMap = {
    single: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="singleGradientAppstore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#singleGradientAppstore)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#singleGradientAppstore)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <circle cx="50" cy="50" r="12" fill="url(#singleGradientAppstore)"/>
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
          <linearGradient id="workflowGradientAppstore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#workflowGradientAppstore)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#workflowGradientAppstore)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <rect x="35" y="40" width="12" height="8" rx="4" fill="url(#workflowGradientAppstore)"/>
        <rect x="50" y="40" width="12" height="8" rx="4" fill="url(#workflowGradientAppstore)"/>
        <rect x="42" y="55" width="12" height="8" rx="4" fill="url(#workflowGradientAppstore)"/>
        <path d="M47 44 L50 44 L48 42 L48 46 Z" fill="url(#workflowGradientAppstore)"/>
        <path d="M56 48 L56 52 L58 50 L54 50 Z" fill="url(#workflowGradientAppstore)"/>
        <path d="M48 58 L45 58 L47 56 L47 60 Z" fill="url(#workflowGradientAppstore)"/>
      </svg>
    `,
    supervisor: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="supervisorGradientAppstore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="45" fill="url(#supervisorGradientAppstore)" opacity="0.1"/>
        <circle cx="50" cy="50" r="35" fill="url(#supervisorGradientAppstore)"/>
        <circle cx="50" cy="50" r="20" fill="white"/>
        <rect x="45" y="45" width="10" height="10" rx="2" fill="url(#supervisorGradientAppstore)"/>
        <rect x="35" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradientAppstore)"/>
        <rect x="59" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradientAppstore)"/>
        <rect x="35" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradientAppstore)"/>
        <rect x="59" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradientAppstore)"/>
        <line x1="50" y1="50" x2="38" y2="38" stroke="url(#supervisorGradientAppstore)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="38" stroke="url(#supervisorGradientAppstore)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="38" y2="62" stroke="url(#supervisorGradientAppstore)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="62" stroke="url(#supervisorGradientAppstore)" stroke-width="1.5"/>
      </svg>
    `,
  }
  return iconMap[iconType as keyof typeof iconMap] || iconMap.single
}
</script>

<template>
  <div class="p-16px pt-0">
    <n-tabs type="line" :value="activeTab" @update:value="handleTabChange">
      <!-- 智能体 Tab -->
      <n-tab-pane name="agent" tab="智能体">
        <!-- 筛选栏 -->
        <n-space justify="space-between" align="center" class="mb-12px">
          <n-space align="center">
            <!-- 智能体名称搜索 -->
            <n-space align="center">
              <span>智能体名称：</span>
              <n-input
                v-model:value="agentFilters.name"
                placeholder="请输入智能体名称"
                style="width: 200px"
                clearable
                @keyup.enter="handleAgentSearch"
              />
            </n-space>

            <!-- 智能体类型筛选 -->
            <n-space align="center">
              <span>智能体类型：</span>
              <n-select
                v-model:value="agentFilters.agentType"
                placeholder="全部"
                clearable
                :options="agentTypeOptions"
                style="width: 120px"
              />
            </n-space>

            <!-- 查询和重置按钮 -->
            <n-button type="primary" @click="handleAgentSearch">
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
                  </svg>
                </n-icon>
              </template>
              查询
            </n-button>
            <n-button quaternary @click="handleAgentClear">
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65Z" />
                  </svg>
                </n-icon>
              </template>
              重置
            </n-button>
          </n-space>
        </n-space>

        <!-- 列表内容 -->
        <n-spin :show="loading">
          <div v-if="!loading && (!agentList || agentList.length === 0)" class="py-6">
            <n-empty description="暂无智能体" />
          </div>

          <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
            <n-gi v-for="item in agentList" :key="item.id">
              <n-card class="nova-card agent-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
                <template #header>
                  <div class="flex gap-2">
                    <div
                      class="flex-shrink-0 self-start"
                      style="width: 44px; height: 44px; margin-top: 2px;"
                      v-html="renderAgentTypeIcon(item.agentType || 'single')"
                    />
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="text-base font-medium">
                          {{ item.name }}
                        </div>
                        <n-tag size="small" round :type="item.agentType === 'single' ? 'info' : item.agentType === 'workflow' ? 'success' : 'warning'">
                          {{ agentTypeOptions.find(o => o.value === item.agentType)?.label || item.agentType }}
                        </n-tag>
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        <n-time :time="item.create_time as any" format="yyyy-MM-dd HH:mm" />
                      </div>
                    </div>
                  </div>
                </template>
                <template #header-extra>
                  <n-button size="small" type="primary" quaternary @click="openCopyModal('agent', item.id)">
                    复制到工作空间
                  </n-button>
                </template>
                <n-thing>
                  <template #description>
                    <div class="text-12px text-gray-500 space-y-2">
                      <div v-if="item.zhName">
                        <span>中文名称：{{ item.zhName || '--' }}</span>
                      </div>
                      <div>
                        <div class="truncate" :title="item.description">
                          描述：{{ item.description || '--' }}
                        </div>
                      </div>
                      <div>
                        <span>创建人：{{ item.userName || '--' }}</span>
                      </div>
                    </div>
                  </template>
                </n-thing>
              </n-card>
            </n-gi>
          </n-grid>

          <!-- 分页 -->
          <div v-if="agentList.length > 0" class="mt-16px flex justify-end">
            <n-pagination
              v-model:page="pageNum"
              v-model:page-size="pageSize"
              :item-count="total"
              show-size-picker
              show-quick-jumper
              :page-sizes="[10, 20, 50]"
              @update:page="() => fetchAgents()"
              @update:page-size="() => { pageNum = 1; fetchAgents() }"
            />
          </div>
        </n-spin>
      </n-tab-pane>

      <!-- 工具 Tab -->
      <n-tab-pane name="tool" tab="工具">
        <!-- 筛选栏 -->
        <n-space justify="space-between" align="center" class="mb-12px">
          <n-space align="center">
            <!-- 工具名称搜索 -->
            <n-space align="center">
              <span>工具名称：</span>
              <n-input
                v-model:value="toolFilters.name"
                placeholder="请输入工具名称"
                style="width: 200px"
                clearable
                @keyup.enter="handleToolSearch"
              />
            </n-space>

            <!-- 工具类型筛选 -->
            <n-space align="center">
              <span>工具类型：</span>
              <n-select
                v-model:value="toolFilters.toolType"
                placeholder="全部"
                clearable
                :options="toolTypeSelectOptions"
                style="width: 120px"
              />
            </n-space>

            <!-- 查询和重置按钮 -->
            <n-button type="primary" @click="handleToolSearch">
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
                  </svg>
                </n-icon>
              </template>
              查询
            </n-button>
            <n-button quaternary @click="handleToolClear">
              <template #icon>
                <n-icon>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65Z" />
                  </svg>
                </n-icon>
              </template>
              重置
            </n-button>
          </n-space>
        </n-space>

        <n-spin :show="loading">
          <div v-if="!loading && (!toolList || toolList.length === 0)" class="py-10">
            <n-empty description="暂无工具" />
          </div>

          <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
            <n-gi v-for="item in toolList" :key="item.id">
              <n-card class="nova-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
                <template #header>
                  <div class="flex gap-2">
                    <div
                      class="flex-shrink-0 self-start"
                      style="width: 44px; height: 44px; margin-top: 2px;"
                      v-html="getToolTypeIcon(item.toolType, item.id)"
                    />
                    <div class="flex-1">
                      <div class="flex items-center gap-2">
                        <div class="text-base font-medium">
                          {{ item.name }}
                        </div>
                        <n-tag size="small" round :type="item.toolType === 'http' ? 'info' : 'warning'">
                          {{ item.toolType.toUpperCase() }}
                        </n-tag>
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        <n-time :time="(item as any).createTime" format="yyyy-MM-dd HH:mm" />
                      </div>
                    </div>
                  </div>
                </template>
                <template #header-extra>
                  <n-button size="small" type="primary" quaternary @click="openCopyModal('tool', item.id)">
                    复制到工作空间
                  </n-button>
                </template>
                <n-thing>
                  <template #description>
                    <div class="text-12px text-gray-500">
                      <div class="line-clamp-3 break-all">
                        {{ item.description }}
                      </div>
                      <div class="mt-2">
                        <span>创建人：{{ item.userName || '--' }}</span>
                      </div>
                    </div>
                  </template>
                </n-thing>
              </n-card>
            </n-gi>
          </n-grid>
        </n-spin>

        <div class="flex justify-end mt-16px">
          <n-pagination
            v-model:page="pageNum"
            v-model:page-size="pageSize"
            :page-count="Math.ceil(total / pageSize) || 1"
            show-size-picker
            :page-sizes="[10, 20, 50]"
            @update:page="() => fetchTools()"
            @update:page-size="() => { pageNum = 1; fetchTools() }"
          />
        </div>
      </n-tab-pane>
    </n-tabs>
    <!-- 复制到工作空间弹框 -->
    <n-modal v-model:show="copyModalVisible" preset="card" :bordered="false" :mask-closable="false" :style="{ width: '420px' }">
      <template #header>
        <div class="text-base font-semibold">
          复制到工作空间
        </div>
      </template>
      <div class="space-y-3">
        <n-form label-placement="top">
          <n-form-item label="选择工作空间">
            <n-select v-model:value="selectedWorkspaceId" :options="workspaceStore.workspaces.map(w => ({ label: w.name, value: w.id }))" placeholder="请选择工作空间" />
          </n-form-item>
        </n-form>
        <div class="flex justify-end gap-2">
          <n-button quaternary @click="copyModalVisible = false">
            取消
          </n-button>
          <n-button type="primary" @click="submitCopy">
            保存
          </n-button>
        </div>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow;
}

.agent-card {
  position: relative;
  overflow: hidden;
}

/* 应用商店卡片不展示发布角标 */
</style>
