import { useId } from 'react'

type Props = { size?: number; light?: boolean }

/** Logo MapSmart : repère de carte entouré d'une zone (isochrone). */
export default function Logo({ size = 32, light = false }: Props) {
  // Identifiant unique : un dégradé partagé disparaîtrait si le logo qui le déclare est masqué.
  const gradient = `ms-logo-${useId().replace(/:/g, '')}`
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#1f7bf2" />
            <stop offset="1" stopColor="#11243e" />
          </linearGradient>
        </defs>
        <rect width="64" height="64" rx="16" fill={`url(#${gradient})`} />
        <circle cx="32" cy="34" r="17" fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="3" strokeDasharray="5 5" />
        <path d="M32 14c-7.2 0-13 5.6-13 12.6C19 35.5 32 48 32 48s13-12.5 13-21.4C45 19.6 39.2 14 32 14z" fill="#fff" />
        <circle cx="32" cy="27" r="5" fill="#e2ad16" />
      </svg>
      <span style={{ fontWeight: 800, fontSize: size * 0.62, letterSpacing: '-0.02em', color: light ? '#fff' : '#0d1b2e' }}>
        Map<span style={{ color: light ? '#8fbaff' : '#1769e0' }}>Smart</span>
      </span>
    </span>
  )
}
