<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getReleaseDetailPublic, runAgentPublic } from '@/service/api/public'
import PreviewDebug from '@/views/agent/components/PreviewDebug.vue'

defineOptions({ name: 'PublicRun' })

const route = useRoute()
const agentId = ref<string>('')
const version = ref<string>('')
const apiKey = ref<string>('')
const agentDetail = ref<any>(null)
const loading = ref(false)
const runMode = ref<'react' | 'plan_execute'>('react')

async function fetchDetail() {
  loading.value = true
  try {
    const result = await getReleaseDetailPublic(agentId.value, version.value, apiKey.value)
    // 兼容不同的返回格式
    agentDetail.value = result?.data || result
  }
  catch {
    agentDetail.value = null
  }
  finally {
    loading.value = false
  }
}

// 自定义 API 调用函数，使用 runAgentPublic
function customApiCall(payload: any) {
  return runAgentPublic(payload, apiKey.value)
}

// 从 agentDetail 中提取基本信息
const agentInfo = computed(() => {
  if (!agentDetail.value) {
    return {
      name: '',
      zh_name: '',
      description: '',
      prologue: '',
      leading_question: [],
      agentType: 'single' as const,
    }
  }
  return {
    name: agentDetail.value.name || '',
    zh_name: agentDetail.value.zh_name || '',
    description: agentDetail.value.description || '',
    prologue: agentDetail.value.prologue || '',
    leading_question: agentDetail.value.leading_question || [],
    agentType: (agentDetail.value.agent_type || 'single') as 'single' | 'workflow' | 'supervisor',
  }
})

onMounted(async () => {
  agentId.value = String(route.query.agent_id || '')
  version.value = String(route.query.version || '')
  apiKey.value = String(route.query.api_key || '')
  await fetchDetail()
})
</script>

<template>
  <div class="h-full bg-white flex flex-col">
    <div class="max-w-6xl mx-auto w-full flex-1 flex flex-col p-6 min-h-0">
      <div class="flex items-center justify-between mb-4">
        <div class="flex flex-col">
          <div class="text-xl font-semibold">
            智能体对话
          </div>
          <div v-if="agentDetail" class="text-sm text-gray-500 font-normal mt-1">
            Agent ID: {{ agentId }} · Version: {{ version }}
          </div>
        </div>
        <template v-if="agentInfo.agentType === 'single'">
          <div class="flex items-center gap-2">
            <span>运行模式：</span>
            <n-select
              v-model:value="runMode"
              :options="[
                { label: 'React模式', value: 'react' },
                { label: 'PlanExecute模式', value: 'plan_execute' },
              ]"
              style="width: 160px"
            />
          </div>
        </template>
      </div>

      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <n-spin size="large" />
      </div>

      <div v-else-if="!agentDetail" class="flex-1 flex items-center justify-center">
        <n-alert type="error" title="加载失败">
          无法加载智能体详情，请检查参数是否正确
        </n-alert>
      </div>

      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <PreviewDebug
          :name="agentInfo.name"
          :zh-name="agentInfo.zh_name"
          :description="agentInfo.description"
          :prologue="agentInfo.prologue"
          :leading-question="agentInfo.leading_question"
          :agent-type="agentInfo.agentType"
          :run-mode="agentInfo.agentType === 'single' ? runMode : undefined"
          :agent-data="agentDetail"
          :custom-api-call="customApiCall"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
