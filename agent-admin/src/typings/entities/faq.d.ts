/// <reference path="../global.d.ts"/>

namespace Entity {
  // FAQ集合类型
  interface FaqCollection {
    id: string
    // 新增唯一标识名，仅允许字母、数字、连字符和下划线
    name?: string
    collectionName: string
    userId: string
    workspaceId: string
    createTime: number
    updateTime: number
  }

  // FAQ类型
  interface Faq {
    id: string
    question: string
    answer: string
    collectionId: string
    createTime: number
    updateTime: number
  }
}
