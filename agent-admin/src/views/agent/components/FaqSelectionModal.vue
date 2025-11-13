<script setup lang="ts">
import { ref, watch } from 'vue'
import { NButton, NCard, NCollapse, NCollapseItem, NEmpty, NGi, NGrid, NIcon, NInput, NInputGroup, NPagination, NTag } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { getFaqCollectionsApi, getFaqsPageApi } from '@/service'
import FaqCollectionModal from '@/views/faq/components/FaqCollectionModal.vue'
import FaqModal from '@/views/faq/components/FaqModal.vue'

const emit = defineEmits<{
  confirm: [collections: Entity.FaqCollection[]]
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// FAQ集合相关状态
const faqCollections = ref<Entity.FaqCollection[]>([])
const activeCollectionId = ref<string | null>(null)

// FAQ列表相关状态（按集合维度缓存）
const faqsByCollection = ref<Record<string, Entity.Faq[]>>({})
const totalByCollection = ref<Record<string, number>>({})
const pageNumByCollection = ref<Record<string, number>>({})
const pageSizeByCollection = ref<Record<string, number>>({})
const keywordByCollection = ref<Record<string, string>>({})

// 选中的集合
const selectedCollections = ref<Entity.FaqCollection[]>([])

// 检查集合是否展开
function isCollectionExpanded(collectionId: string) {
  return activeCollectionId.value === collectionId
}

// FaqCollectionModal 引用
const faqCollectionModalRef = ref<InstanceType<typeof FaqCollectionModal> | null>(null)

// FaqModal 引用
const faqModalRef = ref<InstanceType<typeof FaqModal> | null>(null)

// 监听当前展开集合变化，展开即刷新
watch(activeCollectionId, (id) => {
  if (id) {
    // 只有展开时才请求FAQ
    pageNumByCollection.value[id] = 1
    keywordByCollection.value[id] = ''
    loadFaqs(id)
  }
})

// 打开弹窗
function openModal(_unused: any[] = [], preSelected: Entity.FaqCollection[] = []) {
  selectedCollections.value = [...preSelected]
  activeCollectionId.value = null
  showModal()
  loadFaqCollections()
}

// 加载FAQ集合列表
async function loadFaqCollections() {
  startLoading()
  try {
    const { isSuccess, data } = await getFaqCollectionsApi()
    if (isSuccess) {
      faqCollections.value = data
    }
  }
  finally {
    endLoading()
  }
}

// 加载FAQ列表
async function loadFaqs(collectionId?: string) {
  const cid = collectionId || activeCollectionId.value
  if (!cid)
    return

  // 初始化默认分页与关键词
  if (pageNumByCollection.value[cid] === undefined)
    pageNumByCollection.value[cid] = 1
  if (pageSizeByCollection.value[cid] === undefined)
    pageSizeByCollection.value[cid] = 10
  if (keywordByCollection.value[cid] === undefined)
    keywordByCollection.value[cid] = ''

  startLoading()
  try {
    const { isSuccess, data } = await getFaqsPageApi({
      collectionId: cid,
      pageNum: pageNumByCollection.value[cid],
      pageSize: pageSizeByCollection.value[cid],
      question: keywordByCollection.value[cid],
    })
    if (isSuccess && data) {
      faqsByCollection.value[cid] = data.list || []
      totalByCollection.value[cid] = (data as any).pagination?.total || 0
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

// 选择/取消选择集合
function toggleCollection(col: Entity.FaqCollection) {
  const exists = selectedCollections.value.find(c => c.id === col.id)
  if (exists) {
    selectedCollections.value = selectedCollections.value.filter(c => c.id !== col.id)
  }
  else {
    selectedCollections.value.push(col)
  }
}

// 检查集合是否已选择
function isCollectionSelected(col: Entity.FaqCollection) {
  return selectedCollections.value.some(c => c.id === col.id)
}

// 搜索FAQ
function searchFaqs(collectionId?: string) {
  const cid = collectionId || activeCollectionId.value
  if (!cid)
    return
  pageNumByCollection.value[cid] = 1
  loadFaqs(cid)
}

// 确认选择
function confirmSelection() {
  emit('confirm', selectedCollections.value as any)
  hideModal()
}

// 取消选择
function cancelSelection() {
  hideModal()
}

// 打开新增FAQ集合弹窗
function openAddFaqCollection() {
  faqCollectionModalRef.value?.openModal('add')
}

// 处理新增FAQ集合成功
function handleFaqCollectionCreated() {
  loadFaqCollections()
}

// 打开FAQ弹窗
function openFaqModal(type: 'add' | 'edit', faq?: Entity.Faq, collectionId?: string) {
  const cid = collectionId || activeCollectionId.value
  if (!cid) {
    window.$message.warning('请先选择一个集合')
    return
  }
  if (type === 'add')
    faqModalRef.value?.openModal('add', { collectionId: cid })
  else
    faqModalRef.value?.openModal('edit', faq)
}

// 处理FAQ操作成功
async function handleFaqSuccess() {
  if (activeCollectionId.value) {
    await loadFaqs(activeCollectionId.value)
  }
}
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="选择FAQ" class="w-1000px" :bordered="false">
    <div class="space-y-4">
      <!-- 顶部操作栏：新增集合 -->
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-semibold" />
        <NButton type="primary" @click="openAddFaqCollection">
          <template #icon>
            <NIcon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
            </NIcon>
          </template>
          新增集合
        </NButton>
      </div>

      <!-- 已选择的集合 -->
      <div v-if="selectedCollections.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedCollections.length }} 个集合：
        </div>
        <div class="flex flex-wrap gap-2">
          <NTag
            v-for="col in selectedCollections"
            :key="col.id"
            closable
            @close="toggleCollection(col)"
          >
            {{ (col as any).name || (col as any).collectionName }}
          </NTag>
        </div>
      </div>

      <!-- FAQ集合折叠列表 -->
      <NCard>
        <!-- 空状态：无集合数据 -->
        <div v-if="!loading && faqCollections.length === 0" class="py-10">
          <NEmpty description="暂无集合数据">
            <template #extra>
              <NButton type="primary" @click="openAddFaqCollection">
                新增集合
              </NButton>
            </template>
          </NEmpty>
        </div>
        <!-- 集合折叠列表 -->
        <NCollapse v-if="faqCollections.length > 0" v-model:expanded-names="activeCollectionId" :accordion="true">
          <NCollapseItem v-for="col in faqCollections" :key="col.id" :name="col.id">
            <template #header>
              <div class="flex items-center justify-between w-full">
                <div class="leading-tight">
                  <div class="text-base font-medium" v-if="col.name">{{ col.name }}</div>
                  <div class="text-12px text-gray-500" v-if="col.collectionName">{{ col.collectionName }}</div>
                </div>
              </div>
            </template>
            <template #header-extra>
              <div @click.stop>
                <NButton
                  size="small"
                  :type="isCollectionSelected(col) ? 'error' : 'primary'"
                  ghost
                  round
                  @click="toggleCollection(col)"
                >
                  {{ isCollectionSelected(col) ? '取消选择' : '选择该集合' }}
                </NButton>
              </div>
            </template>

            <!-- FAQ搜索和新增 -->
            <div class="flex justify-between items-center mb-4">
              <NInputGroup class="w-[420px]">
                <NInput
                  v-model:value="keywordByCollection[col.id]"
                  placeholder="请输入问题关键词"
                  size="large"
                  clearable
                  round
                  @keyup.enter="() => { if (isCollectionExpanded(col.id)) searchFaqs(col.id) }"
                >
                  <template #prefix>
                    <NIcon>
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                        <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                      </svg>
                    </NIcon>
                  </template>
                </NInput>
                <NButton size="large" type="primary" ghost round class="ml-2" @click="() => { if (isCollectionExpanded(col.id)) searchFaqs(col.id) }">
                  搜索
                </NButton>
              </NInputGroup>
              <NButton type="primary" :disabled="!col.id" @click="openFaqModal('add', undefined, col.id)">
                新增FAQ
              </NButton>
            </div>

            <!-- FAQ卡片列表（预览，不可单选） -->
            <div v-if="!loading && (!(faqsByCollection[col.id]) || faqsByCollection[col.id].length === 0)" class="py-6 text-center text-gray-500">
              暂无数据
            </div>
            <div v-else>
              <NGrid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
                <NGi v-for="item in (faqsByCollection[col.id] || [])" :key="item.id">
                  <NCard
                    class="nova-card"
                    :segmented="{ content: true, action: true }"
                    :bordered="true"
                    :loading="loading"
                  >
                    <template #header>
                      <div class="flex items-center justify-between">
                        <div>
                          <div class="text-base font-medium">
                            {{ item.question }}
                          </div>
                          <div class="text-xs text-gray-500 mt-1">
                            <n-time :time="(item as any).createTime" format="yyyy-MM-dd HH:mm" />
                          </div>
                        </div>
                      </div>
                    </template>
                    <n-thing>
                      <template #description>
                        <div class="text-12px text-gray-500 nova-meta">
                          <div class="col-span-1 sm:col-span-2">
                            <span class="text-gray-400">回答</span>
                            <div class="line-clamp-3 break-all">
                              {{ item.answer }}
                            </div>
                          </div>
                        </div>
                      </template>
                    </n-thing>
                  </NCard>
                </NGi>
              </NGrid>
            </div>

            <!-- 分页 -->
            <div class="flex justify-end mt-4">
              <NPagination
                v-model:page="pageNumByCollection[col.id]"
                v-model:page-size="pageSizeByCollection[col.id]"
                :page-count="Math.ceil((totalByCollection[col.id] || 0) / (pageSizeByCollection[col.id] || 10))"
                :page-sizes="[10, 20, 50]"
                show-size-picker
                show-quick-jumper
                show-total
                @update:page="() => { if (isCollectionExpanded(col.id)) loadFaqs(col.id) }"
                @update:page-size="() => { if (isCollectionExpanded(col.id)) loadFaqs(col.id) }"
              />
            </div>
          </NCollapseItem>
        </NCollapse>
      </NCard>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <NButton @click="cancelSelection">
          取消
        </NButton>
        <NButton type="primary" :disabled="selectedCollections.length === 0" @click="confirmSelection">
          确认选择 ({{ selectedCollections.length }})
        </NButton>
      </div>
    </template>
  </n-modal>

  <FaqCollectionModal ref="faqCollectionModalRef" @success="handleFaqCollectionCreated" />
  <FaqModal ref="faqModalRef" @success="handleFaqSuccess" />
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>
