<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

interface AgentType {
  value: 'single' | 'workflow' | 'supervisor'
  label: string
  icon: string
  description: string
}

const router = useRouter()

// 智能体类型配置
const agentTypes: AgentType[] = [
  {
    value: 'single',
    label: '单智能体',
    icon: 'single',
    description: '独立的智能体，可以独立完成特定任务',
  },
  {
    value: 'workflow',
    label: '工作流',
    icon: 'workflow',
    description: '由多个步骤组成的工作流程，可以处理复杂任务',
  },
  {
    value: 'supervisor',
    label: '多智能体',
    icon: 'supervisor',
    description: '多个智能体协作，可以处理更复杂的场景',
  },
]

// 弹框显示状态
const visible = ref(false)

// 显示弹框
function show() {
  visible.value = true
}

// 隐藏弹框
function hide() {
  visible.value = false
}

// 选择智能体类型并跳转
function selectAgentType(type: AgentType) {
  hide()
  // 工作流类型跳转到新增工作流页面，其它类型跳转到新增智能体页面
  if (type.value === 'workflow') {
    router.push('/workflow/edit')
  }
  else {
    router.push(`/agent/edit?type=${type.value}`)
  }
}

// 渲染图标
function renderIcon(iconType: string) {
  const iconMap = {
    single: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="singleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- 背景圆形 -->
        <circle cx="50" cy="50" r="45" fill="url(#singleGradient)" opacity="0.1"/>
        <!-- 主体圆形 -->
        <circle cx="50" cy="50" r="35" fill="url(#singleGradient)"/>
        <!-- 单智能体图标 - 单个AI模型 -->
        <circle cx="50" cy="50" r="20" fill="white"/>
        <!-- AI模型核心 -->
        <circle cx="50" cy="50" r="12" fill="url(#singleGradient)"/>
        <!-- 神经网络节点 -->
        <circle cx="45" cy="45" r="2" fill="white"/>
        <circle cx="55" cy="45" r="2" fill="white"/>
        <circle cx="45" cy="55" r="2" fill="white"/>
        <circle cx="55" cy="55" r="2" fill="white"/>
        <circle cx="50" cy="50" r="2" fill="white"/>
        <!-- 连接线 -->
        <line x1="45" y1="45" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="55" y1="45" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="45" y1="55" x2="50" y2="50" stroke="white" stroke-width="1"/>
        <line x1="55" y1="55" x2="50" y2="50" stroke="white" stroke-width="1"/>
      </svg>
    `,
    workflow: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="workflowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#11998e;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#38ef7d;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- 背景圆形 -->
        <circle cx="50" cy="50" r="45" fill="url(#workflowGradient)" opacity="0.1"/>
        <!-- 主体圆形 -->
        <circle cx="50" cy="50" r="35" fill="url(#workflowGradient)"/>
        <!-- 工作流图标 - 流程图节点 -->
        <circle cx="50" cy="50" r="20" fill="white"/>
        <!-- 开始节点 -->
        <rect x="35" y="40" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <!-- 处理节点 -->
        <rect x="50" y="40" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <!-- 结束节点 -->
        <rect x="42" y="55" width="12" height="8" rx="4" fill="url(#workflowGradient)"/>
        <!-- 连接箭头 -->
        <path d="M47 44 L50 44 L48 42 L48 46 Z" fill="url(#workflowGradient)"/>
        <path d="M56 48 L56 52 L58 50 L54 50 Z" fill="url(#workflowGradient)"/>
        <path d="M48 58 L45 58 L47 56 L47 60 Z" fill="url(#workflowGradient)"/>
      </svg>
    `,
    supervisor: `
      <svg viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="supervisorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
          </linearGradient>
        </defs>
        <!-- 背景圆形 -->
        <circle cx="50" cy="50" r="45" fill="url(#supervisorGradient)" opacity="0.1"/>
        <!-- 主体圆形 -->
        <circle cx="50" cy="50" r="35" fill="url(#supervisorGradient)"/>
        <!-- 多智能体图标 - 管理多个子智能体 -->
        <circle cx="50" cy="50" r="20" fill="white"/>
        <!-- 中心管理器 -->
        <rect x="45" y="45" width="10" height="10" rx="2" fill="url(#supervisorGradient)"/>
        <!-- 子智能体 -->
        <rect x="35" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="59" y="35" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="35" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <rect x="59" y="59" width="6" height="6" rx="1" fill="url(#supervisorGradient)"/>
        <!-- 管理连接线 -->
        <line x1="50" y1="50" x2="38" y2="38" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="38" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="38" y2="62" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
        <line x1="50" y1="50" x2="62" y2="62" stroke="url(#supervisorGradient)" stroke-width="1.5"/>
      </svg>
    `,
  }
  return iconMap[iconType as keyof typeof iconMap] || iconMap.single
}

// 暴露方法
defineExpose({
  show,
})
</script>

<template>
  <n-modal
    v-model:show="visible"
    preset="card"
    style="width: 800px"
    :bordered="false"
    :segmented="false"
    :mask-closable="false"
  >
    <template #header>
      <div class="text-center text-lg font-semibold text-gray-800">
        选择智能体类型
      </div>
    </template>
    <div class="space-y-6">
      <div class="text-gray-600 text-sm text-center">
        请选择您要创建的智能体类型，不同类型的智能体具有不同的功能和特点。
      </div>

      <!-- 智能体类型卡片 -->
      <div class="grid grid-cols-3 gap-6">
        <button
          v-for="type in agentTypes"
          :key="type.value"
          type="button"
          class="cursor-pointer transition-all duration-300 hover:scale-102 hover:border-purple-400 border-2 border-gray-200 hover:shadow-2xl hover:bg-purple-50/30 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2"
          @click="selectAgentType(type)"
        >
          <div class="flex flex-col items-center justify-center text-center space-y-4 py-6 px-4 min-h-200px">
            <div class="w-20 h-20 mb-3 flex items-center justify-center" v-html="renderIcon(type.icon)" />
            <div class="text-2xl font-black text-gray-900 text-center">
              {{ type.label }}
            </div>
            <div class="text-sm text-gray-600 leading-relaxed text-center px-2 h-12 flex items-center justify-center">
              {{ type.description }}
            </div>
            <div class="text-sm text-gray-400 font-medium mt-2 text-center">
              点击创建
            </div>
          </div>
        </button>
      </div>
    </div>
  </n-modal>
</template>
