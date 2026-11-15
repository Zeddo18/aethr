export function OrbitLine({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 600 40" fill="none" aria-hidden className={className} preserveAspectRatio="none">
      <defs>
        <linearGradient id="orbit-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#D9B26F" stopOpacity="0" />
          <stop offset="0.7" stopColor="#D9B26F" />
          <stop offset="1" stopColor="#F2EFE8" />
        </linearGradient>
      </defs>
      <path
        className="orbit-line" pathLength={1}
        d="M0 36 C 160 34, 330 24, 470 12 C 540 6, 585 8, 600 12"
        stroke="url(#orbit-fade)" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
