import { request } from '../http'

// 分页获取 MCP 列表
export function getMcpServersPageApi(params: {
  pageNum: number
  pageSize: number
  name?: string
  type?: 'streamable_http' | 'sse'
}) {
  const query = new URLSearchParams()
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  if (params.name)
    query.append('name', params.name)
  if (params.type)
    query.append('type', params.type)
  return request.Get<Service.ResponseResult<Service.PageResult<any>>>(`/mcp-servers/page?${query.toString()}`)
}

// 创建 MCP
export function createMcpServerApi(data: {
  name: string
  description: string
  url: string
  type: 'streamable_http' | 'sse'
  authorization?: string
}) {
  return request.Post<Service.ResponseResult<any>>('/mcp-servers', data)
}

// 更新 MCP
export function updateMcpServerApi(id: string, data: {
  name: string
  description: string
  url: string
  type: 'streamable_http' | 'sse'
  authorization?: string
}) {
  return request.Put<Service.ResponseResult<any>>(`/mcp-servers/${id}`, data)
}

// 删除 MCP
export function deleteMcpServerApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/mcp-servers/${id}`)
}

// 获取 MCP 工具列表
export function getMcpToolsApi(data: {
  type: 'streamable_http' | 'sse'
  url: string
}) {
  return request.Post<Service.ResponseResult<any[]>>('/mcp/tools', data)
}


