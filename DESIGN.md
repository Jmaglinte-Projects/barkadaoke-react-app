# Design References

This document is the source of truth for product behavior,
application architecture, features, and business logic.

For visual design, UI components, styling, layout, and design-system
decisions, follow:

`DESIGN-voltagent.md`

If the documents conflict:

- `DESIGN.md` wins for functionality and application behavior.
- `DESIGN-voltagent.md` wins for visual and UX design.

# Shared Karaoke Queue — Design Document

## 1. Overview

Shared Karaoke Queue is a realtime web application that lets multiple people participate in a YouTube-powered karaoke session using their own devices.

One device acts as the host and is typically connected to a TV.

Other participants join the session using their phones.

Participants can search for karaoke videos and add songs to a shared queue without interrupting the current singer.

The host controls playback.

---

# 2. Problem

Groups often use YouTube for karaoke.

The common setup is:

TV + YouTube + one phone or remote.

This creates several problems:

- Only one person controls song selection.
- People interrupt the current singer to search for the next song.
- There is no visible singer order.
- People forget whose turn is next.
- Someone can dominate the queue.
- Searching between songs creates unnecessary downtime.

The application solves this by separating:

Song selection

from

Video playback.

Guests control song requests.

The host controls playback.

---

# 3. Core Experience

Typical session:

1. Host signs in.
2. Host creates a karaoke room.
3. TV displays the host interface.
4. TV shows a QR code and room code.
5. Guests scan the QR code.
6. Guests sign in using Google.
7. Guests join the room.
8. Guests search for karaoke songs.
9. Guests add songs to the queue.
10. Firestore synchronizes the queue to all devices.
11. Host starts the first song.
12. YouTube plays on the host device.
13. Everyone sees who is currently singing.
14. Everyone sees who is next.
15. When the song ends, the host advances to the next singer.
16. The session continues until the host ends the room.

---

# 4. Technology

## Frontend

React
TypeScript
Shadcn
Responsive web application
Optional PWA support later.

## Backend

Firebase

## External APIs

YouTube Data API v3

Used for:

- video search
- video metadata

YouTube IFrame Player API

Used for:

- embedded playback
- playback state
- video completion events

---

# 5. Authentication

Authentication provider:

Google Sign-In using Firebase Authentication.

All hosts and guests must authenticate.

User:

```ts
type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
};
```

The user's Firebase UID acts as the primary identity.

---

# 6. Roles

There are two room roles.

## Host

The room creator.

Permissions:

- read room
- join room
- play current song
- pause current song
- restart current song
- skip song
- play next
- reorder queue
- remove any queue item
- end room

## Guest

Permissions:

- read room
- join room
- search songs
- add song
- view queue
- remove own queued song

Guests cannot directly control host playback.

---

# 7. Room Model

Firestore path:

```text
rooms/{roomId}
```

Suggested model:

```ts
type KaraokeRoom = {
  id: string;

  name: string;

  hostUserId: string;

  roomCode: string;

  status: "waiting" | "active" | "ended";

  currentQueueItemId: string | null;

  createdAt: Timestamp;

  updatedAt: Timestamp;
};
```

Room codes should be short and human-readable.

Example:

```text
K8P4DZ
```

Room IDs and room codes are different.

Room ID is Firestore's internal document identifier.

Room code is used by guests.

---

# 8. Room Membership

Firestore path:

```text
rooms/{roomId}/members/{uid}
```

Model:

```ts
type RoomMember = {
  userId: string;

  displayName: string;

  photoURL?: string;

  role: "host" | "guest";

  joinedAt: Timestamp;
};
```

---

# 9. Queue

Firestore path:

```text
rooms/{roomId}/queue/{queueItemId}
```

Model:

```ts
type QueueItem = {
  id: string;

  youtubeVideoId: string;

  title: string;

  thumbnailUrl: string;

  singerUserId: string;

  singerName: string;

  singerPhotoURL?: string;

  status: "queued" | "playing" | "completed" | "skipped" | "removed";

  order: number;

  createdAt: Timestamp;

  startedAt?: Timestamp;

  completedAt?: Timestamp;
};
```

---

# 10. Queue Behavior

Initial queue strategy:

FIFO.

First song added is played first.

Later versions can support:

- drag-and-drop reorder
- voting
- priority
- singer rotation
- randomized ordering
- fairness algorithms

For MVP, consider limiting each participant to:

1 upcoming song.

A user can queue another song once their previous song begins or finishes.

This prevents one participant from flooding the queue.

---

# 11. Realtime Synchronization

Firestore listeners synchronize:

Room state

Members

Queue

Current song

Host controls should update Firestore only when shared state needs to change.

Playback time does not need to continuously synchronize to guests.

Guests only need state such as:

playing

paused

current singer

current song

next singer

---

# 12. YouTube Search

Guests search through the application.

Example input:

```text
When I Was Your Man
```

Backend search query may become:

```text
When I Was Your Man karaoke
```

Frontend should debounce typing.

Suggested delay:

400–700 ms.

Search requests should use a Firebase Cloud Function.

Frontend:

```text
Guest
↓
Firebase Function
↓
YouTube Data API
↓
Search results
```

Do not expose the YouTube API secret directly in frontend code.

Search responses should contain only required fields.

Example:

```ts
type SongSearchResult = {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
};
```

Caching should eventually be implemented to reduce API usage.

---

# 13. YouTube Playback

Playback happens only on the host interface.

