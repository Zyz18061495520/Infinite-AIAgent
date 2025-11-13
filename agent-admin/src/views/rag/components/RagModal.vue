<script lang="ts" setup>
import { computed, ref, shallowRef } from 'vue'
import { NButton, NForm, NFormItem, NInput, NModal, NSpace, NUpload, NUploadDragger } from 'naive-ui'
import type { UploadFileInfo } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { updateRagApi, uploadRagApi } from '@/service'
import { Regex } from '@/constants'

const {
  modalName = 'RAG',
} = defineProps<{ modalName?: string }>()

const emit = defineEmits<{ open: [], close: [], success: [] }>()
type ModalType = 'add' | 'view' | 'edit'
const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formDefault = { name: '', description: '' }
const formModel = ref<{ id?: string, name: string, description?: string }>({ ...formDefault })
const fileList = ref<UploadFileInfo[]>([])

const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = { add: '添加', view: '查看', edit: '编辑' }
  return `${titleMap[modalType.value]}${modalName}`
})

async function openModal(type: ModalType = 'add', data?: any) {
  emit('open')
  modalType.value = type
  showModal()
  const handlers = {
    async add() {
      formModel.value = { ...formDefault }
      fileList.value = []
    },
    async view() {
      if (!data)
        return
      formModel.value = { id: data.id, name: data.name, description: data.description }
      fileList.value = []
    },
    async edit() {
      if (!data)
        return
      formModel.value = { id: data.id, name: data.name, description: data.description }
      fileList.value = []
    },
  }
  await handlers[type]()
}

function closeModal() {
  hiddenModal()
  endLoading()
  emit('close')
}

defineExpose({ openModal })

const formRef = ref()

// RAG名称输入限制：只允许大小写字母、数字、下划线、中划线
function filterRagName(value: string) {
  return value.replace(/[^\w-]/g, '')
}

const rules = {
  name: [
    { required: true, message: '请输入名称', trigger: 'blur' },
    { pattern: new RegExp(Regex.ParamName), message: '名称只能包含大小写字母、数字、中划线和下划线', trigger: 'blur' },
  ],
  description: { required: true, message: '请输入描述', trigger: 'blur' },
}

async function submitModal() {
  const handlers: Record<ModalType, () => Promise<boolean>> = {
    async add() {
      const file = fileList.value[0]?.file as File | undefined
      if (!file) {
        window.$message.warning('请上传文件')
        return false
      }
      const { isSuccess } = await uploadRagApi({ name: formModel.value.name, description: formModel.value.description, file })
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      if (!formModel.value.id)
        return false
      const { isSuccess } = await updateRagApi(formModel.value.id, { name: formModel.value.name, description: formModel.value.description })
      if (isSuccess) {
        window.$message.success('编辑成功')
        emit('success')
      }
      return isSuccess
    },
    async view() { return true },
  }
  await formRef.value?.validate()
  startLoading()
  await handlers[modalType.value]() && closeModal()
}
</script>

<template>
  <NModal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    class="w-700px"
    :segmented="{ content: true, action: true }"
  >
    <NForm ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="100" :disabled="modalType === 'view'">
      <NFormItem label="名称" path="name">
        <NInput v-model:value="formModel.name" placeholder="请输入名称" @input="(value: string) => { formModel.name = filterRagName(value) }" />
      </NFormItem>
      <NFormItem label="描述" path="description" required>
        <NInput v-model:value="formModel.description" type="textarea" placeholder="请输入描述" />
      </NFormItem>
      <NFormItem v-if="modalType === 'add'" label="文件" path="file" required>
        <NUpload
          v-model:file-list="fileList"
          :max="1"
          :default-upload="false"
          directory-dnd
          :show-file-list="true"
        >
          <NUploadDragger style="padding: 24px;">
            <div class="flex flex-col items-center text-gray-500">
              <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" aria-hidden="true">
                <path d="M19.35 10.04c-.68-3.36-3.65-5.9-7.19-5.9-2.66 0-5 1.45-6.22 3.61C2.99 8.15 2 9.96 2 12c0 3.31 2.69 6 6 6h10c2.21 0 4-1.79 4-4 0-2.05-1.53-3.73-3.5-3.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
              </svg>
              <div class="mt-2">
                拖拽文件到此处，或点击上传
              </div>
            </div>
          </NUploadDragger>
        </NUpload>
      </NFormItem>
    </NForm>
    <template #action>
      <NSpace justify="center">
        <NButton @click="closeModal">
          取消
        </NButton>
        <NButton type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </NButton>
      </NSpace>
    </template>
  </NModal>
</template>
