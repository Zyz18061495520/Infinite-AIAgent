<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue'
import * as d3 from 'd3'
import AgentSelectionModal from './AgentSelectionModal.vue'

interface Agent {
  id: string
  name: string
  zh_name: string
  description?: string
  agent_type?: string
}

interface OrgNode {
  id: string
  name: string
  zh_name: string
  description?: string
  agent_type?: string
  children?: OrgNode[]
}

const props = defineProps<{
  currentAgent: {
    name: string
    zh_name: string
    description?: string
  }
  selectedAgents?: Agent[]
}>()

const emit = defineEmits<{
  'update:selectedAgents': [agents: Agent[]]
}>()

const svgRef = ref<SVGSVGElement>()
const chartContainerRef = ref<HTMLDivElement>()
const selectedAgents = ref<Agent[]>(props.selectedAgents || [])
const agentSelectionModalRef = ref<InstanceType<typeof AgentSelectionModal> | null>(null)

// 添加子节点
function addChildAgent() {
  const excludeIds = selectedAgents.value.map(a => a.id)
  agentSelectionModalRef.value?.openModal([], excludeIds)
}

// 处理智能体选择确认
function handleAgentSelectionConfirm(agents: Agent[]) {
  // 将新选择的智能体添加到列表中（避免重复）
  agents.forEach((agent) => {
    if (!selectedAgents.value.some(a => a.id === agent.id)) {
      selectedAgents.value.push(agent)
    }
  })
  emit('update:selectedAgents', selectedAgents.value)
  renderChart()
}

// 删除子节点
function removeChildAgent(agentId: string) {
  const index = selectedAgents.value.findIndex(a => a.id === agentId)
  if (index > -1) {
    selectedAgents.value.splice(index, 1)
    emit('update:selectedAgents', selectedAgents.value)
    renderChart()
  }
}

// 构建组织架构数据
function buildOrgData(): OrgNode {
  return {
    id: 'supervisor',
    name: props.currentAgent.name,
    zh_name: props.currentAgent.zh_name,
    description: props.currentAgent.description,
    agent_type: 'supervisor',
    children: selectedAgents.value.map(agent => ({
      id: agent.id,
      name: agent.name,
      zh_name: agent.zh_name,
      description: agent.description,
      agent_type: agent.agent_type,
    })),
  }
}

