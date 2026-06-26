'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AlertCard from '@/components/AlertCard'
import StatsCard from '@/components/StatsCard'
import { connectMQTT, disconnectMQTT, Alert } from '@/lib/mqtt'
import { AlertTriangle, CheckCircle, Clock, Zap } from 'lucide-react'

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const initMQTT = async () => {
      try {
        setIsLoading(true)
        setError(null)

        await connectMQTT(
          (newAlert: Alert) => {
            setAlerts((prev) => {
              // Check if alert already exists
              const exists = prev.find((a) => a.alertId === newAlert.alertId)
              if (exists) {
                // Update existing alert (in case of status change)
                return prev.map((a) =>
                  a.alertId === newAlert.alertId ? newAlert : a
                )
              }
              // Add new alert at the beginning
              return [newAlert, ...prev].slice(0, 100) // Keep last 100
            })
          },
          () => {
            setIsConnected(true)
            setIsLoading(false)
          },
          (error) => {
            console.error('MQTT Error:', error)
            setError('Failed to connect to alert network')
            setIsLoading(false)
          }
        )
      } catch (err) {
        console.error('Connection failed:', err)
        setError('Unable to establish connection')
        setIsLoading(false)
      }
    }

    initMQTT()

    return () => {
      disconnectMQTT()
    }
  }, [])

  const activeAlerts = alerts.filter((a) => a.status === 'active')
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved')
  const highSeverity = alerts.filter((a) => a.severity > 66 && a.status === 'active')

  const resourceCounts = alerts.reduce(
    (acc, alert) => {
      if (alert.status === 'active') {
        acc[alert.resource] = (acc[alert.resource] || 0) + 1
      }
      return acc
    },
    {} as Record<string, number>
  )

  const topResource = Object.entries(resourceCounts).sort(([, a], [, b]) => b - a)[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
      <Header isConnected={isConnected} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Status Message */}
        {isLoading && (
          <div className="mb-6 card-base p-4 bg-blue-500/10 border-blue-500/30 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-300">Connecting to alert network...</span>
          </div>
        )}

        {error && (
          <div className="mb-6 card-base p-4 bg-red-500/10 border-red-500/30 flex items-center gap-3">
            <AlertTriangle size={18} className="text-red-400" />
            <span className="text-sm text-red-300">{error}</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            title="Active Alerts"
            value={activeAlerts.length}
            icon={<AlertTriangle size={24} />}
            trend={activeAlerts.length > 3 ? 'up' : 'stable'}
          />
          <StatsCard
            title="Resolved"
            value={resolvedAlerts.length}
            icon={<CheckCircle size={24} />}
            trend="down"
          />
          <StatsCard
            title="High Priority"
            value={highSeverity.length}
            icon={<Zap size={24} />}
            trend={highSeverity.length > 0 ? 'up' : 'stable'}
          />
          <StatsCard
            title="Total Alerts"
            value={alerts.length}
            icon={<Clock size={24} />}
            subtitle={topResource ? `Top: ${topResource[0]}` : 'No data'}
          />
        </div>

        {/* Alerts Section */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Active Alerts</h2>
            <p className="text-slate-400 text-sm">Real-time resource requests from the mesh network</p>
          </div>

          {alerts.length === 0 ? (
            <div className="card-base p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">No Active Alerts</h3>
              <p className="text-slate-500 text-sm">All systems nominal. Waiting for incoming alerts...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {alerts.map((alert) => (
                <AlertCard key={alert.alertId} alert={alert} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-700/50 text-center text-slate-400 text-xs">
          <p>IoT Disaster Management System • Real-time Mesh Network Monitoring</p>
        </div>
      </main>
    </div>
  )
}
