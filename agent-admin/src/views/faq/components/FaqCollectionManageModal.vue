<script lang="tsx" setup>
import { computed, ref } from 'vue'
import { NButton, NDataTable, NModal, NPopconfirm, NSpace } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { deleteFaqCollectionApi, getFaqCollectionsApi } from '@/service'
import FaqCollectionModal from './FaqCollectionModal.vue'

const {
  modalName = '集合管理',
} = defineProps<{ modalName?: string }>()

const emit = defineEmits<{ success: [], open: [], close: [] }>()

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const modalTitle = computed(() => modalName)

const collections = ref<Entity.FaqCollection[]>([])
const innerModalRef = ref<InstanceType<typeof FaqCollectionModal> | null>(null)

async function loadCollections() {
  startLoading()
  try {
    const { isSuccess, data } = await getFaqCollectionsApi()
    if (isSuccess)
      collections.value = data || []
  }
  finally {
    endLoading()
  }
}

async function openModal() {
  emit('open')
  showModal()
  await loadCollections()
}

function closeModal() {
  hiddenModal()
  emit('close')
}

async function removeCollection(id: string) {
  startLoading()
  try {
    const { isSuccess } = await deleteFaqCollectionApi(id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadCollections()
      emit('success')
    }
  }
  catch {
    window.$message.error('删除失败')
  }
  finally {
    endLoading()
  }
}

const columns = [
  { title: '集合名称', key: 'collectionName' },
  {
    title: '操作',
    key: 'action',
    width: 200,
    render: (row: Entity.FaqCollection) => (
      <NSpace>
        <NButton size="small" onClick={() => innerModalRef.value?.openModal('edit', row)}>编辑</NButton>
        <NPopconfirm
          onPositiveClick={() => removeCollection(row.id)}
          v-slots={{
            trigger: () => (<NButton size="small" type="error">删除</NButton>),
            default: () => '确认删除该集合吗？该集合下的 FAQ 将被一并删除。',
          }}
        />
      </NSpace>
    ),
  },
]

function handleInnerSuccess() {
  loadCollections()
  emit('success')
}

defineExpose({ openModal })
</script>

<template>
  <NModal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    class="w-900px"
    :segmented="{ content: true, action: true }"
  >
    <div class="mb-4 flex justify-between">
      <NButton type="primary" @click="innerModalRef?.openModal('add')">
        新增集合
      </NButton>
    </div>
    <NDataTable :data="collections" :columns="columns" :loading="submitLoading" />
    <FaqCollectionModal ref="innerModalRef" @success="handleInnerSuccess" />
  </NModal>
</template>
