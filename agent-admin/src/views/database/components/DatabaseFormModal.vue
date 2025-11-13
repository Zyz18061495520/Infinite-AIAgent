<script setup lang="ts">
import { computed, ref, shallowRef, h } from 'vue'
import { useBoolean } from '@/hooks'
import { createDatabaseApi, updateDatabaseApi, testDatabaseConnectionApi } from '@/service'
import { dbTypeOptions } from '@/constants/database'

const emit = defineEmits<{ success: []; open: []; close: [] }>()

type ModalType = 'add' | 'view' | 'edit'

const { bool: modalVisible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: testing, setTrue: startTesting, setFalse: endTesting } = useBoolean(false)

const formDefault = { dbType: 'mysql', dbHost: '', dbPort: 3306, dbDatabase: '', dbUser: '', dbPassword: '' }
const formModel = ref({ ...formDefault })
const modalType = shallowRef<ModalType>('add')
const modalTitle = computed(() => ({ add: '新增数据库', view: '查看数据库', edit: '编辑数据库' })[modalType.value])

function toIcon(path?: string) {
  return path || ''
}

async function openModal(type: ModalType = 'add', data?: any) {
  emit('open')
  modalType.value = type
  showModal()
  if (type === 'add') {
    formModel.value = { ...formDefault }
  } else {
    if (!data) return
    formModel.value = { ...formDefault, ...data }
    ;(formModel as any).id = data.id
  }
}

function closeModal() {
  hideModal()
  endLoading()
  endTesting()
  emit('close')
}

const canTest = computed(() => {
  const f: any = formModel.value
  return f.dbType && f.dbHost && f.dbPort && f.dbDatabase && f.dbUser && f.dbPassword
})

async function handleTest() {
  if (!canTest.value) return
  startTesting()
  try {
    const { isSuccess, data } = await testDatabaseConnectionApi({ ...formModel.value })
    if (isSuccess && data === true) {
      window.$message.success('连接成功')
    } else {
      window.$message.error('连接失败')
    }
  } finally {
    endTesting()
  }
}

async function submitModal() {
  const handlers: Record<ModalType, () => Promise<boolean>> = {
    async add() {
      const { isSuccess } = await createDatabaseApi({ ...formModel.value })
      if (isSuccess) {
        window.$message.success('创建成功')
        emit('success')
      }
      return isSuccess
    },
    async edit() {
      const id: string | undefined = (formModel as any).id ?? (formModel as any).value?.id
      const { isSuccess } = await updateDatabaseApi(id as string, { ...formModel.value })
      if (isSuccess) {
        window.$message.success('编辑成功')
        emit('success')
      }
      return isSuccess
    },
    async view() { return true },
  }
  startLoading()
  await handlers[modalType.value]() && closeModal()
}

defineExpose({ openModal })
</script>

<template>
  <n-modal v-model:show="modalVisible" :mask-closable="false" preset="card" :title="modalTitle" :style="{ width: '520px' }" :segmented="{ content: true, action: true }">
    <n-form label-placement="left" :model="formModel" :label-width="100" :disabled="modalType === 'view'">
      <n-form-item label="数据库类型">
        <n-select v-model:value="formModel.dbType" :options="dbTypeOptions" :render-label="(option:any) => h('div', { class: 'flex items-center gap-8px' }, [h('img', { src: toIcon(option.icon), style: 'width:16px;height:16px;object-fit:contain' }), h('span', null, option.label)])" />
      </n-form-item>
      <n-form-item label="主机">
        <n-input v-model:value="(formModel as any).dbHost" placeholder="请输入主机" />
      </n-form-item>
      <n-form-item label="端口">
        <n-input-number v-model:value="(formModel as any).dbPort" :min="1" :max="65535" placeholder="请输入端口" />
      </n-form-item>
      <n-form-item label="数据库名">
        <n-input v-model:value="(formModel as any).dbDatabase" placeholder="请输入数据库名" />
      </n-form-item>
      <n-form-item label="用户名">
        <n-input v-model:value="(formModel as any).dbUser" placeholder="请输入用户名" />
      </n-form-item>
      <n-form-item label="密码">
        <n-input v-model:value="(formModel as any).dbPassword" type="password" show-password-on="click" placeholder="请输入密码" />
      </n-form-item>
    </n-form>
    <template #action>
      <div class="flex justify-between items-center">
        <n-button tertiary :disabled="!canTest" :loading="testing" @click="handleTest">测试连接</n-button>
        <n-space>
          <n-button @click="closeModal">取消</n-button>
          <n-button type="primary" :loading="submitLoading" @click="submitModal">提交</n-button>
        </n-space>
      </div>
    </template>
  </n-modal>
</template>


