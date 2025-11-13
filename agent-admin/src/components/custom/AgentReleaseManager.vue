<script setup lang="ts">
import { computed, h, ref } from 'vue'
import { useBoolean } from '@/hooks'
import { getAgentReleasesApi, publishAgentApi, publishToAppstoreApi } from '@/service/api/agent'
import { createApiKeyApi, generateApiKeyApi, getApiKeysApi } from '@/service/api/apikey'
import { NAlert, NButton, NDataTable, NDatePicker, NForm, NFormItem, NIcon, NInput, NModal, NPopconfirm, NSpin } from 'naive-ui'
import dayjs from 'dayjs'

const props = withDefaults(defineProps<{
  agentId?: string | null
}>(), {
  agentId: null,
})

// no emits

const { bool: visible, setTrue: openModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const releases = ref<any[]>([])

// 创建发布（仅版本号）
const { bool: createVisible, setTrue: openCreateModal, setFalse: closeCreateModal } = useBoolean(false)
const { bool: createLoading, setTrue: startCreateLoading, setFalse: endCreateLoading } = useBoolean(false)
const createForm = ref({ version: '1.0' })
const createRules: any = { version: { required: true, message: '请输入版本号', trigger: 'blur' } }

// APIKey 管理状态
const { bool: apiMgrVisible, setTrue: openApiMgr } = useBoolean(false)
const apiMgrList = ref<any[]>([])
const apiMgrVersion = ref<string>('')
const { bool: apiMgrLoading, setTrue: startApiMgrLoading, setFalse: endApiMgrLoading } = useBoolean(false)

// 创建 APIKey 弹框状态（版本号带入且不可编辑）
const { bool: apiCreateVisible, setTrue: openApiCreate, setFalse: closeApiCreate } = useBoolean(false)
const { bool: apiCreateLoading, setTrue: startApiCreateLoading, setFalse: endApiCreateLoading } = useBoolean(false)
const keyLoadingPart = ref<'gen' | ''>('')
const nowTs = () => Date.now()
const ms30d = 30 * 24 * 60 * 60 * 1000
const apiCreateForm = ref({
  version: '',
  api_key: '',
  effective: nowTs(),
  expire: nowTs() + ms30d,
  remark: '',
})
const apiCreateRules: any = {
  api_key: { required: true, message: '请生成 APIKey', trigger: 'change' },
  effective: { required: true, type: 'number', message: '请选择生效时间', trigger: 'change' },
  expire: { required: true, type: 'number', message: '请选择过期时间', trigger: 'change' },
}

async function generateKey() {
  try {
    keyLoadingPart.value = 'gen'
    startApiCreateLoading()
    const { isSuccess, data } = await generateApiKeyApi()
    if (isSuccess && typeof data === 'string' && data) {
      apiCreateForm.value.api_key = data
      window.$message?.success('生成成功')
    }
    else {
      window.$message?.error('生成失败')
    }
  }
  catch {
    window.$message?.error('生成失败')
  }
  finally {
    keyLoadingPart.value = ''
    endApiCreateLoading()
  }
}

function toISO(ts: number) {
  try {
    return new Date(ts).toISOString()
  }
  catch {
    return new Date().toISOString()
  }
}

async function submitCreate() {
  if (!props.agentId) {
    window.$message?.warning('请先点击保存')
    return
  }
  startCreateLoading()
  try {
    const { isSuccess } = await publishAgentApi(props.agentId as string, {
      is_publish: true,
      version: createForm.value.version,
    })
    if (isSuccess) {
      window.$message?.success('发布成功')
      closeCreateModal()
      await fetchReleases()
    }
    else {
      window.$message?.error('发布失败')
    }
  }
  catch {
    window.$message?.error('发布失败')
  }
  finally {
    endCreateLoading()
  }
}

const hasId = computed(() => !!props.agentId)

async function handleOpen() {
  if (!hasId.value) {
    window.$message?.warning('请先点击保存')
    return
  }
  openModal()
  await fetchReleases()
}

async function fetchReleases() {
  if (!props.agentId)
    return
  startLoading()
  try {
    const { isSuccess, data } = await getAgentReleasesApi(props.agentId)
    if (isSuccess) {
      // 兼容返回数组或包含 list 的对象
      releases.value = Array.isArray(data) ? data : (data?.list ?? [])
    }
    else {
      releases.value = []
    }
  }
  catch {
    releases.value = []
  }
  finally {
    endLoading()
  }
}

function handleCreate() {
  if (!hasId.value) {
    window.$message?.warning('请先点击保存')
    return
  }
  // 每次打开时初始化表单
  createForm.value = {
    version: '1.0',
  }
  openCreateModal()
}

// 已移除上下架操作

async function openApiKeyManager(row: any) {
  if (!props.agentId)
    return
  apiMgrVersion.value = row?.version || ''
  openApiMgr()
  await fetchApiKeys()
}

async function fetchApiKeys() {
  if (!props.agentId)
    return
  startApiMgrLoading()
  try {
    const { isSuccess, data } = await getApiKeysApi({ agent_id: props.agentId as string, version: apiMgrVersion.value || '' })
    apiMgrList.value = isSuccess ? (Array.isArray(data) ? data : data?.list || []) : []
  }
  catch {
    apiMgrList.value = []
  }
  finally {
    endApiMgrLoading()
  }
}

function openCreateApiKey() {
  // 初始化 APIKey 创建表单，带入版本号且不可编辑版本字段
  apiCreateForm.value = {
    version: apiMgrVersion.value,
    api_key: '',
    effective: nowTs(),
    expire: nowTs() + ms30d,
    remark: '',
  }
  openApiCreate()
}

async function submitCreateApiKey() {
  if (!props.agentId)
    return
  if (!apiCreateForm.value.api_key) {
    window.$message?.warning('请先生成 APIKey')
    return
  }
  if (apiCreateForm.value.expire < apiCreateForm.value.effective) {
    window.$message?.warning('过期时间不能早于生效时间')
    return
  }
  startApiCreateLoading()
  try {
    const payload = {
      api_key: apiCreateForm.value.api_key,
      agent_id: props.agentId as string,
      version: apiCreateForm.value.version,
      effective_time: toISO(apiCreateForm.value.effective),
      expire_time: toISO(apiCreateForm.value.expire),
      remark: apiCreateForm.value.remark || '',
    }
    const { isSuccess } = await createApiKeyApi(payload)
    if (isSuccess) {
      window.$message?.success('创建成功')
      closeApiCreate()
      await fetchApiKeys()
    }
    else {
      window.$message?.error('创建失败')
    }
  }
  catch {
    window.$message?.error('创建失败')
  }
  finally {
    endApiCreateLoading()
  }
}

// 历史版本表格列已定制，移除通用构造

const columnsWithActions = computed(() => {
  return [
    {
      title: '版本号',
      key: 'version',
      render: (row: any) => row?.version || '-',
    },
    {
      title: '创建时间',
      key: 'create_time',
      render: (row: any) => {
        const t = row?.create_time || row?.created_at || row?.createTime || ''
        const d = t ? dayjs(t) : null
        return d && d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
      },
    },
    {
      title: '操作',
      key: 'actions',
      render: (row: any) =>
        h(
          'div',
          { class: 'flex items-center gap-2' },
          [
            h(
              NButton,
              { size: 'small', type: 'primary', quaternary: true, onClick: () => openApiKeyManager(row) },
              { default: () => 'APIKey管理' },
            ),
            h(
              NPopconfirm,
              {
                onPositiveClick: async () => {
                  if (!props.agentId)
                    return
                  const version = row?.version || ''
                  if (!version) {
                    window.$message?.warning('版本号不能为空')
                    return
                  }
                  try {
                    const { isSuccess } = await publishToAppstoreApi({ agentId: props.agentId as string, version })
                    if (isSuccess)
                      window.$message?.success('发布到应用商店成功')
                    else
                      window.$message?.error('发布失败')
                  }
                  catch {
                    window.$message?.error('发布失败')
                  }
                },
              },
              {
                default: () => '确认将该版本发布到应用商店？',
                trigger: () =>
                  h(
                    NButton,
                    { size: 'small', type: 'primary', quaternary: true },
                    { default: () => '发布到应用商店' },
                  ),
              },
            ),
          ],
        ),
    },
  ]
})

// APIKey 管理表格列
const apiKeyColumns = computed(() => {
  return [
    {
      title: 'APIKey',
      key: 'api_key',
      render: (row: any) => row?.api_key || row?.key || '-',
    },
    {
      title: '创建时间',
      key: 'create_time',
      render: (row: any) => {
        const t = row?.create_time || row?.created_at || row?.createTime || ''
        const d = t ? dayjs(t) : null
        return d && d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
      },
    },
    {
      title: '生效时间',
      key: 'effective_time',
      render: (row: any) => {
        const t = row?.effective_time || row?.effectiveTime || ''
        const d = t ? dayjs(t) : null
        return d && d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
      },
    },
    {
      title: '过期时间',
      key: 'expire_time',
      render: (row: any) => {
        const t = row?.expire_time || row?.expireTime || ''
        const d = t ? dayjs(t) : null
        return d && d.isValid() ? d.format('YYYY-MM-DD HH:mm:ss') : '-'
      },
    },
    {
      title: '备注',
      key: 'remark',
      render: (row: any) => row?.remark || '-',
    },
    {
      title: '操作',
      key: 'actions',
      render: (row: any) =>
        h(
          'div',
          { class: 'flex items-center gap-2' },
          [
            h(
              NButton,
              {
                size: 'small',
                type: 'primary',
                onClick: () => {
                  const apiKey = row?.api_key || row?.key || ''
                  if (!apiKey) {
                    window.$message?.warning('该条目无有效 APIKey')
                    return
                  }
                  const url = `/public/run?agent_id=${encodeURIComponent(props.agentId as string)}&version=${encodeURIComponent(apiMgrVersion.value)}&api_key=${encodeURIComponent(apiKey)}`
                  window.open(url, '_blank')
                },
              },
              { default: () => '运行' },
            ),
          ],
        ),
    },
  ]
})
</script>

<template>
  <div class="flex items-center">
    <NButton quaternary @click="handleOpen">
      <template #icon>
        <NIcon>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M3 13h2v-2H3v2m4 0h14v-2H7v2m-4 6h2v-2H3v2m4 0h14v-2H7v2M3 7h2V5H3v2m4 0h14V5H7v2z" />
          </svg>
        </NIcon>
      </template>
      发布管理
    </NButton>

    <NModal
      v-model:show="visible"
      preset="card"
      :bordered="false"
      :mask-closable="false"
      :style="{ width: '800px', maxWidth: '90vw' }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="text-base font-semibold">
            发布管理
          </div>
          <NButton type="primary" size="small" @click="handleCreate">
            创建发布
          </NButton>
        </div>
      </template>

      <div class="space-y-3">
        <NAlert v-if="!hasId" title="提示" type="warning" class="mb-2">
          请先点击保存
        </NAlert>

        <NSpin :show="loading">
          <NDataTable :columns="columnsWithActions" :data="releases" size="medium" :bordered="false" />
        </NSpin>
      </div>
    </NModal>

    <!-- 创建发布弹框（仅版本号） -->
    <NModal
      v-model:show="createVisible"
      preset="card"
      :bordered="false"
      :mask-closable="false"
      :style="{ width: '560px', maxWidth: '90vw' }"
    >
      <template #header>
        <div class="text-base font-semibold">
          创建发布
        </div>
      </template>

      <NForm :model="createForm" label-placement="top" :rules="createRules">
        <NFormItem label="版本号" path="version">
          <NInput v-model:value="createForm.version" placeholder="例如 1.0" />
        </NFormItem>

        <div class="flex justify-end gap-2">
          <NButton quaternary @click="closeCreateModal">
            取消
          </NButton>
          <NButton type="primary" :loading="createLoading" @click="submitCreate">
            创建发布
          </NButton>
        </div>
      </NForm>
    </NModal>

    <!-- APIKey 管理弹框 -->
    <NModal
      v-model:show="apiMgrVisible"
      preset="card"
      :bordered="false"
      :mask-closable="false"
      :style="{ width: '1000px', maxWidth: '90vw' }"
    >
      <template #header>
        <div class="flex items-center justify-between w-full">
          <div class="text-base font-semibold">
            APIKey 管理（版本：{{ apiMgrVersion }}）
          </div>
          <NButton type="primary" size="small" @click="openCreateApiKey">
            创建APIKey
          </NButton>
        </div>
      </template>

      <NSpin :show="apiMgrLoading">
        <NDataTable :data="apiMgrList" :columns="apiKeyColumns" size="medium" :bordered="false" />
      </NSpin>
    </NModal>

    <!-- 创建 APIKey 弹框（版本号带入且不可编辑） -->
    <NModal
      v-model:show="apiCreateVisible"
      preset="card"
      :bordered="false"
      :mask-closable="false"
      :style="{ width: '560px', maxWidth: '90vw' }"
    >
      <template #header>
        <div class="text-base font-semibold">
          创建 APIKey
        </div>
      </template>

      <NForm :model="apiCreateForm" label-placement="top" :rules="apiCreateRules">
        <NFormItem label="版本号">
          <NInput v-model:value="apiCreateForm.version" disabled />
        </NFormItem>

        <NFormItem label="APIKey" path="api_key">
          <div class="flex w-full items-center gap-2">
            <template v-if="apiCreateForm.api_key">
              <NInput v-model:value="apiCreateForm.api_key" readonly />
            </template>
            <template v-else>
              <NButton
                size="medium"
                secondary
                type="primary"
                block
                :loading="apiCreateLoading && keyLoadingPart === 'gen'"
                @click="generateKey"
              >
                <template #icon>
                  <NIcon>
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                      <path d="M12.65 10A5.5 5.5 0 1 0 7 15.5c2.1 0 3.94-1.2 4.85-2.95H22V10h-9.35zM7 13a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" />
                    </svg>
                  </NIcon>
                </template>
                点击生成
              </NButton>
            </template>
          </div>
        </NFormItem>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <NFormItem label="生效时间" path="effective">
            <NDatePicker v-model:value="apiCreateForm.effective" type="datetime" :actions="['now']" />
          </NFormItem>
          <NFormItem label="过期时间" path="expire">
            <NDatePicker v-model:value="apiCreateForm.expire" type="datetime" :actions="['now']" />
          </NFormItem>
        </div>

        <NFormItem label="备注" path="remark">
          <NInput v-model:value="apiCreateForm.remark" type="textarea" :rows="3" placeholder="可填写备注" />
        </NFormItem>

        <div class="flex justify-end gap-2">
          <NButton quaternary @click="closeApiCreate">
            取消
          </NButton>
          <NButton type="primary" :loading="apiCreateLoading" @click="submitCreateApiKey">
            创建
          </NButton>
        </div>
      </NForm>
    </NModal>
  </div>
</template>

<style scoped>
</style>
