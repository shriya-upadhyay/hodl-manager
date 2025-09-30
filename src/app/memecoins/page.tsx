"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function MemecoinRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the main portfolio page
    router.replace('/')
  }, [router])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to portfolio...</p>
      </div>
    </div>
  )
}
