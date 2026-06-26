'use client'

import { Wifi } from 'lucide-react'

interface HeaderProps {
  isConnected: boolean
}

export default function Header({ isConnected }: HeaderProps) {
  return (
    <header className="border-b border-slate-700/50 bg-slate-900/30 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">Q</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Disaster Alert Network</h1>
            <p className="text-xs text-slate-400">Real-time Resource Management Dashboard</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
            isConnected
              ? 'bg-green-500/20 border border-green-500/30'
              : 'bg-red-500/20 border border-red-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'
            }`} />
            <span className={`text-xs font-medium ${
              isConnected ? 'text-green-300' : 'text-red-300'
            }`}>
              {isConnected ? 'Live' : 'Offline'}
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
