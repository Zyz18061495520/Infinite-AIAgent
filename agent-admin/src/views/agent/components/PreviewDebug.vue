<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { DebugData } from '@/utils/sse'
import { handleSSEStream } from '@/utils/sse'
import { debugAgentApi } from '@/service/api/agent'
import DebugDataDisplay from './DebugDataDisplay.vue'
import WorkflowDebugCard from './WorkflowDebugCard.vue'

interface Props {
  // 智能体基本信息
  name: string
  zhName: string
  description: string
  prologue: string
  leadingQuestion: string[]
  // 保存智能体的函数，返回保存后的数据（可选）
  onSave?: () => Promise<any>
  // 智能体类型
  agentType: 'single' | 'workflow' | 'supervisor'
  // 运行模式（仅单智能体）
  runMode?: 'react' | 'plan_execute'
  // 直接传入的智能体数据（如果传入，则不调用 onSave）
  agentData?: any
  // 自定义 API 调用函数（可选，默认使用 debugAgentApi）
  customApiCall?: (payload: any) => Promise<Response>
}

const props = defineProps<Props>()

// 对话记录
const chatHistory = ref<Array<{
  role: 'user' | 'assistant'
  content: string
  isLoading?: boolean
  debugData?: DebugData
  isDebugData?: boolean
}>>([])
const currentMessage = ref('')

// 对话线程ID
const threadId = ref<string>('')

// AI是否正在回复
const isAIReplying = ref(false)

// SSE流读取器引用，用于中断流
const currentReader = ref<ReadableStreamDefaultReader<Uint8Array> | null>(null)

// 对话记录容器引用
const chatContainerRef = ref<HTMLElement | null>(null)

// 生成UUID
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 初始化thread_id
function initThreadId() {
  threadId.value = generateUUID()
}

// 删除对话记录
function clearChatHistory() {
  chatHistory.value = []
  initThreadId()
}

// 中断AI回复
async function interruptAIReply() {
  if (currentReader.value) {
    try {
      await currentReader.value.cancel()
      currentReader.value.releaseLock()
      currentReader.value = null
    }
    catch (error) {
      console.error('中断流时出错:', error)
    }
  }
  isAIReplying.value = false

  // 更新最后一条消息，移除loading状态
  const lastMessage = chatHistory.value[chatHistory.value.length - 1]
  if (lastMessage) {
    if (lastMessage.isLoading) {
      lastMessage.isLoading = false
      // 如果是调试数据且没有内容，保持调试数据格式
      if (!lastMessage.isDebugData) {
        if (!lastMessage.content || lastMessage.content.trim() === '') {
          lastMessage.content = '回复已中断'
        }
      }
    }
  }
}

// 滚动到对话记录底部
async function scrollToBottom() {
  await nextTick()
  if (chatContainerRef.value) {
    chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
  }
}

