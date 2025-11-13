<script lang="tsx" setup>
import { useBoolean } from '@/hooks'
import { getWorkspaceApi, getWorkspaceMembersApi, removeWorkspaceMemberApi } from '@/service'
import dayjs from 'dayjs'
import { useAppStore } from '@/store'
import type { DataTableColumns } from 'naive-ui'
import AddMemberModal from './components/AddMemberModal.vue'

const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(true)

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

const { id } = route.params
if (id) {
  getWorkspace(id as string)
  getWorkspaceMembers(id as string)
}

const workspace = ref<Entity.Workspace | null>(null)
async function getWorkspace(id: string) {
  const { isSuccess, data } = await getWorkspaceApi(id)
  if (isSuccess) {
    workspace.value = data
  }
}

const columns: DataTableColumns<Entity.User> = [
  {
    title: '用户名',
    key: 'userName',
  },
  {
    title: '加入时间',
    key: 'createTime',
    render(row) {
      return dayjs(row.createTime).format('YYYY-MM-DD HH:mm:ss')
    },
  },
  {
    title: '操作',
    key: 'action',
    render(row) {
      // 如果角色不是管理员，显示移除按钮
      if (row.role !== 'administrator') {
        return (
          <N-Popconfirm onPositiveClick={() => handleRemoveMember(row.userId)}>
            {{
              default: () => '确认移除吗？',
              trigger: () => <N-Button size="small" type="error">移除成员</N-Button>,
            }}
          </N-Popconfirm>
        )
      }
      return null
    },
  },
]

const addMemberModalRef = ref()

function handleAddMember() {
  addMemberModalRef.value?.openModal()
}

function handleAddMemberSuccess() {
  // 重新获取成员列表
  if (id) {
    getWorkspaceMembers(id as string)
  }
}

async function handleRemoveMember(userId: string) {
  startLoading()
  const { isSuccess } = await removeWorkspaceMemberApi(id as string, userId)
  endLoading()
  if (isSuccess) {
    window.$message.success('移除成功')
    // 重新获取成员列表
    if (id) {
      getWorkspaceMembers(id as string)
    }
  }
}
const tableData = ref<Entity.User[]>([])
async function getWorkspaceMembers(id: string) {
  startLoading()
  const { isSuccess, data } = await getWorkspaceMembersApi(id)
  endLoading()
  if (isSuccess) {
    tableData.value = data
  }
}
</script>

<template>
  <div>
    <n-button @click="router.back()">
      <template #icon>
        <n-icon>
          <icon-park-outline:left />
        </n-icon>
      </template>
      返回
    </n-button>

    <template v-if="workspace">
      <n-card class="mt-4">
        <n-thing
          :title="workspace?.name || ''"
          :description="dayjs(workspace?.updateTime || '').format('YYYY-MM-DD HH:mm:ss')"
          :content="workspace?.description || '暂无描述'"
        >
          <template #avatar>
            <!-- <n-avatar v-if="i.logo" size="large" :src="i.logo" round /> -->
            <n-avatar size="large" round :color="appStore.primaryColor">
              <n-icon size="20">
                <icon-park-outline:peoples-two />
              </n-icon>
            </n-avatar>
          </template>
        </n-thing>
      </n-card>
    </template>

    <n-card class="mt-4">
      <n-space vertical size="large">
        <div class="flex gap-4">
          <n-button type="primary" @click="handleAddMember">
            <template #icon>
              <icon-park-outline-add-one />
            </template>
            添加成员
          </n-button>
        </div>
        <n-data-table :columns="columns" :data="tableData" :loading="loading" />

        <AddMemberModal
          ref="addMemberModalRef"
          :workspace-id="id as string"
          @success="handleAddMemberSuccess"
        />
      </n-space>
    </n-card>
  </div>
</template>
