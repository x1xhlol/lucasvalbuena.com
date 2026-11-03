'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { CircleAlert, Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      if (!res.ok) {
        setError(res.status === 401
          ? 'That password did not match. Try again.'
          : 'Sign-in is unavailable. Try again in a moment.')
        return
      }

      router.replace('/admin/photos')
    } catch {
      setError('Could not connect. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} aria-busy={loading} className="space-y-6">
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full border border-border bg-muted/20 mx-auto mb-2">
              <Lock className="h-5 w-5 text-muted-foreground" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Admin
            </h1>
            <p className="text-sm text-muted-foreground">
              Enter the admin password to continue.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium">
              Password
            </label>
            <Input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              disabled={loading}
              aria-invalid={!!error}
              aria-describedby={error ? 'admin-login-error' : undefined}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('')
              }}
            />
            {error && (
              <p id="admin-login-error" role="alert" className="flex items-start gap-2 text-sm text-destructive">
                <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                {error}
              </p>
            )}
          </div>

          <Button
            type="submit"
            disabled={loading || !password}
            className="w-full h-11 rounded-lg font-medium"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <Link href="/" className="mt-6 flex min-h-11 items-center justify-center text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground">
          Back to the portfolio
        </Link>
      </div>
    </main>
  )
}
