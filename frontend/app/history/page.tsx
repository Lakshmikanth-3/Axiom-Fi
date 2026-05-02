"use client"
import dynamic from 'next/dynamic'
const HistoryContent = dynamic(() => import('./HistoryContent'), { ssr: false })
export default function Page() { return <HistoryContent /> }
