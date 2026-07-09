'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import { nodeNameService } from '@/lib/nodeNames'

interface NodeNamesModalProps {
  isOpen: boolean
  onClose: () => void
  nodeIds: number[]
  onUpdate: () => void
}

export default function NodeNamesModal({ isOpen, onClose, nodeIds, onUpdate }: NodeNamesModalProps) {
  const [nodeNames, setNodeNames] = useState<Record<string, string>>({})
  const [editingNames, setEditingNames] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadNodeNames()
    }
  }, [isOpen])

  const loadNodeNames = async () => {
    const names = await nodeNameService.getNodeNames()
    setNodeNames(names)
    setEditingNames(names)
  }

  const handleSave = async (nodeId: number) => {
    setIsSaving(true)
    try {
      const name = editingNames[nodeId.toString()] || ''
      await nodeNameService.updateNodeName(nodeId.toString(), name)
      await loadNodeNames()
      onUpdate()
    } catch (error) {
      console.error('Failed to save node name:', error)
    }
    setIsSaving(false)
  }

  const handleChange = (nodeId: number, value: string) => {
    setEditingNames(prev => ({
      ...prev,
      [nodeId.toString()]: value
    }))
  }

  if (!isOpen) return null

  const uniqueNodeIds = Array.from(new Set(nodeIds)).sort((a, b) => a - b)

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card-base max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-2xl font-bold font-['Manrope'] text-white">Manage Node Names</h2>
            <p className="text-sm text-slate-400 mt-1">Assign friendly names to nodes</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X size={24} className="text-slate-400" />
          </button>
        </div>

        {/* Node List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 hide-scrollbar">
          {uniqueNodeIds.map(nodeId => {
            const hexId = '0x' + nodeId.toString(16).toUpperCase()
            const currentName = editingNames[nodeId.toString()] || ''
            
            return (
              <div key={nodeId} className="flex items-center gap-4 p-4 bg-slate-800/30 border border-slate-700 rounded-xl">
                <div className="flex-shrink-0">
                  <div className="text-xs text-slate-500 font-semibold mb-1">NODE ID</div>
                  <div className="font-mono text-sm text-cyan-400">{hexId}</div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-slate-500 font-semibold mb-1 block">
                    FRIENDLY NAME
                  </label>
                  <input
                    type="text"
                    value={currentName}
                    onChange={(e) => handleChange(nodeId, e.target.value)}
                    placeholder="Enter name..."
                    className="w-full bg-slate-900/50 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={() => handleSave(nodeId)}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 rounded-lg transition-colors"
                >
                  <Save size={16} />
                  <span className="text-sm font-medium">Save</span>
                </button>
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            <span className="text-sm font-medium">Close</span>
          </button>
        </div>
      </div>
    </div>
  )
}
