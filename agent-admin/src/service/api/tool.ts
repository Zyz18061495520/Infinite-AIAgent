import { request } from '../http'

// 分页获取工具列表
export function getToolsPageApi(params: {
  toolType?: string
  isPublish?: boolean
  pageNum: number
  pageSize: number
  name?: string
}) {
  const query = new URLSearchParams()
  if (params.toolType)
    query.append('toolType', params.toolType)
  if (typeof params.isPublish === 'boolean')
    query.append('isPublish', String(params.isPublish))
  if (params.name)
    query.append('name', params.name)
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  return request.Get<Service.ResponseResult<Service.PageResult<Entity.Tool>>>(`/tools/page?${query.toString()}`)
}

// 新增工具
export function createToolApi(data: Entity.Tool) {
  return request.Post<Service.ResponseResult<any>>('/tools', data)
}

// 更新工具
export function updateToolApi(id: string, data: Partial<Entity.Tool>) {
  return request.Put<Service.ResponseResult<any>>(`/tools/${id}`, data)
}

// 删除工具
export function deleteToolApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/tools/${id}`)
}

// 启用/停用工具
export function toggleToolPublishApi(id: string, isPublish: boolean) {
  return request.Put<Service.ResponseResult<any>>(`/tools/${id}/publish?isPublish=${String(isPublish)}`)
}

// 发布到应用商店
export function publishToAppstoreApi(toolId: string) {
  return request.Post<Service.ResponseResult<any>>(`/appstore-tools/${toolId}/publish`)
}

// 测试工具
export function testToolApi(data: {
  name: string
  description: string
  toolType: 'http' | 'sql'
  config: any
  inputParams: any[]
  workspaceId: string
}) {
  return request.Post<Service.ResponseResult<any>>('/tools/test', data)
}