// 渲染组织架构图
function renderChart() {
  if (!svgRef.value || !chartContainerRef.value)
    return

  const svg = d3.select(svgRef.value)
  svg.selectAll('*').remove()

  // 获取容器的实际可用尺寸
  const containerRect = chartContainerRef.value.getBoundingClientRect()
  const width = containerRect.width || 800
  const height = Math.max(containerRect.height || 400, 400) // 最小高度 400px

  svg.attr('width', width).attr('height', height).style('display', 'block')

  const root = buildOrgData()
  if (!root.children || root.children.length === 0) {
    // 如果没有子节点，显示提示信息
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#999')
      .attr('font-size', '16px')
      .text('点击"添加子智能体"按钮添加子智能体')
    // 即使没有节点，也支持画布拖拽
    const zoom = d3.zoom<any, any>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event: any) => {
        const container = svg.select('.chart-container')
        if (!container.empty()) {
          container.attr('transform', event.transform)
        }
      })
    svg.call(zoom as any)
    return
  }

  const treeData = d3.hierarchy(root) as any
  // 增加边距：垂直方向留 120，水平方向留 240
  const verticalMargin = 60 // 上下各 60px
  const horizontalMargin = 120 // 左右各 120px
  const treeLayout = d3.tree().size([height - verticalMargin * 2, width - horizontalMargin * 2])

  treeLayout(treeData)

  // 创建一个可拖拽的容器组
  const container = svg.append('g').attr('class', 'chart-container')

  // 创建一个内容组，包含所有图表元素，增加初始偏移量以留出边距
  const g = container.append('g').attr('transform', `translate(${horizontalMargin}, ${verticalMargin})`)

  // 创建缩放和平移行为
  const zoom = d3.zoom<any, any>()
    .scaleExtent([0.5, 3]) // 限制缩放范围
    .on('zoom', (event: any) => {
      // 更新容器组的位置和缩放
      container.attr('transform', event.transform)
    })

  // 将缩放行为绑定到 SVG
  svg.call(zoom as any)

  // 绘制连接线（水平-垂直-水平 直角线）
  const links = g.selectAll('.link')
    .data(treeData.links())

  links
    .enter()
    .append('path')
    .attr('class', 'link')
    .merge(links as any)
    .attr('d', (d: any) => {
      const source = d.source as any
      const target = d.target as any
      // 节点尺寸：宽度200，中心在y，左侧在y-100，右侧在y+100
      // 高度80，中心在x，顶部在x-40，底部在x+40
      // 连接线路径（水平-垂直-水平）：
      // 1. 从源节点右侧水平向右
      // 2. 垂直转向到目标节点高度
      // 3. 水平向右到目标节点左侧
      const sourceY = source.y // 源节点中心Y坐标（水平位置）
      const sourceX = source.x // 源节点中心X坐标（垂直位置）
      const targetY = target.y // 目标节点中心Y坐标（水平位置）
      const targetX = target.x // 目标节点中心X坐标（垂直位置）

      // 源节点右侧边缘
      const sourceRight = sourceY + 100
      // 目标节点左侧边缘
      const targetLeft = targetY - 100
      // 中间转向点（在源节点右侧水平延伸后，垂直转向到目标节点高度）
      const midY = (sourceRight + targetLeft) / 2

      // 路径：
      // 1. 移动到源节点右侧边缘（水平位置）
      // 2. 水平向右到中间点
      // 3. 垂直转向到目标节点高度（保持在中间Y位置）
      // 4. 水平向右到目标节点左侧边缘
      return `M ${sourceRight} ${sourceX} L ${midY} ${sourceX} L ${midY} ${targetX} L ${targetLeft} ${targetX}`
    })
    .attr('fill', 'none')
    .attr('stroke', '#ccc')
    .attr('stroke-width', 2)

  links.exit().remove()

  // 绘制节点
  const nodes = g.selectAll('.node')
    .data(treeData.descendants(), (d: any) => (d.data as OrgNode).id)

  const nodeEnter = nodes
    .enter()
    .append('g')
    .attr('class', 'node')

  // 合并新节点和现有节点
  const nodeUpdate = nodeEnter.merge(nodes as any)

  // 更新节点位置
  nodeUpdate.attr('transform', (d: any) => `translate(${d.y},${d.x})`)

  // 添加节点卡片背景
  const cards = nodeEnter
    .append('rect')
    .attr('class', (d: any) => (d.data.id === 'supervisor' ? 'supervisor-card' : 'agent-card'))
    .attr('x', -100)
    .attr('y', -40)
    .attr('width', 200)
    .attr('height', 80)
    .attr('rx', 8)

  cards
    .merge(nodeUpdate.select('rect') as any)
    .attr('fill', (d: any) => (d.data.id === 'supervisor' ? '#667eea' : '#fff'))
    .attr('stroke', (d: any) => (d.data.id === 'supervisor' ? '#667eea' : '#e5e7eb'))
    .attr('stroke-width', 2)

  // 添加节点中文名称文本
  const nameTexts = nodeEnter
    .append('text')
    .attr('class', 'node-name')
    .attr('x', 0)
    .attr('y', -15)
    .attr('text-anchor', 'middle')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')

  nameTexts
    .merge(nodeUpdate.select('.node-name') as any)
    .attr('fill', (d: any) => (d.data.id === 'supervisor' ? '#fff' : '#333'))
    .text((d: any) => {
      const nodeData = d.data as OrgNode
      return nodeData.zh_name || nodeData.name || ''
    })

  // 添加节点英文名称文本
  const nameEnTexts = nodeEnter
    .append('text')
    .attr('class', 'node-name-en')
    .attr('x', 0)
    .attr('y', 5)
    .attr('text-anchor', 'middle')
    .attr('font-size', '12px')

  nameEnTexts
    .merge(nodeUpdate.select('.node-name-en') as any)
    .attr('fill', (d: any) => (d.data.id === 'supervisor' ? '#fff' : '#666'))
    .text((d: any) => {
      const nodeData = d.data as OrgNode
      return nodeData.name || ''
    })

  // 添加描述文本（截断）
  const descTexts = nodeEnter
    .append('text')
    .attr('class', 'node-desc')
    .attr('x', 0)
    .attr('y', 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', '11px')

  descTexts
    .merge(nodeUpdate.select('.node-desc') as any)
    .attr('fill', (d: any) => (d.data.id === 'supervisor' ? '#fff' : '#999'))
    .text((d: any) => {
      const desc = (d.data as OrgNode).description || ''
      return desc.length > 20 ? `${desc.substring(0, 20)}...` : desc
    })

  // 为子节点添加删除按钮
  const childNodes = nodeEnter.filter((d: any) => (d.data as OrgNode).id !== 'supervisor')

  childNodes
    .append('circle')
    .attr('class', 'delete-btn')
    .attr('cx', 90)
    .attr('cy', -30)
    .attr('r', 12)
    .attr('fill', '#ef4444')
    .attr('cursor', 'pointer')
    .on('mouseenter', function () {
      d3.select(this).attr('r', 13.2).attr('fill', '#dc2626')
    })
    .on('mouseleave', function () {
      d3.select(this).attr('r', 12).attr('fill', '#ef4444')
    })
    .on('click', (event: any, d: any) => {
      event.stopPropagation()
      removeChildAgent((d.data as OrgNode).id)
    })

  childNodes
    .append('text')
    .attr('x', 90)
    .attr('y', -26)
    .attr('text-anchor', 'middle')
    .attr('fill', '#fff')
    .attr('font-size', '14px')
    .attr('font-weight', 'bold')
    .attr('pointer-events', 'none')
    .text('×')

  // 为更新节点也添加删除按钮（如果之前没有）
  nodeUpdate.filter((d: any) => (d.data as OrgNode).id !== 'supervisor').each(function (d: any) {
    const node = d3.select(this)
    if (node.select('.delete-btn').empty()) {
      node.append('circle')
        .attr('class', 'delete-btn')
        .attr('cx', 90)
        .attr('cy', -30)
        .attr('r', 12)
        .attr('fill', '#ef4444')
        .attr('cursor', 'pointer')
        .on('mouseenter', function () {
          d3.select(this).attr('r', 13.2).attr('fill', '#dc2626')
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', 12).attr('fill', '#ef4444')
        })
        .on('click', (event: any) => {
          event.stopPropagation()
          removeChildAgent((d.data as OrgNode).id)
        })
      node.append('text')
        .attr('x', 90)
        .attr('y', -26)
        .attr('text-anchor', 'middle')
        .attr('fill', '#fff')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text('×')
    }
  })

  nodes.exit().remove()
}

