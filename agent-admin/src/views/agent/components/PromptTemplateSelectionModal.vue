<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NCheckbox, NEmpty, NGi, NGrid, NIcon, NPagination, NPopover } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { getPromptTemplatesPageApi } from '@/service/api/prompt-template'
import CreatePromptTemplateModal from './CreatePromptTemplateModal.vue'

const emit = defineEmits<{
  confirm: [content: string]
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

interface PromptTemplate {
  id: string
  title: string
  content: string
  createTime: number
  updateTime: number
}

const templates = ref<PromptTemplate[]>([])
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)
const selectedTemplate = ref<PromptTemplate | null>(null)

// CreatePromptTemplateModal引用
const createTemplateModalRef = ref<InstanceType<typeof CreatePromptTemplateModal> | null>(null)

// 加载模板列表
async function loadTemplates() {
  startLoading()
  try {
    const { isSuccess, data } = await getPromptTemplatesPageApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (isSuccess && data) {
      templates.value = data.records || []
      total.value = data.total || 0
    }
  }
  finally {
    endLoading()
  }
}

// 打开弹窗
function openModal() {
  pageNum.value = 1
  selectedTemplate.value = null
  showModal()
  loadTemplates()
}

// 暴露方法给父组件
defineExpose({
  openModal,
})

// 选择模板（点击卡片时选中）
function selectTemplate(template: PromptTemplate) {
  selectedTemplate.value = template
}

// 确认使用选中的模板
function confirmSelection() {
  if (selectedTemplate.value) {
    emit('confirm', selectedTemplate.value.content)
    hideModal()
  }
}

// 取消选择
function cancelSelection() {
  hideModal()
}

// 检查模板是否被选中
function isTemplateSelected(template: PromptTemplate) {
  return selectedTemplate.value?.id === template.id
}

// 打开创建模板弹窗
function openCreateTemplate() {
  createTemplateModalRef.value?.openModal()
}

// 处理创建模板成功
function handleTemplateCreated() {
  loadTemplates() // 重新加载模板列表
}

// 格式化时间
function formatTime(timestamp: number) {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="从模板导入" class="w-1000px" :bordered="false">
    <div class="space-y-4">
      <!-- 操作栏 -->
      <div class="flex justify-end">
        <n-button type="primary" @click="openCreateTemplate">
          <template #icon>
            <n-icon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
              </svg>
            </n-icon>
          </template>
          创建模板
        </n-button>
      </div>

      <!-- 模板列表 -->
      <div v-if="!loading && templates.length === 0" class="py-8">
        <n-empty description="暂无模板" />
      </div>
      <div v-else>
        <n-grid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <n-gi v-for="template in templates" :key="template.id">
            <n-card
              class="nova-card cursor-pointer"
              :class="{ 'selected-card': isTemplateSelected(template) }"
              :segmented="{ content: true }"
              :bordered="true"
              @click="selectTemplate(template)"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <n-checkbox
                      :checked="isTemplateSelected(template)"
                      @update:checked="(checked) => { if (checked) selectTemplate(template) }"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ template.title }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    {{ formatTime(template.createTime) }}
                  </div>
                </div>
              </template>

              <n-popover trigger="hover" placement="top" :show-arrow="true" style="max-width: 500px">
                <template #trigger>
                  <div class="text-sm text-gray-600 line-clamp-3 cursor-pointer">
                    {{ template.content }}
                  </div>
                </template>
                <div class="text-sm text-gray-700 whitespace-pre-wrap max-h-96 overflow-y-auto" style="max-width: 500px">
                  {{ template.content }}
                </div>
              </n-popover>
            </n-card>
          </n-gi>
        </n-grid>
      </div>

      <!-- 分页 -->
      <div class="flex justify-end">
        <n-pagination
          v-model:page="pageNum"
          v-model:page-size="pageSize"
          :item-count="total"
          show-size-picker
          :page-sizes="[10, 20, 50]"
          @update:page="loadTemplates"
          @update:page-size="() => { pageNum = 1; loadTemplates() }"
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <n-button @click="cancelSelection">
          取消
        </n-button>
        <n-button type="primary" :disabled="!selectedTemplate" @click="confirmSelection">
          使用此模板
        </n-button>
      </div>
    </template>
  </n-modal>

  <!-- 创建模板弹窗 -->
  <CreatePromptTemplateModal ref="createTemplateModalRef" @success="handleTemplateCreated" />
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>

