export const nodeNameService = {
  async getNodeNames(): Promise<Record<string, string>> {
    try {
      const response = await fetch('/api/nodes')
      if (!response.ok) throw new Error('Failed to fetch node names')
      return await response.json()
    } catch (error) {
      console.error('Error fetching node names:', error)
      return {}
    }
  },

  async updateNodeName(nodeId: string, name: string): Promise<Record<string, string>> {
    try {
      const response = await fetch('/api/nodes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, name }),
      })
      if (!response.ok) throw new Error('Failed to update node name')
      return await response.json()
    } catch (error) {
      console.error('Error updating node name:', error)
      throw error
    }
  },
}

export function formatNodeId(nodeId: number, nodeNames: Record<string, string>): string {
  const hexId = '0x' + nodeId.toString(16).toUpperCase()
  const name = nodeNames[nodeId.toString()]
  return name ? `${name} (${hexId})` : hexId
}

export function formatQuantity(resource: string, quantity: number): string {
  const units: Record<string, string> = {
    'Food': `Food for ${quantity} people`,
    'Water': `${quantity} litre${quantity !== 1 ? 's' : ''}`,
    'Medical': `${quantity} medical kit${quantity !== 1 ? 's' : ''}`,
    'Shelter': `${quantity} tent${quantity !== 1 ? 's' : ''}`,
    'Clothing': `${quantity} unit${quantity !== 1 ? 's' : ''} of clothing`,
    'Power': `${quantity} generator${quantity !== 1 ? 's' : ''}`,
    'Transport': `Transport for ${quantity} people`,
    'Communication': `${quantity}`,
    'Rescue': `${quantity} rescue team${quantity !== 1 ? 's' : ''}`
  }
  
  return units[resource] || `${quantity}`
}
