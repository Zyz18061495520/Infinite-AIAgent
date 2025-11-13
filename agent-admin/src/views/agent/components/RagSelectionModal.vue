<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NCheckbox, NEmpty, NGi, NGrid, NIcon, NInput, NPagination, NTag } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { getRagListApi } from '@/service'
import RagModal from '@/views/rag/components/RagModal.vue'

const emit = defineEmits<{
  confirm: [rags: any[]]
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const allRags = ref<any[]>([])
const selectedRags = ref<any[]>([])
const searchKeyword = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

// RagModal 引用
const ragModalRef = ref<InstanceType<typeof RagModal> | null>(null)

// 打开弹窗
function openModal(rags: any[], preSelected: any[] = []) {
  selectedRags.value = [...preSelected]
  searchKeyword.value = ''
  pageNum.value = 1
  showModal()
  loadRags()
}

// 加载RAG列表
async function loadRags() {
  startLoading()
  try {
    const { isSuccess, data } = await getRagListApi({
      page_num: pageNum.value,
      page_size: pageSize.value,
      name: searchKeyword.value || undefined,
    })
    if (isSuccess && data) {
      allRags.value = data.list || []
      total.value = data.pagination?.total || 0
    }
  }
  finally {
    endLoading()
  }
}

// 暴露方法给父组件
defineExpose({
  openModal,
})

// 选择/取消选择RAG
function toggleRag(rag: any, checked: boolean) {
  if (checked) {
    if (!selectedRags.value.find(r => r.id === rag.id)) {
      selectedRags.value.push(rag)
    }
  }
  else {
    const index = selectedRags.value.findIndex(r => r.id === rag.id)
    if (index > -1) {
      selectedRags.value.splice(index, 1)
    }
  }
}

// 检查RAG是否已选择
function isRagSelected(rag: any) {
  return selectedRags.value.some(r => r.id === rag.id)
}

// 确认选择
function confirmSelection() {
  emit('confirm', selectedRags.value)
  hideModal()
}

// 取消选择
function cancelSelection() {
  hideModal()
}

// 搜索
function handleSearch() {
  pageNum.value = 1
  loadRags()
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
  pageNum.value = 1
  loadRags()
}

// 打开新增RAG弹窗
function openAddRag() {
  ragModalRef.value?.openModal('add')
}

// 处理新增RAG成功
function handleRagCreated() {
  loadRags()
}
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="选择RAG" class="w-1000px" :bordered="false">
    <div class="space-y-4">
      <!-- 搜索栏 -->
      <NSpace align="center" justify="space-between" class="mb-4">
        <NSpace align="center">
          <NInput v-model:value="searchKeyword" placeholder="按名称搜索" style="width: 220px" clearable @keyup.enter="handleSearch" @clear="clearSearch" />
          <NButton type="primary" @click="handleSearch">
            <template #icon>
              <NIcon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" /></svg>
              </NIcon>
            </template>
            查询
          </NButton>
          <NButton quaternary @click="clearSearch">
            <template #icon>
              <NIcon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65Z" /></svg>
              </NIcon>
            </template>
            重置
          </NButton>
        </NSpace>
        <NButton type="primary" @click="openAddRag">
          <template #icon>
            <NIcon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
            </NIcon>
          </template>
          新增RAG
        </NButton>
      </NSpace>

      <!-- 已选择的RAG -->
      <div v-if="selectedRags.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedRags.length }} 个RAG：
        </div>
        <div class="flex flex-wrap gap-2">
          <NTag
            v-for="rag in selectedRags"
            :key="rag.id"
            closable
            @close="toggleRag(rag, false)"
          >
            {{ rag.name }}
          </NTag>
        </div>
      </div>

      <!-- RAG列表 -->
      <div v-if="!loading && allRags.length === 0" class="py-8">
        <NEmpty description="暂无RAG" />
      </div>
      <div v-else>
        <NGrid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <NGi v-for="rag in allRags" :key="rag.id">
            <NCard
              class="nova-card cursor-pointer"
              :segmented="{ content: true }"
              :bordered="true"
              :class="{ 'selected-card': isRagSelected(rag) }"
              @click="toggleRag(rag, !isRagSelected(rag))"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <NCheckbox
                      :checked="isRagSelected(rag)"
                      @update:checked="(checked) => toggleRag(rag, checked)"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ rag.name }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <n-time :time="(rag as any).createTime" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </template>
              <div class="text-sm text-gray-600">
                {{ rag.description }}
              </div>
            </NCard>
          </NGi>
        </NGrid>
      </div>

      <!-- 分页 -->
      <div class="flex justify-end">
        <NPagination
          v-model:page="pageNum"
          v-model:page-size="pageSize"
          :item-count="total"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="loadRags"
          @update:page-size="() => { pageNum = 1; loadRags() }"
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <NButton @click="cancelSelection">
          取消
        </NButton>
        <NButton type="primary" :disabled="selectedRags.length === 0" @click="confirmSelection">
          确认选择 ({{ selectedRags.length }})
        </NButton>
      </div>
    </template>
  </n-modal>

  <RagModal ref="ragModalRef" @success="handleRagCreated" />
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>
