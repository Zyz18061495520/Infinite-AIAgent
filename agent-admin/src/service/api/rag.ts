import { request } from '../http'

// 分页查询RAG列表
export function getRagListApi(params: {
  page_num: number
  page_size: number
  name?: string
}) {
  const query = new URLSearchParams()
  query.append('page_num', String(params.page_num))
  query.append('page_size', String(params.page_size))
  if (params.name) {
    query.append('name', params.name)
  }
  return request.Get<Service.ResponseResult<Service.PageResult<any>>>(`/rag/list?${query.toString()}`)
}

// 新增（上传文件）
export function uploadRagApi(data: { name: string; description?: string; file: File }) {
  const form = new FormData()
  form.append('file', data.file)
  // name、description 按要求作为查询参数传入
  const query = new URLSearchParams()
  query.append('name', data.name)
  if (data.description)
    query.append('description', data.description)
  return request.Post<Service.ResponseResult<any>>(`/rag/upload?${query.toString()}`, form)
}

// 更新基本信息
export function updateRagApi(id: string, data: { name: string; description?: string }) {
  return request.Put<Service.ResponseResult<any>>(`/rag/${id}`, data)
}

// 删除
export function deleteRagApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/rag/${id}`)
}

// 召回测试
export function recallRagApi(body: {
  uploadIds: string[]
  query: string
  topK: number
  strategy: 'hybrid_search'
}) {
  return request.Post<Service.ResponseResult<any>>('/rag/recall', body)
}


