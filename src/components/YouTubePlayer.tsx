import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { CLIP_DURATIONS } from '../lib/game'
import {
  createPlayer,
  loadYouTubeApi,
  YtPlayerState,
  type YtPlayer,
} from '../lib/youtube'

export interface YouTubePlayerHandle {
  /** Call synchronously inside a user click handler. */
  play: () => void
  /** Stop the current clip early and return to idle cover. */
  pause: () => void
  /** Warm the next clip while idle (e.g. hover on Next). */
  preloadNext: (videoId: string, startSec: number) => void
}

interface YouTubePlayerProps {
  videoId: string
  startSec: number
  durationSec: number
  /** 0–100 playback volume applied when the clip is unmuted. */
  volume?: number
  onPlayingChange?: (playing: boolean) => void
  onErrorChange?: (error: string | null) => void
  /** True only when the clip is buffered and can start instantly. */
  onReadyChange?: (ready: boolean) => void
}

const BLOCKED_MSG =
  'YouTube is blocked on this browser. Disable your ad blocker for this site, or try Chrome/Safari without extensions.'

/** Longest playable clip — warm with this so short levels don't ENDED mid-buffer. */
const LONGEST_CLIP = CLIP_DURATIONS[CLIP_DURATIONS.length - 1] ?? 5
/** Keep YT's hard stop slightly after our timer so we veil first, then YT stops. */
const END_PAD_SEC = 0.85

function preferFastQuality(player: YtPlayer) {
  try {
    player.setPlaybackQuality('small')
  } catch {
    /* quality hint not always available */
  }
}

