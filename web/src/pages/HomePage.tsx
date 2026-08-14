import { Link } from "react-router-dom";
import { LogIn, Plus, Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useActiveRoom } from "@/hooks/useActiveRoom";
import { useAuth } from "@/hooks/useAuth";

export function HomePage() {
  const { user } = useAuth();
  const { activeRoom, roomPath, isLoading } = useActiveRoom();

  if (!user) {
    return null;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <p className="eyebrow-mono text-mute">Welcome back</p>
      <h1 className="display-lg mt-2 text-ink-strong">
        Hey, {user.displayName.split(" ")[0]}
      </h1>
      <p className="mt-3 max-w-lg text-body">
        {activeRoom
          ? "You are already in a karaoke session. Return to it, or end/leave before starting another."
          : "Start a karaoke room for the TV, or join a friend with a room code."}
      </p>

      {isLoading ? (
        <p className="mt-10 text-sm text-body">Checking active room…</p>
      ) : activeRoom && roomPath ? (
        <section className="hairline-card mt-10 p-6">
          <p className="eyebrow-mono text-primary">Active room</p>
          <h2 className="display-sm mt-2">{activeRoom.name}</h2>
          <p className="mt-1 font-mono text-sm tracking-wider text-body">
            {activeRoom.roomCode}
            <span className="ml-2 text-mute">· {activeRoom.role}</span>
          </p>
          <Button asChild className="mt-6" size="lg">
            <Link to={roomPath}>
              <Radio data-icon="inline-start" />
              Return to room
            </Link>
          </Button>
        </section>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <Link
            to="/create"
            className="hairline-card group block p-6 transition-shadow hover:shadow-[0_0_15px_rgba(92,88,85,0.2)]"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border text-primary">
              <Plus className="size-5" />
            </div>
            <h2 className="display-sm">Create a room</h2>
            <p className="mt-2 text-sm text-body">
              You&apos;ll host playback on this device — best for TV or laptop.
            </p>
            <Button className="mt-6" tabIndex={-1}>
              Create room
            </Button>
          </Link>

          <Link
            to="/join"
            className="hairline-card group block p-6 transition-shadow hover:shadow-[0_0_15px_rgba(92,88,85,0.2)]"
          >
            <div className="mb-4 flex size-10 items-center justify-center rounded-md border border-border text-primary">
              <LogIn className="size-5" />
            </div>
            <h2 className="display-sm">Join a room</h2>
            <p className="mt-2 text-sm text-body">
              Enter a room code or scan the host QR to start requesting songs.
            </p>
            <Button variant="outline" className="mt-6" tabIndex={-1}>
              Join room
            </Button>
          </Link>
        </div>
      )}
    </main>
  );
}
