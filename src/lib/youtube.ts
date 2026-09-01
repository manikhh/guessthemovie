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
    videoIdOrOptions: string | { videoId: string; startSeconds?: number },
    startSeconds?: number,
  ): void
  cueVideoById(
    videoIdOrOptions: string | { videoId: string; startSeconds?: number },
    startSeconds?: number,
  ): void
  playVideo(): void
  pauseVideo(): void
  stopVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getCurrentTime(): number
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
  }
}

interface YtPlayerConstructor {
  new (elementId: string | HTMLElement, options: YtPlayerOptions): YtPlayer
}

/** Alias for components that reference YT.PlayerState */
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

export function loadYouTubeApi(): Promise<void> {
  if (isApiReady()) return Promise.resolve()
  if (apiPromise) return apiPromise

  apiPromise = new Promise((resolve) => {
    if (isApiReady()) {
      resolve()
      return
    }

    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      prev?.()
      resolve()
    }

    if (!document.querySelector('script[src*="iframe_api"]')) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(tag)
    }

    // Fallback: callback may have fired before we registered it.
    const poll = window.setInterval(() => {
      if (isApiReady()) {
        window.clearInterval(poll)
        resolve()
      }
    }, 50)

    window.setTimeout(() => window.clearInterval(poll), 15_000)
  })

  return apiPromise
}

export function createPlayer(
  element: HTMLElement,
  options: YtPlayerOptions,
): YtPlayer {
  return new window.YT.Player(element, options)
}
