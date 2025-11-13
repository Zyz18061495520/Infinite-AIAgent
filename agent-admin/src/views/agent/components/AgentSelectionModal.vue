<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useBoolean } from '@/hooks'
import { getAgentsPageApi } from '@/service/api/agent'

interface Agent {
  id: string
  name: string
  zh_name: string
  description?: string
  agent_type?: string
  create_time?: string
}

interface Props {
  selectedAgents?: Agent[]
  excludeIds?: string[]
}

interface Emits {
  (e: 'confirm', agents: Agent[]): void
  (e: 'cancel'): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedAgents: () => [],
  excludeIds: () => [],
})

const emit = defineEmits<Emits>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

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
const list = ref<Agent[]>([])
const selectedAgents = ref<Agent[]>([])

// 加载智能体列表
async function fetchList() {
  startLoading()
  try {
    const { isSuccess, data } = await getAgentsPageApi({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      name: searchForm.name || undefined,
      agent_type: 'single', // 只显示单智能体
      isPublish: true, // 只显示已发布的
    })

    if (isSuccess && data) {
      // 过滤掉已排除的智能体和已选择的智能体
      const allAgents = (data.list || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        zh_name: item.zh_name,
        description: item.description,
        agent_type: item.agent_type,
        create_time: item.create_time,
      }))

      list.value = allAgents.filter(
        agent => !props.excludeIds.includes(agent.id) && !selectedAgents.value.some(s => s.id === agent.id),
      )
      pagination.total = data.pagination?.total || 0
    }
  }
  catch (error) {
    console.error('加载智能体列表失败:', error)
    window.$message.error('加载智能体列表失败')
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

// 切换智能体选择状态
function toggleAgentSelection(agent: Agent) {
  const index = selectedAgents.value.findIndex(item => item.id === agent.id)
  if (index > -1) {
    selectedAgents.value.splice(index, 1)
  }
  else {
    selectedAgents.value.push(agent)
  }
}

// 检查智能体是否已选择
function isAgentSelected(agent: Agent) {
  return selectedAgents.value.some(item => item.id === agent.id)
}

// 确认选择
function handleConfirm() {
  emit('confirm', selectedAgents.value)
  hideModal()
}

// 取消选择
function handleCancel() {
  emit('cancel')
  hideModal()
}

// 打开弹窗
function openModal(initialSelected: Agent[] = [], excludeIds: string[] = []) {
  selectedAgents.value = [...initialSelected]
  showModal()
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
    title="选择子智能体"
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
      </div>

      <!-- 已选择的智能体 -->
      <div v-if="selectedAgents.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedAgents.length }} 个智能体：
        </div>
        <div class="flex flex-wrap gap-2">
          <n-tag
            v-for="agent in selectedAgents"
            :key="agent.id"
            closable
            @close="() => toggleAgentSelection(agent)"
          >
            {{ agent.name }}
          </n-tag>
        </div>
      </div>

      <!-- 智能体列表 -->
      <div v-if="!loading && (!list || list.length === 0)" class="py-8">
        <n-empty description="暂无可用的单智能体" />
      </div>
      <div v-else>
        <n-grid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <n-gi v-for="agent in list" :key="agent.id">
            <n-card
              class="nova-card cursor-pointer"
              :segmented="{ content: true }"
              :bordered="true"
              :class="{ 'selected-card': isAgentSelected(agent) }"
              @click="toggleAgentSelection(agent)"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <n-checkbox
                      :checked="isAgentSelected(agent)"
                      @update:checked="() => toggleAgentSelection(agent)"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ agent.name }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1" v-if="agent.zh_name">
                    {{ agent.zh_name }}
                  </div>
                  <div class="text-xs text-gray-500 mt-1" v-if="agent.create_time">
                    <n-time :time="agent.create_time as any" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </template>

              <div class="text-sm text-gray-600">
                {{ agent.description || '暂无描述' }}
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
        <n-button type="primary" :disabled="selectedAgents.length === 0" @click="handleConfirm">
          确认选择 ({{ selectedAgents.length }})
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

