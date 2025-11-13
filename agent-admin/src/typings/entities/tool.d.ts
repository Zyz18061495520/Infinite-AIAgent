/// <reference path="../global.d.ts"/>

namespace Entity {
  interface Tool {
    createTime?: number | null
    creatorId?: string | null
    id?: string
    toolType: 'http' | 'sql'
    name: string
    description: string
    isPublish?: boolean
    inputParams: ToolInputParam[]
    config: ToolHttpConfig | ToolSqlConfig
  }

  interface ToolInputParam {
    name: string
    location: 'query' | 'body' | 'path'
    type: 'string' | 'integer' | 'float' | 'bool' | 'object' | 'array'
    description: string
    required: boolean
    children: ToolInputParam[]
  }

  interface ToolHttpConfig {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE'
    url: string
    headers: Record<string, string>
  }

  interface ToolSqlConfig {
    host: string
    port: number
    database: string
    user: string
    password: string
    sql: string
  }
}
