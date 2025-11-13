<script setup lang="ts">
import { deleteModelApi, getModelsApi, toggleModelEnabledApi } from '@/service'
import { modelProviderOptions } from '@/constants/model'
import ModelFormModal from './components/ModelFormModal.vue'
import { h } from 'vue'
import { useAuthStore } from '@/store/auth'
import { useBoolean } from '@/hooks'

const providerOptions = computed(() =>
  modelProviderOptions.map(opt => ({ label: opt.label, value: opt.value, icon: opt.icon })),
)

const filters = reactive<{ provider?: string, enabled?: boolean }>({ provider: undefined, enabled: undefined })

const enabledOptions = [
  { label: '启用', value: true },
  { label: '停用', value: false },
] as const
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const list = ref<Entity.Model[]>([])
const auth = useAuthStore()
const currentUserId = computed(() => auth.userInfo?.id)

function toIcon(path?: string) {
  return path || ''
}

async function fetchList() {
  startLoading()
  const { data } = await getModelsApi({
    provider: filters.provider,
    enabled: filters.enabled !== undefined && filters.enabled !== null ? filters.enabled : '' as any,
  })
  list.value = data || []
  endLoading()
}

// 查询处理
function handleSearch() {
  fetchList()
}

// 重置处理
function clearSearch() {
  filters.provider = undefined
  filters.enabled = undefined
  fetchList()
}

onMounted(fetchList)

const modalRef = ref<InstanceType<typeof ModelFormModal> | null>(null)
function openAdd() {
  modalRef.value?.openModal('add')
}
function openEdit(row: Entity.Model) {
  modalRef.value?.openModal('edit', row)
}

async function confirmDelete(row: Entity.Model) {
  await window.$dialog.info({
    title: '删除确认',
    content: '删除后不可恢复，是否继续？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      const { isSuccess } = await deleteModelApi(row.id as string)
      if (isSuccess) {
        window.$message.success('删除成功')
        fetchList()
      }
    },
  })
}

async function toggleEnabled(row: Entity.Model) {
  const next = !row.enabled
  const { isSuccess } = await toggleModelEnabledApi(row.id as string, next)
  if (isSuccess) {
    row.enabled = next
    window.$message.success(next ? '已启用' : '已停用')
  }
}

//
</script>

<template>
  <div class="p-16px">
    <n-space justify="space-between" align="center" class="mb-12px">
      <n-space align="center">
        <n-space align="center">
          <span>模型提供商：</span>
          <n-select
            v-model:value="filters.provider"
            placeholder="全部"
            clearable
            :options="providerOptions"
            :render-label="(option:any) => {
              return h('div', { class: 'flex items-center gap-8px' }, [
                h('img', { src: toIcon(option.icon), style: 'width:16px;height:16px;object-fit:contain' }),
                h('span', null, option.label),
              ])
            }"
            style="width: 220px"
          />
        </n-space>
        <!-- 启用状态筛选 -->
        <n-space align="center">
          <span>启用状态：</span>
          <n-select
            v-model:value="(filters as any).enabled"
            placeholder="全部"
            clearable
            :options="(enabledOptions as any)"
            style="width: 100px"
          />
        </n-space>

        <!-- 查询和重置按钮 -->
        <n-button type="primary" @click="handleSearch">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" /></svg>
            </n-icon>
          </template>
          查询
        </n-button>
        <n-button quaternary @click="clearSearch">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65Z" /></svg>
            </n-icon>
          </template>
          重置
        </n-button>
      </n-space>
      <n-button type="primary" @click="openAdd">
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          </n-icon>
        </template>
        新增模型
      </n-button>
    </n-space>

    <n-spin :show="loading">
      <n-empty v-if="!loading && (!list || list.length === 0)" description="暂无模型" />

      <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in list" :key="item.id">
          <n-card class="nova-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
            <template #header>
              <div class="flex gap-2">
                <div
                  class="flex-shrink-0 self-start"
                  style="width: 44px; height: 44px; margin-top: 2px;"
                >
                  <img :src="toIcon(modelProviderOptions.find(o => o.value === item.provider)?.icon)" style="width:44px;height:44px;object-fit:contain">
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <div class="text-base font-medium">
                      {{ item.name }}
                    </div>
                    <n-tag size="small" round :type="item.provider === 'openai' ? 'info' : item.provider === 'deepseek' ? 'success' : item.provider === 'qwen' ? 'warning' : 'default'">
                      {{ modelProviderOptions.find(o => o.value === item.provider)?.label || item.provider }}
                    </n-tag>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <n-time :time="item.createTime as any" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </div>
            </template>
            <template #header-extra>
              <n-space align="center">
                <n-switch :value="!!item.enabled" @update:value="() => toggleEnabled(item)">
                  <template #checked>
                    启用
                  </template>
                  <template #unchecked>
                    停用
                  </template>
                </n-switch>
                <n-button size="small" tertiary round @click="openEdit(item)">
                  <template #icon>
                    <n-icon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </n-icon>
                  </template>
                  编辑
                </n-button>
                <n-popconfirm v-if="currentUserId && currentUserId === item.userId" :on-positive-click="() => confirmDelete(item)">
                  <template #trigger>
                    <n-button size="small" tertiary round type="error">
                      <template #icon>
                        <n-icon>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" /></svg>
                        </n-icon>
                      </template>
                      删除
                    </n-button>
                  </template>
                  确认删除该模型吗？
                </n-popconfirm>
              </n-space>
            </template>
            <n-thing>
              <template #description>
                <div class="text-12px text-gray-500 nova-meta">
                  <div>
                    <span class="text-gray-400">模型名称</span>
                    <div class="truncate" :title="item.modelName">
                      {{ item.modelName }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-400">Base URL</span>
                    <div class="truncate" :title="item.baseUrl">
                      {{ item.baseUrl }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-400">Max Tokens</span>
                    <div>{{ item.maxTokens }}</div>
                  </div>
                  <div>
                    <span class="text-gray-400">TopP</span>
                    <div>{{ Number(item.topP ?? 1).toFixed(1) }}</div>
                  </div>
                  <div>
                    <span class="text-gray-400">Temperature</span>
                    <div>{{ Number(item.temperature ?? 1).toFixed(1) }}</div>
                  </div>
                  <div>
                    <span class="text-gray-400">创建人</span>
                    <div>{{ (item as any).userName || '--' }}</div>
                  </div>
                </div>
              </template>
            </n-thing>
          </n-card>
        </n-gi>
      </n-grid>
    </n-spin>

    <ModelFormModal ref="modalRef" @success="fetchList" />
  </div>
</template>
