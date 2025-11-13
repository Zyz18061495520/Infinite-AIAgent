<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useBoolean } from '@/hooks'
import { deleteAgentApi, getAgentsPageApi } from '@/service/api/agent'
import AgentTypeSelectionModal from './components/AgentTypeSelectionModal.vue'

const router = useRouter()
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 智能体类型选择弹框引用
const agentTypeModalRef = ref<InstanceType<typeof AgentTypeSelectionModal> | null>(null)

// 智能体类型选项
const agentTypeOptions = [
  { label: '全部', value: '' },
  { label: '单智能体', value: 'single' },
  { label: '工作流', value: 'workflow' },
  { label: '多智能体', value: 'supervisor' },
]

// 筛选条件
const filters = reactive<{
  name?: string
  agent_type?: string
  isPublish?: string | null
}>({
  name: '',
  agent_type: '',
  isPublish: null,
})

// 顶部类型筛选 Tab
const activeAgentTypeTab = ref('')
function handleAgentTypeTabChange(val: string) {
  activeAgentTypeTab.value = val
  filters.agent_type = val
  handleSearch()
}

// 分页参数
const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

// 列表数据
const list = ref<any[]>([])

// 加载列表数据
async function fetchList() {
  startLoading()
  try {
    const { isSuccess, data } = await getAgentsPageApi({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      name: filters.name || undefined,
      agent_type: filters.agent_type || undefined,
      isPublish: filters.isPublish ? filters.isPublish === 'true' : undefined,
    })

    if (isSuccess && data) {
      list.value = data.list || []
      pagination.total = data.pagination?.total || 0
    }
  }
  catch (error) {
    console.error('加载智能体列表失败:', error)
  }
  finally {
    endLoading()
  }
}

// 搜索处理
function handleSearch() {
  pagination.pageNum = 1
  fetchList()
}

// 清空搜索（重置所有筛选条件）
function clearSearch() {
  filters.name = ''
  filters.agent_type = ''
  filters.isPublish = null
  pagination.pageNum = 1
  fetchList()
}

// 清空输入框（仅清空名称输入框时调用）
function clearNameInput() {
  filters.name = ''
}

// 分页变化
function handlePageChange(page: number) {
  pagination.pageNum = page
  fetchList()
}

function handlePageSizeChange(pageSize: number) {
  pagination.pageSize = pageSize
  pagination.pageNum = 1
  fetchList()
}

// 删除智能体
async function confirmDelete(item: any) {
  const { isSuccess } = await deleteAgentApi(item.id)
  if (isSuccess) {
    window.$message.success('删除成功')
    fetchList()
  }
}

// 编辑智能体
function goToEdit(item?: any) {
  // 如果是工作流类型，跳转到工作流编辑页面
  if (item?.agent_type === 'workflow' && item?.id) {
    router.push(`/workflow/edit?id=${item.id}`)
  }
  // 如果有 id，跳转到编辑页面
  else if (item?.id) {
    router.push(`/agent/edit?id=${item.id}`)
  }
  // 否则跳转到新增页面
  else {
    router.push('/agent/edit')
  }
}

// 显示智能体类型选择弹框
function showAgentTypeModal() {
  agentTypeModalRef.value?.show()
}

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

// 初始化
onMounted(fetchList)
</script>

