import { request } from '../http'

// 应用商店-智能体分页
export function getAppstoreAgentsPageApi(params: {
  pageNum: number
  pageSize: number
  name?: string
  agentType?: string
}) {
  const query = new URLSearchParams()
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  if (params.name)
    query.append('name', params.name)
  if (params.agentType)
    query.append('agentType', params.agentType)
  return request.Get<Service.ResponseResult<any>>(`/appstore-agents/page?${query.toString()}`)
}

// 应用商店-工具分页
export function getAppstoreToolsPageApi(params: {
  pageNum: number
  pageSize: number
  name?: string
  toolType?: string
}) {
  const query = new URLSearchParams()
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  if (params.name)
    query.append('name', params.name)
  if (params.toolType)
    query.append('toolType', params.toolType)
  return request.Get<Service.ResponseResult<any>>(`/appstore-tools/page?${query.toString()}`)
}

// 复制应用商店智能体到工作空间（Workspace-Id 由请求头注入）
export function copyAppstoreAgentToWorkspace(agentId: string) {
  return request.Post<Service.ResponseResult<any>>(`/appstore-agents/copy-to-workspace/${agentId}`, {})
}

// 复制应用商店工具到工作空间（Workspace-Id 由请求头注入）
export function copyAppstoreToolToWorkspace(toolId: string) {
  return request.Post<Service.ResponseResult<any>>(`/appstore-tools/copy-to-workspace/${toolId}`, {})
}


