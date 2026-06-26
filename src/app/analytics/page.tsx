'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Alert } from '@/lib/mqtt'
import { alertService } from '@/lib/alertService'
import { ArrowLeft, Download, Database } from 'lucide-react'
import Papa from 'papaparse'
import mockAlerts from '../../../data/mockAlerts.json'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type TimeRange = '1h' | '6h' | '24h' | '7d' | 'all'
type StatusFilter = 'all' | 'active' | 'resolved'

const COLORS = ['#ff3b5c', '#00d9ff', '#7c3aed', '#facc15', '#10b981', '#f97316']

export default function AnalyticsPage() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [resourceFilter, setResourceFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [useMockData, setUseMockData] = useState(false)

  useEffect(() => {
    loadAlerts()
  }, [useMockData])

  const loadAlerts = async () => {
    setIsLoading(true)
    if (useMockData) {
      setAlerts(mockAlerts as Alert[])
    } else {
      const data = await alertService.getAlerts()
      setAlerts(data)
    }
    setIsLoading(false)
  }

  // Filter alerts based on selections
  const filteredAlerts = alerts.filter((alert) => {
    const now = Math.floor(Date.now() / 1000)
    let timeLimit = 0

    switch (timeRange) {
      case '1h':
        timeLimit = now - 3600
        break
      case '6h':
        timeLimit = now - 6 * 3600
        break
      case '24h':
        timeLimit = now - 24 * 3600
        break
      case '7d':
        timeLimit = now - 7 * 24 * 3600
        break
      case 'all':
        timeLimit = 0
        break
    }

    if (timeLimit > 0 && alert.timestamp < timeLimit) return false
    if (resourceFilter !== 'all' && alert.resource !== resourceFilter) return false
    if (statusFilter !== 'all' && alert.status !== statusFilter) return false

    return true
  })

  // Calculate summary stats
  const totalAlerts = filteredAlerts.length
  const resolvedAlerts = filteredAlerts.filter((a) => a.status === 'resolved').length
  const avgResolutionTime = (() => {
    const resolved = filteredAlerts.filter((a) => a.status === 'resolved' && a.resolvedAt)
    if (resolved.length === 0) return 0
    const total = resolved.reduce((sum, a) => sum + ((a.resolvedAt || 0) - a.timestamp), 0)
    return Math.round(total / resolved.length / 60) // minutes
  })()
  const topResource = (() => {
    const counts: Record<string, number> = {}
    filteredAlerts.forEach((a) => {
      counts[a.resource] = (counts[a.resource] || 0) + 1
    })
    const sorted = Object.entries(counts).sort(([, a], [, b]) => b - a)
    return sorted[0]?.[0] || 'N/A'
  })()

  // Get unique resources
  const resources = Array.from(new Set(alerts.map((a) => a.resource)))

  // Chart 1: Alerts Over Time
  const timelineData = (() => {
    const buckets: Record<string, { time: string; active: number; resolved: number }> = {}
    const bucketSize = timeRange === '1h' || timeRange === '6h' ? 3600 : 24 * 3600

    filteredAlerts.forEach((alert) => {
      const bucket = Math.floor(alert.timestamp / bucketSize) * bucketSize
      const key = new Date(bucket * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: timeRange === '1h' || timeRange === '6h' ? 'numeric' : undefined,
      })

      if (!buckets[key]) {
        buckets[key] = { time: key, active: 0, resolved: 0 }
      }

      if (alert.status === 'active') buckets[key].active++
      else buckets[key].resolved++
    })

    return Object.values(buckets).sort((a, b) => a.time.localeCompare(b.time))
  })()

  // Chart 2: Alerts by Resource
  const resourceData = (() => {
    const counts: Record<string, number> = {}
    filteredAlerts.forEach((a) => {
      counts[a.resource] = (counts[a.resource] || 0) + 1
    })
    return Object.entries(counts).map(([resource, count]) => ({ resource, count }))
  })()

  // Chart 3: Alerts by Severity
  const severityData = (() => {
    const counts = { High: 0, Medium: 0, Low: 0 }
    filteredAlerts.forEach((a) => {
      if (a.severity > 66) counts.High++
      else if (a.severity > 33) counts.Medium++
      else counts.Low++
    })
    return [
      { name: 'High', value: counts.High },
      { name: 'Medium', value: counts.Medium },
      { name: 'Low', value: counts.Low },
    ]
  })()

  // Chart 4: Status Distribution
  const statusData = [
    { name: 'Active', value: filteredAlerts.filter((a) => a.status === 'active').length },
    { name: 'Resolved', value: filteredAlerts.filter((a) => a.status === 'resolved').length },
  ]

  // Chart 5: Alerts by Node
  const nodeData = (() => {
    const counts: Record<number, number> = {}
    filteredAlerts.forEach((a) => {
      counts[a.nodeId] = (counts[a.nodeId] || 0) + 1
    })
    return Object.entries(counts)
      .map(([nodeId, count]) => ({ 
        nodeId: '0x' + parseInt(nodeId).toString(16).toUpperCase(), 
        count 
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  })()

  // Chart 6: Hourly Distribution
  const hourlyData = (() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }))
    filteredAlerts.forEach((a) => {
      const hour = new Date(a.timestamp * 1000).getHours()
      hours[hour].count++
    })
    return hours.map((h) => ({ hour: `${h.hour}:00`, count: h.count }))
  })()

  // Export to CSV
  const exportCSV = () => {
    const csv = Papa.unparse(
      filteredAlerts.map((a) => ({
        alertId: a.alertId,
        nodeId: a.nodeId,
        resource: a.resource,
        severity: a.severity,
        status: a.status,
        timestamp: new Date(a.timestamp * 1000).toISOString(),
        resolvedAt: a.resolvedAt ? new Date(a.resolvedAt * 1000).toISOString() : '',
        resolvedBy: a.resolvedBy || '',
      }))
    )
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `alerts-${Date.now()}.csv`
    a.click()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white font-['Inter']">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold font-['Manrope']">Analytics Dashboard</h1>
              <p className="text-sm text-slate-400">Comprehensive alert insights and trends</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Mock Data Toggle */}
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-xl">
              <Database size={18} className="text-slate-400" />
              <span className="text-sm text-slate-300">Mock Data</span>
              <button
                onClick={() => setUseMockData(!useMockData)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  useMockData ? 'bg-blue-500' : 'bg-slate-600'
                }`}
              >
                <div
                  className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    useMockData ? 'transform translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              <Download size={18} />
              <span className="text-sm font-medium">Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-[1920px] mx-auto px-6 py-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="card-base p-5 hover:scale-105 transition-transform">
            <div className="text-sm text-slate-400 mb-1 font-medium">Total Alerts</div>
            <div className="text-3xl font-bold font-['Manrope'] bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              {totalAlerts}
            </div>
          </div>
          <div className="card-base p-5 hover:scale-105 transition-transform">
            <div className="text-sm text-slate-400 mb-1 font-medium">Resolved</div>
            <div className="text-3xl font-bold font-['Manrope'] text-emerald-400">{resolvedAlerts}</div>
          </div>
          <div className="card-base p-5 hover:scale-105 transition-transform">
            <div className="text-sm text-slate-400 mb-1 font-medium">Avg Resolution</div>
            <div className="text-3xl font-bold font-['Manrope'] text-yellow-400">{avgResolutionTime}m</div>
          </div>
          <div className="card-base p-5 hover:scale-105 transition-transform">
            <div className="text-sm text-slate-400 mb-1 font-medium">Top Resource</div>
            <div className="text-2xl font-bold font-['Manrope'] text-pink-400">{topResource}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="card-base p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Time Range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as TimeRange)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="1h">Last 1 Hour</option>
                <option value="6h">Last 6 Hours</option>
                <option value="24h">Last 24 Hours</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Resource Type</label>
              <select
                value={resourceFilter}
                onChange={(e) => setResourceFilter(e.target.value)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">All Resources</option>
                {resources.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="all">All Alerts</option>
                <option value="active">Active Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Content: Charts + Audit Log */}
        <div className="flex gap-6">
          {/* Charts Grid - 2/3 width */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart 1: Timeline */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-blue-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Alerts Over Time
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Legend />
                <Line type="monotone" dataKey="active" stroke="#ff3b5c" strokeWidth={3} name="Active" />
                <Line type="monotone" dataKey="resolved" stroke="#00ff87" strokeWidth={3} name="Resolved" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 2: Resource Breakdown */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-purple-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Alerts by Resource
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={resourceData} barGap={8}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="resource" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#a855f7" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 3: Severity Distribution */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-red-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
              Severity Distribution
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 4: Status Distribution */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-green-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              Alert Status
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  <Cell fill="#ff3b5c" />
                  <Cell fill="#00ff87" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 5: Node Activity */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              Top Nodes by Alerts
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={nodeData} layout="vertical" barGap={6}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <YAxis
                  type="category"
                  dataKey="nodeId"
                  stroke="#94a3b8"
                  style={{ fontSize: '12px' }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#00d9ff" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Chart 6: Hourly Distribution */}
          <div className="card-base p-6 hover:shadow-2xl hover:shadow-amber-500/10 transition-all">
            <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
              Alerts by Hour of Day
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={hourlyData} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="hour"
                  stroke="#94a3b8"
                  style={{ fontSize: '10px' }}
                  interval={2}
                />
                <YAxis stroke="#94a3b8" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" fill="#facc15" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

          {/* Audit Log Sidebar - 1/3 width */}
          <div className="w-96 flex-shrink-0">
            <div className="card-base p-6 flex flex-col sticky top-24" style={{ height: 'calc(100vh - 140px)' }}>
              <h3 className="text-lg font-semibold font-['Manrope'] mb-4 bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Audit Log
              </h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-4 hide-scrollbar">
                {filteredAlerts.length === 0 ? (
                  <div className="text-center text-slate-500 py-8">
                    <p className="text-sm">No alerts to display</p>
                  </div>
                ) : (
                  filteredAlerts
                    .sort((a, b) => {
                      const timeA = a.status === 'resolved' && a.resolvedAt ? a.resolvedAt : a.timestamp
                      const timeB = b.status === 'resolved' && b.resolvedAt ? b.resolvedAt : b.timestamp
                      return timeB - timeA
                    })
                    .map((alert, idx) => (
                      <div key={`${alert.alertId}-${idx}`}>
                        {/* Alert Created Log */}
                        <div className="flex gap-3 items-start p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                            alert.severity > 66 ? 'bg-red-400' : alert.severity > 33 ? 'bg-amber-400' : 'bg-green-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-cyan-400">CREATED</span>
                              <span className="text-xs text-slate-500">
                                {new Date(alert.timestamp * 1000).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-sm text-slate-300 truncate">
                              <span className="font-medium">{alert.resource}</span> alert from{' '}
                              <span className="font-mono text-xs text-slate-400">
                                0x{alert.nodeId.toString(16).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded ${
                                alert.severity > 66
                                  ? 'bg-red-500/20 text-red-300'
                                  : alert.severity > 33
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                {alert.severity > 66 ? 'High' : alert.severity > 33 ? 'Med' : 'Low'}
                              </span>
                              <span className="text-xs text-slate-500">#{alert.alertId}</span>
                            </div>
                          </div>
                        </div>

                        {/* Alert Resolved Log */}
                        {alert.status === 'resolved' && alert.resolvedAt && (
                          <div className="flex gap-3 items-start p-3 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors mt-2">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-medium text-emerald-400">RESOLVED</span>
                                <span className="text-xs text-slate-500">
                                  {new Date(alert.resolvedAt * 1000).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <div className="text-sm text-slate-300">
                                Alert #{alert.alertId} resolved
                                {alert.resolvedBy && (
                                  <span>
                                    {' '}by{' '}
                                    <span className="font-mono text-xs text-slate-400">
                                      0x{alert.resolvedBy.toString(16).toUpperCase()}
                                    </span>
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                Duration: {Math.round((alert.resolvedAt - alert.timestamp) / 60)}m
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

      </main>
    </div>
  )
}
