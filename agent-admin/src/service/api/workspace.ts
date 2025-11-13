import { request } from '../http'

// 获取登录用户工作空间列表
export function getWorkspacesApi() {
  return request.Get<Service.ResponseResult<Entity.Workspace[]>>('/workspaces')
}

// 移除工作空间
export function removeWorkspaceApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/workspaces/${id}`)
}

// 创建工作空间
export function createWorkspaceApi(data: Entity.Workspace) {
  return request.Post<Service.ResponseResult<Entity.Workspace>>('/workspaces', data)
}

// 编辑工作空间
export function modifyWorkspaceApi(data: Entity.Workspace) {
  return request.Put<Service.ResponseResult<Entity.Workspace>>(`/workspaces/${data.id}`, data)
}

// 获取某一工作空间详情
export function getWorkspaceApi(id: string) {
  return request.Get<Service.ResponseResult<Entity.Workspace>>(`/workspaces/${id}`)
}

// 获取某一工作空间下成员列表
export function getWorkspaceMembersApi(id: string) {
  return request.Get<Service.ResponseResult<Entity.User[]>>(`/workspace-users/workspace/${id}`)
}

// 搜索用户
export function searchUsersApi(keyword: string) {
  return request.Get<Service.ResponseResult<Entity.User[]>>(`/users?name=${keyword}`)
}

// 添加工作空间成员
export function addWorkspaceMemberApi(data: {
  workspaceId: string
  userId: string
  role: string
}) {
  return request.Post<Service.ResponseResult<any>>('/workspace-users', data)
}

// 移除工作空间成员
export function removeWorkspaceMemberApi(workspaceId: string, userId: string) {
  return request.Delete<Service.ResponseResult<any>>(`/workspace-users/${workspaceId}/${userId}`)
}
