import { request } from '../http'

// 获取FAQ集合列表
export function getFaqCollectionsApi() {
  return request.Get<Service.ResponseResult<Entity.FaqCollection[]>>('/faq-collections')
}

// 创建FAQ集合
export function createFaqCollectionApi(data: { name?: string; collectionName: string }) {
  return request.Post<Service.ResponseResult<Entity.FaqCollection>>('/faq-collections', data)
}

// 修改FAQ集合
export function updateFaqCollectionApi(id: string, data: { name?: string; collectionName: string }) {
  return request.Put<Service.ResponseResult<any>>(`/faq-collections/${id}`, data)
}

// 删除FAQ集合
export function deleteFaqCollectionApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/faq-collections/${id}`)
}

// 分页获取FAQ列表
export function getFaqsPageApi(params: {
  collectionId: string
  pageNum: number
  pageSize: number
  question?: string
}) {
  const queryParams = new URLSearchParams()
  queryParams.append('collectionId', params.collectionId)
  queryParams.append('pageNum', params.pageNum.toString())
  queryParams.append('pageSize', params.pageSize.toString())
  if (params.question) {
    queryParams.append('question', params.question)
  }
  return request.Get<Service.ResponseResult<Service.PageResult<Entity.Faq>>>(`/faqs/page?${queryParams.toString()}`)
}

// 创建FAQ
export function createFaqApi(data: {
  question: string
  answer: string
  collectionId: string
}) {
  return request.Post<Service.ResponseResult<Entity.Faq>>('/faqs', data)
}

// 修改FAQ
export function updateFaqApi(id: string, data: {
  question: string
  answer: string
}) {
  return request.Put<Service.ResponseResult<any>>(`/faqs/${id}`, data)
}

// 删除FAQ
export function deleteFaqApi(id: string) {
  return request.Delete<Service.ResponseResult<any>>(`/faqs/${id}`)
}

// FAQ 问答测试
export function faqQaApi(body: {
  question: string
  threshold: number
  topK: number
  collectionId: string
  uploadIds: string[]
}) {
  return request.Post<Service.ResponseResult<any>>('/faqs/qa', body)
}
