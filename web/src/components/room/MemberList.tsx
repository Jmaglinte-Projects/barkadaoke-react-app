import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MAX_ROOM_MEMBERS, type RoomMember } from '@/types/room'

type MemberListProps = {
  members: RoomMember[]
}

export function MemberList({ members }: MemberListProps) {
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
        {members.map((member) => (
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
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
