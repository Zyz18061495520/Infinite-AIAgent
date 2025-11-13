/// <reference path="../global.d.ts"/>

namespace Api {
  namespace Login {
    interface Info {
      token: string
      user: Entity.User
      [property: string]: any
    }
  }
}
