import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import {
  createPlayer,
  loadYouTubeApi,
  YtPlayerState,
  type YtPlayer,
} from '../lib/youtube'

export interface YouTubePlayerHandle {
  /** Call synchronously inside a user click handler. */
  play: () => void
}

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  durationSec: number
  onPlayingChange?: (playing: boolean) => void
  onErrorChange?: (error: string | null) => void
  onReadyChange?: (ready: boolean) => void
}

const BLOCKED_MSG =
  'YouTube is blocked on this browser. Disable your ad blocker for this site, or try Chrome/Safari without extensions.'

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    { videoId, startSec, durationSec, onPlayingChange, onErrorChange, onReadyChange },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YtPlayer | null>(null)
    const readyRef = useRef(false)
    const playingRef = useRef(false)
    const awaitingPlayRef = useRef(false)
    const pollRef = useRef<number | null>(null)
    const clipTimerRef = useRef<number | null>(null)

    const videoIdRef = useRef(videoId)
    const startSecRef = useRef(startSec)
    const durationRef = useRef(durationSec)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const onErrorChangeRef = useRef(onErrorChange)
    const onReadyChangeRef = useRef(onReadyChange)
    videoIdRef.current = videoId
    startSecRef.current = startSec
    durationRef.current = durationSec
    onPlayingChangeRef.current = onPlayingChange
    onErrorChangeRef.current = onErrorChange
    onReadyChangeRef.current = onReadyChange

    const [status, setStatus] = useState<'loading' | 'ready' | 'blocked'>('loading')

    function clearTimers() {
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      if (clipTimerRef.current !== null) {
        window.clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
    }

    function stopClip() {
      clearTimers()
      playingRef.current = false
      awaitingPlayRef.current = false
      try {
        playerRef.current?.pauseVideo()
      } catch {
        /* ignore */
      }
      onPlayingChangeRef.current?.(false)
    }

    function scheduleStopAt(endSec: number) {
      clearTimers()
      const player = playerRef.current
      if (!player) return

      pollRef.current = window.setInterval(() => {
        try {
          if (player.getCurrentTime() >= endSec) {
            stopClip()
          }
        } catch {
          stopClip()
        }
      }, 50)

      // Hard cap in case getCurrentTime stalls.
      clipTimerRef.current = window.setTimeout(
        stopClip,
        durationRef.current * 1000 + 2000,
      )
    }

    function cueVideo() {
      const player = playerRef.current
      if (!player || !readyRef.current) return
      try {
        player.cueVideoById({
          videoId: videoIdRef.current,
          startSeconds: startSecRef.current,
        })
      } catch {
        /* ignore */
      }
    }

    function startPlayback() {
      const player = playerRef.current
      if (!player || !readyRef.current) return

      awaitingPlayRef.current = true
      onErrorChangeRef.current?.(null)

      try {
        // Video is already cued — reload would flash the default thumbnail.
        player.seekTo(startSecRef.current, true)
        player.playVideo()
      } catch {
        awaitingPlayRef.current = false
        onErrorChangeRef.current?.('Playback failed')
      }
    }

    useImperativeHandle(ref, () => ({
      play() {
        if (!readyRef.current) {
          onErrorChangeRef.current?.(
            status === 'blocked' ? BLOCKED_MSG : 'Player still loading — try again in a second',
          )
          return
        }
        clearTimers()
        startPlayback()
      },
    }))

    useEffect(() => {
      let destroyed = false

      loadYouTubeApi()
        .then(() => {
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
                if (destroyed) return
                readyRef.current = true
                setStatus('ready')
                onReadyChangeRef.current?.(true)
                onErrorChangeRef.current?.(null)
                cueVideo()
              },
              onStateChange: (e) => {
                if (destroyed) return

                if (e.data === YtPlayerState.PLAYING && awaitingPlayRef.current) {
                  playingRef.current = true
                  onPlayingChangeRef.current?.(true)
                  const endAt = startSecRef.current + durationRef.current
                  scheduleStopAt(endAt)
                }

                if (e.data === YtPlayerState.ENDED) {
                  stopClip()
                }
              },
              onError: () => {
                if (destroyed) return
                onErrorChangeRef.current?.('This trailer cannot be played here')
                stopClip()
              },
            },
          })
        })
        .catch(() => {
          if (destroyed) return
          setStatus('blocked')
          onReadyChangeRef.current?.(false)
          onErrorChangeRef.current?.(BLOCKED_MSG)
        })

      return () => {
        destroyed = true
        readyRef.current = false
        clearTimers()
        onReadyChangeRef.current?.(false)
        playerRef.current?.destroy()
        playerRef.current = null
      }
    }, [])

    useEffect(() => {
      if (readyRef.current) cueVideo()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, startSec])

    useEffect(() => () => clearTimers(), [])

    return (
      <div className="player-mount">
        <div className="player-frame" ref={containerRef} />
        {status === 'loading' && (
          <p className="player-status">Loading player…</p>
        )}
        {status === 'blocked' && (
          <p className="player-status player-status-error">{BLOCKED_MSG}</p>
        )}
      </div>
    )
  },
)
