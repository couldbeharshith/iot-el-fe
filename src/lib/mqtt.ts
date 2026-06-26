import mqtt, { MqttClient } from 'mqtt'

export interface Alert {
  alertId: number
  nodeId: number
  resource: string
  severity: number
  timestamp: number
  status: 'active' | 'resolved'
  resolvedAt?: number
  resolvedBy?: number
}

const MQTT_BROKER = 'wss://0aa83f4bcfc64c5f80b6447461eae988.s1.eu.hivemq.cloud:8884/mqtt'
const MQTT_USER = 'mich123'
const MQTT_PASSWORD = 'Michelle123'
const MQTT_TOPIC = 'disaster/alerts'

let client: mqtt.MqttClient | null = null
let isConnecting = false

export const connectMQTT = (
  onMessage: (alert: Alert | null) => void, // null means update existing
  onResolve: (alertId: number) => void,
  onConnect: () => void,
  onError: (error: Error) => void
): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (client?.connected) {
      resolve()
      return
    }

    if (isConnecting) {
      const checkInterval = setInterval(() => {
        if (client?.connected) {
          clearInterval(checkInterval)
          resolve()
        }
      }, 100)
      return
    }

    isConnecting = true

    try {
      client = mqtt.connect(MQTT_BROKER, {
        username: MQTT_USER,
        password: MQTT_PASSWORD,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30000,
      })

      client.on('connect', () => {
        console.log('MQTT Connected')
        client?.subscribe(MQTT_TOPIC, (err) => {
          if (err) {
            console.error('Subscribe error:', err)
            onError(new Error('Failed to subscribe to MQTT topic'))
          }
        })
        onConnect()
        isConnecting = false
        resolve()
      })

      client.on('message', (topic, message) => {
        if (topic === MQTT_TOPIC) {
          try {
            const data = JSON.parse(message.toString())
            
            // Handle resolve messages: {"alertId": X, "nodeId": Y, "timestamp": Z, "status": "resolved"}
            if (data.alertId && data.status === 'resolved') {
              console.log('Received resolve message for alert:', data.alertId)
              onResolve(data.alertId)
              return
            }
            
            // Handle full alert messages
            if (data.alertId && data.nodeId) {
              const alert: Alert = {
                alertId: data.alertId,
                nodeId: data.nodeId,
                resource: data.resource || 'Unknown',
                severity: data.severity || 0,
                timestamp: data.timestamp || Math.floor(Date.now() / 1000),
                status: (data.status === 'resolved' ? 'resolved' : 'active') as 'active' | 'resolved'
              }
              console.log('Received alert:', alert)
              onMessage(alert)
            }
          } catch (error) {
            console.error('Failed to parse message:', error)
          }
        }
      })

      client.on('error', (error) => {
        console.error('MQTT error:', error)
        onError(error)
        isConnecting = false
        reject(error)
      })

      client.on('disconnect', () => {
        console.log('MQTT Disconnected')
        isConnecting = false
      })
    } catch (error) {
      isConnecting = false
      reject(error)
    }
  })
}

export const disconnectMQTT = (): Promise<void> => {
  return new Promise((resolve) => {
    if (!client) {
      resolve()
      return
    }
    client.end(true, () => {
      client = null
      resolve()
    })
  })
}

export const getSeverityLevel = (severity: number): string => {
  if (severity > 66) return 'High'
  if (severity > 33) return 'Medium'
  return 'Low'
}

export const getSeverityColor = (severity: number): string => {
  if (severity > 66) return 'text-red-400'
  if (severity > 33) return 'text-amber-400'
  return 'text-green-400'
}

export const getSeverityBgColor = (severity: number): string => {
  if (severity > 66) return 'bg-red-500/10 border-red-500/30'
  if (severity > 33) return 'bg-amber-500/10 border-amber-500/30'
  return 'bg-green-500/10 border-green-500/30'
}