// 监听 selectedAgents 变化
watch(() => props.selectedAgents, (newVal) => {
  if (newVal) {
    selectedAgents.value = [...newVal]
    nextTick(() => {
      renderChart()
    })
  }
}, { deep: true })

// 监听容器大小变化
watch(() => chartContainerRef.value?.clientWidth, () => {
  nextTick(() => {
    renderChart()
  })
})

onMounted(() => {
  nextTick(() => {
    renderChart()
  })
})

// 监听窗口大小变化
window.addEventListener('resize', () => {
  nextTick(() => {
    renderChart()
  })
})
</script>

<template>
  <div class="supervisor-org-chart">
    <div class="org-chart-header">
      <h3 class="text-lg font-semibold mb-4">
        多智能体配置
      </h3>
      <n-button type="primary" size="small" @click="addChildAgent">
        <template #icon>
          <n-icon>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19 11H13V5h-2v6H5v2h6v6h2v-6h6z" />
            </svg>
          </n-icon>
        </template>
        添加子智能体
      </n-button>
    </div>
    <div ref="chartContainerRef" class="org-chart-container">
      <svg ref="svgRef" />
    </div>

    <!-- 选择智能体弹窗 -->
    <AgentSelectionModal
      ref="agentSelectionModalRef"
      :selected-agents="[]"
      :exclude-ids="selectedAgents.map(a => a.id)"
      @confirm="handleAgentSelectionConfirm"
    />
  </div>
</template>

<style scoped>
.supervisor-org-chart {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.org-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  /* margin-bottom: 16px; */
}

.org-chart-container {
  flex: 1;
  overflow: hidden;
  background: #f9fafb;
  border-radius: 8px;
  position: relative;
  min-height: 0;
}

.org-chart-container :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.org-chart-container :deep(.supervisor-card) {
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
}

.org-chart-container :deep(.agent-card) {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1));
}

.org-chart-container :deep(.agent-card:hover) {
  stroke: #667eea;
  stroke-width: 3;
}

.org-chart-container :deep(.delete-btn:hover) {
  /* 悬浮效果通过 JavaScript 控制，不使用 CSS transform */
}

.org-chart-container :deep(.link) {
  marker-end: url(#arrowhead);
}

.org-chart-container :deep(svg) {
  cursor: grab;
}

.org-chart-container :deep(svg:active) {
  cursor: grabbing;
}
</style>
