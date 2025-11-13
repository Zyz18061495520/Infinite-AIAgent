<script setup lang="ts">
import { useBoolean } from '@/hooks'
import { addWorkspaceMemberApi, searchUsersApi } from '@/service'
import { computed, ref } from 'vue'

const {
  workspaceId,
} = defineProps<Props>()

const emit = defineEmits<{
  open: []
  close: []
  success: []
}>()

interface Props {
  workspaceId: string
}

const { bool: modalVisible, setTrue: showModal, setFalse: hiddenModal } = useBoolean(false)
const { bool: submitLoading, setTrue: startLoading, setFalse: endLoading } = useBoolean(false)
const { bool: searchLoading, setTrue: startSearchLoading, setFalse: endSearchLoading } = useBoolean(false)

const searchKeyword = ref('')
const searchResults = ref<Entity.User[]>([])
const selectedUserId = ref<string | null>(null)
const hasSearched = ref(false)

async function openModal() {
  emit('open')
  showModal()
  searchKeyword.value = ''
  searchResults.value = []
  selectedUserId.value = null
}

function closeModal() {
  hiddenModal()
  endLoading()
  endSearchLoading()
  emit('close')
}

defineExpose({
  openModal,
})

async function searchUsers() {
  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    hasSearched.value = false
    return
  }

  startSearchLoading()
  const { isSuccess, data } = await searchUsersApi(searchKeyword.value)
  endSearchLoading()
  hasSearched.value = true
  if (isSuccess) {
    // 过滤掉已经在工作空间中的用户（假设可以从某处获取）
    searchResults.value = data
  }
}

async function submitModal() {
  if (!selectedUserId.value) {
    window.$message.warning('请先选择用户')
    return
  }

  startLoading()
  const { isSuccess } = await addWorkspaceMemberApi({
    workspaceId,
    userId: selectedUserId.value,
    role: 'common',
  })
  endLoading()

  if (isSuccess) {
    window.$message.success('添加成员成功')
    emit('success')
    closeModal()
  }
}

const modalTitle = computed(() => '添加成员')
</script>

<template>
  <n-modal
    v-model:show="modalVisible"
    :mask-closable="false"
    preset="card"
    :title="modalTitle"
    class="w-700px"
    :segmented="{
      content: true,
      action: true,
    }"
  >
    <div>
      <n-form-item label="搜索用户" label-width="100">
        <n-input
          v-model:value="searchKeyword"
          placeholder="请输入用户名或邮箱"
          @keyup.enter="searchUsers"
        >
          <template #suffix>
            <n-icon :loading="searchLoading" @click="searchUsers">
              <icon-park-outline:search />
            </n-icon>
          </template>
        </n-input>
      </n-form-item>

      <div v-if="searchResults.length > 0" class="mt-4">
        <n-divider content-position="left">
          搜索结果
        </n-divider>
        <div class="grid grid-cols-2 gap-4">
          <n-card
            v-for="user in searchResults"
            :key="user.id"
            :bordered="true"
            :class="selectedUserId === user.id ? 'border-primary-500 bg-primary-50' : 'border-gray-200'"
            class="cursor-pointer transition-all hover:shadow-md h-full"
            @click="selectedUserId = selectedUserId === user.id ? null : user.id"
          >
            <div class="flex items-center justify-between h-full">
              <n-thing :title="user.username" :description="user.email">
                <template #avatar>
                  <n-avatar size="medium" :src="(user as any).avatar || ''">
                    {{ user.username?.charAt(0) || user.email?.charAt(0) }}
                  </n-avatar>
                </template>
              </n-thing>
              <n-checkbox
                :checked="selectedUserId === user.id"
                :focusable="false"
                @click.stop="selectedUserId = selectedUserId === user.id ? null : user.id"
              />
            </div>
          </n-card>
        </div>
      </div>

      <!-- 搜索无结果时的提示 -->
      <div v-else-if="hasSearched" class="mt-8 flex flex-col items-center justify-center text-gray-500">
        <n-empty description="没有找到相关用户" />
      </div>
    </div>

    <template #action>
      <n-space justify="center">
        <n-button @click="closeModal">
          取消
        </n-button>
        <n-button type="primary" :loading="submitLoading" @click="submitModal">
          提交
        </n-button>
      </n-space>
    </template>
  </n-modal>
</template>