// 处理参数确认
async function handleParamsConfirm(params: Record<string, any>) {
  // 检查AI是否正在回复
  if (isAIReplying.value) {
    return
  }

  // 设置AI正在回复状态
  isAIReplying.value = true

  // 立即添加loading卡片
  const loadingMessageIndex = chatHistory.value.length
  chatHistory.value.push({
    role: 'assistant',
    content: '',
    isLoading: true,
  })

  try {
    // 获取智能体数据（优先使用 agentData，否则调用 onSave）
    const savedAgentData = props.agentData || (props.onSave ? await props.onSave() : null)
    if (!savedAgentData) {
      throw new Error('无法获取智能体数据')
    }

    // 调用调试接口，传递确认的参数
    const debugPayload: any = {
      type: props.agentType,
      question: '', // 空问题
      runable_config: {
        thread_id: threadId.value,
      },
      user_inputs: params, // 传递确认的参数
      data: savedAgentData,
    }
    // 如果是单智能体，添加 run_mode
    if (props.agentType === 'single' && props.runMode) {
      debugPayload.run_mode = props.runMode
    }

    const response = props.customApiCall ? await props.customApiCall(debugPayload) : await debugAgentApi(debugPayload)

    // 处理SSE流式数据
    await handleSSEStream(
      response,
      async (content: string) => {
        // 检查是否是调试数据
        try {
          const parsed = JSON.parse(content)
          if (parsed.type === 'debug_data' && parsed.data) {
            // 只有AI类型才考虑合并，其他类型都单独显示
            if (parsed.data.type === 'ai') {
              // 忽略 type 为 ai 且 name 为 RunnableSequence 的数据
              if (parsed.data.name === 'RunnableSequence') {
                return
              }
              const lastMessage = chatHistory.value[chatHistory.value.length - 1]
              if (lastMessage && lastMessage.isDebugData && lastMessage.debugData?.type === 'ai') {
                // 如果是连续的AI类型，追加content
                lastMessage.debugData.content += (parsed.data.content || '')
              }
              else {
                // 如果loading消息还存在，替换它；否则添加新的AI消息
                if (chatHistory.value[loadingMessageIndex].isLoading) {
                  chatHistory.value[loadingMessageIndex] = {
                    role: 'assistant',
                    content: '',
                    isDebugData: true,
                    debugData: parsed.data,
                  }
                }
                else {
                  // loading已经被替换，添加新的AI消息
                  chatHistory.value.push({
                    role: 'assistant',
                    content: '',
                    isDebugData: true,
                    debugData: parsed.data,
                  })
                }
              }
              // 滚动到底部显示最新内容
              await scrollToBottom()
            }
            else {
              // 非AI类型都单独显示
              // 先替换loading消息为第一个非AI类型
              if (chatHistory.value[loadingMessageIndex].isLoading) {
                chatHistory.value[loadingMessageIndex] = {
                  role: 'assistant',
                  content: '',
                  isDebugData: true,
                  debugData: parsed.data,
                }
              }
              else {
                // 如果loading已经被替换，则添加新的消息
                chatHistory.value.push({
                  role: 'assistant',
                  content: '',
                  isDebugData: true,
                  debugData: parsed.data,
                })
              }
              // 滚动到底部显示最新内容
              await scrollToBottom()
            }
            return
          }
        }
        catch {
          // 不是JSON格式，继续正常处理
        }

        // 替换loading消息为普通内容
        chatHistory.value[loadingMessageIndex] = {
          role: 'assistant',
          content,
        }

        // 滚动到底部显示最新内容
        await scrollToBottom()
      },
      () => {
        // 流式数据接收完成
        const msg = chatHistory.value[loadingMessageIndex]
        if (msg) {
          // 若不是调试数据且内容为空，则移除占位，避免出现空灰卡片
          if (!msg.isDebugData && (!msg.content || msg.content.trim() === '')) {
            chatHistory.value.splice(loadingMessageIndex, 1)
          }
          else if (msg.isLoading) {
            msg.isLoading = false
          }
        }
        isAIReplying.value = false
      },
      () => {
        // 处理错误
        chatHistory.value[loadingMessageIndex] = {
          role: 'assistant',
          content: '参数确认失败，请重试',
        }
        isAIReplying.value = false
      },
      currentReader,
    )
  }
  catch {
    chatHistory.value[loadingMessageIndex] = {
      role: 'assistant',
      content: '参数确认失败，请重试',
    }
    isAIReplying.value = false
  }
}

// 处理引导提问点击
function handleLeadingQuestionClick(question: string) {
  if (question.trim()) {
    currentMessage.value = question
    // 直接发送消息
    sendMessage()
  }
}

// 处理回车键事件
function handleEnterKey(event: KeyboardEvent) {
  // 如果AI正在回复，阻止发送
  if (isAIReplying.value) {
    event.preventDefault()
    return
  }

  // 如果按的是Shift+回车，允许换行
  if (event.shiftKey) {
    return
  }

  // 如果按的是单独的回车键，发送消息
  event.preventDefault()
  sendMessage()
}

