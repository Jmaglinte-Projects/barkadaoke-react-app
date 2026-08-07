import { QRCodeSVG } from 'qrcode.react'

type RoomQRCodeProps = {
  roomCode: string
  size?: number
}

export function RoomQRCode({ roomCode, size = 160 }: RoomQRCodeProps) {
  const appUrl = (
    import.meta.env.VITE_APP_URL ||
    (typeof window !== 'undefined' ? window.location.origin : '')
  ).replace(/\/$/, '')

  const joinUrl = appUrl
    ? `${appUrl}/join/${roomCode}`
    : `/join/${roomCode}`

  return (
    <div className="hairline-card flex flex-col items-center gap-4 p-6">
      <div className="rounded-md bg-white p-3">
        <QRCodeSVG value={joinUrl} size={size} level="M" />
      </div>
      <div className="text-center">
        <p className="eyebrow-mono text-mute">Scan to join</p>
        <p className="mt-1 font-mono text-lg tracking-[0.2em] text-ink-strong">
          {roomCode}
        </p>
        <p className="mt-2 text-sm text-body break-all">{joinUrl}</p>
      </div>
    </div>
  )
}
