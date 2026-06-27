'use client'

import { useEffect, useState } from 'react'
import Header from '@/components/Header'
import AlertCard from '@/components/AlertCard'
import StatsCard from '@/components/StatsCard'
import { connectMQTT, disconnectMQTT, Alert } from '@/lib/mqtt'
import { alertService } from '@/lib/alertService'
import { AlertTriangle, CheckCircle, Clock, Zap, Trash2 } from 'lucide-react'

const MAX_ALERTS = 100

export default function Dashboard() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'resolved'>('all')

  // Load alerts from server on mount
  useEffect(() => {
    setIsMounted(true)
    loadAlerts()
  }, [])

  const loadAlerts = async () => {
    try {
      const serverAlerts = await alertService.getAlerts()
      setAlerts(serverAlerts)
    } catch (err) {
      console.error('Failed to load alerts:', err)
    }
  }

  const handleResolveAlert = async (alertId: number) => {
    try {
      await alertService.resolveAlert(alertId)
      setAlerts((prev) =>
        prev.map((alert) =>
          alert.alertId === alertId
            ? { ...alert, status: 'resolved' as const, resolvedAt: Math.floor(Date.now() / 1000) }
            : alert
        )
      )
    } catch (err) {
      console.error('Failed to resolve alert:', err)
    }
  }

  const handleReset = async () => {
    if (confirm('Clear all alerts from dashboard? This cannot be undone.')) {
      try {
        await alertService.clearAlerts()
        setAlerts([])
      } catch (err) {
        console.error('Failed to clear alerts:', err)
      }
    }
  }

  useEffect(() => {
    if (!isMounted) return

    const initMQTT = async () => {
      try {
        setIsLoading(true)
        setError(null)

        await connectMQTT(
          async (newAlert: Alert | null) => {
            if (newAlert) {
              try {
                await alertService.saveAlert(newAlert)
                setAlerts((prev) => {
                  const exists = prev.find((a) => a.alertId === newAlert.alertId)
                  if (!exists) {
                    return [newAlert, ...prev].slice(0, MAX_ALERTS)
                  } else {
                    return prev.map((a) =>
                      a.alertId === newAlert.alertId ? newAlert : a
                    )
                  }
                })
              } catch (err) {
                console.error('Error saving alert:', err)
              }
            }
          },
          handleResolveAlert,
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
  }, [isMounted])

  if (!isMounted) {
    return null
  }

  const activeAlerts = alerts.filter((a) => a.status === 'active')
  const resolvedAlerts = alerts.filter((a) => a.status === 'resolved')
  const highSeverity = alerts.filter((a) => a.severity > 66 && a.status === 'active')

  const filteredAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.status === filter)

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
    <div className="min-h-screen bg-black">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
            title="Total Alerts"
            value={alerts.length}
            icon={<Clock size={24} />}
            subtitle={topResource ? `Top: ${topResource[0]}` : 'No data'}
          />
        </div>

        {/* Alerts Section */}
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Alerts</h2>
              <p className="text-slate-400 text-sm">Real-time resource requests from the mesh network</p>
            </div>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors"
            >
              <Trash2 size={18} />
              <span className="text-sm font-medium">Reset</span>
            </button>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'all'
                  ? 'bg-blue-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'active'
                  ? 'bg-red-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Active ({activeAlerts.length})
            </button>
            <button
              onClick={() => setFilter('resolved')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === 'resolved'
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              Resolved ({resolvedAlerts.length})
            </button>
          </div>

          {filteredAlerts.length === 0 ? (
            <div className="card-base p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-300 mb-2">
                {filter === 'all' ? 'No Alerts' : `No ${filter} Alerts`}
              </h3>
              <p className="text-slate-500 text-sm">
                {filter === 'all' 
                  ? 'All systems nominal. Waiting for incoming alerts...'
                  : `No ${filter} alerts found.`
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => (
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
