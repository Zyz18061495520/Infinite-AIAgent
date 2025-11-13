/// <reference path="../global.d.ts"/>

namespace Entity {
  interface Model {
    createTime?: number | null
    creatorId?: string | null
    id?: string
    updateTime?: number | null
    provider: 'deepseek' | 'openai' | 'qwen' | 'ollama'
    name: string
    modelName: string
    apiKey: string
    baseUrl: string
    topP: number
    maxTokens: number
    temperature: number
    enabled?: boolean
    [property: string]: any
  }
}
