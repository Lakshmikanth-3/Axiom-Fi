"use client"
import dynamic from 'next/dynamic'
const TerminalContent = dynamic(() => import('./TerminalContent'), { ssr: false })
export default function Page() { return <TerminalContent /> }
