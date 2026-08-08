import { ChevronDown } from 'lucide-react'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  MAX_ROOM_MEMBERS,
  type AssignableMemberRole,
  type RoomMember,
} from '@/types/room'

type MemberListProps = {
  members: RoomMember[]
  /** When true, show guest/controller role controls for non-host members. */
  canManageRoles?: boolean
  rolePendingUserId?: string | null
  onChangeRole?: (userId: string, role: AssignableMemberRole) => void
}

export function MemberList({
  members,
  canManageRoles = false,
  rolePendingUserId = null,
  onChangeRole,
}: MemberListProps) {
  const isFull = members.length >= MAX_ROOM_MEMBERS

  return (
    <div className="hairline-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow-mono text-mute">Participants</p>
        <div className="flex items-center gap-2">
          {isFull ? (
            <Badge variant="outline" className="rounded-full">
              Full
            </Badge>
          ) : null}
          <span className="font-mono text-sm text-body">
            {members.length}/{MAX_ROOM_MEMBERS}
          </span>
        </div>
      </div>
      <ul className="space-y-3">
        {members.map((member) => {
          const showRoleSelect =
            canManageRoles &&
            member.role !== 'host' &&
            typeof onChangeRole === 'function'
          const isPending = rolePendingUserId === member.userId

          return (
            <li key={member.userId} className="flex items-center gap-3">
              <Avatar size="sm">
                <AvatarImage src={member.photoURL} alt={member.displayName} />
                <AvatarFallback>
                  {member.displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {member.displayName}
                </p>
              </div>
              {member.role === 'host' ? (
                <Badge variant="outline" className="rounded-full">
                  Host
                </Badge>
              ) : showRoleSelect ? (
                <div className="relative shrink-0">
                  <select
                    aria-label={`Role for ${member.displayName}`}
                    className="h-8 max-w-[9.5rem] appearance-none rounded-md border border-border bg-background py-0 pl-2.5 pr-8 font-mono text-xs text-foreground outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50"
                    value={
                      member.role === 'controller' ? 'controller' : 'guest'
                    }
                    disabled={isPending}
                    onChange={(event) => {
                      onChangeRole(
                        member.userId,
                        event.target.value as AssignableMemberRole,
                      )
                    }}
                  >
                    <option value="guest">Guest</option>
                    <option value="controller">Controller</option>
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-mute"
                  />
                </div>
              ) : member.role === 'controller' ? (
                <Badge variant="default" className="rounded-full">
                  Controller
                </Badge>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
