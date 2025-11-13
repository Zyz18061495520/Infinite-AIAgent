import { getWorkspacesApi } from '@/service'
import { local } from '@/utils'

interface WorkspaceStore {
  workspaces: Entity.Workspace[]
  workspaceId: string
}
export const useWorkspaceStore = defineStore('workspace-store', {
  state: (): WorkspaceStore => {
    return {
      workspaceId: local.get('workspaceId') || '',
      workspaces: [],
    }
  },
  actions: {
    async getWorkspaces() {
      try {
        const { isSuccess, data } = await getWorkspacesApi()
        if (!isSuccess)
          return
        const list = data || []
        list.forEach((i) => {
          i.value = i.id
        })
        this.workspaces = data || []
        if (this.workspaces.length > 0 && !this.workspaceId) {
          this.workspaceId = this.workspaces[0].id as string
          local.set('workspaceId', this.workspaceId)
        }
      }
      catch (e) {
        console.warn('[getWorkspaces Error]:', e)
      }
    },
    changeWorkspace(workspace: Entity.Workspace) {
      this.workspaceId = workspace.id as string
      local.set('workspaceId', this.workspaceId)
    },
    clearWorkspace() {
      this.workspaceId = ''
      this.workspaces = []
      local.remove('workspaceId')
    },
  },
})
