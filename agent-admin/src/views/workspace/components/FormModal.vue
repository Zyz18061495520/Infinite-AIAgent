<script setup lang="ts">
import { useBoolean } from '@/hooks'
import { createWorkspaceApi, modifyWorkspaceApi } from '@/service'
import { useWorkspaceStore } from '@/store'

const {
  modalName = '',
} = defineProps<Props>()

const emit = defineEmits<{
  open: []
  close: []
}>()

const workspaceStore = useWorkspaceStore()

interface Props {
  modalName?: string
}

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)

const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formDefault: Entity.Workspace = {
  name: '',
  description: '',
  logo: '',
  status: 1,
}
const formModel = ref<Entity.Workspace>({ ...formDefault })

type ModalType = 'add' | 'view' | 'edit'
const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: '添加',
    view: '查看',
    edit: '编辑',
  }
  return `${titleMap[modalType.value]}${modalName}`
})

async function openModal(type: ModalType = 'add', data: any) {
  emit('open')
  modalType.value = type
  showModal()
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
    },
    async view() {
      if (!data)
        return
      formModel.value = { ...data }
    },
    async edit() {
      if (!data)
        return
      formModel.value = { ...data }
    },
  }
  await handlers[type]()
}

function closeModal() {
  hiddenModal()
  endLoading()
  emit('close')
}

defineExpose({
  openModal,
})

const formRef = ref()
async function submitModal() {
  const handlers = {
    async add() {
      const { isSuccess, data } = await createWorkspaceApi(formModel.value)
      if (isSuccess) {
        window.$message.success('创建成功')
        workspaceStore.changeWorkspace(data)
        workspaceStore.getWorkspaces()
      }
      return isSuccess
    },
    async edit() {
      const { isSuccess } = await modifyWorkspaceApi(formModel.value)
      if (isSuccess) {
        window.$message.success('编辑成功')
        workspaceStore.getWorkspaces()
      }
      return isSuccess
    },
    async view() {
      return true
    },
  }
  await formRef.value?.validate()
  startLoading()
  await handlers[modalType.value]() && closeModal()
}

const rules = {
  name: {
    required: true,
    message: '请输入名称',
    trigger: 'blur',
  },
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100" :disabled="modalType === 'view'">
      <n-grid :cols="2" :x-gap="18">
        <n-form-item-grid-item :span="1" label="名称" path="name">
          <n-input v-model:value="formModel.name" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="2" label="描述" path="description">
          <n-input v-model:value="formModel.description" type="textarea" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal">
          取消
        </n-button>
        <n-button type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
