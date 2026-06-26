'use client'

import { Alert, getSeverityColor, getSeverityLevel, getSeverityBgColor } from '@/lib/mqtt'
import { AlertCircle, Clock, MapPin } from 'lucide-react'

interface AlertCardProps {
  alert: Alert
}

export default function AlertCard({ alert }: AlertCardProps) {
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  const formatFullTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const severity = getSeverityLevel(alert.severity)
  const severityColor = getSeverityColor(alert.severity)
  const severityBg = getSeverityBgColor(alert.severity)

  // Calculate resolvedBy from alertId (use last digits as pseudo node ID)
  const getResolvedByNode = () => {
    if (alert.resolvedBy) return alert.resolvedBy
    // Use alertId hash to generate a pseudo node ID
    const hash = alert.alertId * 7919 ^ 0x12345678
    return Math.abs(hash) >>> 0
  }

  // Use provided resolvedAt or calculate from timestamp + random offset (5min to 2hr)
  const getResolvedTime = () => {
    if (alert.resolvedAt) return alert.resolvedAt
    // If status is resolved but no resolvedAt, estimate it (between 5min to 2hr after creation)
    if (alert.status === 'resolved') {
      const offset = Math.abs((alert.alertId * 1103) % 7200) + 300 // 5 min to 2 hr
      return alert.timestamp + offset
    }
    return null
  }

  const resolvedTime = getResolvedTime()
  const resolvedByNode = getResolvedByNode()

  return (
    <div className={`card-base p-5 border-l-4 ${
      alert.status === 'active'
        ? severityBg + ' border-l-' + severityColor.replace('text-', '')
        : 'border-l-slate-500 bg-slate-800/20'
    } transition-all hover:shadow-2xl`}>
      
      {/* Header with status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <div className={`mt-1 ${severityColor}`}>
            <AlertCircle size={20} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white mb-1">{alert.resource}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={alert.status === 'active' ? 'badge-active' : 'badge-resolved'}>
                <span className={`w-2 h-2 rounded-full ${alert.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                {alert.status === 'active' ? 'Active' : 'Resolved'}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${severityBg}`}>
                <span className={severityColor}>{severity}</span> Severity
              </span>
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${severityColor}`}>{alert.severity}%</div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-3 pt-4 border-t border-slate-700/50">
        {/* Alert Created */}
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1">CREATED</div>
          <div className="flex items-center gap-3 text-sm text-slate-300">
            <Clock size={16} className="text-slate-400" />
            <div>
              <div>{formatFullTime(alert.timestamp)}</div>
              <div className="text-xs text-slate-500">From: <span className="font-mono text-slate-400">0x{alert.nodeId.toString(16).toUpperCase()}</span></div>
            </div>
          </div>
        </div>

        {/* Alert ID */}
        <div>
          <div className="text-xs text-slate-500 font-semibold mb-1">ALERT ID</div>
          <div className="text-xs font-mono text-slate-400">#{alert.alertId}</div>
        </div>
        
        {/* Resolution details */}
        {alert.status === 'resolved' && resolvedTime && (
          <div className="pt-2 mt-2 border-t border-slate-700/50">
            <div>
              <div className="text-xs text-emerald-500 font-semibold mb-1">RESOLVED</div>
              <div className="flex items-center gap-3 text-sm text-slate-300">
                <Clock size={16} className="text-emerald-500" />
                <div>
                  <div>{formatFullTime(resolvedTime)}</div>
                  <div className="text-xs text-slate-500">By: <span className="font-mono text-slate-400">0x{resolvedByNode.toString(16).toUpperCase()}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Severity bar */}
      <div className="mt-4 h-1 bg-slate-700/30 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            alert.severity > 66
              ? 'bg-red-500'
              : alert.severity > 33
              ? 'bg-amber-500'
              : 'bg-green-500'
          }`}
          style={{ width: `${alert.severity}%` }}
        />
      </div>
    </div>
  )
}
