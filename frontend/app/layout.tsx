import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google'
import ClientNav from './ClientNav'
import './globals.css'

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-ibm',
})

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono-ibm',
})

export const metadata: Metadata = {
  title: 'Axiom-Fi — Autonomous On-Chain DeFi Trading',
  description: 'An agentic DeFi terminal where AI agents research, assess risk, and execute trades on-chain, with every decision auditable on Base Sepolia.',
  keywords: ['DeFi', 'AI agents', 'autonomous trading', 'on-chain', 'Base Sepolia', 'Uniswap', '0G'],
  authors: [{ name: 'Axiom-Fi' }],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      translate="no"
      className={`${ibmPlexSans.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body
        data-gramm="false"
        data-gramm_editor="false"
        data-enable-grammarly="false"
        suppressHydrationWarning
      >
        <ClientNav />
        {children}
      </body>
    </html>
  )
}