// 发送消息
async function sendMessage() {
  if (!currentMessage.value.trim())
    return

  // 检查AI是否正在回复
  if (isAIReplying.value) {
    return
  }

  const userMessage = currentMessage.value.trim()

  // 添加用户消息到聊天记录
  chatHistory.value.push({
    role: 'user',
    content: userMessage,
  })

  // 滚动到底部
  await scrollToBottom()

  // 清空输入框
  currentMessage.value = ''

  // 设置AI正在回复状态
  isAIReplying.value = true

  // 添加AI回复占位符
  const assistantMessageIndex = chatHistory.value.length
  chatHistory.value.push({
    role: 'assistant',
    content: '',
    isLoading: true,
  })

  try {
    // 获取智能体数据（优先使用 agentData，否则调用 onSave）
    const savedAgentData = props.agentData || (props.onSave ? await props.onSave() : null)
    if (!savedAgentData) {
      throw new Error('无法获取智能体数据')
    }

    // 调用调试接口
    const debugPayload: any = {
      type: props.agentType,
      question: userMessage,
      runable_config: {
        thread_id: threadId.value,
      },
      user_inputs: {},
      data: savedAgentData,
    }
    // 如果是单智能体，添加 run_mode
    if (props.agentType === 'single' && props.runMode) {
      debugPayload.run_mode = props.runMode
    }

    const response = props.customApiCall ? await props.customApiCall(debugPayload) : await debugAgentApi(debugPayload)

    // 处理SSE流式数据
    await handleSSEStream(
      response,
      async (content: string) => {
        // 检查是否是调试数据
        try {
          const parsed = JSON.parse(content)
          if (parsed.type === 'debug_data' && parsed.data) {
            // 检查是否有loading消息需要替换
            const loadingMessageIndex = chatHistory.value.findIndex(msg => msg.isLoading)

            // 只有AI类型才考虑合并，其他类型都单独显示
            if (parsed.data.type === 'ai') {
              // 忽略 type 为 ai 且 name 为 RunnableSequence 的数据
              if (parsed.data.name === 'RunnableSequence') {
                return
              }
              const lastMessage = chatHistory.value[chatHistory.value.length - 1]
              if (lastMessage && lastMessage.isDebugData && lastMessage.debugData?.type === 'ai') {
                // 如果是连续的AI类型，追加content
                lastMessage.debugData.content += (parsed.data.content || '')
              }
              else {
                // 如果有loading消息，替换它；否则添加新的AI调试数据
                if (loadingMessageIndex !== -1) {
                  chatHistory.value[loadingMessageIndex] = {
                    role: 'assistant',
                    content: '',
                    isDebugData: true,
                    debugData: parsed.data,
                  }
                }
                else {
                  chatHistory.value.push({
                    role: 'assistant',
                    content: '',
                    isDebugData: true,
                    debugData: parsed.data,
                  })
                }
              }
              // 滚动到底部显示最新内容
              await scrollToBottom()
            }
            else {
              // 非AI类型都单独显示
              if (loadingMessageIndex !== -1) {
                chatHistory.value[loadingMessageIndex] = {
                  role: 'assistant',
                  content: '',
                  isDebugData: true,
                  debugData: parsed.data,
                }
              }
              else {
                chatHistory.value.push({
                  role: 'assistant',
                  content: '',
                  isDebugData: true,
                  debugData: parsed.data,
                })
              }
              // 滚动到底部显示最新内容
              await scrollToBottom()
            }
            return
          }
        }
        catch {
          // 不是JSON格式，继续正常处理
        }

        // 更新AI回复内容
        chatHistory.value[assistantMessageIndex].content += content

        // 滚动到底部显示最新内容
        await scrollToBottom()
      },
      () => {
        // 流式数据接收完成
        const msg = chatHistory.value[assistantMessageIndex]
        if (msg) {
          if (!msg.isDebugData && (!msg.content || msg.content.trim() === '')) {
            // 若为空普通消息，则移除，避免空灰卡片
            chatHistory.value.splice(assistantMessageIndex, 1)
          }
          else {
            msg.isLoading = false
          }
        }
        isAIReplying.value = false
      },
      () => {
        // 处理错误
        const msg = chatHistory.value[assistantMessageIndex]
        if (msg) {
          msg.isLoading = false
          msg.content = '调试失败，请检查智能体配置'
        }
        isAIReplying.value = false
      },
      currentReader,
    )
  }
  catch {
    chatHistory.value[assistantMessageIndex].isLoading = false
    chatHistory.value[assistantMessageIndex].content = '发送消息失败，请重试'
    isAIReplying.value = false
  }
}

