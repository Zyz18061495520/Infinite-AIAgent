import { request } from '../http'

// 分页获取数据库列表
export function getDatabasesPageApi(params: { pageNum: number, pageSize: number }) {
  const queryParams = new URLSearchParams()
  queryParams.append('pageNum', String(params.pageNum))
  queryParams.append('pageSize', String(params.pageSize))
  return request.Get<Service.ResponseResult<Service.PageResult<any>>>(`/databases/page?${queryParams.toString()}`)
}

// 新增数据库
export function createDatabaseApi(data: {
  dbType: string
  dbHost: string
  dbPort: number
  dbDatabase: string
  dbUser: string
  dbPassword: string
}) {
  return request.Post<Service.ResponseResult<any>>('/databases', data)
}

// 更新数据库
export function updateDatabaseApi(id: string, data: Partial<{
  dbType: string
  dbHost: string
  dbPort: number
  dbDatabase: string
  dbUser: string
  dbPassword: string
}>) {
  return request.Put<Service.ResponseResult<any>>(`/databases/${id}`, data)
}

// 删除数据库
export function deleteDatabaseApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/databases/${id}`)
}

// 测试数据库连接
export function testDatabaseConnectionApi(data: {
  dbType: string
  dbHost: string
  dbPort: number
  dbDatabase: string
  dbUser: string
  dbPassword: string
}) {
  return request.Post<Service.ResponseResult<any>>('/databases/test-connection', data)
}


