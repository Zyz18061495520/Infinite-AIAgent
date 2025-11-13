<script lang="tsx" setup>
import { computed, onMounted, ref, watch } from 'vue'
import { NButton, NCard, NCollapse, NCollapseItem, NEmpty, NIcon, NInput, NInputGroup, NPagination, NPopconfirm } from 'naive-ui'
import { useBoolean } from '@/hooks'
import FaqCollectionModal from './components/FaqCollectionModal.vue'
import FaqCollectionManageModal from './components/FaqCollectionManageModal.vue'
import FaqModal from './components/FaqModal.vue'
import { deleteFaqApi, getFaqCollectionsApi, getFaqsPageApi } from '@/service'
import { faqQaApi } from '@/service/api/faq'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import { useAuthStore } from '@/store/auth'

// 状态管理
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

// FAQ集合相关状态
const faqCollections = ref<Entity.FaqCollection[]>([])
const activeCollectionId = ref<string | null>(null)

// 集合弹窗引用
const collectionModalRef = ref<InstanceType<typeof FaqCollectionModal> | null>(null)
const collectionManageRef = ref<InstanceType<typeof FaqCollectionManageModal> | null>(null)

// FAQ弹窗引用
const faqModalRef = ref<InstanceType<typeof FaqModal> | null>(null)

// FAQ列表相关状态（按集合维度缓存）
const faqsByCollection = ref<Record<string, Entity.Faq[]>>({})
const totalByCollection = ref<Record<string, number>>({})
const pageNumByCollection = ref<Record<string, number>>({})
const pageSizeByCollection = ref<Record<string, number>>({})
const keywordByCollection = ref<Record<string, string>>({})

// 检查集合是否展开
function isCollectionExpanded(collectionId: string) {
  return activeCollectionId.value === collectionId
}
const auth = useAuthStore()
const currentUserId = computed(() => auth.userInfo?.id)

// 加载FAQ集合列表
async function loadFaqCollections() {
  startLoading()
  try {
    const { isSuccess, data } = await getFaqCollectionsApi()
    if (isSuccess) {
      faqCollections.value = data
      // 不在此处请求FAQ，仅在折叠面板展开时请求
    }
  }
  catch {
    window.$message.error('获取FAQ集合失败')
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
  catch {
    window.$message.error('获取FAQ列表失败')
  }
  finally {
    endLoading()
  }
}

// 集合编辑改为在“集合管理”弹窗中完成

// 处理集合操作成功
async function handleCollectionSuccess() {
  await loadFaqCollections()
}

// 集合删除迁移至集合管理弹窗

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
  await loadFaqs()
}

// 删除FAQ
async function removeFaq(id: string) {
  startLoading()
  try {
    const { isSuccess } = await deleteFaqApi(id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadFaqs()
    }
  }
  catch {
    window.$message.error('删除失败')
  }
  finally {
    endLoading()
  }
}

// 搜索FAQ
function searchFaqs(collectionId?: string) {
  const cid = collectionId || activeCollectionId.value
  if (!cid)
    return
  pageNumByCollection.value[cid] = 1
  loadFaqs(cid)
}

// 监听当前展开集合变化，展开即刷新
watch(activeCollectionId, (id) => {
  if (id) {
    // 只有展开时才请求FAQ
    pageNumByCollection.value[id] = 1
    keywordByCollection.value[id] = ''
    loadFaqs(id)
  }
})

// 初始化加载
onMounted(() => {
  loadFaqCollections()
})

// 集合编辑/删除
function openCollectionAdd() {
  collectionModalRef.value?.openModal('add')
}
function openCollectionEdit(col: Entity.FaqCollection) {
  collectionModalRef.value?.openModal('edit', col)
}
async function removeCollection(col: Entity.FaqCollection) {
  startLoading()
  try {
    const { deleteFaqCollectionApi } = await import('@/service')
    const { isSuccess } = await deleteFaqCollectionApi(col.id)
    if (isSuccess) {
      window.$message.success('删除成功')
      await loadFaqCollections()
    }
  }
  finally {
    endLoading()
  }
}

// 卡片视图，无需表格列

// 测试弹框
const testVisible = ref(false)
const testCollectionId = ref<string>('')
const testUploadId = ref<string>('')
const testQuestion = ref('')
const testLoading = ref(false)
const testResult = ref<any>(null)

function openTestCollection(col: Entity.FaqCollection) {
  testCollectionId.value = col.id
  // 兼容不同字段命名
  testUploadId.value = (col as any).uploadId || (col as any).upload_id || ''
  testQuestion.value = ''
  testResult.value = null
  testVisible.value = true
}

async function doCollectionTest() {
  if (!testCollectionId.value || !testQuestion.value)
    return
  testLoading.value = true
  testResult.value = null
  try {
    const { isSuccess, data } = await faqQaApi({
      question: testQuestion.value,
      threshold: 0.8,
      topK: 1,
      collectionId: testCollectionId.value,
      uploadIds: testUploadId.value ? [testUploadId.value] : [],
    })
    if (isSuccess)
      testResult.value = data
  }
  finally {
    testLoading.value = false
  }
}
</script>

