import { useEffect, useRef, useState } from 'react'

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  durationSec: number
  playToken: number
  onPlayingChange?: (playing: boolean) => void
  onReadyChange?: (ready: boolean) => void
  onErrorChange?: (error: string | null) => void
}

function buildEmbedUrl(videoId: string, startSec: number): string {
  const params = new URLSearchParams({
    start: String(Math.floor(startSec)),
    autoplay: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    iv_load_policy: '3',
    modestbranding: '1',
    playsinline: '1',
    rel: '0',
    origin: window.location.origin,
  })
  // nocookie domain — no iframe_api script, works through most ad blockers.
  return `https://www.youtube-nocookie.com/embed/${videoId}?${params}`
}

/**
 * Plays a short clip via a plain YouTube embed iframe.
 * Does NOT load youtube.com/iframe_api (commonly blocked by ad blockers).
 */
export function YouTubePlayer({
  videoId,
  startSec,
  durationSec,
  playToken,
  onPlayingChange,
  onReadyChange,
  onErrorChange,
}: YouTubePlayerProps) {
  const [activeToken, setActiveToken] = useState(0)
  const timerRef = useRef<number | null>(null)
  const loadTimerRef = useRef<number | null>(null)

  const durationRef = useRef(durationSec)
  const onPlayingChangeRef = useRef(onPlayingChange)
  const onErrorChangeRef = useRef(onErrorChange)
  durationRef.current = durationSec
  onPlayingChangeRef.current = onPlayingChange
  onErrorChangeRef.current = onErrorChange

  function clearTimers() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current)
      loadTimerRef.current = null
    }
  }

  function stopClip() {
    clearTimers()
    setActiveToken(0)
    onPlayingChangeRef.current?.(false)
  }

  // Ready immediately — no external script required.
  useEffect(() => {
    onReadyChange?.(true)
    onErrorChangeRef.current?.(null)
    return () => {
      clearTimers()
      onReadyChange?.(false)
    }
  }, [onReadyChange])

  // Start a new clip whenever playToken increments.
  useEffect(() => {
    if (playToken <= 0) return
    clearTimers()
    onErrorChangeRef.current?.(null)
    setActiveToken(playToken)

    // If the iframe never loads (fully blocked embed), surface an error.
    loadTimerRef.current = window.setTimeout(() => {
      onErrorChangeRef.current?.(
        'Video blocked — disable your ad blocker for this site, or try another browser.',
      )
      stopClip()
    }, 12_000)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken])

  function handleIframeLoad() {
    if (loadTimerRef.current !== null) {
      window.clearTimeout(loadTimerRef.current)
      loadTimerRef.current = null
    }
    onErrorChangeRef.current?.(null)
    onPlayingChangeRef.current?.(true)

    timerRef.current = window.setTimeout(stopClip, durationRef.current * 1000)
  }

  const showIframe = activeToken > 0

  return (
    <div className="player-mount">
      {showIframe && (
        <iframe
          key={`${videoId}-${startSec}-${activeToken}`}
          className="player-iframe"
          src={buildEmbedUrl(videoId, startSec)}
          title="Movie clip"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen={false}
          onLoad={handleIframeLoad}
        />
      )}
    </div>
  )
}
