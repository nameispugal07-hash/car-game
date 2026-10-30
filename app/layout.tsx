import { Analytics } from '@vercel/analytics/next'
import { Geist, Geist_Mono } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
export const metadata: Metadata = {
  title: 'APEX — A little car. A faster lap.',
  description: 'An instant-play racing time trial. Find your line, master the circuit, and beat your personal best. Play with keyboard or touch controls.',
}
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#131816' }
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={`bg-background ${geist.variable} ${geistMono.variable}`}><body className="font-sans antialiased">{children}{process.env.NODE_ENV === 'production' && <Analytics />}</body></html>
}