// 初始化
initThreadId()
</script>

<template>
  <div class="preview-debug-container">
    <!-- 对话记录 -->
    <div ref="chatContainerRef" class="flex-1 overflow-y-auto mb-4">
      <!-- 欢迎界面：当没有聊天记录时显示 -->
      <div v-if="chatHistory.length === 0" class="flex flex-col items-center justify-center h-full text-center">
        <!-- 机器人头像 -->
        <div class="w-16 h-16 mb-4 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="white">
            <path d="M12 2C11.5 2 11 2.19 10.59 2.59L2.59 10.59C1.8 11.37 1.8 12.63 2.59 13.41L10.59 21.41C11.37 22.2 12.63 22.2 13.41 21.41L21.41 13.41C22.2 12.63 22.2 11.37 21.41 10.59L13.41 2.59C13 2.19 12.5 2 12 2M7 7H9V9H7V7M15 7H17V9H15V7M7 15H17V17H7V15M11 11H13V13H11V11Z" />
          </svg>
        </div>

        <!-- 智能体名称 -->
        <h4 class="text-lg font-semibold text-gray-800 mb-2">
          {{ name || '智能体' }}
        </h4>

        <!-- 中文名称 -->
        <p class="text-sm text-gray-600 mb-4">
          {{ zhName || '暂无中文名称' }}
        </p>

        <!-- 开场白 -->
        <div v-if="prologue" class="bg-gray-100 rounded-lg p-4 mb-4 max-w-sm">
          <p class="text-sm text-gray-700 leading-relaxed">
            {{ prologue }}
          </p>
        </div>

        <!-- 引导提问列表 -->
        <div v-if="leadingQuestion && leadingQuestion.length > 0" class="w-full">
          <div class="mb-4 text-left">
            您可以问我：
          </div>
          <div class="space-y-2">
            <div
              v-for="(question, index) in leadingQuestion"
              :key="index"
              class="bg-purple-50 border border-purple-200 rounded-lg p-2 cursor-pointer hover:bg-purple-100 transition-colors text-left w-fit"
              @click="handleLeadingQuestionClick(question)"
            >
              <p class="text-sm text-purple-700">
                {{ question }}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 聊天记录：当有聊天记录时显示 -->
      <div
        v-for="(message, index) in chatHistory"
        :key="index"
        class="flex"
        :class="message.role === 'user' ? 'justify-end my-4' : 'justify-start my-1'"
      >
        <!-- 用户消息 -->
        <div
          v-if="message.role === 'user'"
          class="max-w-[80%] p-3 rounded-lg bg-purple-500 text-white"
        >
          {{ message.content }}
        </div>

        <!-- 助手消息 -->
        <div
          v-else
          class="max-w-[80%]"
        >
          <!-- 显示loading动画 -->
          <div v-if="message.isLoading" class="p-3 rounded-lg bg-gray-100 text-gray-800">
            <div class="flex items-center space-x-1">
              <div class="loading-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
          <!-- 显示调试数据 -->
          <template v-if="message.isDebugData && message.debugData">
            <!-- 工作流节点类型（node, workflow_answer, error, transfer_to）使用 WorkflowDebugCard -->
            <WorkflowDebugCard
              v-if="['node', 'workflow_answer', 'error', 'transfer_to'].includes(message.debugData.type)"
              :event="message.debugData"
            />
            <!-- 其他类型（ai, tool_choose, params_confirm, tool_result）使用 DebugDataDisplay -->
            <DebugDataDisplay
              v-else
              :debug-data="message.debugData"
              @confirm-params="handleParamsConfirm"
            />
          </template>
          <!-- 显示正常内容（仅当非空） -->
          <div v-else-if="message.content && message.content.trim().length > 0" class="p-3 rounded-lg bg-gray-100 text-gray-800">
            {{ message.content }}
          </div>
        </div>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="flex gap-2 items-center">
      <!-- 删除对话记录按钮 -->
      <n-tooltip trigger="hover" placement="top">
        <template #trigger>
          <n-button
            quaternary
            size="small"
            circle
            :disabled="chatHistory.length === 0 || isAIReplying"
            @click="clearChatHistory"
          >
            <template #icon>
              <n-icon :style="{ color: chatHistory.length > 0 ? 'var(--n-color-text)' : 'var(--n-color-text-disabled)' }">
                <icon-park-outline:clear />
              </n-icon>
            </template>
          </n-button>
        </template>
        删除对话记录
      </n-tooltip>

      <n-input
        v-model:value="currentMessage"
        type="textarea"
        placeholder="输入内容..."
        :rows="1"
        :autosize="{ minRows: 1, maxRows: 4 }"
        :disabled="isAIReplying"
        round
        class="chat-input"
        @keydown.enter="handleEnterKey"
      >
        <template #suffix>
          <!-- AI正在回复时显示中断按钮 -->
          <n-button
            v-if="isAIReplying"
            quaternary
            size="small"
            circle
            type="error"
            :disabled="false"
            @click="interruptAIReply"
          >
            <template #icon>
              <n-icon style="color: var(--n-color-error)">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M6 6h12v12H6z" />
                </svg>
              </n-icon>
            </template>
          </n-button>
          <!-- AI未回复时显示发送按钮 -->
          <n-button
            v-else
            quaternary
            size="small"
            circle
            :disabled="!currentMessage.trim()"
            @click="sendMessage"
          >
            <template #icon>
              <n-icon :style="{ color: currentMessage.trim() ? 'var(--n-color-primary)' : 'var(--n-color-text-disabled)' }">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </n-icon>
            </template>
          </n-button>
        </template>
      </n-input>
    </div>
  </div>
