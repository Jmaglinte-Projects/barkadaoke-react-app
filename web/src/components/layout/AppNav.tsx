import type { ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bookmark, DoorOpen, Mic2, Plus, Radio } from 'lucide-react'

import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useActiveRoom } from '@/hooks/useActiveRoom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

export function AppNav() {
  const { user, isAuthenticated, isMockAuth, signOut } = useAuth()
  const { activeRoom, roomPath } = useActiveRoom()
  const location = useLocation()
  const inRoomRoute = location.pathname.startsWith('/room/')

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2 md:h-14 md:flex-row md:items-center md:gap-3 md:py-0 md:px-8">
        <div className="flex items-center justify-between gap-3 md:contents">
          <Link
            to={isAuthenticated ? '/home' : '/'}
            className="flex min-w-0 shrink-0 items-center gap-2 text-foreground"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border text-primary">
              <Mic2 className="size-4" />
            </span>
            <span className="truncate text-sm font-semibold tracking-tight">
              Barkadaoke
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-2 md:order-3">
            {isMockAuth ? (
              <span className="hidden rounded-full border border-border px-2 py-0.5 text-[11px] text-mute xl:inline">
                Demo auth
              </span>
            ) : null}
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center gap-2">
                  <Avatar size="sm">
                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                    <AvatarFallback>
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-[120px] truncate text-sm text-body lg:inline">
                    {user.displayName}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="px-2.5 sm:px-3"
                  onClick={() => {
                    void signOut()
                  }}
                >
                  <span className="sm:hidden">Out</span>
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <GoogleSignInButton
                className="h-8 px-3 text-sm"
                label="Sign in"
              />
            )}
          </div>
        </div>

        {isAuthenticated ? (
          <nav className="flex min-w-0 flex-1 items-center justify-start gap-1 overflow-x-auto md:justify-center md:gap-2 md:order-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeRoom && roomPath ? (
              <>
                {!inRoomRoute ? (
                  <Button asChild size="sm" className="max-w-[220px] shrink-0">
                    <Link to={roomPath} className="truncate">
                      <Radio data-icon="inline-start" />
                      <span className="truncate">
                        Back to {activeRoom.roomCode}
                      </span>
                    </Link>
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border border-border bg-canvas-soft px-3 py-1.5">
                    <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                    <span className="font-mono text-xs tracking-wider text-ink-strong">
                      {activeRoom.roomCode}
                    </span>
                    <span className="hidden max-w-[140px] truncate text-xs text-mute sm:inline">
                      {activeRoom.name}
                    </span>
                  </div>
                )}
                <span className="hidden shrink-0 text-xs text-mute lg:inline">
                  End or leave room to create/join another
                </span>
              </>
            ) : (
              <>
                <NavItem to="/home" label="Home" />
                <NavItem
                  to="/saved"
                  label="Saved"
                  icon={<Bookmark className="size-3.5" />}
                />
                <NavItem
                  to="/create"
                  label="Create"
                  icon={<Plus className="size-3.5" />}
                />
                <NavItem
                  to="/join"
                  label="Join"
                  icon={<DoorOpen className="size-3.5" />}
                />
              </>
            )}
          </nav>
        ) : null}
      </div>
    </header>
  )
}

function NavItem({
  to,
  label,
  icon,
}: {
  to: string
  label: string
  icon?: ReactNode
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
          isActive
            ? 'bg-canvas-soft text-foreground'
            : 'text-body hover:bg-canvas-soft/70 hover:text-foreground',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}
