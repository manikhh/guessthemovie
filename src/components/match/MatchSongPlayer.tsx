import { useEffect, useRef } from 'react'
import { YouTubePlayer, type YouTubePlayerHandle } from '../YouTubePlayer'

interface MatchSongPlayerProps {
  youtubeId: string
  startSec: number
  previewSec: number
  active: boolean
}

/** Plays one trailer peek while the round is active. Title stays hidden in the arena UI. */
export function MatchSongPlayer({ youtubeId, startSec, previewSec, active }: MatchSongPlayerProps) {
  const ref = useRef<YouTubePlayerHandle>(null)
  const key = `${youtubeId}:${startSec}:${active}`

  useEffect(() => {
    if (!active) return
    const t = window.setTimeout(() => ref.current?.play(), 120)
    return () => window.clearTimeout(t)
  }, [key, active])

  return (
    <div className="match-song-player">
      <YouTubePlayer
        key={`${youtubeId}-${startSec}`}
        ref={ref}
        videoId={youtubeId}
        startSec={startSec}
        durationSec={previewSec}
      />
      <div className="match-song-scrub" aria-hidden />
    </div>
  )
}
