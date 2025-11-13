<script setup lang="ts">
import { usePermission } from '@/hooks'
import { useRouter } from 'vue-router'

const router = useRouter()
const { hasPermission } = usePermission()

// 检查是否有 superuser 权限
const showAdmin = computed(() => hasPermission('superuser'))

function handleClick() {
  router.push('/user')
}
</script>

<template>
  <n-tooltip v-if="showAdmin" placement="bottom" trigger="hover">
    <template #trigger>
      <n-tag
        round
        class="cursor-pointer"
        @click="handleClick"
      >
        <template #icon>
          <n-icon size="12" class="spanner-icon">
            <icon-park-outline:spanner />
          </n-icon>
        </template>
        Admin
      </n-tag>
    </template>
    <span>用户管理</span>
  </n-tooltip>
</template>

<style scoped>
.spanner-icon {
  transform: translate3d(2px, 0, 0);
}
</style>
