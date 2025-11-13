<script setup lang="ts">
import { useBoolean } from '@/hooks'
import { createModelApi, updateModelApi, testModelApi } from '@/service'
import { modelProviderOptions } from '@/constants/model'
import { h } from 'vue'
import type { FormRules } from 'naive-ui'

const {
  modalName = '模型',
} = defineProps<{ modalName?: string }>()

const emit = defineEmits<{
  open: []
  close: []
  success: []
}>()

type ModalType = 'add' | 'view' | 'edit'

const { bool: modalVisible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: testLoading, setTrue: startTest, setFalse: endTest } = useBoolean(false)

const formDefault: Entity.Model = {
  provider: 'deepseek',
  name: '',
  modelName: '',
  apiKey: '',
  baseUrl: '',
  topP: 1,
  maxTokens: 4096,
  temperature: 1,
}
const formModel = ref<Entity.Model>({ ...formDefault })
const modalType = shallowRef<ModalType>('add')

const modalTitle = computed(() => {
  const titleMap: Record<ModalType, string> = { add: '添加', view: '查看', edit: '编辑' }
  return `${titleMap[modalType.value]}${modalName}`
})

async function openModal(type: ModalType = 'add', data?: Entity.Model) {
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
  hideModal()
  endLoading()
  emit('close')
}

defineExpose({ openModal })

const formRef = ref()

const rules: FormRules = {
  provider: { required: true, message: '请选择提供商', trigger: 'change' },
  name: { required: true, message: '请输入名称', trigger: 'blur' },
  modelName: { required: true, message: '请输入模型名称', trigger: 'blur' },
  apiKey: { required: true, message: '请输入 API Key', trigger: 'blur' },
  baseUrl: { required: true, message: '请输入 Base URL', trigger: 'blur' },
  maxTokens: { required: true, type: 'number', message: '请输入最大 Token 数', trigger: 'blur' },
}

// 是否可以测试（简单校验必填项是否填写）
const canTest = computed(() => {
  const f = formModel.value as any
  return Boolean(f.provider && f.name && f.modelName && f.apiKey && f.baseUrl && typeof f.maxTokens === 'number')
})

// 驼峰转下划线
function toSnakeCaseKeys(obj: Record<string, any>) {
  const result: Record<string, any> = {}
  Object.keys(obj).forEach((key) => {
    const snake = key.replace(/[A-Z]/g, (m) => `_${m.toLowerCase()}`)
    const val = obj[key]
    if (val && typeof val === 'object' && !Array.isArray(val))
      result[snake] = toSnakeCaseKeys(val)
    else
      result[snake] = val
  })
  return result
}

async function handleTestModel() {
  if (!canTest.value)
    return
  // 先做一次校验，但不阻塞（避免弹出错误）
  try {
    await formRef.value?.validate()
  } catch {}
  startTest()
  try {
    const payload = toSnakeCaseKeys({
      provider: formModel.value.provider,
      modelName: formModel.value.modelName,
      apiKey: formModel.value.apiKey,
      baseUrl: formModel.value.baseUrl,
      topP: Number(formModel.value.topP ?? 1),
      maxTokens: Number(formModel.value.maxTokens ?? 4096),
      temperature: Number(formModel.value.temperature ?? 1),
    })
    const { isSuccess, data } = await testModelApi(payload)
    if (isSuccess) {
      window.$message.success(typeof data === 'string' ? data : JSON.stringify(data))
    }
  }
  finally {
    endTest()
  }
}

