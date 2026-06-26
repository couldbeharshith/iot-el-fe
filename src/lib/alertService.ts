import { Alert } from './mqtt'

const API_URL = '/api/alerts'

export const alertService = {
  // Get all alerts from server
  async getAlerts(): Promise<Alert[]> {
    try {
      const response = await fetch(API_URL)
      if (!response.ok) throw new Error('Failed to fetch alerts')
      return await response.json()
    } catch (error) {
      console.error('Error fetching alerts:', error)
      return []
    }
  },

  // Save new alert to server
  async saveAlert(alert: Alert): Promise<Alert> {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      })
      if (!response.ok) throw new Error('Failed to save alert')
      return await response.json()
    } catch (error) {
      console.error('Error saving alert:', error)
      throw error
    }
  },

  // Update alert status (for resolve)
  async resolveAlert(alertId: number): Promise<Alert> {
    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, status: 'resolved' }),
      })
      if (!response.ok) throw new Error('Failed to update alert')
      return await response.json()
    } catch (error) {
      console.error('Error resolving alert:', error)
      throw error
    }
  },

  // Clear all alerts
  async clearAlerts(): Promise<void> {
    try {
      const response = await fetch(API_URL, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to clear alerts')
    } catch (error) {
      console.error('Error clearing alerts:', error)
      throw error
    }
  },
}