function loadOpts(videoId: string, startSec: number, playSec: number) {
  const startSeconds = Math.max(0, startSec)
  return {
    videoId,
    startSeconds,
    // YT end-screen / suggestions only appear on real ENDED; stop before trailer end.
    endSeconds: startSeconds + Math.max(playSec, 0.05) + END_PAD_SEC,
  }
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer(
    { videoId, startSec, durationSec, volume = 80, onPlayingChange, onErrorChange, onReadyChange },
    ref,
  ) {
    const containerRef = useRef<HTMLDivElement>(null)
    const playerRef = useRef<YtPlayer | null>(null)
    const apiReadyRef = useRef(false)
    const playingRef = useRef(false)
    const warmingRef = useRef(false)
    const primedRef = useRef(false)
    const awaitingPlayRef = useRef(false)
    const rearmAttemptsRef = useRef(0)
    const stopAtRef = useRef(0)
    const rafRef = useRef<number | null>(null)
    const hardTimerRef = useRef<number | null>(null)

    const videoIdRef = useRef(videoId)
    const startSecRef = useRef(startSec)
    const durationRef = useRef(durationSec)
    const volumeRef = useRef(volume)
    const onPlayingChangeRef = useRef(onPlayingChange)
    const onErrorChangeRef = useRef(onErrorChange)
    const onReadyChangeRef = useRef(onReadyChange)
    videoIdRef.current = videoId
    startSecRef.current = startSec
    durationRef.current = durationSec
    volumeRef.current = volume
    onPlayingChangeRef.current = onPlayingChange
    onErrorChangeRef.current = onErrorChange
    onReadyChangeRef.current = onReadyChange

    const [status, setStatus] = useState<'loading' | 'ready' | 'blocked'>('loading')
    const [veiled, setVeiled] = useState(true)

    function applyAudibleVolume(player: YtPlayer) {
      const level = Math.max(0, Math.min(100, volumeRef.current))
      try {
        if (level <= 0) {
          player.mute()
          player.setVolume(0)
        } else {
          player.unMute()
          player.setVolume(level)
        }
      } catch {
        /* ignore */
      }
    }

    function clearTimers() {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      if (hardTimerRef.current !== null) {
        window.clearTimeout(hardTimerRef.current)
        hardTimerRef.current = null
      }
    }

    function setPrimed(ready: boolean) {
      primedRef.current = ready
      onReadyChangeRef.current?.(ready)
      if (ready) setStatus('ready')
    }

    function parkAtStart(forceSeek = false) {
      const player = playerRef.current
      if (!player) return
      try {
        preferFastQuality(player)
        player.mute()
        player.pauseVideo()
        if (forceSeek) {
          player.seekTo(startSecRef.current, true)
          return
        }
        let t = startSecRef.current
        try {
          t = player.getCurrentTime()
        } catch {
          /* ignore */
        }
        if (Math.abs(t - startSecRef.current) > 0.2) {
          player.seekTo(startSecRef.current, true)
        }
      } catch {
        /* ignore */
      }
    }

    function finishWarm() {
      warmingRef.current = false
      rearmAttemptsRef.current = 0
      setVeiled(true)
      // Pause in place — seek here would throw away the buffer we just built.
      parkAtStart(false)
      setPrimed(true)
      onErrorChangeRef.current?.(null)
    }

    /** Buffer the clip muted in the background so Play is instant. */
    function warmBuffer() {
      const player = playerRef.current
      if (!player || !apiReadyRef.current) return

      clearTimers()
      playingRef.current = false
      awaitingPlayRef.current = false
      warmingRef.current = true
      rearmAttemptsRef.current = 0
      setPrimed(false)
      setVeiled(true)
      setStatus('loading')
      onPlayingChangeRef.current?.(false)

      try {
        preferFastQuality(player)
        player.mute()
        // Warm with longest window so unlocking longer clips still has endSeconds headroom.
        player.loadVideoById(loadOpts(videoIdRef.current, startSecRef.current, LONGEST_CLIP))
      } catch {
        warmingRef.current = false
        setPrimed(false)
      }
    }

    function stopClip(rearm = false) {
      // Veil first so YT end-screen / suggestions never flash.
      setVeiled(true)
      clearTimers()
      playingRef.current = false
      awaitingPlayRef.current = false
      onPlayingChangeRef.current?.(false)

      // After ENDED, seek alone often leaves the suggestions UI stuck — reload the warm window.
      // Cap attempts so a bad startSec past trailer end cannot loop forever.
      if (rearm && rearmAttemptsRef.current < 1 && playerRef.current && apiReadyRef.current) {
        rearmAttemptsRef.current += 1
        warmingRef.current = true
        setPrimed(false)
        setStatus('loading')
        try {
          preferFastQuality(playerRef.current)
          playerRef.current.mute()
          playerRef.current.loadVideoById(
            loadOpts(videoIdRef.current, startSecRef.current, LONGEST_CLIP),
          )
          return
        } catch {
          warmingRef.current = false
        }
      }

      rearmAttemptsRef.current = 0
      // Rewind while the player is guessing so the next Play is hot again.
      parkAtStart(true)
      setPrimed(true)
    }

    function watchClipEnd() {
      clearTimers()
      const endAt = stopAtRef.current

      const tick = () => {
        if (!playingRef.current) return
        if (performance.now() >= endAt) {
          stopClip()
          return
        }
        rafRef.current = window.requestAnimationFrame(tick)
      }

      rafRef.current = window.requestAnimationFrame(tick)
      hardTimerRef.current = window.setTimeout(stopClip, durationRef.current * 1000 + 350)
    }

    function startPlayback() {
      const player = playerRef.current
      if (!player || !apiReadyRef.current) return

      if (!primedRef.current) {
        // Still warming — kick playback from this click gesture anyway.
        warmingRef.current = false
        awaitingPlayRef.current = true
        setVeiled(true)
        try {
          preferFastQuality(player)
          applyAudibleVolume(player)
          player.loadVideoById(
            loadOpts(videoIdRef.current, startSecRef.current, durationRef.current),
          )
        } catch {
          awaitingPlayRef.current = false
          onErrorChangeRef.current?.('Playback failed')
        }
        return
      }

      clearTimers()
      warmingRef.current = false
      awaitingPlayRef.current = true
      setVeiled(true)
      onErrorChangeRef.current?.(null)

      try {
        preferFastQuality(player)
        // Instant path: buffer already hot — no reload.
        // endSeconds from warm (longest clip) still caps YT before trailer end.
        applyAudibleVolume(player)
        const t = (() => {
          try {
            return player.getCurrentTime()
          } catch {
            return startSecRef.current
          }
        })()
        if (Math.abs(t - startSecRef.current) > 0.12) {
          player.seekTo(startSecRef.current, true)
        }
        player.playVideo()
      } catch {
        awaitingPlayRef.current = false
        onErrorChangeRef.current?.('Playback failed')
      }
    }

    useImperativeHandle(ref, () => ({
      play() {
        if (!apiReadyRef.current) {
          onErrorChangeRef.current?.(
            status === 'blocked' ? BLOCKED_MSG : 'Player still loading — try again in a second',
          )
          return
        }
        startPlayback()
      },
      pause() {
        if (!playingRef.current && !awaitingPlayRef.current) return
        stopClip()
      },
      preloadNext(nextVideoId: string, nextStartSec: number) {
        if (!apiReadyRef.current || playingRef.current || awaitingPlayRef.current) return
        try {
          playerRef.current?.mute()
          playerRef.current?.loadVideoById(loadOpts(nextVideoId, nextStartSec, LONGEST_CLIP))
        } catch {
          /* ignore */
        }
      },
    }))

    useEffect(() => {
      if (!apiReadyRef.current || !playingRef.current) return
      const player = playerRef.current
      if (!player) return
      applyAudibleVolume(player)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [volume])

    useEffect(() => {
      let destroyed = false
      const initial = loadOpts(videoIdRef.current, startSecRef.current, LONGEST_CLIP)

      loadYouTubeApi()
        .then(() => {
          if (destroyed || !containerRef.current || playerRef.current) return

          playerRef.current = createPlayer(containerRef.current, {
            height: '100%',
            width: '100%',
            videoId: initial.videoId,
            playerVars: {
              // Mute-autoplay starts buffering immediately on create.
              autoplay: 1,
              mute: 1,
              controls: 0,
              disablekb: 1,
              enablejsapi: 1,
              fs: 0,
              iv_load_policy: 3,
              modestbranding: 1,
              playsinline: 1,
              rel: 0,
              cc_load_policy: 0,
              start: Math.max(0, Math.floor(initial.startSeconds)),
              end: Math.max(1, Math.ceil(initial.endSeconds)),
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                if (destroyed) return
                apiReadyRef.current = true
                warmingRef.current = true
                setStatus('loading')
                onReadyChangeRef.current?.(false)
                onErrorChangeRef.current?.(null)
                try {
                  preferFastQuality(event.target)
                  event.target.mute()
                  event.target.playVideo()
                } catch {
                  try {
                    event.target.loadVideoById(
                      loadOpts(videoIdRef.current, startSecRef.current, LONGEST_CLIP),
                    )
                  } catch {
                    /* ignore */
                  }
                }
              },
              onStateChange: (e) => {
                if (destroyed) return

                if (e.data === YtPlayerState.PLAYING) {
                  preferFastQuality(e.target)

                  if (warmingRef.current && !awaitingPlayRef.current) {
                    // Buffer is hot — park and unlock Play.
                    finishWarm()
                    return
                  }

                  if (awaitingPlayRef.current) {
                    awaitingPlayRef.current = false
                    playingRef.current = true
                    primedRef.current = true
                    rearmAttemptsRef.current = 0
                    setVeiled(false)
                    onPlayingChangeRef.current?.(true)
                    stopAtRef.current = performance.now() + durationRef.current * 1000
                    watchClipEnd()
                  }
                  return
                }

                if (e.data === YtPlayerState.BUFFERING) {
                  if (!playingRef.current) setVeiled(true)
                  return
                }

                if (e.data === YtPlayerState.CUED || e.data === YtPlayerState.PAUSED) {
                  if (!playingRef.current) setVeiled(true)
                  // cue/pause after warm load without PLAYING — still unlock if we got data
                  if (warmingRef.current && !awaitingPlayRef.current && !primedRef.current) {
                    // Sometimes YT cues without firing PLAYING for muted autoplay.
                    window.setTimeout(() => {
                      if (warmingRef.current && !primedRef.current && !awaitingPlayRef.current) {
                        finishWarm()
                      }
                    }, 280)
                  }
                  return
                }

                if (e.data === YtPlayerState.ENDED) {
                  // Hard stop from endSeconds (or trailer end) — veil + re-cue so suggestions die.
                  stopClip(true)
                }
              },
              onError: () => {
                if (destroyed) return
                warmingRef.current = false
                primedRef.current = false
                onReadyChangeRef.current?.(false)
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
        apiReadyRef.current = false
        clearTimers()
        onReadyChangeRef.current?.(false)
        playerRef.current?.destroy()
        playerRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      if (!apiReadyRef.current) return
      warmBuffer()
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoId, startSec])

    useEffect(() => () => clearTimers(), [])

    return (
      <div className="player-mount">
        <div className="player-frame" ref={containerRef} />
        {/* Blocks hover/click so YouTube never shows its pause overlay / gradients. */}
        <div className="player-shield" aria-hidden />
        <div className={`player-veil ${veiled ? 'is-on' : ''}`} aria-hidden />
        {status === 'loading' && veiled && <p className="player-status">Buffering clip…</p>}
        {status === 'blocked' && (
          <p className="player-status player-status-error">{BLOCKED_MSG}</p>
        )}
      </div>
    )
  },
)
