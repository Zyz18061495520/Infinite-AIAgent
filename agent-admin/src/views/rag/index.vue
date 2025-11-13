<script lang="tsx" setup>
import { onMounted, ref, computed } from 'vue'
import { NButton, NCard, NPagination, NPopconfirm, NInput, NIcon } from 'naive-ui'
import { useBoolean } from '@/hooks'
import RagModal from './components/RagModal.vue'
import { deleteRagApi, getRagListApi } from '@/service'
import { recallRagApi } from '@/service/api/rag'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { useAuthStore } from '@/store/auth'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const list = ref<any[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')

const modalRef = ref<InstanceType<typeof RagModal> | null>(null)
const auth = useAuthStore()
const currentUserId = computed(() => auth.userInfo?.id)

async function loadList() {
  startLoading()
  try {
    const { isSuccess, data } = await getRagListApi({ 
      page_num: pageNum.value, 
      page_size: pageSize.value,
      name: searchKeyword.value || undefined
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

function openEdit(row: any) {
  modalRef.value?.openModal('edit', row)
}

async function handleDelete(id: string) {
  startLoading()
  try {
    const { isSuccess } = await deleteRagApi(id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadList()
    }
  }
  finally {
    endLoading()
  }
}

// 搜索
function handleSearch() {
  pageNum.value = 1
  loadList()
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
  pageNum.value = 1
  loadList()
}

onMounted(loadList)

// 卡片视图，无需表格列

// 测试可用弹框
const testVisible = ref(false)
const testRow = ref<any>(null)
const testQuery = ref('')
const testLoading = ref(false)
const testResult = ref<any>(null)

function openTest(row: any) {
  testRow.value = row
  testQuery.value = ''
  testResult.value = null
  testVisible.value = true
}

async function doTest() {
  if (!testRow.value || !testQuery.value)
    return
  testLoading.value = true
  testResult.value = null
  try {
    const uploadId = (testRow.value.uploadId ?? testRow.value.upload_id ?? testRow.value.id) as string
    const { isSuccess, data } = await recallRagApi({
      uploadIds: [uploadId],
      query: testQuery.value,
      topK: 1,
      strategy: 'hybrid_search',
    })
    if (isSuccess)
      testResult.value = data
  }
  finally {
    testLoading.value = false
  }
}
</script>

<template>
  <div class="p-16px">
    <n-space align="center" justify="space-between" class="mb-16px">
      <n-space align="center">
        <!-- RAG名称搜索 -->
        <n-space align="center">
          <span>RAG名称：</span>
          <n-input
            v-model:value="searchKeyword"
            placeholder="请输入RAG名称"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
            @clear="clearSearch"
          />
        </n-space>
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
        新增RAG
      </n-button>
    </n-space>

    <n-spin :show="loading">
      <div v-if="!loading && (!list || list.length === 0)" class="py-10">
        <n-empty description="暂无RAG" />
      </div>

      <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in list" :key="item.id">
          <n-card class="nova-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
            <template #header>
              <div>
                <div class="text-base font-medium">
                  {{ item.name }}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  <n-time :time="(item as any).createTime" format="yyyy-MM-dd HH:mm" />
                </div>
              </div>
            </template>
            <template #header-extra>
              <div class="flex items-center gap-2">
                <NButton size="small" tertiary round @click="openEdit(item)">
                  <template #icon>
                    <NIcon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </NIcon>
                  </template>
                  编辑
                </NButton>
                <NPopconfirm v-if="currentUserId && currentUserId === item.userId" :on-positive-click="() => handleDelete(item.id)">
                  <template #trigger>
                    <NButton size="small" tertiary round type="error">
                      <template #icon>
                        <NIcon>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" /></svg>
                      </NIcon>
                    </template>
                    删除
                  </NButton>
                </template>
                确认删除该RAG吗？
              </NPopconfirm>
                <NButton size="small" tertiary round @click="openTest(item)">
                  <template #icon>
                    <NIcon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5z" /></svg>
                    </NIcon>
                  </template>
                  测试
                </NButton>
            </div>
          </template>
          <n-thing>
            <template #description>
              <div class="text-12px text-gray-500 nova-meta">
                <div>
                  <span class="text-gray-400">来源</span>
                  <div class="truncate" :title="item.sourceName">
                    {{ item.sourceName }}
                  </div>
                </div>
                <div class="col-span-1 sm:col-span-2">
                  <span class="text-gray-400">描述</span>
                  <div class="line-clamp-3 break-all">
                    {{ item.description }}
                  </div>
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

  <div class="flex justify-end mt-16px">
    <n-pagination
      v-model:page="pageNum" v-model:page-size="pageSize" :page-count="Math.ceil(total / pageSize) || 1" show-size-picker :page-sizes="[10, 20, 50]"
      @update:page="loadList" @update:page-size="() => { pageNum = 1; loadList() }"
    />
  </div>

  <RagModal ref="modalRef" @success="loadList" />

  <!-- 测试可用弹框 -->
  <n-modal v-model:show="testVisible" preset="card" title="RAG 召回测试" :segmented="{ content: true }" :style="{ width: '640px' }">
    <div class="space-y-3">
      <n-input v-model:value="testQuery" type="textarea" placeholder="请输入问题" :autosize="{ minRows: 3, maxRows: 6 }" />
      <div>
        <n-button type="primary" :loading="testLoading" :disabled="!testQuery" @click="doTest">
          测试
        </n-button>
      </div>
      <div v-if="testResult">
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
</div>
</template>