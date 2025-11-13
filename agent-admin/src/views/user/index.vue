<script setup lang="tsx">
import type { DataTableColumns } from 'naive-ui'
import { computed, onMounted, reactive, ref } from 'vue'
import { useBoolean } from '@/hooks'
import { getUsersPageApi, resetUserPasswordApi, setUserEnableApi } from '@/service/api/login'
import { NButton, NSwitch } from 'naive-ui'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// 筛选条件
const filters = reactive<{
  name?: string
  email?: string
}>({
  name: '',
  email: '',
})

// 分页参数
const pagination = reactive({
  pageNum: 1,
  pageSize: 10,
  total: 0,
})

// 列表数据
const list = ref<Entity.User[]>([])

// 重置密码弹框
const resetModalVisible = ref(false)
const resetTargetId = ref<string>('')
const resetPassword = ref('')

function openResetModal(row: Entity.User) {
  resetTargetId.value = row.id
  resetPassword.value = ''
  resetModalVisible.value = true
}

async function submitResetPassword(): Promise<boolean> {
  if (!resetTargetId.value || !resetPassword.value) {
    window.$message.warning('请输入新密码')
    return false
  }
  const { isSuccess } = await resetUserPasswordApi(resetTargetId.value, resetPassword.value)
  if (isSuccess) {
    window.$message.success('密码重置成功')
    resetModalVisible.value = false
    resetPassword.value = ''
    return true
  }
  return false
}

// 加载列表数据
async function fetchList() {
  startLoading()
  try {
    const { isSuccess, data } = await getUsersPageApi({
      pageNum: pagination.pageNum,
      pageSize: pagination.pageSize,
      name: filters.name || undefined,
      email: filters.email || undefined,
    })

    if (isSuccess && data) {
      list.value = data.list || []
      pagination.total = data.pagination?.total || 0
    }
  }
  catch (error) {
    console.error('加载用户列表失败:', error)
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
  filters.name = ''
  filters.email = ''
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

// 表格列定义
const columns = computed<DataTableColumns<Entity.User>>(() => [
  {
    title: '用户名',
    key: 'username',
  },
  {
    title: '邮箱',
    key: 'email',
  },
  {
    title: '是否启用',
    key: 'isEnable',
    render: (row: Entity.User) => {
      return (
        <NSwitch
          value={row.isEnable}
          onUpdateValue={async (val: boolean) => {
            const prev = row.isEnable
            row.isEnable = val
            const { isSuccess } = await setUserEnableApi(row.id, val)
            if (!isSuccess) {
              row.isEnable = prev
              window.$message.error('操作失败')
              return
            }
            window.$message.success(val ? '已启用' : '已停用')
          }}
        />
      )
    },
  },
  {
    title: '是否管理员',
    key: 'isSuperuser',
    render: (row: Entity.User) => {
      return row.isSuperuser ? '是' : '否'
    },
  },
  {
    title: '创建时间',
    key: 'createTime',
    render: (row: Entity.User) => {
      return row.createTime ? new Date(row.createTime).toLocaleString('zh-CN') : '--'
    },
  },
  {
    title: '操作',
    key: 'actions',
    render: (row: Entity.User) => {
      return (
        <NButton
          size="small"
          type="primary"
          quaternary
          onClick={() => openResetModal(row)}
        >
          重置密码
        </NButton>
      )
    },
  },
])

// 初始化
onMounted(fetchList)
</script>

<template>
  <div>
    <div class="p-16px">
    <!-- 筛选栏 -->
    <n-space justify="space-between" align="center" class="mb-12px">
      <n-space align="center">
        <!-- 用户名搜索 -->
        <n-space align="center">
          <span>用户名：</span>
          <n-input
            v-model:value="filters.name"
            placeholder="请输入用户名"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
          />
        </n-space>

        <!-- 邮箱搜索 -->
        <n-space align="center">
          <span>邮箱：</span>
          <n-input
            v-model:value="filters.email"
            placeholder="请输入邮箱"
            style="width: 200px"
            clearable
            @keyup.enter="handleSearch"
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
    </n-space>

    <!-- 列表内容 -->
    <n-spin :show="loading">
      <div v-if="!loading && (!list || list.length === 0)" class="py-6">
        <n-empty description="暂无用户" />
      </div>
      <n-data-table
        v-else
        :columns="columns"
        :data="list"
        :loading="loading"
        :pagination="false"
      />
    </n-spin>

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
    </div>

    <!-- 重置密码弹框 -->
    <n-modal v-model:show="resetModalVisible" preset="dialog" title="重置密码" positive-text="提交" negative-text="取消" :on-positive-click="submitResetPassword">
      <n-input v-model:value="resetPassword" type="password" placeholder="请输入新密码" show-password-on="click" />
    </n-modal>
  </div>
</template>

<style scoped></style>

