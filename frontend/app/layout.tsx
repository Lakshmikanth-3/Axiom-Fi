import type { Metadata } from 'next'
import './globals.css'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'Axiom — Agentic Trading OS',
  description: 'The first agentic trading terminal where agents earn their reputation on-chain and charge accordingly. Finally, tools that have something to lose.',
  keywords: ['DeFi', 'trading terminal', 'AI agents', 'on-chain reputation', 'x402', 'Uniswap'],
  openGraph: {
    title: 'Axiom — Agentic Trading OS',
    description: 'Finally, tools that have something to lose.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  )
}
