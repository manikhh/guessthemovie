import { useEffect, useRef } from 'react'
import { createPlayer, loadYouTubeApi, YtPlayerState, type YtPlayer } from '../lib/youtube'

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  durationSec: number
  /** Increment to trigger playback. */
  playToken: number
  onPlayingChange?: (playing: boolean) => void
  onReadyChange?: (ready: boolean) => void
}

export function YouTubePlayer({
  videoId,
  startSec,
  durationSec,
  playToken,
  onPlayingChange,
  onReadyChange,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YtPlayer | null>(null)
  const readyRef = useRef(false)
  const pauseTimerRef = useRef<number | null>(null)
  const awaitingPlayRef = useRef(false)
  const cuedVideoRef = useRef<string | null>(null)

  const videoIdRef = useRef(videoId)
  const startSecRef = useRef(startSec)
  const durationSecRef = useRef(durationSec)
  const playTokenRef = useRef(playToken)
  const onPlayingChangeRef = useRef(onPlayingChange)
  const onReadyChangeRef = useRef(onReadyChange)
  videoIdRef.current = videoId
  startSecRef.current = startSec
  durationSecRef.current = durationSec
  playTokenRef.current = playToken
  onPlayingChangeRef.current = onPlayingChange
  onReadyChangeRef.current = onReadyChange

  function clearPauseTimer() {
    if (pauseTimerRef.current !== null) {
      window.clearTimeout(pauseTimerRef.current)
      pauseTimerRef.current = null
    }
  }

  function stopClip() {
    clearPauseTimer()
    awaitingPlayRef.current = false
    try {
      playerRef.current?.pauseVideo()
    } catch {
      /* player gone */
    }
    onPlayingChangeRef.current?.(false)
  }

  function cueCurrentVideo() {
    const player = playerRef.current
    if (!player || !readyRef.current) return false

    const id = videoIdRef.current
    const start = startSecRef.current
    if (cuedVideoRef.current === id) return true

    stopClip()
    try {
      player.cueVideoById({ videoId: id, startSeconds: start })
      cuedVideoRef.current = id
      return true
    } catch {
      return false
    }
  }

  function playClip() {
    const player = playerRef.current
    if (!player || !readyRef.current) return

    clearPauseTimer()
    awaitingPlayRef.current = true

    try {
      if (!cueCurrentVideo()) {
        player.loadVideoById({
          videoId: videoIdRef.current,
          startSeconds: startSecRef.current,
        })
        cuedVideoRef.current = videoIdRef.current
      } else {
        player.seekTo(startSecRef.current, true)
      }
      player.playVideo()
    } catch {
      awaitingPlayRef.current = false
    }
  }

  useEffect(() => {
    let destroyed = false
    readyRef.current = false
    cuedVideoRef.current = null

    loadYouTubeApi().then(() => {
      if (destroyed || !containerRef.current || playerRef.current) return

      playerRef.current = createPlayer(containerRef.current, {
        height: '100%',
        width: '100%',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
          modestbranding: 1,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            readyRef.current = true
            onReadyChangeRef.current?.(true)
            cueCurrentVideo()
            if (playTokenRef.current > 0) playClip()
          },
          onStateChange: (e) => {
            const player = playerRef.current
            if (!player) return

            if (e.data === YtPlayerState.PLAYING) {
              if (!awaitingPlayRef.current) return
              onPlayingChangeRef.current?.(true)
              clearPauseTimer()
              pauseTimerRef.current = window.setTimeout(
                stopClip,
                durationSecRef.current * 1000,
              )
            }

            if (e.data === YtPlayerState.ENDED) stopClip()
          },
        },
      })
    })

    return () => {
      destroyed = true
      readyRef.current = false
      cuedVideoRef.current = null
      awaitingPlayRef.current = false
      onReadyChangeRef.current?.(false)
      clearPauseTimer()
      playerRef.current?.destroy()
      playerRef.current = null
    }
  }, [])

  useEffect(() => {
    cuedVideoRef.current = null
    if (readyRef.current) cueCurrentVideo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, startSec])

  useEffect(() => {
    if (playToken > 0) playClip()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playToken])

  return <div className="player-frame" ref={containerRef} />
}
