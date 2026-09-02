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
  /** Warm the next clip while the player is idle (e.g. hover on Next). */
  preloadNext: (videoId: string, startSec: number) => void
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
    const loadedVideoIdRef = useRef<string | null>(null)
    const pendingPlayRef = useRef(false)
    const playingRef = useRef(false)
    const awaitingPlayRef = useRef(false)
    const pollRef = useRef<number | null>(null)
    const revealPollRef = useRef<number | null>(null)
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
    const [frameVisible, setFrameVisible] = useState(false)

    function clearRevealPoll() {
      if (revealPollRef.current !== null) {
        window.clearInterval(revealPollRef.current)
        revealPollRef.current = null
      }
    }

    function clearTimers() {
      clearRevealPoll()
      if (pollRef.current !== null) {
        window.clearInterval(pollRef.current)
        pollRef.current = null
      }
      if (clipTimerRef.current !== null) {
        window.clearTimeout(clipTimerRef.current)
        clipTimerRef.current = null
      }
    }

    function revealClip(endAt: number) {
      playingRef.current = true
      setFrameVisible(true)
      onPlayingChangeRef.current?.(true)
      scheduleStopAt(endAt)
    }

    function waitForClipFrame(endAt: number) {
      clearRevealPoll()
      const player = playerRef.current
      if (!player) return

      let attempts = 0
      revealPollRef.current = window.setInterval(() => {
        attempts += 1
        try {
          const atClip = player.getCurrentTime() >= startSecRef.current - 0.5
          if (atClip || attempts >= 60) {
            clearRevealPoll()
            revealClip(endAt)
          }
        } catch {
          clearRevealPoll()
          stopClip()
        }
      }, 50)
    }

    function stopClip() {
      clearTimers()
      playingRef.current = false
      awaitingPlayRef.current = false
      setFrameVisible(false)
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

    function loadClip(videoId: string, startSec: number) {
      const player = playerRef.current
      if (!player || !readyRef.current) return

      if (loadedVideoIdRef.current === videoId) {
        onReadyChangeRef.current?.(true)
        return
      }

      setFrameVisible(false)
      onReadyChangeRef.current?.(false)
      loadedVideoIdRef.current = videoId
      try {
        player.loadVideoById({ videoId, startSeconds: startSec })
      } catch {
        loadedVideoIdRef.current = null
      }
    }

    function preloadVideo() {
      loadClip(videoIdRef.current, startSecRef.current)
    }

    function warmClip(videoId: string, startSec: number) {
      if (!readyRef.current || playingRef.current || awaitingPlayRef.current) return
      if (loadedVideoIdRef.current === videoId) return
      loadClip(videoId, startSec)
    }

    function startPlayback() {
      const player = playerRef.current
      if (!player || !readyRef.current) return

      awaitingPlayRef.current = true
      onErrorChangeRef.current?.(null)

      try {
        if (loadedVideoIdRef.current !== videoIdRef.current) {
          pendingPlayRef.current = true
          preloadVideo()
          return
        }
        player.seekTo(startSecRef.current, true)
        player.playVideo()
      } catch {
        awaitingPlayRef.current = false
        pendingPlayRef.current = false
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
      preloadNext(videoId: string, startSec: number) {
        warmClip(videoId, startSec)
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
            videoId: videoIdRef.current,
            playerVars: {
              autoplay: 0,
              cc_load_policy: 0,
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              start: startSecRef.current,
              origin: window.location.origin,
            },
            events: {
              onReady: () => {
                if (destroyed) return
                readyRef.current = true
                loadedVideoIdRef.current = videoIdRef.current
                setStatus('ready')
                onErrorChangeRef.current?.(null)
                onReadyChangeRef.current?.(false)
              },
              onStateChange: (e) => {
                if (destroyed) return

                if (
                  (e.data === YtPlayerState.PAUSED || e.data === YtPlayerState.CUED) &&
                  !awaitingPlayRef.current &&
                  !playingRef.current
                ) {
                  onReadyChangeRef.current?.(true)

                  if (pendingPlayRef.current && loadedVideoIdRef.current === videoIdRef.current) {
                    pendingPlayRef.current = false
                    try {
                      playerRef.current?.seekTo(startSecRef.current, true)
                      playerRef.current?.playVideo()
                    } catch {
                      awaitingPlayRef.current = false
                      onErrorChangeRef.current?.('Playback failed')
                    }
                  }
                }

                if (e.data === YtPlayerState.PLAYING && awaitingPlayRef.current) {
                  const endAt = startSecRef.current + durationRef.current
                  waitForClipFrame(endAt)
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
      if (readyRef.current) preloadVideo()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, startSec])

    useEffect(() => () => clearTimers(), [])

    return (
      <div className="player-mount">
        <div className="player-frame" ref={containerRef} />
        <div className={`player-shield ${frameVisible ? 'is-hidden' : ''}`} aria-hidden />
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
