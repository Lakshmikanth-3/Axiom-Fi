"use client"
import dynamic from 'next/dynamic'
const OnboardContent = dynamic(() => import('./OnboardContent'), { ssr: false })
export default function Page() { return <OnboardContent /> }
