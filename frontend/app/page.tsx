"use client"
import dynamic from 'next/dynamic'
const LandingContent = dynamic(() => import('./LandingContent'), { ssr: false })
export default function Page() { return <LandingContent /> }
