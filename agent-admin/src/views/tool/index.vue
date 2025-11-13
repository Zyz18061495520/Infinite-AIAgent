<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useBoolean } from '@/hooks'
import { deleteToolApi, getToolsPageApi, toggleToolPublishApi } from '@/service'
import { publishToAppstoreApi } from '@/service/api/tool'
import { toolTypeOptions } from '@/constants/tool'
import ToolFormModal from './components/ToolFormModal.vue'
import { useAuthStore } from '@/store/auth'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const list = ref<Entity.Tool[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const filters = ref<{ toolType?: string, isPublish?: boolean, name?: string }>({ toolType: undefined, isPublish: undefined, name: '' })

const publishOptions: { label: string, value: boolean }[] = [
  { label: '启用', value: true },
  { label: '停用', value: false },
]

// 顶部类型筛选 Tab
const activeToolTypeTab = ref('')
function handleToolTypeTabChange(val: string) {
  activeToolTypeTab.value = val
  filters.value.toolType = val || undefined
  pageNum.value = 1
  loadList()
}

// 工具类型选项（包含全部）
const toolTypeTabOptions = [
  { label: '全部', value: '' },
  ...toolTypeOptions,
]

const modalRef = ref<InstanceType<typeof ToolFormModal> | null>(null)
const auth = useAuthStore()
const currentUserId = computed(() => auth.userInfo?.id)

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

async function loadList() {
  startLoading()
  try {
    const { isSuccess, data } = await getToolsPageApi({
      toolType: filters.value.toolType,
      isPublish: filters.value.isPublish,
      name: filters.value.name,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (isSuccess && data) {
      list.value = data.list || []
      total.value = (data as any).pagination?.total || 0
    }
  }
  finally {
    endLoading()
  }
}

function openAdd() {
  modalRef.value?.openModal('add')
}
function openEdit(row: Entity.Tool) {
  modalRef.value?.openModal('edit', row)
}

async function handleDelete(id: string) {
  await window.$dialog.info({
    title: '删除确认',
    content: '删除后不可恢复，是否继续？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      startLoading()
      try {
        const { isSuccess } = await deleteToolApi(id)
        if (isSuccess) {
          window.$message.success('删除成功')
          await loadList()
        }
      }
      finally {
        endLoading()
      }
    },
  })
}

async function togglePublish(row: Entity.Tool) {
  const next = !row.isPublish
  const { isSuccess } = await toggleToolPublishApi(row.id as string, next)
  if (isSuccess) {
    row.isPublish = next
    window.$message.success(next ? '已启用' : '已停用')
  }
}

async function handlePublishToAppstore(item: Entity.Tool) {
  await window.$dialog.info({
    title: '发布确认',
    content: '确认将该工具发布到应用商店？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      startLoading()
      try {
        const { isSuccess } = await publishToAppstoreApi(item.id as string)
        if (isSuccess) {
          window.$message.success('发布到应用商店成功')
        }
        else {
          window.$message.error('发布失败')
        }
      }
      catch {
        window.$message.error('发布失败')
      }
      finally {
        endLoading()
      }
    },
  })
}

onMounted(loadList)
</script>

<template>
  <div class="p-16px pt-0">
    <!-- 顶部类型筛选 Tab -->
    <n-tabs type="line" :value="activeToolTypeTab" class="mb-12px" @update:value="handleToolTypeTabChange">
      <n-tab-pane v-for="opt in toolTypeTabOptions" :key="opt.value || 'all'" :name="opt.value" :tab="opt.label" />
    </n-tabs>

    <!-- 筛选栏 -->
    <n-space align="center" justify="space-between" class="mb-16px">
      <n-space align="center">
        <!-- 工具名称搜索 -->
        <n-space align="center">
          <span>工具名称：</span>
          <n-input
            v-model:value="(filters as any).name"
            placeholder="请输入工具名称"
            style="width: 200px"
            clearable
            @keyup.enter="() => { pageNum = 1; loadList() }"
          />
        </n-space>

        <!-- 启用状态筛选 -->
        <n-space align="center">
          <span>启用状态：</span>
          <n-select
            v-model:value="(filters as any).isPublish"
            placeholder="全部"
            clearable
            :options="(publishOptions as any)"
            style="width: 100px"
          />
        </n-space>
        <n-button type="primary" @click="() => { pageNum = 1; loadList() }">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" /></svg>
            </n-icon>
          </template>
          查询
        </n-button>
        <n-button quaternary @click="() => { activeToolTypeTab = ''; (filters as any).toolType = undefined; (filters as any).isPublish = undefined; (filters as any).name = ''; pageNum = 1; loadList() }">
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
        新增工具
      </n-button>
    </n-space>

    <n-spin :show="loading">
      <div v-if="!loading && (!list || list.length === 0)" class="py-10">
        <n-empty description="暂无工具" />
      </div>

      <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in list" :key="item.id">
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
              <n-space align="center">
                <n-switch :value="!!item.isPublish" @update:value="() => togglePublish(item)">
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
                <n-popconfirm v-if="currentUserId && currentUserId === item.userId" :on-positive-click="() => handleDelete(item.id as string)">
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
                  确认删除该工具吗？
                </n-popconfirm>
                <n-dropdown :options="[{ label: '发布到应用商店', key: 'publish' }]" trigger="click" @select="(key) => { if (key === 'publish') handlePublishToAppstore(item) }">
                  <n-button size="small" quaternary circle>
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                          <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
                        </svg>
                      </n-icon>
                    </template>
                  </n-button>
                </n-dropdown>
              </n-space>
            </template>
            <n-thing>
              <template #description>
                <div class="text-12px text-gray-500">
                  <div class="line-clamp-3 break-all">
                    {{ item.description }}
                  </div>
                  <div class="mt-2">
                    <span>创建人：{{ (item as any).userName || '--' }}</span>
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
        v-model:page="(pageNum as any)" v-model:page-size="(pageSize as any)" :page-count="Math.ceil(total / pageSize) || 1" show-size-picker :page-sizes="[10, 20, 50]"
        @update:page="loadList" @update:page-size="() => { pageNum = 1; loadList() }"
      />
    </div>

    <ToolFormModal ref="modalRef" @success="loadList" />
  </div>
</template>
