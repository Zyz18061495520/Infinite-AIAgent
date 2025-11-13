import { request } from '../http'

// 生成 API Key（只获取字符串，不落库）
export function generateApiKeyApi() {
  return request.Get<Service.ResponseResult<string>>('/api-keys/generate-key')
}

// 查询某个版本下的 API Keys（by agent + version）
export function getApiKeysApi(params: { agent_id: string; version: string }) {
  const query = new URLSearchParams()
  query.append('agent_id', params.agent_id)
  query.append('version', params.version)
  return request.Get<Service.ResponseResult<any>>(`/api-keys/by-agent-version?${query.toString()}`)
}

// 创建 API Key（发布版本）
export function createApiKeyApi(data: {
  api_key: string
  agent_id: string
  version: string
  effective_time: string
  expire_time: string
  remark?: string
}) {
  return request.Post<Service.ResponseResult<any>>('/api-keys', data)
}