<template>
  <div>
    <!-- 顶部操作栏：新增集合 -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">
        FAQ管理
      </h2>
      <NButton type="primary" @click="openCollectionAdd">
        <template #icon>
          <NIcon>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
          </NIcon>
        </template>
        新增集合
      </NButton>
    </div>

    <!-- FAQ管理区域 -->
    <NCard>
      <!-- 空状态：无集合数据 -->
      <div v-if="!loading && faqCollections.length === 0" class="py-10">
        <NEmpty description="暂无集合数据">
          <template #extra>
            <NButton type="primary" @click="openCollectionAdd">
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
              <div class="flex items-center gap-2">
                <NButton size="small" tertiary round @click.stop="openCollectionEdit(col)">
                  <template #icon>
                    <NIcon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                    </NIcon>
                  </template>
                  编辑
                </NButton>
                <NPopconfirm :on-positive-click="() => removeCollection(col)">
                  <template #trigger>
                    <NButton size="small" tertiary round type="error" @click.stop>
                      <template #icon>
                        <NIcon>
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" /></svg>
                        </NIcon>
                      </template>
                      删除
                    </NButton>
                  </template>
                  确认删除该集合吗？
                </NPopconfirm>
                <NButton size="small" tertiary round @click.stop="openTestCollection(col)">
                  <template #icon>
                    <NIcon>
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7L8 5z"/></svg>
                    </NIcon>
                  </template>
                  测试
                </NButton>
              </div>
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

          <!-- FAQ卡片列表（沿用现状） -->
          <div v-if="!loading && (!(faqsByCollection[col.id]) || faqsByCollection[col.id].length === 0)" class="py-6 text-center text-gray-500">
            暂无数据
          </div>
          <div v-else>
            <n-grid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
              <n-gi v-for="item in (faqsByCollection[col.id] || [])" :key="item.id">
                <NCard class="nova-card" :segmented="{ content: true, action: true }" :bordered="true" :loading="loading">
                  <template #header>
                    <div>
                      <div class="text-base font-medium">
                        {{ item.question }}
                      </div>
                      <div class="text-xs text-gray-500 mt-1">
                        <n-time :time="(item as any).createTime" format="yyyy-MM-dd HH:mm" />
                      </div>
                    </div>
                  </template>
                  <template #header-extra>
                    <div class="flex items-center gap-2">
                      <NButton size="small" tertiary round @click="openFaqModal('edit', item, col.id)">
                        <template #icon>
                          <NIcon>
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" /></svg>
                          </NIcon>
                        </template>
                        编辑
                      </NButton>
                      <NPopconfirm v-if="currentUserId && currentUserId === col.userId" :on-positive-click="() => removeFaq(item.id)">
                        <template #trigger>
                          <NButton size="small" tertiary round type="error">
                            <template #icon>
                              <NIcon>
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1z" /></svg>
                              </NIcon>
                            </template>
                            删除
                          </NButton>
                        </template>
                        确认移除吗？
                      </NPopconfirm>
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
                        <div>
                          <span class="text-gray-400">创建人</span>
                          <div>{{ (item as any).userName || '--' }}</div>
                        </div>
                      </div>
                    </template>
                  </n-thing>
                </NCard>
              </n-gi>
            </n-grid>
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

    <!-- FAQ集合弹窗组件 -->
    <FaqCollectionModal ref="collectionModalRef" @success="handleCollectionSuccess" />
    <FaqCollectionManageModal ref="collectionManageRef" @success="handleCollectionSuccess" />

    <!-- FAQ弹窗组件 -->
    <FaqModal ref="faqModalRef" @success="handleFaqSuccess" />

  <!-- FAQ 集合测试弹框 -->
  <n-modal v-model:show="testVisible" preset="card" title="FAQ 集合问答测试" :segmented="{ content: true }" :style="{ width: '640px' }">
    <div class="space-y-3">
      <n-input v-model:value="testQuestion" type="textarea" placeholder="请输入问题" :autosize="{ minRows: 3, maxRows: 6 }" />
      <div>
        <n-button type="primary" :loading="testLoading" :disabled="!testQuestion" @click="doCollectionTest">
          测试
        </n-button>
      </div>
      <div v-if="testResult">
        <div class="mb-2">
          <span class="text-sm font-medium text-gray-700">测试结果：</span>
        </div>
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-96 overflow-auto">
          <template v-if="typeof testResult === 'string'">
            <div class="text-sm text-gray-800 break-all whitespace-pre-wrap">
              {{ testResult }}
            </div>
          </template>
          <template v-else>
            <VueJsonPretty
              :data="testResult"
              :show-length="true"
              :show-line-number="false"
              :show-icon="true"
              :deep="3"
              :deep-collapse="4"
              class="text-xs"
            />
          </template>
        </div>
      </div>
    </div>
  </n-modal>
  </div>
</template>
