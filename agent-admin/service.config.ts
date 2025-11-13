/** 不同请求服务的环境配置 */
export const serviceConfig: Record<ServiceEnvType, Record<string, string>> = {
  dev: {
    url: 'http://xx.xx.xx.xx:8090/api',
  },
  production: {
    url: 'http://xx.xx.xx.xx:8090/api',
  },
}
