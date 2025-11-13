/// <reference path="../global.d.ts"/>

namespace Entity {
  interface Workspace {
    createTime?: number | null
    creatorId?: string | null
    description: string
    id?: string
    logo: string
    name: string
    status: number
    updateTime?: number | null
    [property: string]: any
  }
}
