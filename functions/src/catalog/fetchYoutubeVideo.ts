import { logger } from 'firebase-functions'

export type YoutubeVideoSnippet = {
  videoId: string
  title: string
  thumbnailUrl: string
  channelTitle: string
}

export type FetchYoutubeVideoResult =
  | { status: 'found'; video: YoutubeVideoSnippet }
  | { status: 'missing' }
  | { status: 'error'; message: string }

type YoutubeVideosListItem = {
  id?: string
  snippet?: {
    title?: string
    channelTitle?: string
    thumbnails?: {
      medium?: { url?: string }
      default?: { url?: string }
    }
  }
}

/**
 * Cheap per-video metadata refresh via YouTube Data API `videos.list`.
 * Prefer this over Search API when validating a known videoId.
 */
export async function fetchYoutubeVideoMetadata(
  videoId: string,
  apiKey: string,
): Promise<FetchYoutubeVideoResult> {
  const url = new URL('https://www.googleapis.com/youtube/v3/videos')
  url.searchParams.set('part', 'snippet')
  url.searchParams.set('id', videoId)
  url.searchParams.set('key', apiKey)

  let response: Response
  try {
    response = await fetch(url)
  } catch (error) {
    logger.error('YouTube videos.list network error', error)
    return { status: 'error', message: 'Failed to reach YouTube.' }
  }

  if (!response.ok) {
    const body = await response.text()
    logger.error('YouTube videos.list failed', {
      status: response.status,
      body,
    })
    return {
      status: 'error',
      message: 'YouTube video lookup failed. Check the API key and quota.',
    }
  }

  const json = (await response.json()) as { items?: YoutubeVideosListItem[] }
  const item = json.items?.[0]
  if (!item?.id) {
    return { status: 'missing' }
  }

  return {
    status: 'found',
    video: {
      videoId: item.id,
      title: item.snippet?.title ?? 'Untitled',
      thumbnailUrl:
        item.snippet?.thumbnails?.medium?.url ??
        item.snippet?.thumbnails?.default?.url ??
        '',
      channelTitle: item.snippet?.channelTitle ?? 'YouTube',
    },
  }
}
