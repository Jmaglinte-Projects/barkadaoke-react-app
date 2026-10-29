import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SelectField } from '@/components/ui/select-field'
import { DEFAULT_ROOM_SETTINGS } from '@/lib/room-limits'
import type {
  AssignableMemberRole,
  RoomMember,
  RoomSettings,
} from '@/types/room'

const roleOptions = [
  { value: 'guest', label: 'Guest' },
  { value: 'controller', label: 'Controller' },
]

type MemberListProps = {
  members: RoomMember[]
  settings?: RoomSettings
  /** When true, show guest/controller role controls for non-host members. */
  canManageRoles?: boolean
  rolePendingUserId?: string | null
  onChangeRole?: (userId: string, role: AssignableMemberRole) => void
}

export function MemberList({
  members,
  settings = DEFAULT_ROOM_SETTINGS,
  canManageRoles = false,
  rolePendingUserId = null,
  onChangeRole,
}: MemberListProps) {
  const isFull = members.length >= settings.memberLimit

  return (
    <div className="hairline-card p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="eyebrow-mono text-mute">Participants</p>
        <div className="flex items-center gap-2">
          {isFull ? (
            <Badge variant="outline" className="h-8 shrink-0 rounded-full px-3">
              Full
            </Badge>
          ) : null}
          <span className="font-mono text-sm text-body">
            {members.length}/{settings.memberLimit}
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
                <Badge
                  variant="outline"
                  className="h-8 shrink-0 rounded-full px-3"
                >
                  Host
                </Badge>
              ) : showRoleSelect ? (
                <SelectField
                  aria-label={`Role for ${member.displayName}`}
                  value={member.role === 'controller' ? 'controller' : 'guest'}
                  options={roleOptions}
                  disabled={isPending}
                  className="h-8 w-29 shrink-0 rounded-full bg-canvas-soft/60 px-3 text-xs"
                  onValueChange={(role) => {
                    if (role === 'guest' || role === 'controller')
                      onChangeRole?.(member.userId, role)
                  }}
                />
              ) : member.role === 'controller' ? (
                <Badge
                  variant="default"
                  className="h-8 shrink-0 rounded-full px-3"
                >
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
