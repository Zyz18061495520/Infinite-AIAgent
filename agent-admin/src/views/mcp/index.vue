<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useBoolean } from '@/hooks'
import { createMcpServerApi, deleteMcpServerApi, getMcpServersPageApi, getMcpToolsApi, updateMcpServerApi } from '@/service'
import { mcpTypeOptions, Regex } from '@/constants'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: toolsLoading, setTrue: startToolsLoading, setFalse: endToolsLoading } = useBoolean(false)

const list = ref<any[]>([])
const total = ref(0)
const pageNum = ref(1)
const pageSize = ref(10)

const filters = reactive<{ name?: string, type?: 'streamable_http' | 'sse' | null }>({ name: '', type: null })

async function loadList() {
  startLoading()
  try {
    const { isSuccess, data } = await getMcpServersPageApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      name: filters.name || undefined,
      type: filters.type || undefined,
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

function handleSearch() {
  pageNum.value = 1
  loadList()
}

function clearSearch() {
  filters.name = ''
  filters.type = null
  pageNum.value = 1
  loadList()
}

function handlePageChange(page: number) {
  pageNum.value = page
  loadList()
}

function handlePageSizeChange(size: number) {
  pageSize.value = size
  pageNum.value = 1
  loadList()
}

// 弹窗表单
type ModalType = 'add' | 'edit'
const showModal = ref(false)
const modalType = ref<ModalType>('add')
const editRow = ref<any | null>(null)
const formModel = ref<{ id?: string, name: string, description: string, url: string, type: 'streamable_http' | 'sse', authorization?: string }>({
  name: '',
  description: '',
  url: '',
  type: 'streamable_http',
  authorization: '',
})

// 工具列表弹框
const showToolsModal = ref(false)
const toolsList = ref<any[]>([])
const currentMcp = ref<any>(null)

// MCP名称输入限制：只允许大小写字母、数字、下划线、中划线
function filterMcpName(value: string) {
  return value.replace(/[^\w-]/g, '')
}

function openAdd() {
  modalType.value = 'add'
  editRow.value = null
  formModel.value = { name: '', description: '', url: '', type: 'streamable_http', authorization: '' }
  showModal.value = true
}

function openEdit(row: any) {
  modalType.value = 'edit'
  editRow.value = row
  formModel.value = {
    id: row.id,
    name: row.name,
    description: row.description || '',
    url: row.url || '',
    type: row.type,
    authorization: row.authorization || '',
  }
  showModal.value = true
}

async function submitForm() {
  if (!formModel.value.name || !formModel.value.description || !formModel.value.url || !formModel.value.type) {
    window.$message.warning('请完整填写必填项')
    return
  }
  startLoading()
  try {
    if (modalType.value === 'add') {
      const { isSuccess } = await createMcpServerApi({
        name: formModel.value.name,
        description: formModel.value.description,
        url: formModel.value.url,
        type: formModel.value.type,
        authorization: formModel.value.authorization || undefined,
      })
      if (isSuccess) {
        window.$message.success('创建成功')
        showModal.value = false
        await loadList()
      }
    }
    else if (formModel.value.id) {
      const { isSuccess } = await updateMcpServerApi(formModel.value.id, {
        name: formModel.value.name,
        description: formModel.value.description,
        url: formModel.value.url,
        type: formModel.value.type,
        authorization: formModel.value.authorization || undefined,
      })
      if (isSuccess) {
        window.$message.success('更新成功')
        showModal.value = false
        await loadList()
      }
    }
  }
  finally {
    endLoading()
  }
}

async function handleDelete(row: any) {
  startLoading()
  try {
    const { isSuccess } = await deleteMcpServerApi(row.id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadList()
    }
  }
  finally {
    endLoading()
  }
}

async function openToolsModal(row: any) {
  currentMcp.value = row
  toolsList.value = [] // 先清空上次的工具列表
  showToolsModal.value = true
  startToolsLoading()
  try {
    const { isSuccess, data } = await getMcpToolsApi({
      type: row.type,
      url: row.url,
    })
    if (isSuccess && data) {
      toolsList.value = data || []
    }
    else {
      toolsList.value = []
      window.$message.warning('获取工具列表失败')
    }
  }
  finally {
    endToolsLoading()
  }
}

onMounted(loadList)
</script>

<template>
  <div class="p-16px">
    <n-space justify="space-between" align="center" class="mb-12px">
      <n-space align="center">
        <n-space align="center">
          <span>名称：</span>
          <n-input v-model:value="filters.name" placeholder="输入名称搜索" clearable style="width: 240px" @keyup.enter="handleSearch" />
        </n-space>
        <n-space align="center">
          <span>类型：</span>
          <n-select v-model:value="filters.type" placeholder="全部" clearable :options="mcpTypeOptions" style="width: 200px" />
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
        新增 MCP
      </n-button>
    </n-space>

    <n-spin :show="loading">
      <n-empty v-if="!loading && (!list || list.length === 0)" description="暂无数据" />
      <n-grid v-else responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
        <n-gi v-for="item in list" :key="item.id">
          <n-card class="nova-card" :segmented="{ content: true, action: true }" :bordered="true">
            <template #header>
              <div>
                <div class="flex items-center gap-2">
                  <div class="text-base font-medium">
                    {{ item.name }}
                  </div>
                  <n-tag size="small" round type="info">
                    {{ item.type }}
                  </n-tag>
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  <n-time :time="item.update_time as any" format="yyyy-MM-dd HH:mm" />
                </div>
              </div>
            </template>
            <template #header-extra>
              <n-space>
                <n-button size="small" tertiary round @click="openToolsModal(item)">
                  <template #icon>
                    <n-icon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M22.7 19l-9.1-9.1c.9-2.3.4-5-1.5-6.9-2-2-5-2.4-7.4-1.3L9 6 6 9 1.6 4.7C.4 7.1.9 10.1 2.9 12.1c1.9 1.9 4.6 2.4 6.9 1.5l9.1 9.1c.4.4 1 .4 1.4 0l2.3-2.3c.5-.4.5-1.1.1-1.4z" /></svg>
                    </n-icon>
                  </template>
                  查看工具
                </n-button>
                <n-button size="small" tertiary round @click="openEdit(item)">
                  <template #icon>
                    <n-icon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </n-icon>
                  </template>
                  编辑
                </n-button>
                <n-popconfirm
                  :show-icon="false"
                  positive-text="删除"
                  negative-text="取消"
                  @positive-click="handleDelete(item)"
                >
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
                  删除后不可恢复，是否继续？
                </n-popconfirm>
              </n-space>
            </template>
            <n-thing>
              <template #description>
                <div class="text-12px text-gray-500 nova-meta">
                  <div>
                    <span class="text-gray-400">URL</span>
                    <div class="truncate" :title="item.url">
                      {{ item.url }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-400">Authorization</span>
                    <div class="truncate" :title="item.authorization">
                      {{ item.authorization || '-' }}
                    </div>
                  </div>
                  <div>
                    <span class="text-gray-400">描述</span>
                    <div class="truncate" :title="item.description">
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

      <div v-if="total > 0" class="flex justify-end mt-16px">
        <n-pagination :page="pageNum" :page-size="pageSize" :item-count="total" show-size-picker :page-sizes="[10, 20, 50]" @update:page="handlePageChange" @update:page-size="handlePageSizeChange" />
      </div>
    </n-spin>

    <!-- 表单弹窗 -->
    <n-modal v-model:show="showModal" preset="card" :title="modalType === 'add' ? '新增 MCP' : '编辑 MCP'" :style="{ width: '520px' }" :segmented="{ content: true, action: true }">
      <n-form label-placement="left" :label-width="120">
        <n-form-item label="名称" required>
          <n-input v-model:value="formModel.name" placeholder="请输入名称" @input="(value: string) => { formModel.name = filterMcpName(value) }" />
        </n-form-item>
        <n-form-item label="描述" required>
          <n-input v-model:value="formModel.description" type="textarea" placeholder="请输入描述" :autosize="{ minRows: 2, maxRows: 4 }" />
        </n-form-item>
        <n-form-item label="URL" required>
          <n-input v-model:value="formModel.url" placeholder="请输入服务 URL" />
        </n-form-item>
        <n-form-item label="类型" required>
          <n-radio-group v-model:value="formModel.type">
            <n-space>
              <n-radio value="streamable_http">
                streamable_http
              </n-radio>
              <n-radio value="sse">
                sse
              </n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        <n-form-item label="Authorization">
          <n-input v-model:value="formModel.authorization" type="textarea" placeholder="可选，鉴权令牌" :autosize="{ minRows: 2, maxRows: 4 }" />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="center">
          <n-button @click="showModal = false">
            取消
          </n-button>
          <n-button type="primary" :loading="loading" @click="submitForm">
            提交
          </n-button>
        </n-space>
      </template>
    </n-modal>

    <!-- 工具列表弹框 -->
    <n-modal v-model:show="showToolsModal" preset="card" :title="`${currentMcp?.name || ''} - 工具列表`" :style="{ width: '900px' }" :segmented="{ content: true }">
      <n-spin :show="toolsLoading">
        <n-empty v-if="!toolsLoading && (!toolsList || toolsList.length === 0)" description="暂无工具" />
        <n-grid v-else responsive="screen" :cols="3" :x-gap="16" :y-gap="16">
          <n-gi v-for="tool in toolsList" :key="tool.name">
            <n-card :bordered="true" size="small">
              <template #header>
                <div class="text-sm font-medium">
                  {{ tool.name }}
                </div>
              </template>
              <div class="text-xs text-gray-500">
                {{ tool.description || '-' }}
              </div>
            </n-card>
          </n-gi>
        </n-grid>
      </n-spin>
    </n-modal>
  </div>
</template>
