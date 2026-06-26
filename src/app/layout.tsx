import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Disaster Resource Management - Live Dashboard',
  description: 'Real-time disaster resource alerts and mesh network monitoring',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900">
        {children}
      </body>
    </html>
  )
}
