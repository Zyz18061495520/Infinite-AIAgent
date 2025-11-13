<script lang="ts" setup>
import { useWorkspaceStore } from '@/store'
import FormModal from '../../../views/workspace/components/FormModal.vue'

const workspaceStore = useWorkspaceStore()

const router = useRouter()

function onWorkspaceSelect(value: string) {
  workspaceStore.changeWorkspace(workspaceStore.workspaces.find(i => i.id === value) as Entity.Workspace)
  location.reload()
}

const FormModalRef = ref()
</script>

<template>
  <div>
    <n-popselect :value="workspaceStore.workspaceId" :options="workspaceStore.workspaces" trigger="hover" label-field="name" size="large" scrollable @update:value="onWorkspaceSelect">
      <CommonWrapper>
        <span class="max-w-[100px] truncate">{{ workspaceStore.workspaces.find(i => i.id === workspaceStore.workspaceId)?.name }}</span>
        <icon-park-outline:down />
      </CommonWrapper>
      <template #action>
        <div class="flex items-center">
          <CommonWrapper @click="router.push('/workspace')">
            <icon-park-outline:setting-one />
            空间管理
          </CommonWrapper>
          <n-divider vertical />
          <CommonWrapper @click="FormModalRef.openModal('add')">
            <icon-park-outline:plus />
            创建空间
          </CommonWrapper>
        </div>
      </template>
    </n-popselect>
  </div>

  <FormModal ref="FormModalRef" modal-name="工作空间" />
</template>
