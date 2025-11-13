<script setup lang="ts">
import { ref } from 'vue'
import { NButton, NForm, NFormItem, NInput, NModal } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { createPromptTemplateApi } from '@/service/api/prompt-template'
import MarkDownEditor from '@/components/custom/Editor/MarkDownEditor/index.vue'

const emit = defineEmits<{
  success: []
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const formData = ref({
  title: '',
  content: '',
})

const formRef = ref<InstanceType<typeof NForm> | null>(null)

// 打开弹窗
function openModal() {
  formData.value = {
    title: '',
    content: '',
  }
  showModal()
}

// 暴露方法给父组件
defineExpose({
  openModal,
})

// 保存模板
async function handleSave() {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  }
  catch {
    return
  }

  startLoading()
  try {
    const { isSuccess } = await createPromptTemplateApi({
      title: formData.value.title,
      content: formData.value.content,
    })

    if (isSuccess) {
      window.$message.success('创建成功')
      emit('success')
      hideModal()
    }
    else {
      window.$message.error('创建失败')
    }
  }
  catch {
    window.$message.error('创建失败')
  }
  finally {
    endLoading()
  }
}

// 取消
function handleCancel() {
  hideModal()
}
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="创建模板" class="w-800px" :bordered="false">
    <n-form ref="formRef" :model="formData" label-placement="top" :rules="{
      title: {
        required: true,
        message: '请输入标题',
        trigger: ['input', 'blur'],
      },
      content: {
        required: true,
        message: '请输入提示词',
        trigger: ['change'],
        validator: (rule, value) => {
          return !!value && value.trim().length > 0
        },
      },
    }">
      <n-form-item label="标题" path="title">
        <n-input
          v-model:value="formData.title"
          placeholder="请输入模板标题"
          :maxlength="100"
          show-count
        />
      </n-form-item>

      <n-form-item label="提示词" path="content">
        <div class="w-full" style="min-height: 300px">
          <MarkDownEditor v-model="formData.content" />
        </div>
      </n-form-item>
    </n-form>

    <template #action>
      <div class="flex justify-center gap-2">
        <n-button @click="handleCancel">
          取消
        </n-button>
        <n-button type="primary" :loading="loading" @click="handleSave">
          保存
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<style scoped></style>

