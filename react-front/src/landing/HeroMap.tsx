import { useMemo } from 'react'

/**
 * Illustration de l'app (SVG, sans tuiles ni appel réseau) : parcelles, Loire,
 * routes, zone en temps de trajet, terrains compatibles / hors zone, ventes DVF.
 * Les cartes flottantes (HTML) sont posées par-dessus par le parent.
 */
export default function HeroMap({ compact = false }: { compact?: boolean }) {
  const parcels = useMemo(() => buildParcels(), [])

  return (
    <svg className="hm" viewBox="0 0 560 440" role="img" aria-label="Aperçu de MapSmart : une zone de 15 minutes autour d'un point, avec terrains et ventes">
      <defs>
        <radialGradient id="hm-zone" cx="50%" cy="50%" r="60%">
          <stop offset="0" stopColor="#1769e0" stopOpacity=".26" />
          <stop offset="1" stopColor="#1769e0" stopOpacity=".08" />
        </radialGradient>
        <clipPath id="hm-clip"><rect width="560" height="440" rx="22" /></clipPath>
      </defs>
      <g clipPath="url(#hm-clip)">
        <rect width="560" height="440" fill="#edf2f8" />
        {parcels.map((d, i) => <path key={i} d={d} fill="#f8fafd" stroke="#d9e1ec" strokeWidth="1" />)}

        {/* Loire */}
        <path d="M-20 330 C 90 300, 160 360, 260 335 S 430 270, 600 300" fill="none" stroke="#c9dcf3" strokeWidth="26" strokeLinecap="round" />
        <path d="M-20 330 C 90 300, 160 360, 260 335 S 430 270, 600 300" fill="none" stroke="#b8d1ef" strokeWidth="2" strokeDasharray="2 10" />

        {/* Routes */}
        {ROADS.map((d, i) => (
          <g key={i}>
            <path d={d} fill="none" stroke="#dfe6ef" strokeWidth={i < 2 ? 11 : 7} strokeLinecap="round" />
            <path d={d} fill="none" stroke="#fff" strokeWidth={i < 2 ? 7 : 4} strokeLinecap="round" />
          </g>
        ))}

        {/* Zone 15 min (isochrone) */}
        <path className="hm-zone" d={ZONE} fill="url(#hm-zone)" stroke="#1769e0" strokeWidth="2.2" strokeLinejoin="round" />

        {/* Ventes DVF */}
        {DVF.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r="4.2" fill={c} stroke="#fff" strokeWidth="1.4" />)}

        {/* Terrains : dorés dans la zone, gris hors zone */}
        {TERRAINS_IN.map(([x, y], i) => <circle key={i} className="hm-terrain" style={{ animationDelay: `${0.9 + i * 0.08}s` }} cx={x} cy={y} r="7" fill="#e2ad16" stroke="#fff" strokeWidth="2.4" />)}
        {TERRAINS_OUT.map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill="#a3aebd" stroke="#fff" strokeWidth="2" />)}

        {/* Parcelle sélectionnée */}
        <path d="M318 168 l34 -6 l7 32 l-36 7 z" fill="#e2ad16" fillOpacity=".18" stroke="#c48f00" strokeWidth="1.6" />

        {/* Point de départ */}
        <circle className="hm-pulse" cx="262" cy="214" r="10" fill="#1769e0" fillOpacity=".25" />
        <circle cx="262" cy="214" r="8" fill="#1769e0" stroke="#fff" strokeWidth="3.5" />
      </g>
      {!compact && <rect width="560" height="440" rx="22" fill="none" stroke="#d6dfea" />}
    </svg>
  )
}

const ROADS = [
  'M-10 214 C 120 200, 200 226, 262 214 S 430 190, 570 205',
  'M262 -10 C 250 90, 275 150, 262 214 S 245 360, 270 450',
  'M60 -10 C 90 120, 150 160, 262 214',
  'M570 90 C 470 120, 380 150, 262 214',
  'M120 450 C 160 360, 210 270, 262 214',
  'M570 400 C 480 350, 400 280, 262 214',
]

const ZONE = 'M262 96 C 300 92, 336 118, 372 120 C 420 124, 452 168, 440 210 C 430 246, 458 280, 420 306 C 386 330, 344 300, 300 318 C 260 334, 214 326, 186 300 C 150 270, 104 262, 110 220 C 116 180, 96 150, 134 128 C 170 108, 220 100, 262 96 Z'

const TERRAINS_IN: [number, number][] = [[336, 182], [214, 156], [300, 268], [190, 246], [392, 236], [242, 290]]
const TERRAINS_OUT: [number, number][] = [[486, 116], [70, 360], [500, 370], [62, 120], [160, 400]]

const RED = '#d1495b', VIOLET = '#8e44ad', TEAL = '#2a9d8f'
const DVF: [number, number, string][] = [
  [232, 186, RED], [288, 176, RED], [318, 236, VIOLET], [208, 210, TEAL], [356, 200, RED], [276, 248, TEAL],
  [170, 196, RED], [402, 270, VIOLET], [338, 286, RED], [226, 262, VIOLET], [300, 140, TEAL], [252, 134, RED],
  [150, 230, TEAL], [372, 158, RED], [410, 196, TEAL], [196, 128, VIOLET], [282, 302, RED],
]

/** Parcellaire pseudo-aléatoire mais stable (graine fixe). */
function buildParcels(): string[] {
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  const out: string[] = []
  const cell = 46
  for (let x = -20; x < 580; x += cell) {
    for (let y = -20; y < 460; y += cell) {
      const j = () => (rnd() - 0.5) * 12
      const split = rnd() > 0.45
      const p = [[x + j(), y + j()], [x + cell + j(), y + j()], [x + cell + j(), y + cell + j()], [x + j(), y + cell + j()]]
      if (split) {
        const m1 = [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2]
        const m2 = [(p[3][0] + p[2][0]) / 2, (p[3][1] + p[2][1]) / 2]
        out.push(poly([p[0], m1, m2, p[3]]), poly([m1, p[1], p[2], m2]))
      } else out.push(poly(p))
    }
  }
  return out
}

const poly = (pts: number[][]) => `M${pts.map((p) => p.map((v) => v.toFixed(1)).join(' ')).join(' L')} Z`
