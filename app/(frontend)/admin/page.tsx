'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Invalid password')
        return
      }

      router.push('/admin/photos')
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border bg-muted/20 mx-auto mb-2">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the admin password to continue.
            </p>
          </div>

          {/* Password field */}
          <div className="space-y-2">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              className="w-full h-11 px-4 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-foreground/10 focus:border-foreground/20 transition-all"
            />
            {error && (
              <p className="text-sm text-red-500 font-medium">{error}</p>
            )}
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full h-11 rounded-lg font-medium"
          >
            {loading ? 'Authenticating...' : 'Continue'}
          </Button>
        </form>
      </div>
    </main>
  )
}
