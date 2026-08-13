import { initializeApp } from 'firebase-admin/app'
import { setGlobalOptions } from 'firebase-functions/v2'

initializeApp()
setGlobalOptions({ region: 'asia-southeast1', maxInstances: 10 })

export { searchVideos } from './youtube/searchVideos'
export { upsertCatalogSongCallable } from './catalog/upsertCatalogSongCallable'
export { joinRoom } from './rooms/joinRoom'
export { leaveRoom } from './rooms/leaveRoom'
