interface IconProps {
  className?: string
}

export function TrophyIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="trophy-cup" x1="40" y1="8" x2="40" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF4D0" />
          <stop offset="0.45" stopColor="#FFC857" />
          <stop offset="1" stopColor="#C9921A" />
        </linearGradient>
        <linearGradient id="trophy-base" x1="40" y1="56" x2="40" y2="80" gradientUnits="userSpaceOnUse">
          <stop stopColor="#E8B84A" />
          <stop offset="1" stopColor="#8A6A1E" />
        </linearGradient>
        <linearGradient id="trophy-star" x1="40" y1="0" x2="40" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFF8E8" />
          <stop offset="1" stopColor="#FFC857" />
        </linearGradient>
      </defs>
      {/* Star crown */}
      <path
        d="M40 2l3.2 6.8L50 8.5l-5 4.8 1.2 7.2L40 17.5l-6.2 3-1.2-7.2-5-4.8 6.8-.7L40 2z"
        fill="url(#trophy-star)"
      />
      {/* Left handle */}
      <path
        d="M18 22c-6 2-8 10-6 16 2 4 6 6 10 6"
        stroke="url(#trophy-cup)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right handle */}
      <path
        d="M62 22c6 2 8 10 6 16-2 4-6 6-10 6"
        stroke="url(#trophy-cup)"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      {/* Cup */}
      <path
        d="M24 18h32l-4 34c-.5 4-4 7-8 7h-8c-4 0-7.5-3-8-7L24 18z"
        fill="url(#trophy-cup)"
      />
      <path
        d="M28 20h24l-3.5 30c-.3 3-2.8 5.5-5.5 5.5h-7c-2.7 0-5.2-2.5-5.5-5.5L28 20z"
        fill="rgba(255,255,255,0.15)"
      />
      {/* Stem */}
      <rect x="34" y="52" width="12" height="6" rx="1" fill="url(#trophy-base)" />
      {/* Base */}
      <path
        d="M26 58h28l2 6c.5 1.5-.5 3-2 3H26c-1.5 0-2.5-1.5-2-3l2-6z"
        fill="url(#trophy-base)"
      />
      <ellipse cx="40" cy="68" rx="18" ry="4" fill="url(#trophy-base)" />
    </svg>
  )
}

export function PlayIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="24" fill="currentColor" />
      <path d="M20 15.5v17l14-8.5-14-8.5z" fill="#1a1408" />
    </svg>
  )
}

export function StarBurstIcon({ className }: IconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <radialGradient
          id="star-burst"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(60 60) rotate(90) scale(56)"
        >
          <stop stopColor="#FFC857" />
          <stop offset="1" stopColor="#FFC857" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d="M60 4l4 20 18-6-10 16 18 6-16 10 6 18-20-4 4 20-16-10-6 18 10 16-18-6 10-16-18 6 4-20-16 10-6-18 10-16-18 6-10-16 18 6-4-20z"
        fill="url(#star-burst)"
        opacity="0.35"
      />
    </svg>
  )
}
