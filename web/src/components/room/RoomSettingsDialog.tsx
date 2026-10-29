import { useState, type FormEvent } from 'react'
import { Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectField } from '@/components/ui/select-field'
import { updateRoomSettings } from '@/firebase/rooms'
import { cn } from '@/lib/utils'
import { formatLimit, isPositiveInteger } from '@/lib/room-limits'
import type { KaraokeRoom, RoomMember, SongLimit } from '@/types/room'

const limitOptions = [
  { value: 'limited', label: 'Set a limit' },
  { value: 'unlimited', label: 'Unlimited' },
]
const memberLimitOptions = [
  { value: 'default', label: 'Use room default' },
  ...limitOptions,
]

/** Empty means Unlimited; 'default' means inherit the room's current default. */
function LimitField({
  id,
  label,
  value,
  onChange,
  allowDefault = false,
  disabled = false,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  allowDefault?: boolean
  disabled?: boolean
}) {
  const mode =
    value === 'default' ? 'default' : value === '' ? 'unlimited' : 'limited'
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div
        className={cn(
          'grid gap-2',
          mode === 'limited' && 'grid-cols-[minmax(0,1fr)_5rem]',
        )}
      >
        <SelectField
          id={id}
          value={mode}
          options={allowDefault ? memberLimitOptions : limitOptions}
          disabled={disabled}
          onValueChange={(mode) =>
            onChange(
              mode === 'default' ? 'default' : mode === 'unlimited' ? '' : '3',
            )
          }
        />
        {mode === 'limited' && (
          <Input
            aria-label={`${label}: number of songs`}
            type="number"
            min={1}
            step={1}
            required
            value={value}
            disabled={disabled}
            onChange={(event) =>
              onChange(event.target.value === '' ? '0' : event.target.value)
            }
            className="h-10 w-full bg-canvas-soft px-3 text-center text-sm tabular-nums dark:bg-canvas-soft"
          />
        )}
      </div>
    </div>
  )
}

function parseSongLimit(value: string): SongLimit {
  if (value === '') return null
  const limit = Number(value)
  if (!isPositiveInteger(limit))
    throw new Error('Song limits must be positive whole numbers, or Unlimited.')
  return limit
}

function SettingsForm({
  room,
  members,
  onSaved,
}: {
  room: KaraokeRoom
  members: RoomMember[]
  onSaved: () => void
}) {
  const [queueLimit, setQueueLimit] = useState(
    room.settings.queueLimit?.toString() ?? '',
  )
  const [songsPerUser, setSongsPerUser] = useState(
    room.settings.songsPerUser?.toString() ?? '',
  )
  const [memberLimit, setMemberLimit] = useState(
    String(room.settings.memberLimit),
  )
  const [initialOverrides] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      members.map((member) => [
        member.userId,
        member.songLimitOverride === undefined
          ? 'default'
          : member.songLimitOverride === null
            ? ''
            : String(member.songLimitOverride),
      ]),
    ),
  )
  const [overrides, setOverrides] = useState(initialOverrides)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setError('')
    try {
      const capacity = Number(memberLimit)
      if (!isPositiveInteger(capacity))
        throw new Error(
          'Room capacity must be a positive whole number, including the host.',
        )
      const settings = {
        queueLimit: parseSongLimit(queueLimit),
        songsPerUser: parseSongLimit(songsPerUser),
        memberLimit: capacity,
      }
      // Only submit edited allowances; defaults keep following future changes.
      const memberSongLimits = members.flatMap((member) => {
        const original =
          initialOverrides[member.userId] ??
          (member.songLimitOverride === undefined
            ? 'default'
            : member.songLimitOverride === null
              ? ''
              : String(member.songLimitOverride))
        const value = overrides[member.userId] ?? original
        return value === original
          ? []
          : [
              {
                userId: member.userId,
                limit:
                  value === 'default'
                    ? ('default' as const)
                    : parseSongLimit(value),
              },
            ]
      })
      setSaving(true)
      await updateRoomSettings(room.id, settings, memberSongLimits)
      toast.success('Room settings updated')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <LimitField
          id="room-queue-limit"
          label="Room queue limit"
          value={queueLimit}
          onChange={setQueueLimit}
          disabled={saving}
        />
        <LimitField
          id="default-song-limit"
          label="Songs per user"
          value={songsPerUser}
          onChange={setSongsPerUser}
          disabled={saving}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="room-member-limit">Room capacity</Label>
        <Input
          id="room-member-limit"
          type="number"
          min={1}
          step={1}
          required
          value={memberLimit}
          onChange={(event) => setMemberLimit(event.target.value)}
          disabled={saving}
          className="h-10 bg-canvas-soft px-3 text-sm tabular-nums dark:bg-canvas-soft"
        />
        <p className="text-xs text-mute">
          Includes you, the host. Currently {members.length} participant
          {members.length === 1 ? '' : 's'}.
        </p>
      </div>
      <section
        className="space-y-4 border-t border-border pt-5"
        aria-labelledby="member-allowances-title"
      >
        <div>
          <h3 id="member-allowances-title" className="text-sm font-semibold">
            Individual song allowances
          </h3>
          <p className="mt-1 text-xs leading-5 text-mute">
            Use the shared default or give someone a custom allowance. Unlimited
            allowances still respect the room queue limit.
          </p>
        </div>
        {members.map((member) => (
          <LimitField
            key={member.userId}
            id={`song-limit-${member.userId}`}
            label={`${member.displayName}${member.role === 'host' ? ' (host)' : ''}`}
            value={
              overrides[member.userId] ??
              (member.songLimitOverride === undefined
                ? 'default'
                : (member.songLimitOverride?.toString() ?? ''))
            }
            onChange={(value) =>
              setOverrides((previous) => ({
                ...previous,
                [member.userId]: value,
              }))
            }
            allowDefault
            disabled={saving}
          />
        ))}
      </section>
      <p className="rounded-md border border-border bg-canvas-soft p-3 text-xs leading-5 text-body">
        Only waiting songs count. Lowering limits keeps existing songs and
        participants; new additions and joins wait until there is space.
      </p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? 'Saving…' : 'Save settings'}
      </Button>
    </form>
  )
}

export function RoomSettingsDialog({
  room,
  members,
}: {
  room: KaraokeRoom
  members: RoomMember[]
}) {
  const [open, setOpen] = useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full">
          <Settings2 aria-hidden="true" />
          Room settings
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90svh] overflow-y-auto sm:max-w-xl"
        onKeyDown={(event) => {
          if (event.key === '/') event.stopPropagation()
        }}
      >
        <DialogHeader>
          <DialogTitle>Room settings</DialogTitle>
          <DialogDescription>
            Queue: {formatLimit(room.settings.queueLimit)} · Default per user:{' '}
            {formatLimit(room.settings.songsPerUser)} · Capacity:{' '}
            {room.settings.memberLimit}
          </DialogDescription>
        </DialogHeader>
        {open && (
          <SettingsForm
            room={room}
            members={members}
            onSaved={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
