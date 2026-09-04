declare global {
  interface Window {
    YT: {
      Player: YtPlayerConstructor
      PlayerState: typeof YtPlayerState
    }
    onYouTubeIframeAPIReady: () => void
  }
}

export const YtPlayerState = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
} as const

export type YtPlayerState = (typeof YtPlayerState)[keyof typeof YtPlayerState]

export interface YtPlayer {
  loadVideoById(
    videoIdOrOptions:
      | string
      | { videoId: string; startSeconds?: number; endSeconds?: number },
    startSeconds?: number,
  ): void
  cueVideoById(
    videoIdOrOptions:
      | string
      | { videoId: string; startSeconds?: number; endSeconds?: number },
    startSeconds?: number,
  ): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  setVolume(volume: number): void
  getVolume(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
  getPlayerState(): number
  setPlaybackQuality(suggestedQuality: string): void
  destroy(): void
}

export interface YtPlayerOptions {
  height?: string | number
  width?: string | number
  videoId?: string
  playerVars?: Record<string, string | number>
  events?: {
    onReady?: (event: { target: YtPlayer }) => void
    onStateChange?: (event: { data: YtPlayerState; target: YtPlayer }) => void
    onError?: (event: { data: number }) => void
  }
}

interface YtPlayerConstructor {
  new (elementId: string | HTMLElement, options: YtPlayerOptions): YtPlayer
}

export const YT = {
  get PlayerState() {
    return window.YT?.PlayerState ?? YtPlayerState
  },
  Player: null as unknown as YtPlayerConstructor,
}

let apiPromise: Promise<void> | null = null

function isApiReady(): boolean {
  return typeof window.YT?.Player === 'function'
}

export function loadYouTubeApi(timeoutMs = 20_000): Promise<void> {
  if (isApiReady()) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve, reject) => {
    if (isApiReady()) {
      resolve()
      return
    }

    let settled = false
    const finish = (fn: () => void) => {
      if (settled) return
      settled = true
      window.clearInterval(poll)
      window.clearTimeout(timeout)
      fn()
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      finish(resolve)
    }

    if (!document.querySelector('script[src*="iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      tag.async = true
      tag.onerror = () => finish(() => reject(new Error('YouTube script blocked')))
      document.head.appendChild(tag)
    }

    const poll = window.setInterval(() => {
      if (isApiReady()) finish(resolve)
    }, 100)

    const timeout = window.setTimeout(() => {
      finish(() => reject(new Error('YouTube API timed out')))
    }, timeoutMs)
  })

  apiPromise.catch(() => {
    apiPromise = null
  })

  return apiPromise
}

export function createPlayer(
  element: HTMLElement,
  options: YtPlayerOptions,
): YtPlayer {
  return new window.YT.Player(element, options)
}
