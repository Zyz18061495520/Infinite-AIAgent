<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NCheckbox, NEmpty, NGi, NGrid, NIcon, NInput, NPagination, NSelect, NTag } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { getToolsPageApi } from '@/service'
import { toolTypeOptions } from '@/constants/tool'
import ToolFormModal from '@/views/tool/components/ToolFormModal.vue'

const emit = defineEmits<{
  confirm: [tools: Entity.Tool[]]
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const allTools = ref<Entity.Tool[]>([])
const selectedTools = ref<Entity.Tool[]>([])
const searchKeyword = ref('')
const toolType = ref<string | undefined>(undefined)
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

// ToolFormModal引用
const toolFormModalRef = ref<InstanceType<typeof ToolFormModal> | null>(null)

// 加载工具列表
async function loadTools() {
  startLoading()
  try {
    const { isSuccess, data } = await getToolsPageApi({
      toolType: toolType.value,
      isPublish: true, // 只查询已启用的工具
      name: searchKeyword.value,
      pageNum: pageNum.value,
      pageSize: pageSize.value,
    })
    if (isSuccess && data) {
      allTools.value = data.list || []
      total.value = data.pagination?.total || 0
    }
  }
  finally {
    endLoading()
  }
}

// 仅内部使用的单选标记
const singleSelect = ref(false)

// 打开弹窗
function openModal(tools: Entity.Tool[], preSelected: Entity.Tool[] = [], options?: { type?: 'http' | 'sql', single?: boolean }) {
  selectedTools.value = [...preSelected]
  searchKeyword.value = ''
  toolType.value = options?.type || undefined
  singleSelect.value = !!options?.single
  pageNum.value = 1
  showModal()
  loadTools()
}

// 暴露方法给父组件
defineExpose({
  openModal,
})

// 选择/取消选择工具
function toggleTool(tool: Entity.Tool, checked: boolean) {
  if (checked) {
    if (singleSelect.value) {
      selectedTools.value = [tool]
    }
    else {
      if (!selectedTools.value.find(t => t.id === tool.id)) {
        selectedTools.value.push(tool)
      }
    }
  }
  else {
    const index = selectedTools.value.findIndex(t => t.id === tool.id)
    if (index > -1) {
      selectedTools.value.splice(index, 1)
    }
  }
}

// 检查工具是否已选择
function isToolSelected(tool: Entity.Tool) {
  return selectedTools.value.some(t => t.id === tool.id)
}

// 确认选择
function confirmSelection() {
  emit('confirm', selectedTools.value)
  hideModal()
}

// 取消选择
function cancelSelection() {
  hideModal()
}

// 搜索
function handleSearch() {
  pageNum.value = 1
  loadTools()
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
  pageNum.value = 1
  loadTools()
}

// 工具类型筛选
function handleToolTypeChange() {
  pageNum.value = 1
  loadTools()
}

// 重置筛选
function resetFilters() {
  toolType.value = undefined
  searchKeyword.value = ''
  pageNum.value = 1
  loadTools()
}

// 打开新增工具弹窗
function openAddTool() {
  toolFormModalRef.value?.openModal('add')
}

// 处理新增工具成功
function handleToolCreated() {
  loadTools() // 重新加载工具列表
}
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="选择工具" class="w-1000px" :bordered="false">
    <div class="space-y-4">
      <!-- 筛选栏 -->
      <div class="flex gap-2 items-center justify-between">
        <div class="flex gap-2 items-center">
          <NSelect
            v-model:value="toolType"
            :options="toolTypeOptions"
            clearable
            placeholder="工具类型"
            style="width: 180px"
            @update:value="handleToolTypeChange"
          />
          <NInput
            v-model:value="searchKeyword"
            placeholder="按名称搜索"
            style="width: 220px"
            clearable
            @keyup.enter="handleSearch"
            @clear="clearSearch"
          />
          <NButton type="primary" @click="handleSearch">
            <template #icon>
              <NIcon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5Zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14Z" /></svg>
              </NIcon>
            </template>
            查询
          </NButton>
          <NButton quaternary @click="resetFilters">
            <template #icon>
              <NIcon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M17.65 6.35A7.95 7.95 0 0 0 12 4V1L7 6l5 5V7c2.76 0 5 2.24 5 5a5 5 0 0 1-9.9 1h-2.02A7 7 0 0 0 19 12c0-2.21-.9-4.21-2.35-5.65Z" /></svg>
              </NIcon>
            </template>
            重置
          </NButton>
        </div>
        <NButton type="primary" @click="openAddTool">
          <template #icon>
            <NIcon>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" /></svg>
            </NIcon>
          </template>
          新增工具
        </NButton>
      </div>

      <!-- 已选择的工具 -->
      <div v-if="selectedTools.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedTools.length }} 个工具：
        </div>
        <div class="flex flex-wrap gap-2">
          <NTag
            v-for="tool in selectedTools"
            :key="tool.id"
            closable
            @close="toggleTool(tool, false)"
          >
            {{ tool.name }}
          </NTag>
        </div>
      </div>

      <!-- 工具列表 -->
      <div v-if="!loading && allTools.length === 0" class="py-8">
        <NEmpty description="暂无工具" />
      </div>
      <div v-else>
        <NGrid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <NGi v-for="tool in allTools" :key="tool.id">
            <NCard
              class="nova-card cursor-pointer"
              :segmented="{ content: true }"
              :bordered="true"
              :class="{ 'selected-card': isToolSelected(tool) }"
              @click="toggleTool(tool, !isToolSelected(tool))"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <NCheckbox
                      :checked="isToolSelected(tool)"
                      @update:checked="(checked) => toggleTool(tool, checked)"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ tool.name }}
                    </div>
                    <NTag size="small" round :type="tool.toolType === 'http' ? 'info' : 'warning'">
                      {{ tool.toolType.toUpperCase() }}
                    </NTag>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <n-time :time="(tool as any).createTime" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </template>

              <div class="text-sm text-gray-600">
                {{ tool.description }}
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
          @update:page="loadTools"
          @update:page-size="() => { pageNum = 1; loadTools() }"
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <NButton @click="cancelSelection">
          取消
        </NButton>
        <NButton type="primary" :disabled="selectedTools.length === 0" @click="confirmSelection">
          确认选择 ({{ selectedTools.length }})
        </NButton>
      </div>
    </template>
  </n-modal>

  <!-- 新增工具弹窗 -->
  <ToolFormModal ref="toolFormModalRef" @success="handleToolCreated" />
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>
