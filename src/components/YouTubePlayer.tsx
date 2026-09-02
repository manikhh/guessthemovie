import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface YouTubePlayerHandle {
  /** Must be called synchronously inside a user click handler. */
  play: () => void
}

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  durationSec: number
  onPlayingChange?: (playing: boolean) => void
  onErrorChange?: (error: string | null) => void
}

function buildEmbedUrl(videoId: string, startSec: number): string {
  const start = Math.floor(startSec)
  const params = new URLSearchParams({
    start: String(start),
    autoplay: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    enablejsapi: '0',
    origin: window.location.origin,
  })
  return `https://www.youtube.com/embed/${videoId}?${params}`
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    { videoId, startSec, durationSec, onPlayingChange, onErrorChange },
    ref,
  ) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const clipTimerRef = useRef<number | null>(null)
    const loadTimerRef = useRef<number | null>(null)
    const playingRef = useRef(false)

    const videoIdRef = useRef(videoId)
    const startSecRef = useRef(startSec)
    const durationRef = useRef(durationSec)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const onErrorChangeRef = useRef(onErrorChange)
    videoIdRef.current = videoId
    startSecRef.current = startSec
    durationRef.current = durationSec
    onPlayingChangeRef.current = onPlayingChange
    onErrorChangeRef.current = onErrorChange

    function clearTimers() {
      if (clipTimerRef.current !== null) {
        window.clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current)
        loadTimerRef.current = null
      }
    }

    function stopClip() {
      clearTimers()
      playingRef.current = false
      const iframe = iframeRef.current
      if (iframe) iframe.src = 'about:blank'
      onPlayingChangeRef.current?.(false)
    }

    function startClipTimer() {
      clearTimers()
      // Give the player a moment to actually start after the shell loads.
      const delayMs = 150
      const playMs = Math.max(durationRef.current * 1000, 400)
      clipTimerRef.current = window.setTimeout(stopClip, delayMs + playMs)
    }

    useImperativeHandle(ref, () => ({
      play() {
        const iframe = iframeRef.current
        if (!iframe) return

        clearTimers()
        onErrorChangeRef.current?.(null)

        // Setting src here (inside the click handler) keeps autoplay-with-sound allowed.
        const url = `${buildEmbedUrl(videoIdRef.current, startSecRef.current)}&_=${Date.now()}`
        iframe.src = url
        playingRef.current = true
        onPlayingChangeRef.current?.(true)

        loadTimerRef.current = window.setTimeout(() => {
          if (!playingRef.current) return
          onErrorChangeRef.current?.(
            'Video blocked — allow YouTube embeds or disable your ad blocker.',
          )
          stopClip()
        }, 10_000)
      },
    }))

    function handleIframeLoad() {
      if (!playingRef.current) return

      if (loadTimerRef.current !== null) {
        window.clearTimeout(loadTimerRef.current)
        loadTimerRef.current = null
      }
      onErrorChangeRef.current?.(null)
      startClipTimer()
    }

    useEffect(() => () => clearTimers(), [])

    return (
      <div className="player-mount">
        <iframe
          ref={iframeRef}
          className="player-iframe"
          src="about:blank"
          title="Movie clip"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          onLoad={handleIframeLoad}
        />
      </div>
    )
  },
)
