import type { ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { Mic2, QrCode, Users } from 'lucide-react'

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'

export function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-[50svh] items-center justify-center">
        <p className="text-sm text-body">Loading…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />
  }

  return (
    <main>
      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-20">
        <p className="eyebrow-mono text-primary">Shared karaoke queue</p>
        <h1 className="display-xl mt-4 max-w-3xl">
          Everyone can queue. Nobody fights over the remote.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-7 text-body">
          Host on the TV. Guests join from their phones. Search, queue, and
          take turns — without interrupting the current singer.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <GoogleSignInButton />
          <Button variant="outline" size="lg" asChild>
            <Link to="/join">Enter room code</Link>
          </Button>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <div className="dashed-divider" />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-12 md:px-8 md:py-16">
        <p className="eyebrow-mono text-mute">How it works</p>
        <h2 className="display-lg mt-3 text-ink-strong">
          Separate song selection from playback.
        </h2>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Mic2 className="size-5 text-primary" />}
            title="Host on TV"
            body="Create a room, show the QR code, and control YouTube playback from one device."
          />
          <FeatureCard
            icon={<QrCode className="size-5 text-primary" />}
            title="Join by code"
            body="Guests scan the QR or type a short room code like K8P4DZ on their phones."
          />
          <FeatureCard
            icon={<Users className="size-5 text-primary" />}
            title="Shared queue"
            body="Everyone sees who is singing now, who is next, and can add songs without interruption."
          />
        </div>
      </section>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: ReactNode
  title: string
  body: string
}) {
  return (
    <article className="hairline-card p-6">
      <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border">
        {icon}
      </div>
      <h3 className="display-sm">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-body">{body}</p>
    </article>
  )
}
