<script setup lang="ts">
import { useRouter } from 'vue-router'
import { onMounted, reactive, ref, watch } from 'vue'
import { useBoolean } from '@/hooks'
import { getAgentsPageApi } from '@/service/api/agent'
import { modelProviderOptions } from '@/constants/model'

interface Workflow {
  id: string
  name: string
  zh_name: string
  description: string
  agent_type: string
  model: {
    provider: string
    model_name: string
  }
  create_time: string
  is_publish: boolean
}

interface Props {
  selectedWorkflows?: Workflow[]
}

interface Emits {
  (e: 'confirm', workflows: Workflow[]): void
  (e: 'cancel'): void
}

const _props = withDefaults(defineProps<Props>(), {
  selectedWorkflows: () => [],
})

const emit = defineEmits<Emits>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 工作流维护弹框引用

// 分页参数
const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

// 搜索条件
const searchForm = reactive({
  name: '',
})

// 列表数据
const list = ref<Workflow[]>([])
const selectedWorkflows = ref<Workflow[]>([])

// 获取模型提供商图标
function _getModelProviderIcon(provider: string) {
  return modelProviderOptions.find(o => o.value === provider)?.icon || ''
}

// 加载工作流列表
async function fetchList() {
  startLoading()
  try {
    const { isSuccess, data } = await getAgentsPageApi({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      agent_type: 'workflow', // 固定传递 workflow
      isPublish: true, // 只显示已发布的工作流
    })

    if (isSuccess && data) {
      list.value = data.list || []
      pagination.total = data.pagination?.total || 0
    }
  }
  catch (error) {
    console.error('加载工作流列表失败:', error)
    window.$message.error('加载工作流列表失败')
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

// 清空搜索
function clearSearch() {
  searchForm.name = ''
  pagination.pageNum = 1
  fetchList()
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

// 切换工作流选择状态
function toggleWorkflowSelection(workflow: Workflow) {
  const index = selectedWorkflows.value.findIndex(item => item.id === workflow.id)
  if (index > -1) {
    selectedWorkflows.value.splice(index, 1)
  }
  else {
    selectedWorkflows.value.push(workflow)
  }
}

// 检查工作流是否已选择
function isWorkflowSelected(workflow: Workflow) {
  return selectedWorkflows.value.some(item => item.id === workflow.id)
}

// 确认选择
function handleConfirm() {
  emit('confirm', selectedWorkflows.value)
  hideModal()
}

// 取消选择
function handleCancel() {
  emit('cancel')
  hideModal()
}

// 打开弹窗
function openModal(initialSelected: Workflow[] = []) {
  selectedWorkflows.value = [...initialSelected]
  showModal()
  fetchList()
}

// 打开新增工作流页面（新窗口）
const router = useRouter()
function openAddWorkflow() {
  const routeUrl = router.resolve('/workflow/edit')
  window.open(routeUrl.href, '_blank')
}

// 处理工作流创建成功
function handleWorkflowCreated(_workflow: any) {
  // 刷新工作流列表
  fetchList()
}

// 监听搜索条件变化
watch(() => searchForm.name, () => {
  pagination.pageNum = 1
  fetchList()
})

// 暴露方法
defineExpose({
  openModal,
})

onMounted(() => {
  // 组件挂载时不自动加载，等待 openModal 调用
})
</script>

<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    title="选择工作流"
    class="w-1000px"
    :bordered="false"
  >
    <div class="space-y-4">
      <!-- 搜索栏 -->
      <div class="flex gap-2 items-center justify-between">
        <div class="flex gap-2 items-center">
          <n-input
            v-model:value="searchForm.name"
            placeholder="按名称搜索"
            style="width: 220px"
            clearable
            @keyup.enter="handleSearch"
            @clear="clearSearch"
          />
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
        </div>
        <n-button type="primary" @click="openAddWorkflow">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
              </svg>
            </n-icon>
          </template>
          新增工作流
        </n-button>
      </div>

      <!-- 已选择的工作流 -->
      <div v-if="selectedWorkflows.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedWorkflows.length }} 个工作流：
        </div>
        <div class="flex flex-wrap gap-2">
          <n-tag
            v-for="workflow in selectedWorkflows"
            :key="workflow.id"
            closable
            @close="() => toggleWorkflowSelection(workflow)"
          >
            {{ workflow.name }}
          </n-tag>
        </div>
      </div>

      <!-- 工作流列表 -->
      <div v-if="!loading && (!list || list.length === 0)" class="py-8">
        <n-empty description="暂无工作流" />
      </div>
      <div v-else>
        <n-grid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <n-gi v-for="workflow in list" :key="workflow.id">
            <n-card
              class="nova-card cursor-pointer"
              :segmented="{ content: true }"
              :bordered="true"
              :class="{ 'selected-card': isWorkflowSelected(workflow) }"
              @click="toggleWorkflowSelection(workflow)"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <n-checkbox
                      :checked="isWorkflowSelected(workflow)"
                      @update:checked="() => toggleWorkflowSelection(workflow)"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ workflow.name }}
                    </div>
                    <!-- <n-tag size="small" round type="success">
                      工作流
                    </n-tag> -->
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <n-time :time="workflow.create_time as any" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </template>

              <div class="text-sm text-gray-600">
                {{ workflow.description || workflow.zh_name || '暂无描述' }}
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- 分页 -->
      <div class="flex justify-end">
        <n-pagination
          v-model:page="pagination.pageNum"
          v-model:page-size="pagination.pageSize"
          :item-count="pagination.total"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="handlePageChange"
          @update:page-size="() => { pagination.pageNum = 1; handlePageSizeChange(pagination.pageSize) }"
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <n-button @click="handleCancel">
          取消
        </n-button>
        <n-button type="primary" :disabled="selectedWorkflows.length === 0" @click="handleConfirm">
          确认选择 ({{ selectedWorkflows.length }})
        </n-button>
      </div>
    </template>
  </n-modal>

  
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>
