import { request } from '../http'

// 获取模型列表（支持 provider 与 enabled 过滤）
export function getModelsApi(params?: { provider?: string, enabled?: boolean }) {
  if (!params || (params.provider === undefined && params.enabled === undefined)) {
    return request.Get<Service.ResponseResult<Entity.Model[]>>('/models')
  }
  const queryParams = new URLSearchParams()
  if (params.provider !== undefined && params.provider !== '') {
    queryParams.append('provider', String(params.provider))
  }
  if (params.enabled !== undefined) {
    queryParams.append('enabled', String(params.enabled))
  }
  const qs = queryParams.toString()
  const url = qs ? `/models?${qs}` : '/models'
  return request.Get<Service.ResponseResult<Entity.Model[]>>(url)
}

// 新增模型
export function createModelApi(data: {
  provider: Entity.Model['provider']
  modelName: string
  apiKey: string
  baseUrl: string
  topP: number
  maxTokens: number
  temperature: number
}) {
  return request.Post<Service.ResponseResult<Entity.Model>>('/models', data)
}

// 更新模型（包含启停用）
export function updateModelApi(id: string, data: Partial<{
  provider: Entity.Model['provider']
  modelName: string
  apiKey: string
  baseUrl: string
  topP: number
  maxTokens: number
  temperature: number
  enabled: boolean
}>) {
  return request.Put<Service.ResponseResult<any>>(`/models/${id}`, data)
}

// 启用/停用模型
export function toggleModelEnabledApi(id: string, enabled: boolean) {
  const url = `/models/${id}/enabled?enabled=${String(enabled)}`
  return request.Put<Service.ResponseResult<any>>(url)
}

// 删除模型
export function deleteModelApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/models/${id}`)
}

// 测试模型可用性
export function testModelApi(body: Record<string, any>) {
  return request.Post<Service.ResponseResult<any>>('/models/test-model', body)
}
