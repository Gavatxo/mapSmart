import express from 'express'

/**
 * Module portails immo — service ISOLÉ et OPTIONNEL.
 *
 * ⚠️ Ne pas activer sans validation juridique (CGU des portails + RGPD).
 * Principe "agrégateur" : renvoyer infos minimales + URL source, le contact
 * se fait chez le portail. NE RIEN persister de personnel.
 *
 * Ce squelette renvoie 501 tant que ENABLED=false. La vraie implémentation
 * (Playwright furtif + proxies résidentiels rotatifs + coupe-circuit) se
 * branche dans searchListings().
 */

const app = express()
app.use(express.json())

const ENABLED = process.env.LISTINGS_MODULE_ENABLED === 'true'
const PORT = process.env.PORT || 4000

app.get('/health', (_req, res) => res.json({ ok: true, enabled: ENABLED }))

app.post('/search', async (req, res) => {
  if (!ENABLED) {
    return res.status(501).json({
      error: 'Module désactivé. Activation soumise à validation juridique (CGU + RGPD).',
    })
  }
  try {
    const listings = await searchListings(req.body)
    res.json({ listings })
  } catch (e) {
    res.status(502).json({ error: 'Source momentanément indisponible.' })
  }
})

/**
 * @param {{ polygon?: object, commune?: string, category?: string }} _query
 * @returns {Promise<Array<{ title: string, price: number|null, thumbnail: string|null, url: string, source: string }>>}
 */
async function searchListings(_query) {
  // TODO (si Go juridique) :
  //  - Playwright headless furtif + rotation de proxies résidentiels
  //  - respect d'un rate-limit, backoff, détection de blocage → coupe-circuit
  //  - extraire UNIQUEMENT : titre, prix, vignette, URL source (pas de données perso)
  //  - filtrer par zone (polygon/commune) et retourner des liens vers la source
  return []
}

app.listen(PORT, () => console.log(`[scraper] listening on :${PORT} (enabled=${ENABLED})`))
