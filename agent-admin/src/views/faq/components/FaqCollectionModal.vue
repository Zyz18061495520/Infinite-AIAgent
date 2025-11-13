<script lang="ts" setup>
import { computed, ref, shallowRef } from 'vue'
import { useBoolean } from '@/hooks'
import { Regex } from '@/constants/Regex'
import { createFaqCollectionApi, updateFaqCollectionApi } from '@/service'

const {
  modalName = '集合',
} = defineProps<Props>()

const emit = defineEmits<{
  success: []
  open: []
  close: []
}>()

interface Props {
  modalName?: string
}

type ModalType = 'add' | 'view' | 'edit'

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formDefault = { name: '', collectionName: '' }
const formModel = ref<{ name: string; collectionName: string }>({ ...formDefault })

const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: '新增',
    view: '查看',
    edit: '编辑',
  }
  return `${titleMap[modalType.value as ModalType]}${modalName}`
})

async function openModal(type: ModalType = 'add', data?: any) {
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
      formModel.value = { name: data.name ?? '', collectionName: data.collectionName ?? '' }
      ;(formModel as any).id = data.id
    },
    async edit() {
      if (!data)
        return
      formModel.value = { name: data.name ?? '', collectionName: data.collectionName ?? '' }
      ;(formModel as any).id = data.id
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
const rules = {
  name: {
    required: true,
    message: '请输入集合名称',
    trigger: ['blur', 'input'],
    pattern: new RegExp(Regex.ParamName),
  },
}

// 输入时过滤：仅保留大小写字母、数字、下划线、中划线
function filterCollectionName(value: string) {
  return value.replace(/[^\w-]/g, '')
}

async function submitModal() {
  const handlers: Record<ModalType, () => Promise<boolean>> = {
    async add() {
      const { isSuccess } = await createFaqCollectionApi({
        name: formModel.value.name,
        collectionName: formModel.value.collectionName,
      } as any)
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      const id: string | undefined = (formModel as any).id ?? (formModel as any).value?.id
      const { isSuccess } = await updateFaqCollectionApi(id as any, {
        name: formModel.value.name,
        collectionName: formModel.value.collectionName,
      } as any)
      if (isSuccess) {
        window.$message.success('编辑成功')
        emit('success')
      }
      return isSuccess
    },
    async view() {
      return true
    },
  }
  await formRef.value?.validate()
  startLoading()
  await handlers[modalType.value as ModalType]() && closeModal()
}
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    :style="{ width: '400px' }"
    :segmented="{ content: true, action: true }"
  >
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="80" :disabled="modalType === 'view'">
      <n-form-item label="集合名称" path="name">
        <n-input
          v-model:value="formModel.name"
          @update:value="(val: string) => (formModel.name = filterCollectionName(val))"
          placeholder="请输入集合名称"
          :maxlength="50"
          show-word-limit
        />
      </n-form-item>
      <n-form-item label="描述" path="collectionName">
        <n-input
          v-model:value="formModel.collectionName"
          placeholder="请输入描述"
          :maxlength="50"
          show-word-limit
        />
      </n-form-item>
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
