import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json')

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true })
  } catch (err) {
    // Directory might already exist
  }
}

// Read alerts from file
async function readAlerts() {
  try {
    await ensureDataDir()
    const data = await fs.readFile(ALERTS_FILE, 'utf-8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Write alerts to file
async function writeAlerts(alerts: any[]) {
  try {
    await ensureDataDir()
    await fs.writeFile(ALERTS_FILE, JSON.stringify(alerts, null, 2))
  } catch (err) {
    console.error('Failed to write alerts:', err)
  }
}

// GET all alerts
export async function GET() {
  try {
    const alerts = await readAlerts()
    return NextResponse.json(alerts)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read alerts' }, { status: 500 })
  }
}

// POST new alert
export async function POST(request: NextRequest) {
  try {
    const newAlert = await request.json()
    const alerts = await readAlerts()
    
    // Check if alert already exists
    const exists = alerts.find((a: any) => a.alertId === newAlert.alertId)
    if (!exists) {
      alerts.push(newAlert)
      await writeAlerts(alerts)
    }
    
    return NextResponse.json(newAlert, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

// PUT update alert (for resolving)
export async function PUT(request: NextRequest) {
  try {
    const { alertId, status, nodeId, timestamp } = await request.json()
    const alerts = await readAlerts()
    
    const alert = alerts.find((a: any) => a.alertId === alertId)
    if (alert) {
      alert.status = status
      if (status === 'resolved') {
        alert.resolvedAt = timestamp || Math.floor(Date.now() / 1000)
        alert.resolvedBy = nodeId
      }
      await writeAlerts(alerts)
      return NextResponse.json(alert)
    }
    
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

// DELETE all alerts (reset)
export async function DELETE() {
  try {
    await writeAlerts([])
    return NextResponse.json({ message: 'All alerts cleared' })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to clear alerts' }, { status: 500 })
  }
}
