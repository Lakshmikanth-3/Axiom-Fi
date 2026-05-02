"use client"
import dynamic from 'next/dynamic'
const AgentsContent = dynamic(() => import('./AgentsContent'), { ssr: false })
export default function Page() { return <AgentsContent /> }
