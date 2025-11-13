import { useAuthStore } from '@/store/auth'
import { useWorkspaceStore } from '@/store/workspace'

// API基础URL
const API_BASE_URL = 'http://58.222.41.69:8090/api'

/**
 * SSE请求配置
 */
interface SSEConfig {
  url: string
  data?: any
  headers?: Record<string, string>
  onMessage?: (data: any) => void
  onError?: (error: Error) => void
  onComplete?: () => void
}

/**
 * 创建SSE请求
 * @param config SSE配置
 * @returns Promise<Response>
 */
export async function createSSERequest(config: SSEConfig): Promise<Response> {
  const { url, data, headers = {}, onError } = config

  // 获取认证信息
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()

  // 构建请求头
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...headers,
  }

  // 添加认证token
  if (authStore.token) {
    requestHeaders.Authorization = `Bearer ${authStore.token}`
  }

  // 添加工作空间ID
  if (workspaceStore.workspaceId) {
    requestHeaders['Workspace-Id'] = workspaceStore.workspaceId
  }

  try {
    // 构建完整的URL
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`

    // 直接发送JSON数据
    let body: string | undefined
    if (data) {
      body = JSON.stringify(data)
    }

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: requestHeaders,
      body,
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type')
    console.warn('Response Content-Type:', contentType)
    console.warn('Response Status:', response.status)
    const headersObj: Record<string, string> = {}
    response.headers.forEach((value, key) => {
      headersObj[key] = value
    })
    console.warn('Response Headers:', headersObj)

    // 放宽响应类型检查，支持更多格式
    if (contentType && (
      contentType.includes('text/event-stream')
      || contentType.includes('text/plain')
      || contentType.includes('application/json')
      || contentType.includes('application/octet-stream')
    )) {
      return response
    }

    // 如果Content-Type不匹配，但仍然尝试处理
    console.warn('Unexpected Content-Type:', contentType, 'but continuing...')
    return response
  }
  catch (error) {
    onError?.(error as Error)
    throw error
  }
}

/**
 * 无认证版本的SSE请求（不携带登录token与Workspace-Id）
 */
export async function createPublicSSERequest(config: SSEConfig): Promise<Response> {
  const { url, data, headers = {}, onError } = config
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Accept': 'text/event-stream',
    'Cache-Control': 'no-cache',
    ...headers,
  }

  try {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`
    const body = data ? JSON.stringify(data) : undefined
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: requestHeaders,
      body,
    })
    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)
    return response
  }
  catch (error) {
    onError?.(error as Error)
    throw error
  }
}

/**
 * 调试数据类型定义（统一工作流和智能体）
 */
export interface DebugData {
  type: 'ai' | 'tool_choose' | 'params_confirm' | 'tool_result' | 'transfer_to' | 'node' | 'workflow_answer' | 'error' | 'plan' | 'act'
  id?: string
  name?: string
  content?: string | null
  imgdata?: any
  tool_calls?: any[] | null
  tool_output?: string | null
  documents?: any
  next?: any
  // 工作流相关字段
  node_id?: string
  node_name?: string
  node_type?: string
  start_time?: string
  end_time?: string
  input?: any
  output?: any
  metadata?: {
    thread_id?: string
    transaction_id?: string
  }
}

/**
 * 处理SSE流式数据
 * @param response Response对象
 * @param onMessage 消息回调
 * @param onComplete 完成回调
 * @param onError 错误回调
 * @param readerRef 可选的reader引用，用于中断流
 */
export async function handleSSEStream(
  response: Response,
  onMessage: (content: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void,
  readerRef?: { value: ReadableStreamDefaultReader<Uint8Array> | null },
) {
  const reader = response.body?.getReader()
  if (!reader) {
    const error = new Error('无法读取响应流')
    onError?.(error)
    throw error
  }

  // 如果提供了readerRef，保存reader引用
  if (readerRef) {
    readerRef.value = reader
  }

  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onComplete?.()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      buffer += chunk

      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.trim() === '')
          continue

        // 处理SSE格式
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onComplete?.()
            return
          }

          try {
            const parsed = JSON.parse(data)
            // 统一处理所有调试数据类型（智能体和工作流）
            if (parsed.type && ['ai', 'tool_choose', 'params_confirm', 'tool_result', 'transfer_to', 'node', 'workflow_answer', 'error', 'plan', 'act'].includes(parsed.type)) {
              // 将所有调试数据统一作为 debug_data 传递给onMessage
              onMessage(JSON.stringify({ type: 'debug_data', data: parsed }))
            }
            else if (parsed.content) {
              onMessage(parsed.content)
            }
          }
          catch {
            // 忽略解析错误，继续处理下一行
            console.warn('SSE数据解析失败:', data)
          }
        }
        // 处理普通JSON格式（非SSE）
        else if (line.startsWith('{') || line.startsWith('[')) {
          try {
            const parsed = JSON.parse(line)
            if (parsed.content) {
              onMessage(parsed.content)
            }
            else if (typeof parsed === 'string') {
              onMessage(parsed)
            }
          }
          catch {
            // 如果不是JSON，直接作为文本处理
            onMessage(line)
          }
        }
        // 处理纯文本
        else {
          onMessage(line)
        }
      }
    }
  }
  catch (error) {
    console.error('SSE流处理错误:', error)
    onError?.(error as Error)
    throw error
  }
  finally {
    reader.releaseLock()
    // 清空readerRef
    if (readerRef) {
      readerRef.value = null
    }
  }
}
