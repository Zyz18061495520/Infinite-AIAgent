/// <reference path="../global.d.ts"/>

namespace Entity {
  interface Agent {
    id?: string
    workspace_id: string
    name: string
    zh_name: string
    description: string
    agent_type: 'single' | 'workflow' | 'supervisor'
    prologue: string
    leading_question: string[]
    self_prompt: string
    model: {
      id: string
      provider: string
      model_name: string
      api_key: string
      base_url: string
      top_p: number
      max_tokens: number
      temperature: number
    }
    tool_list: any[]
    rag_list: any[]
    faq_list: any[]
    edges: any
    nodes: any
    agents: any
    extra_json: any
    createTime?: number
    updateTime?: number
    enabled?: boolean
  }
}

