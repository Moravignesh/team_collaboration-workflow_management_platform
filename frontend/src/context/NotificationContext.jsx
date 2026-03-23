import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'

const NotifContext = createContext(null)

export function NotificationProvider({ children }) {
  const { user }                          = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread,        setUnread]        = useState(0)
  const wsRef                             = useRef(null)

  useEffect(() => {
    if (!user) return
    const token = localStorage.getItem('token')
    if (!token) return

    // Connect WebSocket — JWT passed as query param
    const ws = new WebSocket(`ws://localhost:8000/ws/notifications?token=${token}`)
    wsRef.current = ws

    ws.onopen    = () => console.log('[WS] Notification stream connected')
    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        setNotifications((prev) => [
          { ...data, id: Date.now(), read: false, ts: new Date().toISOString() },
          ...prev,
        ])
        setUnread((n) => n + 1)
      } catch (_) {}
    }
    ws.onerror = () => {}
    ws.onclose = () => console.log('[WS] Disconnected')

    return () => ws.close()
  }, [user])

  const markAllRead = () => {
    setNotifications((p) => p.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }
  const clearAll = () => { setNotifications([]); setUnread(0) }

  return (
    <NotifContext.Provider value={{ notifications, unread, markAllRead, clearAll }}>
      {children}
    </NotifContext.Provider>
  )
}

export const useNotifications = () => {
  const ctx = useContext(NotifContext)
  if (!ctx) throw new Error('useNotifications must be inside NotificationProvider')
  return ctx
}
