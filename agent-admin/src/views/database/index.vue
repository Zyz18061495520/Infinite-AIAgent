<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useBoolean } from '@/hooks'
import { deleteDatabaseApi, getDatabasesPageApi } from '@/service'
import { NButton, NCard, NPagination, NPopconfirm } from 'naive-ui'
import { dbTypeOptions } from '@/constants/database'
import DatabaseFormModal from './components/DatabaseFormModal.vue'
import { useAuthStore } from '@/store/auth'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const list = ref<any[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

interface DatabaseFormModalExposed { openModal: (type: 'add' | 'edit', data?: any) => void }
const modalRef = ref<DatabaseFormModalExposed | null>(null)
const auth = useAuthStore()
const currentUserId = computed(() => auth.userInfo?.id)

function toIcon(path?: string) {
  return path || ''
}

async function loadList() {
  startLoading()
  try {
    const { isSuccess, data } = await getDatabasesPageApi({ pageNum: pageNum.value, pageSize: pageSize.value })
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
function openEdit(row: any) {
  modalRef.value?.openModal('edit', row)
}

async function handleDelete(id: string) {
  startLoading()
  try {
    const { isSuccess } = await deleteDatabaseApi(id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadList()
    }
  }
  finally {
    endLoading()
  }
}

onMounted(loadList)
</script>

<template>
  <div>
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">
        数据库管理
      </h2>
      <NButton type="primary" @click="openAdd">
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          </n-icon>
        </template>
        新增数据库
      </NButton>
    </div>
    <n-spin :show="loading">
      <div v-if="!loading && (!list || list.length === 0)" class="py-6 text-center text-gray-500">
        暂无数据
      </div>
      <div v-else>
        <n-grid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <n-gi v-for="item in list" :key="item.id">
            <NCard class="nova-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
              <template #header>
                <div class="flex gap-2">
                  <div
                    class="flex-shrink-0 self-start"
                    style="width: 44px; height: 44px; margin-top: 2px;"
                  >
                    <img :src="toIcon(dbTypeOptions.find(o => o.value === item.dbType)?.icon)" style="width:44px;height:44px;object-fit:contain">
                  </div>
                  <div class="flex-1">
                    <div class="flex items-center gap-2">
                      <div class="text-base font-medium">
                        {{ item.dbDatabase }}
                      </div>
                      <n-tag size="small" round type="success">
                        {{ dbTypeOptions.find(o => o.value === item.dbType)?.label || item.dbType }}
                      </n-tag>
                    </div>
                    <div class="text-xs text-gray-500 mt-1">
                      <n-time :time="(item as any).createTime" format="yyyy-MM-dd HH:mm" />
                    </div>
                  </div>
                </div>
              </template>
              <template #header-extra>
                <div class="flex items-center gap-2">
                  <NButton size="small" tertiary round @click="openEdit(item)">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                      </n-icon>
                    </template>
                    编辑
                  </NButton>
                  <NPopconfirm v-if="currentUserId && currentUserId === item.userId" :on-positive-click="() => handleDelete(item.id)">
                    <template #trigger>
                      <NButton size="small" tertiary round type="error">
                        <template #icon>
                          <n-icon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" /></svg>
                          </n-icon>
                        </template>
                        删除
                      </NButton>
                    </template>
                    确认删除该数据库吗？
                  </NPopconfirm>
                </div>
              </template>
              <n-thing>
                <template #description>
                  <div class="text-12px text-gray-500 nova-meta">
                    <div>
                      <span class="text-gray-400">Host</span>
                      <div class="truncate" :title="item.dbHost">
                        {{ item.dbHost }}
                      </div>
                    </div>
                    <div>
                      <span class="text-gray-400">Port</span>
                      <div>{{ item.dbPort }}</div>
                    </div>
                    <div>
                      <span class="text-gray-400">User</span>
                      <div>{{ item.dbUser }}</div>
                    </div>
                    <div>
                      <span class="text-gray-400">创建人</span>
                      <div>{{ (item as any).userName || '--' }}</div>
                    </div>
                  </div>
                </template>
              </n-thing>
            </NCard>
          </n-gi>
        </n-grid>
      </div>
      <div class="flex justify-end mt-4">
        <NPagination
          v-model:page="pageNum"
          v-model:page-size="pageSize"
          :page-count="Math.ceil(total / pageSize)"
          :page-sizes="[10, 20, 50]"
          show-size-picker
          show-quick-jumper
          show-total
          @update:page="loadList"
          @update:page-size="loadList"
        />
      </div>
    </n-spin>

    <DatabaseFormModal ref="modalRef" @success="loadList" />
  </div>
</template>