<template>
  <div class="p-16px pt-0">
    <!-- 顶部类型筛选 Tab -->
    <n-tabs type="line" :value="activeAgentTypeTab" class="mb-12px" @update:value="handleAgentTypeTabChange">
      <n-tab-pane v-for="opt in agentTypeOptions" :key="opt.value || 'all'" :name="opt.value" :tab="opt.label" />
    </n-tabs>

    <!-- 筛选栏 -->
    <n-space justify="space-between" align="center" class="mb-12px">
      <n-space align="center">
        <!-- 智能体名称搜索 -->
        <n-space align="center">
          <span>智能体名称：</span>
          <n-input
            v-model:value="filters.name"
            placeholder="请输入智能体名称"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
            @clear="clearNameInput"
          />
        </n-space>

        <!-- 发布状态筛选 -->
        <n-space align="center">
          <span>发布状态：</span>
          <n-select
            v-model:value="filters.isPublish"
            placeholder="全部"
            clearable
            :options="[
              { label: '启用', value: 'true' },
              { label: '停用', value: 'false' },
            ]"
            style="width: 100px"
          />
        </n-space>

        <!-- 查询和重置按钮 -->
        <n-button type="primary" @click="handleSearch">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" />
              </svg>
            </n-icon>
          </template>
          查询
        </n-button>
        <n-button quaternary @click="clearSearch">
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

      <!-- 新增按钮 -->
      <n-button type="primary" @click="showAgentTypeModal">
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
            </svg>
          </n-icon>
        </template>
        创建智能体
      </n-button>
    </n-space>

    <!-- 列表内容 -->
    <n-spin :show="loading">
      <div v-if="!loading && (!list || list.length === 0)" class="py-6">
        <n-empty description="暂无智能体" />
      </div>

      <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in list" :key="item.id">
          <n-card class="nova-card agent-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
            <!-- 发布状态角标 -->
            <div class="publish-badge" :class="item.is_publish ? 'published' : 'unpublished'">
              <span class="badge-text">{{ item.is_publish ? '已发布' : '未发布' }}</span>
            </div>
            <template #header>
              <div class="flex gap-2">
                <div
                  class="flex-shrink-0 self-start"
                  style="width: 44px; height: 44px; margin-top: 2px;"
                  v-html="renderAgentTypeIcon(item.agent_type || 'single')"
                />
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="text-base font-medium">
                      {{ item.name }}
                    </div>
                    <n-tag size="small" round :type="item.agent_type === 'single' ? 'info' : item.agent_type === 'workflow' ? 'success' : 'warning'">
                      {{ agentTypeOptions.find(o => o.value === item.agent_type)?.label || item.agent_type }}
                    </n-tag>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <n-time :time="item.create_time as any" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </div>
            </template>
            <template #header-extra>
              <n-space align="center">
                <n-button size="small" tertiary round @click="goToEdit(item)">
                  <template #icon>
                    <n-icon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </n-icon>
                  </template>
                  编辑
                </n-button>
                <n-popconfirm :on-positive-click="() => confirmDelete(item)">
                  <template #trigger>
                    <n-button size="small" tertiary round type="error">
                      <template #icon>
                        <n-icon>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" />
                          </svg>
                        </n-icon>
                      </template>
                      删除
                    </n-button>
                  </template>
                  确认删除该智能体吗？
                </n-popconfirm>
              </n-space>
            </template>
            <n-thing>
              <!-- <template #avatar>
                <img v-if="item.model?.provider" :src="getModelProviderIcon(item.model.provider)" style="width:28px;height:28px;object-fit:contain">
              </template>
              <template #header>
                <div class="text-sm text-gray-600">
                  {{ item.model?.model_name }}
                </div>
              </template> -->
              <template #description>
                <div class="text-12px text-gray-500 space-y-2">
                  <div v-if="item.zh_name">
                    <span>中文名称：{{ item.zh_name || '--' }}</span>
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
      <div v-if="list.length > 0" class="mt-16px flex justify-end">
        <n-pagination
          v-model:page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.total"
          show-size-picker
          show-quick-jumper
          :page-sizes="[10, 20, 50]"
          @update:page="handlePageChange"
          @update:page-size="handlePageSizeChange"
        />
      </div>
    </n-spin>

    <!-- 智能体类型选择弹框 -->
    <AgentTypeSelectionModal ref="agentTypeModalRef" />
  </div>
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow;
}

.nova-meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
}

.agent-card {
  position: relative;
  overflow: hidden;
}

.publish-badge {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 50px;
  z-index: 1;
  overflow: hidden;
}

.publish-badge::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 50px 50px 0 0;
}

.publish-badge.published::before {
  border-color: #18a058 transparent transparent transparent;
}

.publish-badge.unpublished::before {
  border-color: #d9d9d9 transparent transparent transparent;
}

.badge-text {
  position: absolute;
  top: 24px;
  left: 0;
  transform: rotate(-45deg);
  transform-origin: 0 0;
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
  z-index: 2;
  /* text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2); */
  line-height: 1;
  display: inline-block;
}

.publish-badge.published .badge-text {
  color: #fff;
}

.publish-badge.unpublished .badge-text {
  color: #999;
}
</style>