</template>

<style scoped>
.preview-debug-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  flex: 1;
}

/* 聊天输入框圆形样式 */
.chat-input :deep(.n-input) {
  border-radius: 24px !important;
}

.chat-input :deep(.n-input__input-el) {
  border-radius: 24px !important;
}

/* Loading动画样式 */
.loading-dots {
  display: flex;
  align-items: center;
  gap: 4px;
}

.loading-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #9ca3af;
  animation: loading-dots 1.4s infinite ease-in-out both;
}

.loading-dots span:nth-child(1) {
  animation-delay: -0.32s;
}

.loading-dots span:nth-child(2) {
  animation-delay: -0.16s;
}

.loading-dots span:nth-child(3) {
  animation-delay: 0s;
}

@keyframes loading-dots {
  0%, 80%, 100% {
    background-color: #e5e7eb;
    transform: scale(0.8);
  }
  40% {
    background-color: #6b7280;
    transform: scale(1);
  }
}

/* 中断按钮样式 - 确保可点击状态明显 */
.chat-input :deep(.n-input__suffix) .n-button[type="error"] {
  cursor: pointer;
  opacity: 1;
}

.chat-input :deep(.n-input__suffix) .n-button[type="error"]:hover {
  opacity: 0.8;
  transform: scale(1.05);
  transition: all 0.2s ease;
}
</style>
