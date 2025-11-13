<script lang="ts" setup>
import { computed, ref, shallowRef } from 'vue'
import { useBoolean } from '@/hooks'
import { createFaqApi, updateFaqApi } from '@/service'

const {
  modalName = 'FAQ',
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

const formDefault = {
  question: '',
  answer: '',
}
const formModel = ref<{ question: string; answer: string }>({ ...formDefault })

const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = {
    add: '新增',
    view: '查看',
    edit: '编辑',
  }
  return `${titleMap[modalType.value as ModalType]}${modalName}`
})

// 在新增时需要 collectionId；在编辑/查看时需要传入 faq 实体
let currentCollectionId: string | null = null
let currentFaqId: string | null = null

async function openModal(type: ModalType = 'add', data?: any) {
  emit('open')
  modalType.value = type
  showModal()
  currentCollectionId = null
  currentFaqId = null
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
      currentCollectionId = data?.collectionId ?? null
    },
    async view() {
      if (!data)
        return
      formModel.value = { question: data.question ?? '', answer: data.answer ?? '' }
      currentFaqId = data.id ?? null
    },
    async edit() {
      if (!data)
        return
      formModel.value = { question: data.question ?? '', answer: data.answer ?? '' }
      currentFaqId = data.id ?? null
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
  question: { required: true, message: '请输入问题', trigger: 'blur' },
  answer: { required: true, message: '请输入回答', trigger: 'blur' },
}

async function submitModal() {
  const handlers: Record<ModalType, () => Promise<boolean>> = {
    async add() {
      const payload = { ...formModel.value, collectionId: currentCollectionId }
      if (!payload.collectionId) {
        window.$message.warning('缺少集合 ID')
        return false
      }
      const { isSuccess } = await createFaqApi(payload as any)
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      if (!currentFaqId)
        return false
      const { isSuccess } = await updateFaqApi(currentFaqId, formModel.value)
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
    class="w-700px"
    :segmented="{ content: true, action: true }"
  >
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100" :disabled="modalType === 'view'">
      <n-form-item label="问题" path="question">
        <n-input v-model:value="formModel.question" placeholder="请输入问题" />
      </n-form-item>
      <n-form-item label="回答" path="answer">
        <n-input v-model:value="formModel.answer" placeholder="请输入回答" type="textarea" :rows="5" />
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
