import { useId } from 'react'

type BrandLogoProps = {
  variant?: 'full' | 'icon'
  width?: number | string
  height?: number | string
  title?: string
}

export function BrandLogo({
  variant = 'full',
  width,
  height,
  title = 'StyleAgent logo',
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, '')
  const bgRingId = `bgRing-${uid}`
  const innerGlassId = `innerGlass-${uid}`
  const blueArcId = `blueArc-${uid}`
  const amberArcId = `amberArc-${uid}`
  const textFillId = `textFill-${uid}`
  const centerGlowId = `centerGlow-${uid}`
  const softGlowId = `softGlow-${uid}`
  const iconClipId = `iconClip-${uid}`
  const titleId = `brandTitle-${uid}`

  const isIcon = variant === 'icon'
  const svgWidth = width ?? (isIcon ? 160 : 720)
  const svgHeight = height ?? (isIcon ? 160 : 180)
  const viewBox = isIcon ? '0 0 160 160' : '0 0 720 180'

  return (
    <svg
      width={svgWidth}
      height={svgHeight}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby={titleId}
    >
      <title id={titleId}>{title}</title>
      <defs>
        <linearGradient id={bgRingId} x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6E7685" />
          <stop offset="50%" stopColor="#2B313C" />
          <stop offset="100%" stopColor="#0F1218" />
        </linearGradient>

        <linearGradient id={innerGlassId} x1="42" y1="38" x2="118" y2="122" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2E3642" />
          <stop offset="55%" stopColor="#11161E" />
          <stop offset="100%" stopColor="#080B11" />
        </linearGradient>

        <linearGradient id={blueArcId} x1="38" y1="72" x2="79" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#36597A" />
          <stop offset="100%" stopColor="#8CB9E8" />
        </linearGradient>

        <linearGradient id={amberArcId} x1="77" y1="47" x2="122" y2="65" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F0C777" />
          <stop offset="100%" stopColor="#9A5C2F" />
        </linearGradient>

        <linearGradient id={textFillId} x1="180" y1="40" x2="500" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F3F5F7" />
          <stop offset="100%" stopColor="#C8CDD4" />
        </linearGradient>

        <radialGradient
          id={centerGlowId}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(80 80) rotate(90) scale(48)"
        >
          <stop offset="0%" stopColor="#1D2430" />
          <stop offset="100%" stopColor="#090C12" />
        </radialGradient>

        <filter id={softGlowId} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id={iconClipId}>
          <circle cx="80" cy="80" r="60" />
        </clipPath>
      </defs>

      <g transform={isIcon ? 'translate(0,0)' : 'translate(20,10)'}>
        <circle cx="80" cy="80" r="64" fill="#05070B" />
        <circle cx="80" cy="80" r="60" stroke={`url(#${bgRingId})`} strokeWidth="8" />

        <circle cx="80" cy="80" r="46" fill={`url(#${innerGlassId})`} />
        <circle cx="80" cy="80" r="46" fill={`url(#${centerGlowId})`} opacity="0.95" />

        <g clipPath={`url(#${iconClipId})`} opacity="0.28">
          <path d="M80 34 L108 56 L80 80 Z" fill="#3B4350" />
          <path d="M108 56 L102 100 L80 80 Z" fill="#1A202A" />
          <path d="M102 100 L58 106 L80 80 Z" fill="#0D1118" />
          <path d="M58 106 L50 60 L80 80 Z" fill="#202734" />
          <path d="M50 60 L80 34 L80 80 Z" fill="#323A46" />
        </g>

        <path
          d="M38 84C46 61 62 48 84 48C99 48 113 54 124 64"
          stroke={`url(#${blueArcId})`}
          strokeWidth="11"
          strokeLinecap="round"
          filter={`url(#${softGlowId})`}
        />
        <path
          d="M82 48C100 49 114 55 124 64"
          stroke={`url(#${amberArcId})`}
          strokeWidth="11"
          strokeLinecap="round"
          filter={`url(#${softGlowId})`}
        />

        <path
          d="M53 49C60 42 71 37 84 37"
          stroke="#DDE4EE"
          strokeOpacity="0.35"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {!isIcon ? (
        <g transform="translate(180,0)">
          <text
            x="0"
            y="92"
            fill={`url(#${textFillId})`}
            fontFamily='"IBM Plex Sans", "Segoe UI", sans-serif'
            fontSize="64"
            fontWeight="600"
            letterSpacing="-2"
          >
            StyleAgent
          </text>

          <text
            x="4"
            y="124"
            fill="#7E8693"
            fontFamily='"IBM Plex Sans", "Segoe UI", sans-serif'
            fontSize="14"
            fontWeight="600"
            letterSpacing="3.2"
          >
            INTELLIGENT STYLE · PRECISION EDITS
          </text>
        </g>
      ) : null}
    </svg>
  )
}
