"use client"
import dynamic from 'next/dynamic'
const VerifyContent = dynamic(() => import('./VerifyContent'), { ssr: false })
export default function Page() { return <VerifyContent /> }
