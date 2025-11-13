<script lang="ts" setup>
import { useAppStore, useAuthStore, useWorkspaceStore } from '@/store'
import dayjs from 'dayjs'
import { removeWorkspaceApi } from '@/service'
import FormModal from './components/FormModal.vue'

const appStore = useAppStore()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
workspaceStore.getWorkspaces()

// 获取当前用户ID
const currentUserId = computed(() => authStore.userInfo?.id)

// 判断是否为工作空间创建者
function isCreator(workspace: Entity.Workspace) {
  return currentUserId.value && workspace.creatorId && currentUserId.value === workspace.creatorId
}

function removeWorkspace(i: Entity.Workspace) {
  window.$dialog.info({
    title: '提示',
    content: '确定删除该工作空间吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      const { isSuccess } = await removeWorkspaceApi(i.id as string)
      if (isSuccess) {
        window.$message.success('删除成功')
        workspaceStore.getWorkspaces()
      }
    },
  })
}

const FormModalRef = ref()

const router = useRouter()
</script>

<template>
  <div>
    <n-grid
      :x-gap="8"
      :y-gap="8"
      :cols="4"
    >
      <n-gi
        v-for="i in workspaceStore.workspaces"
        :key="i.id"
      >
        <n-card hoverable>
          <n-thing
            :title="i.name"
            :description="dayjs(i.updateTime).format('YYYY-MM-DD HH:mm:ss')"
          >
            <template #avatar>
              <!-- <n-avatar v-if="i.logo" size="large" :src="i.logo" round /> -->
              <n-avatar size="large" round :color="appStore.primaryColor">
                <n-icon size="20">
                  <icon-park-outline:peoples-two />
                </n-icon>
              </n-avatar>
            </template>
            <template v-if="workspaceStore.workspaceId === i.id" #header-extra>
              <n-tag type="success" size="small">
                当前
              </n-tag>
            </template>
            <template v-else-if="!isCreator(i)" #header-extra>
              <n-tag type="info" size="small">
                协作者
              </n-tag>
            </template>
            <template #default>
              <div class="line-clamp-2 h-11" :title="i.description">
                {{ i.description || '暂无描述' }}
              </div>
            </template>
            <template #footer>
              <div class="border-t-solid border-t-1 border-t-[#efeff5] my-4" />
              <div class="flex items-center">
                <div class="flex-1 flex justify-center">
                  <n-button quaternary type="primary" size="small" @click="FormModalRef.openModal('edit', i)">
                    <template #icon>
                      <icon-park-outline:edit />
                    </template>
                    编辑
                  </n-button>
                </div>
                <template v-if="isCreator(i) && !i.isDefault && workspaceStore.workspaceId !== i.id">
                  <n-divider vertical />
                  <div class="flex-1 flex justify-center">
                    <n-button quaternary type="error" size="small" @click="removeWorkspace(i)">
                      <template #icon>
                        <icon-park-outline:delete />
                      </template>
                      删除
                    </n-button>
                  </div>
                </template>
                <template v-if="isCreator(i)">
                  <n-divider vertical />
                  <div class="flex-1 flex justify-center">
                    <n-button quaternary type="primary" size="small" @click="router.push(`/workspace/${i.id}`)">
                      <template #icon>
                        <icon-park-outline:user />
                      </template>
                      成员管理
                    </n-button>
                  </div>
                </template>
              </div>
            </template>
          </n-thing>
        </n-card>
      </n-gi>

      <n-gi>
        <n-card hoverable class="cursor-pointer h-full min-h-[208px]" @click="FormModalRef.openModal('add')">
          <div class="h-full flex flex-col items-center justify-center">
            <n-icon size="40" color="#999">
              <icon-park-outline:plus />
            </n-icon>
            <div class="mt-4 text-[#999] text-sm">
              创建工作空间
            </div>
          </div>
        </n-card>
      </n-gi>
    </n-grid>

    <FormModal ref="FormModalRef" modal-name="工作空间" />
  </div>
</template>