async function submitModal() {
  const handlers = {
    async add() {
      const { isSuccess } = await createModelApi({
        provider: formModel.value.provider,
        name: formModel.value.name || '',
        modelName: formModel.value.modelName,
        apiKey: formModel.value.apiKey,
        baseUrl: formModel.value.baseUrl,
        topP: Number(formModel.value.topP ?? 1),
        maxTokens: Number(formModel.value.maxTokens ?? 4096),
        temperature: Number(formModel.value.temperature ?? 1),
      })
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      if (!formModel.value.id)
        return false
      const { isSuccess } = await updateModelApi(formModel.value.id, {
        provider: formModel.value.provider,
        name: formModel.value.name || '',
        modelName: formModel.value.modelName,
        apiKey: formModel.value.apiKey,
        baseUrl: formModel.value.baseUrl,
        topP: Number(formModel.value.topP ?? 1),
        maxTokens: Number(formModel.value.maxTokens ?? 4096),
        temperature: Number(formModel.value.temperature ?? 1),
      })
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

function toIcon(path?: string) {
  return path || ''
}

const providerOptions = computed(() =>
  modelProviderOptions.map(opt => ({ label: opt.label, value: opt.value, icon: opt.icon })),
)
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
    <n-form ref="formRef" :rules="rules" label-placement="left" :model="formModel" :label-width="120" :disabled="modalType === 'view'">
      <n-grid :cols="1" :x-gap="18">
        <n-form-item-grid-item :span="1" label="模型提供商" path="provider">
          <n-grid :cols="4" :x-gap="16" :y-gap="16">
            <n-gi v-for="option in providerOptions" :key="option.value">
              <div
                class="provider-card"
                :class="{ 
                  'provider-card-selected': (formModel as any).provider === option.value,
                  'provider-card-disabled': modalType === 'view'
                }"
                @click="modalType !== 'view' && ((formModel as any).provider = option.value)"
              >
                <div class="provider-card-inner">
                  <div class="provider-icon-wrapper">
                    <img :src="toIcon(option.icon)" class="provider-icon" alt="">
                  </div>
                  <div class="provider-label">{{ option.label }}</div>
                  <div v-if="(formModel as any).provider === option.value" class="provider-check">
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                </div>
              </div>
            </n-gi>
          </n-grid>
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="名称" path="name">
          <n-input v-model:value="formModel.name" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="模型名称" path="modelName">
          <n-input v-model:value="(formModel as any).modelName" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="API Key" path="apiKey">
          <n-input v-model:value="(formModel as any).apiKey" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="Base URL" path="baseUrl">
          <n-input v-model:value="(formModel as any).baseUrl" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="Top P">
          <n-slider v-model:value="(formModel as any).topP" :step="0.1" :min="0" :max="1" :format-tooltip="(v:number) => v.toFixed(1)" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="Max Tokens" path="maxTokens">
          <n-input-number v-model:value="(formModel as any).maxTokens" :min="0" :precision="0" />
        </n-form-item-grid-item>
        <n-form-item-grid-item :span="1" label="Temperature">
          <n-slider v-model:value="(formModel as any).temperature" :step="0.1" :min="0" :max="1" :format-tooltip="(v:number) => v.toFixed(1)" />
        </n-form-item-grid-item>
      </n-grid>
    </n-form>
    <template #action>
      <div class="flex justify-between items-center">
        <n-button type="primary" tertiary :loading="testLoading" :disabled="!canTest" @click="handleTestModel">
          测试
        </n-button>
        <n-space>
          <n-button @click="closeModal">
            取消
          </n-button>
          <n-button type="primary" :loading="submitLoading" @click="submitModal">
            提交
          </n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.provider-card {
  position: relative;
  cursor: pointer;
  border: 1.5px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  min-height: 110px;
}

.provider-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #8b5cf6, #9d78f7);
  transform: scaleX(0);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.provider-card:hover {
  border-color: #8b5cf6;
  box-shadow: 0 4px 12px rgba(139, 92, 246, 0.15);
  transform: translateY(-2px);
}

.provider-card:hover::before {
  transform: scaleX(1);
}

.provider-card-selected {
  border-color: #8b5cf6;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.03) 100%);
  box-shadow: 0 6px 20px rgba(139, 92, 246, 0.3), 0 2px 10px rgba(139, 92, 246, 0.2);
}

.provider-card-selected::before {
  transform: scaleX(1);
}

.provider-card-selected:hover {
  box-shadow: 0 8px 24px rgba(139, 92, 246, 0.35), 0 4px 12px rgba(139, 92, 246, 0.25);
  transform: translateY(-2px);
}

.provider-card-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  background: #f9fafb;
}

.provider-card-disabled:hover {
  border-color: #e5e7eb;
  box-shadow: none;
  transform: none;
}

.provider-card-disabled::before {
  display: none;
}

.provider-card-inner {
  position: relative;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 100%;
}

.provider-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
  border-radius: 10px;
  transition: all 0.3s ease;
}

.provider-card:hover .provider-icon-wrapper {
  background: rgba(139, 92, 246, 0.1);
  transform: scale(1.05);
}

.provider-card-selected .provider-icon-wrapper {
  background: rgba(139, 92, 246, 0.12);
}

.provider-icon {
  width: 40px;
  height: 40px;
  object-fit: contain;
  transition: transform 0.3s ease;
}

.provider-card:hover .provider-icon {
  transform: scale(1.1);
}

.provider-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  text-align: center;
  transition: color 0.3s ease;
}

.provider-card-selected .provider-label {
  color: #8b5cf6;
  font-weight: 600;
}

.provider-check {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  background: #8b5cf6;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  animation: checkIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.4);
}

@keyframes checkIn {
  from {
    transform: scale(0);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
