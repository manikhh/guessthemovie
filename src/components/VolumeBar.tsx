import { Volume2, VolumeX } from './icons'

interface VolumeBarProps {
  volume: number
  onChange: (volume: number) => void
}

export function VolumeBar({ volume, onChange }: VolumeBarProps) {
  const muted = volume <= 0

  return (
    <div className="screen-volume" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className="screen-volume-mute"
        aria-label={muted ? 'Unmute' : 'Mute'}
        onClick={() => onChange(muted ? 70 : 0)}
      >
        {muted ? (
          <VolumeX size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
        ) : (
          <Volume2 size={14} strokeWidth={1.5} absoluteStrokeWidth aria-hidden />
        )}
      </button>
      <input
        type="range"
        className="screen-volume-slider"
        min={0}
        max={100}
        step={1}
        value={volume}
        aria-label="Volume"
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="screen-volume-value">{volume}</span>
    </div>
  )
}
