import { request } from '../http'
import { sha256 } from 'js-sha256'

interface Ilogin {
  username: string
  password: string
}

export function fetchLogin(data: Ilogin) {
  data.password = sha256(data.password)
  const methodInstance = request.Post<Service.ResponseResult<Api.Login.Info>>('/users/login', data)
  methodInstance.meta = {
    authRole: null,
  }
  return methodInstance
}

export function fetchUpdateToken(data: any) {
  const method = request.Post<Service.ResponseResult<Api.Login.Info>>('/updateToken', data)
  method.meta = {
    authRole: 'refreshToken',
  }
  return method
}

export function fetchUserRoutes(params: { id: number }) {
  return request.Get<Service.ResponseResult<AppRoute.RowRoute[]>>('/getUserRoutes', { params })
}

interface IRegister {
  username: string
  password: string
  email: string
}

export function registerUserApi(data: IRegister) {
  data.password = sha256(data.password)
  return request.Post<Service.ResponseResult<Entity.User>>('/users/register', data)
}

interface IChangePassword {
  oldPassword: string
  newPassword: string
}

export function changePasswordApi(data: IChangePassword) {
  const requestData = {
    oldPassword: sha256(data.oldPassword),
    newPassword: sha256(data.newPassword),
  }
  return request.Post<Service.ResponseResult<any>>('/users/change-password', requestData)
}

interface IGetUsersPageParams {
  pageNum: number
  pageSize: number
  name?: string
  email?: string
}

export function getUsersPageApi(params: IGetUsersPageParams) {
  return request.Get<Service.ResponseResult<{
    list: Entity.User[]
    pagination: {
      total: number
      pageNum: number
      pageSize: number
    }
  }>>('/users/page', { params })
}

export function resetUserPasswordApi(id: string, newPassword: string) {
  const hashed = sha256(newPassword)
  return request.Post<Service.ResponseResult<any>>(`/users/${id}/reset-password?newPassword=${hashed}`, {})
}

export function setUserEnableApi(id: string, enable: boolean) {
  return request.Post<Service.ResponseResult<any>>(`/users/${id}/enable?enable=${enable}`, {})
}