Use YouTube IFrame Player API.

Host should react to:

```text
READY

PLAYING

PAUSED

ENDED

ERROR

AUTOPLAY_BLOCKED
```

When a video ends:

```text
current song
↓
completed
↓
find next queued song
↓
set next song as current
↓
load next YouTube video
```

MVP may require the host to press:

Next

to start the next song.

This is acceptable and may be preferable initially because browsers can restrict autoplay.

---

# 14. Host Controls

Host interface provides:

## Play

Start/resume current video.

## Pause

Pause current video.

## Restart

Seek current video to zero.

## Next

Mark current song completed.

Load next queued song.

## Skip

Mark current song skipped.

Load next queued song.

## Remove

Remove a queue entry.

## Reorder

Change upcoming queue ordering.

Reordering can be added after the base queue system is stable.

---

# 15. Guest Experience

Mobile guest interface should prioritize:

Current singer

Who's next

Search

Queue

My song

Suggested bottom navigation:

```text
Now Playing
Search
Queue
```

Guest should never need access to the YouTube player.

---

# 16. Host Experience

Host UI is designed for a TV or laptop.

Suggested layout:

```text
+------------------------------------------------+
| ROOM NAME                  CODE: K8P4DZ        |
+------------------------------------------------+
|                                                |
|                                                |
|              YOUTUBE PLAYER                    |
|                                                |
|                                                |
+------------------------------------------------+
| NOW SINGING                                    |
| Maria — A Thousand Years                       |
+------------------------------------------------+
| NEXT                                           |
| John — Perfect                                 |
+------------------------------------------------+
| QUEUE                                          |
| 1. John — Perfect                              |
| 2. Carlo — Always                              |
| 3. Anna — Maybe This Time                      |
+------------------------------------------------+
| [Restart] [Pause] [Skip] [Next]                |
+------------------------------------------------+
```

---

# 17. QR Joining

Each room should expose a URL:

```text
https://app.example.com/join/{roomCode}
```

Generate a QR code from this URL.

Guest scans QR.

Application opens join flow.

After authentication, guest automatically enters the referenced room.

---

# 18. Suggested Routes

```text
/
```

Landing/authentication.

```text
/home
```

User home.

```text
/create
```

Create room.

```text
/join
```

Manual room-code entry.

```text
/join/:roomCode
```

QR join.

```text
/room/:roomId
```

Guest room.

```text
/room/:roomId/host
```

Host interface.

---

# 19. Security Model

Security must not depend solely on frontend controls.

Firestore Security Rules must verify:

- user is authenticated
- user belongs to room
- hostUserId matches authenticated user for host actions
- guests can modify only permitted resources

Guests must not be able to:

- make themselves host
- change room host
- set current song
- skip another singer
- end room
- modify another user's queue entries

Cloud Functions should be used for operations requiring trusted server logic.

---

# 20. Suggested Application Structure

```text
src/
  app/
    router.tsx

  components/
    auth/
      GoogleSignInButton.tsx

    room/
      RoomHeader.tsx
      RoomQRCode.tsx
      MemberList.tsx

    queue/
      QueueList.tsx
      QueueItem.tsx
      CurrentSinger.tsx
      NextSinger.tsx

    search/
      SongSearch.tsx
      SongSearchResult.tsx

    player/
      YouTubePlayer.tsx
      HostControls.tsx

  hooks/
    useAuth.ts
    useRoom.ts
    useRoomMembers.ts
    useQueue.ts
    useYouTubeSearch.ts

  firebase/
    config.ts
    auth.ts
    rooms.ts
    queue.ts

  types/
    user.ts
    room.ts
    queue.ts
    youtube.ts

  pages/
    LandingPage.tsx
    HomePage.tsx
    CreateRoomPage.tsx
    JoinRoomPage.tsx
    GuestRoomPage.tsx
    HostRoomPage.tsx
```

Cloud Functions:

```text
functions/
  src/
    youtube/
      searchVideos.ts

    rooms/
      createRoom.ts
      joinRoom.ts
      endRoom.ts

    queue/
      addSong.ts
      skipSong.ts
      nextSong.ts
      reorderQueue.ts
```

---

# 21. MVP Scope

Version 1 must support:

- Google Sign-In
- Create room
- Join room
- QR joining
- Realtime participants
- Search YouTube
- Add song to queue
- Realtime queue
- Show current singer
- Show next singer
- Host YouTube playback
- Play
- Pause
- Restart
- Next
- Skip
- Remove queue item
- Room ending
- Firebase Security Rules
- Responsive guest interface
- TV-friendly host interface

Not required for V1:

- scoring
- microphone input
- pitch detection
- lyrics extraction
- native iOS app
- native Android app
- payments
- subscriptions
- social profiles
- recording
- leaderboards

---

# 22. Future Features

Possible later features:

Singer rotation

Queue voting

Favorites

Song history

Recently sung

Save favorite karaoke videos

Private/public rooms

Room themes

Party reactions

Emoji reactions

Song deduplication

Host moderation

Multiple hosts

Remote volume controls where technically possible

PWA installation

Party statistics

Most-sung songs

Singer profiles

Permanent friend groups

---

# 23. Product Principle

The application is not trying to replace YouTube.

YouTube provides the video catalog and playback.

The application provides:

Coordination

Queueing

Turn management

Multi-device participation

Party experience

The core value proposition is:

**Everyone can queue. Nobody has to fight over the remote.**
