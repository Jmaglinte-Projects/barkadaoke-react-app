import type { QueueItem } from '@/types/queue'
import type { KaraokeRoom, RoomMember } from '@/types/room'
import type { UserProfile } from '@/types/user'
import type { SongSearchResult } from '@/types/youtube'

export const MOCK_USER: UserProfile = {
  uid: 'user-maria',
  displayName: 'Maria Santos',
  email: 'maria@example.com',
  photoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria',
}

export const MOCK_ROOM: KaraokeRoom = {
  id: 'room-demo-001',
  name: 'Friday Night Karaoke',
  hostUserId: 'user-maria',
  roomCode: 'K8P4DZ',
  status: 'active',
  currentQueueItemId: 'q1',
  playbackState: 'playing',
  memberCount: 4,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const MOCK_MEMBERS: RoomMember[] = [
  {
    userId: 'user-maria',
    displayName: 'Maria Santos',
    photoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria',
    role: 'host',
    joinedAt: new Date().toISOString(),
  },
  {
    userId: 'user-john',
    displayName: 'John Reyes',
    photoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=John',
    role: 'guest',
    joinedAt: new Date().toISOString(),
  },
  {
    userId: 'user-carlo',
    displayName: 'Carlo Lim',
    photoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Carlo',
    role: 'guest',
    joinedAt: new Date().toISOString(),
  },
  {
    userId: 'user-anna',
    displayName: 'Anna Cruz',
    photoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Anna',
    role: 'guest',
    joinedAt: new Date().toISOString(),
  },
]

export const MOCK_QUEUE: QueueItem[] = [
  {
    id: 'q1',
    youtubeVideoId: 'yGb1cVqT4mI',
    title: 'A Thousand Years — Christina Perri (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/yGb1cVqT4mI/hqdefault.jpg',
    singerUserId: 'user-maria',
    singerName: 'Maria Santos',
    singerPhotoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Maria',
    status: 'playing',
    order: 1,
    createdAt: new Date().toISOString(),
    startedAt: new Date().toISOString(),
  },
  {
    id: 'q2',
    youtubeVideoId: '2Vv-BfVoq4g',
    title: 'Perfect — Ed Sheeran (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/2Vv-BfVoq4g/hqdefault.jpg',
    singerUserId: 'user-john',
    singerName: 'John Reyes',
    singerPhotoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=John',
    status: 'queued',
    order: 2,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'q3',
    youtubeVideoId: 'RgKAFK5djSk',
    title: 'Always — Bon Jovi (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/RgKAFK5djSk/hqdefault.jpg',
    singerUserId: 'user-carlo',
    singerName: 'Carlo Lim',
    singerPhotoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Carlo',
    status: 'queued',
    order: 3,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'q4',
    youtubeVideoId: 'kJQP7kiw5Fk',
    title: 'Maybe This Time — Karaoke Version',
    thumbnailUrl: 'https://i.ytimg.com/vi/kJQP7kiw5Fk/hqdefault.jpg',
    singerUserId: 'user-anna',
    singerName: 'Anna Cruz',
    singerPhotoURL: 'https://api.dicebear.com/9.x/avataaars/svg?seed=Anna',
    status: 'queued',
    order: 4,
    createdAt: new Date().toISOString(),
  },
]

export const MOCK_SEARCH_RESULTS: SongSearchResult[] = [
  {
    videoId: 'srG9d_gYp9c',
    title: 'When I Was Your Man — Bruno Mars (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/srG9d_gYp9c/hqdefault.jpg',
    channelTitle: 'Sing King Karaoke',
  },
  {
    videoId: 'hT_nvWreIhg',
    title: 'Someone Like You — Adele (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/hT_nvWreIhg/hqdefault.jpg',
    channelTitle: 'Karaoke Version',
  },
  {
    videoId: 'fJ9rUzIMcZQ',
    title: 'Bohemian Rhapsody — Queen (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/fJ9rUzIMcZQ/hqdefault.jpg',
    channelTitle: 'Sing King',
  },
  {
    videoId: 'YykjpeuMNEk',
    title: 'Hymn for the Weekend — Coldplay (Karaoke)',
    thumbnailUrl: 'https://i.ytimg.com/vi/YykjpeuMNEk/hqdefault.jpg',
    channelTitle: 'Karaoke Channel',
  },
]
