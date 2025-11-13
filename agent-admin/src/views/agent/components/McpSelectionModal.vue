<script setup lang="ts">
import { computed, ref } from 'vue'
import { NButton, NCard, NCheckbox, NEmpty, NGi, NGrid, NIcon, NInput, NPagination, NTag, NTime } from 'naive-ui'
import { useBoolean } from '@/hooks'
import { getMcpServersPageApi } from '@/service'

const emit = defineEmits<{
  success: [selectedMcps: any[]]
}>()

const { bool: visible, setTrue: showModal, setFalse: hideModal } = useBoolean(false)
const { bool: loading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)

const allMcps = ref<any[]>([])
const selectedMcps = ref<any[]>([])
const searchKeyword = ref('')
const pageNum = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 打开弹窗
function openModal(_unused: any[] = [], preSelected: any[] = []) {
  selectedMcps.value = [...preSelected]
  searchKeyword.value = ''
  pageNum.value = 1
  showModal()
  loadMcpList()
}

// 加载 MCP 列表
async function loadMcpList() {
  startLoading()
  try {
    const { isSuccess, data } = await getMcpServersPageApi({
      pageNum: pageNum.value,
      pageSize: pageSize.value,
      name: searchKeyword.value || undefined,
    })
    if (isSuccess && data) {
      allMcps.value = data.list || []
      total.value = (data as any).pagination?.total || 0
    }
  }
  finally {
    endLoading()
  }
}

// 选择/取消选择 MCP
function toggleMcp(mcp: any, checked: boolean) {
  if (checked) {
    if (!selectedMcps.value.find(m => m.id === mcp.id)) {
      selectedMcps.value.push(mcp)
    }
  }
  else {
    const index = selectedMcps.value.findIndex(m => m.id === mcp.id)
    if (index > -1) {
      selectedMcps.value.splice(index, 1)
    }
  }
}

// 检查是否已选择
function isMcpSelected(mcp: any) {
  return selectedMcps.value.some(m => m.id === mcp.id)
}

// 确认选择
function confirmSelection() {
  emit('success', selectedMcps.value)
  hideModal()
}

// 取消选择
function cancelSelection() {
  hideModal()
}

// 搜索
function handleSearch() {
  pageNum.value = 1
  loadMcpList()
}

// 清空搜索
function clearSearch() {
  searchKeyword.value = ''
  pageNum.value = 1
  loadMcpList()
}

defineExpose({ openModal })
</script>

<template>
  <n-modal v-model:show="visible" preset="card" title="选择MCP" class="w-1000px" :bordered="false">
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
      </NSpace>

      <!-- 已选择的MCP -->
      <div v-if="selectedMcps.length > 0" class="bg-purple-50 p-3 rounded">
        <div class="text-sm font-medium text-purple-800 mb-2">
          已选择 {{ selectedMcps.length }} 个MCP：
        </div>
        <div class="flex flex-wrap gap-2">
          <NTag
            v-for="mcp in selectedMcps"
            :key="mcp.id"
            closable
            @close="toggleMcp(mcp, false)"
          >
            {{ mcp.name }}
          </NTag>
        </div>
      </div>

      <!-- MCP列表 -->
      <div v-if="!loading && allMcps.length === 0" class="py-8">
        <NEmpty description="暂无MCP" />
      </div>
      <div v-else>
        <NGrid responsive="screen" :cols="2" :x-gap="16" :y-gap="16">
          <NGi v-for="mcp in allMcps" :key="mcp.id">
            <NCard
              class="nova-card cursor-pointer"
              :segmented="{ content: true }"
              :bordered="true"
              :class="{ 'selected-card': isMcpSelected(mcp) }"
              @click="toggleMcp(mcp, !isMcpSelected(mcp))"
            >
              <template #header>
                <div>
                  <div class="flex items-center gap-2">
                    <NCheckbox
                      :checked="isMcpSelected(mcp)"
                      @update:checked="(checked) => toggleMcp(mcp, checked)"
                      @click.stop
                    />
                    <div class="text-base font-medium">
                      {{ mcp.name }}
                    </div>
                    <NTag size="small" round type="info">{{ mcp.type }}</NTag>
                  </div>
                  <div class="text-xs text-gray-500 mt-1">
                    <NTime :time="mcp.create_time" format="yyyy-MM-dd HH:mm" />
                  </div>
                </div>
              </template>
              <div class="text-sm text-gray-600">
                {{ mcp.description }}
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
          @update:page="loadMcpList"
          @update:page-size="() => { pageNum = 1; loadMcpList() }"
        />
      </div>
    </div>

    <template #action>
      <div class="flex justify-center gap-2">
        <NButton @click="cancelSelection">
          取消
        </NButton>
        <NButton type="primary" :disabled="selectedMcps.length === 0" @click="confirmSelection">
          确认选择 ({{ selectedMcps.length }})
        </NButton>
      </div>
    </template>
  </n-modal>
</template>

<style scoped>
.nova-card {
  @apply shadow-sm hover:shadow-md transition-shadow cursor-pointer;
}

.selected-card {
  @apply border-purple-500 bg-purple-100 shadow-lg ring-2 ring-purple-300;
}
</style>
