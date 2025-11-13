import { local } from '@/utils'
import { createAlova } from 'alova'
import { createServerTokenAuthentication } from 'alova/client'
import adapterFetch from 'alova/fetch'
import VueHook from 'alova/vue'
import type { VueHookType } from 'alova/vue'
import {
  DEFAULT_ALOVA_OPTIONS,
  DEFAULT_BACKEND_OPTIONS,
} from './config'
import {
  handleBusinessError,
  handleRefreshToken,
  handleResponseError,
  handleServiceResult,
  handleLoginExpired,
} from './handle'
import { useWorkspaceStore } from '@/store'

const { onAuthRequired, onResponseRefreshToken } = createServerTokenAuthentication<VueHookType>({
  // 服务端判定token过期
  refreshTokenOnSuccess: {
    // 当服务端返回401或403时，表示token过期
    isExpired: async (response, method) => {
      const isExpired = method.meta && method.meta.isExpired
      
      // 403状态码只在response.status中，不在响应体的code字段中
      if (response.status === 403) {
        return !isExpired
      }
      
      // 对于401状态码，需要检查响应体的code字段
      if (response.status === 401) {
        try {
          const res = await response.clone().json()
          return (res.code === 401) && !isExpired
        } catch {
          // 如果JSON解析失败，只检查status
          return !isExpired
        }
      }
      
      return false
    },

    // 当token过期时触发，在此函数中触发刷新token
    handler: async (response, method) => {
      // 此处采取限制，防止过期请求无限循环重发
      if (!method.meta)
        method.meta = { isExpired: true }
      else
        method.meta.isExpired = true

      // 403状态码直接跳转到登录页，不尝试刷新token
      if (response.status === 403) {
        await handleLoginExpired()
        return
      }

      await handleRefreshToken()
    },
  },
  // 添加token到请求头
  assignToken: (method) => {
    method.config.headers.Authorization = `Bearer ${local.get('accessToken')}`
  },
})

// docs path of alova.js https://alova.js.org/
export function createAlovaInstance(
  alovaConfig: Service.AlovaConfig,
  backendConfig?: Service.BackendConfig,
) {
  const _backendConfig = { ...DEFAULT_BACKEND_OPTIONS, ...backendConfig }
  const _alovaConfig = { ...DEFAULT_ALOVA_OPTIONS, ...alovaConfig }

  return createAlova({
    statesHook: VueHook,
    requestAdapter: adapterFetch(),
    cacheFor: null,
    baseURL: _alovaConfig.baseURL,
    timeout: _alovaConfig.timeout,

    beforeRequest: onAuthRequired((method) => {
      // 注入 Workspace-Id 请求头
      const workspaceStore = useWorkspaceStore()
      try {
        const workspaceId = workspaceStore.workspaceId
        if (workspaceId)
          method.config.headers['Workspace-Id'] = workspaceId
      }
      catch {}
      if (method.meta?.isFormPost) {
        method.config.headers['Content-Type'] = 'application/x-www-form-urlencoded'
        method.data = new URLSearchParams(method.data as URLSearchParams).toString()
      }
      alovaConfig.beforeRequest?.(method)
    }),
    responded: onResponseRefreshToken({
      // 请求成功的拦截器
      onSuccess: async (response, method) => {
        const { status } = response

        if (status === 200) {
          // SSE流式数据
          if (method.meta?.isSSE) {
            return response
          }

          // 返回blob数据
          if (method.meta?.isBlob)
            return response.blob()

          // 返回json数据
          const apiData = await response.json()
          // 请求成功
          if (apiData[_backendConfig.codeKey] === _backendConfig.successCode)
            return handleServiceResult(apiData)

          // 业务请求失败
          const errorResult = handleBusinessError(apiData, _backendConfig)
          return handleServiceResult(errorResult, false)
        }
        
        // 403状态码直接处理，不尝试解析JSON
        if (status === 403) {
          await handleLoginExpired()
          const errorResult = handleResponseError(response)
          return handleServiceResult(errorResult, false)
        }
        
        // 其他接口请求失败
        const errorResult = handleResponseError(response)
        return handleServiceResult(errorResult, false)
      },
      onError: (error, method) => {
        const tip = `[${method.type}] - [${method.url}] - ${error.message}`
        window.$message?.warning(tip)
      },

      onComplete: async (_method) => {
        // 处理请求完成逻辑
      },
    }),
  })
}
