interface FactoryMarkProps {
  className?: string
}

export function FactoryMark({ className }: FactoryMarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 -8 160 156"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        className="factory-smoke"
        d="M122 20c8-9 5-17-5-21 14 1 24 9 20 23-3 10-13 11-9 21"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />
      <path
        className="factory-body"
        d="M20 136V80l14-26 14 26 14-26 14 26 14-26 14 26H120V26h24v110H20Z"
        fill="currentColor"
      />
      <path
        className="factory-door"
        d="M62 136v-20c0-10 8-16 16-16s16 6 16 16v20H62Z"
        fill="var(--bg)"
      />
      <path
        className="factory-drip"
        d="M128 26c6 2 10 8 9 16-1 9-7 12-6 22 8-10 12-22 8-32-2-8-8-10-11-6Z"
        fill="currentColor"
      />
    </svg>
  )
}
