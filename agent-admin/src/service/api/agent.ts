import { request } from '../http'

// 创建智能体
export function createAgentApi(data: {
  workspace_id: string
  name: string
  zh_name: string
  description: string
  agent_type: 'single' | 'workflow' | 'supervisor'
  prologue: string
  leading_question: string[]
  self_prompt: string
  model: {
    id: string
    provider: string
    model_name: string
    api_key: string
    base_url: string
    top_p: number
    max_tokens: number
    temperature: number
  }
  tool_list: any[]
  rag_list: any[]
  faq_list: any[]
  variables: Array<{ name: string; description: string; value: string }>
  edges: any
  nodes: any
  agents: any
  extra_json: any
}) {
  return request.Post<Service.ResponseResult<any>>('/agent-graphs', data)
}

// 更新智能体
export function updateAgentApi(id: string, data: Partial<{
  name: string
  zh_name: string
  description: string
  agent_type: 'single' | 'workflow' | 'supervisor'
  prologue: string
  leading_question: string[]
  self_prompt: string
  model: any
  tool_list: any[]
  rag_list: any[]
  faq_list: any[]
  variables: Array<{ name: string; description: string; value: string }>
  edges: any
  nodes: any
  agents: any
  extra_json: any
}>) {
  return request.Put<Service.ResponseResult<any>>(`/agent-graphs/${id}`, data)
}

// 获取智能体详情
export function getAgentApi(id: string) {
  return request.Get<Service.ResponseResult<any>>(`/agent-graphs/${id}`)
}

// 分页获取智能体列表
export function getAgentsPageApi(params: {
  pageNum: number
  pageSize: number
  name?: string
  agent_type?: string
  isPublish?: boolean
}) {
  const query = new URLSearchParams()
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  if (params.name) {
    query.append('name', params.name)
  }
  if (params.agent_type) {
    query.append('agent_type', params.agent_type)
  }
  if (params.isPublish !== undefined) {
    query.append('is_publish', String(params.isPublish))
  }
  return request.Get<Service.ResponseResult<any>>(`/agent-graphs/page?${query.toString()}`)
}

// 删除智能体
export function deleteAgentApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/agent-graphs/${id}`)
}

// 发布/取消发布智能体
export function toggleAgentPublishApi(id: string, isPublish: boolean) {
  return request.Put<Service.ResponseResult<any>>(`/agent-graphs/${id}/publish?is_publish=${String(isPublish)}&version=1.0`)
}

// 发布/取消发布（请求体传参：is_publish, version）
export function publishAgentApi(id: string, data: { is_publish: boolean; version: string }) {
  const query = new URLSearchParams()
  query.append('is_publish', String(data.is_publish))
  if (data.version)
    query.append('version', data.version)
  return request.Put<Service.ResponseResult<any>>(`/agent-graphs/${id}/publish?${query.toString()}`)
}

// 获取智能体发布版本列表
export function getAgentReleasesApi(id: string) {
  return request.Get<Service.ResponseResult<any>>(`/agent-releases/${id}`)
}

// 发布到应用商店
export function publishToAppstoreApi(data: { agentId: string; version: string }) {
  return request.Post<Service.ResponseResult<any>>('/appstore-agents', data)
}

// 调试智能体接口（支持SSE流式数据）
export async function debugAgentApi(data: {
  type: 'single' | 'workflow' | 'supervisor'
  question: string
  runable_config: {
    thread_id: string
  }
  user_inputs: any
  data: any
}) {
  const { createSSERequest } = await import('@/utils/sse')

  return createSSERequest({
    url: '/agent/debug',
    data,
  })
}
