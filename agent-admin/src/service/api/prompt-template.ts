import { request } from '../http'

// 分页获取提示词模板列表
export function getPromptTemplatesPageApi(params: {
  pageNum: number
  pageSize: number
}) {
  const query = new URLSearchParams()
  query.append('pageNum', String(params.pageNum))
  query.append('pageSize', String(params.pageSize))
  return request.Get<Service.ResponseResult<{
    current: number
    pages: number
    records: Array<{
      id: string
      title: string
      content: string
      createTime: number
      updateTime: number
    }>
    size: number
    total: number
  }>>(`/prompt-templates/page?${query.toString()}`)
}

// 创建提示词模板
export function createPromptTemplateApi(data: {
  title: string
  content: string
}) {
  return request.Post<Service.ResponseResult<any>>('/prompt-templates', data)
}

