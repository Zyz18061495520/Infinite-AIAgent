/// <reference path="../global.d.ts"/>

/** 用户数据库表字段 */
namespace Entity {
  interface User {
    createTime: null
    email: string
    id: string
    isEnable: boolean
    isSuperuser: boolean
    password: null
    updateTime: null
    username: string
    [property: string]: any
  }
}
