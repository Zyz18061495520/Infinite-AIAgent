import { createPublicSSERequest } from '@/utils/sse'

const API_BASE_URL = 'http://58.222.41.69:8090/api'

export async function getReleaseDetailPublic(agentId: string, version: string, apiKey: string) {
  const url = `${API_BASE_URL}/agent-releases/${encodeURIComponent(agentId)}/${encodeURIComponent(version)}`
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
  if (!res.ok)
    throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function runAgentPublic(data: any, apiKey: string) {
  return createPublicSSERequest({
    url: '/agent/run',
    data,
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  })
}


