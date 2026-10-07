import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import Logo from '../components/Logo'
import HeroMap from '../landing/HeroMap'
import '../landing/landing.css'

/** Page d'accueil publique. */
export default function Landing() {
  const { user } = useAuth()
  const [scrolled, setScrolled] = useState(false)

  return (
    <div className="lp" onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 8)}>
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <div className="lp-wrap">
          <Link to="/" aria-label="MapSmart, accueil"><Logo size={34} /></Link>
          <div className="lp-links">
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#comment">Comment ça marche</a>
            <a href="#donnees">Données</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-nav-cta">
            {user ? (
              <Link to="/app" className="btn btn-primary btn-sm">Ouvrir mes cartes</Link>
            ) : (
              <>
                <Link to="/login" className="lp-signin">Se connecter</Link>
                <Link to="/register" className="btn btn-primary btn-sm">Créer un compte</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ---------- Hero ---------- */}
      <header className="lp-hero">
        <div className="lp-wrap">
          <div>
            <span className="lp-eyebrow"><i />Analyse de secteur pour agences immobilières &amp; foncières</span>
            <h1>Le bon terrain, au bon endroit, <em>au juste prix.</em></h1>
            <p className="lp-lead">
              MapSmart réunit vos terrains, les temps de trajet, les ventes réelles et le cadastre sur une seule carte.
              Dessinez un secteur : vous voyez instantanément ce qui s'y trouve et à quel prix cela se vend.
            </p>
            <div className="lp-hero-ctas">
              <Link to={user ? '/app' : '/register'} className="btn btn-primary">
                {user ? 'Ouvrir mes cartes' : 'Créer un compte'} <Arrow />
              </Link>
              <a href="#comment" className="btn btn-ghost">Voir comment ça marche</a>
            </div>
            <p className="lp-sources">
              Sources officielles :<b>DVF</b><b>Cadastre</b><b>Base Adresse Nationale</b><b>OpenStreetMap</b>
            </p>
          </div>

          <div className="lp-visual">
            <HeroMap />
            <div className="lp-float lp-float-zone">
              <span className="dot"><Icon name="clock" size={18} /></span>
              <div><small>Zone de recherche</small><strong>15 min en voiture</strong></div>
            </div>
            <div className="lp-float lp-float-parcel">
              <small>Parcelle AD 764</small><strong>359 m²</strong>
            </div>
            <div className="lp-float lp-float-stats">
              <small>Ventes dans la zone · 24 mois</small>
              <ul>
                <li><span className="sw" style={{ background: 'var(--red)' }} /><span>Maisons</span><b>2 301 €/m²</b></li>
                <li><span className="sw" style={{ background: 'var(--violet)' }} /><span>Appartements</span><b>2 333 €/m²</b></li>
                <li><span className="sw" style={{ background: 'var(--teal)' }} /><span>Terrains</span><b>169 €/m²</b></li>
              </ul>
            </div>
          </div>
        </div>
      </header>

      {/* ---------- Chiffres ---------- */}
      <section className="lp-stats" aria-label="MapSmart en chiffres">
        <div className="lp-wrap">
          <Stat value="70 918" label="ventes DVF analysées (2021-2025)" />
          <Stat value="796 734" label="parcelles cadastrales en base" />
          <Stat value="0,2 s" label="pour analyser un secteur" />
          <Stat value="100 %" label="de données publiques officielles" />
        </div>
        <div className="lp-wrap lp-stats-note-wrap"><p className="lp-stats-note">Chiffres mesurés sur le département pilote (Loiret).</p></div>
      </section>

      {/* ---------- Fonctionnalités ---------- */}
      <section className="lp-section" id="fonctionnalites">
        <div className="lp-wrap">
          <div className="lp-section-head">
            <span className="lp-kicker">Fonctionnalités</span>
            <h2>Tout ce qu'il faut pour qualifier un secteur, <em>sans tableur.</em></h2>
            <p>Plus de va-et-vient entre Google My Maps, le site du cadastre et les exports DVF. Une carte, vos données, les bonnes réponses.</p>
          </div>
          <div className="lp-features">
            <Feature icon="upload" tint="#ecf3fe" color="#1769e0" title="Vos terrains, importés en un clic">
              Importez vos exports KML ou Google My Maps : points, polygones et calques sont conservés, sans aucune ressaisie.
            </Feature>
            <Feature icon="clock" tint="#fff6dd" color="#b8860b" title="Zones en temps de trajet">
              « À 15 minutes en voiture de la gare » : calculez une zone par temps ou distance routière, ou dessinez-la. Croisez plusieurs zones.
            </Feature>
            <Feature icon="euro" tint="#fdeef0" color="#d1495b" title="Ventes réelles DVF">
              Les prix réellement payés, filtrés par type de bien et période, avec le prix médian et le prix au m² du secteur.
            </Feature>
            <Feature icon="grid" tint="#e7f6f3" color="#2a9d8f" title="Cadastre intégré">
              Parcelles, sections et contenances directement sur la carte, et la référence cadastrale de chacun de vos terrains.
            </Feature>
            <Feature icon="users" tint="#f3ecfa" color="#8e44ad" title="Pensé pour les agences">
              Un espace par agence, des cartes et des zones sauvegardées, retrouvées telles quelles depuis n'importe quel poste.
            </Feature>
            <Feature icon="shield" tint="#eef1f5" color="#11243e" title="Des données saines">
              Uniquement des sources publiques officielles et vos propres fichiers. Les données de chaque agence restent strictement privées.
            </Feature>
          </div>
        </div>
      </section>

      {/* ---------- Comment ça marche ---------- */}
      <section className="lp-section lp-steps-bg" id="comment">
        <div className="lp-wrap">
          <div className="lp-section-head center">
            <span className="lp-kicker">Comment ça marche</span>
            <h2>De votre fichier à la décision, <em>en trois étapes.</em></h2>
            <p>Aucune installation, aucune formation : tout se passe dans le navigateur.</p>
          </div>
          <div className="lp-steps">
            <Step n={1} title="Importez vos terrains">
              Déposez l'export <code>.kml</code> de votre carte Google My Maps. Vos terrains apparaissent, classés par calque.
            </Step>
            <Step n={2} title="Dessinez votre secteur">
              Saisissez une adresse et une durée de trajet, ou tracez un polygone. Ajoutez une deuxième zone pour affiner.
            </Step>
            <Step n={3} title="Analysez et décidez">
              Les terrains compatibles ressortent, les ventes du secteur s'affichent avec leurs prix médians. Vous savez quoi proposer.
            </Step>
          </div>
        </div>
      </section>

      {/* ---------- Démo analyse ---------- */}
      <section className="lp-section">
        <div className="lp-wrap lp-split">
          <div>
            <span className="lp-kicker">Analyse de secteur</span>
            <h2>Des prix de marché <em>vérifiables</em>, pas des estimations.</h2>
            <ul className="lp-checks">
              <Check><b>Ventes réellement signées</b>, issues des actes notariés publiés par l'administration fiscale.</Check>
              <Check><b>Filtrées sur votre zone exacte</b> : temps de trajet, distance ou polygone, et leur intersection.</Check>
              <Check><b>Synthétisées pour décider</b> : nombre de ventes, prix médian, prix au m² bâti ou terrain.</Check>
              <Check><b>Cliquables une à une</b> : date, adresse, surfaces, pour argumenter face à un vendeur.</Check>
            </ul>
          </div>

          <div className="lp-demo" aria-label="Exemple d'analyse de secteur">
            <div className="lp-demo-head">
              <div>
                <strong>Orléans · 15 min en voiture</strong>
                <small>Ventes des 24 derniers mois</small>
              </div>
              <span className="lp-pill">Données DVF</span>
            </div>
            <div className="lp-kpis">
              <div className="lp-kpi"><small>Ventes dans la zone</small><strong>4 389</strong></div>
              <div className="lp-kpi"><small>Prix médian</small><strong>145 000 €</strong></div>
            </div>
            <div className="lp-bars">
              <Bar color="var(--violet)" label="Appartements" value="2 333 €/m²" pct={100} />
              <Bar color="var(--red)" label="Maisons" value="2 301 €/m²" pct={98} />
              <Bar color="var(--teal)" label="Terrains" value="169 €/m²" pct={7} />
            </div>
            <p className="lp-demo-foot">Exemple réel calculé par MapSmart. Prix médians au m² de surface bâtie (au m² de terrain pour les terrains).</p>
          </div>
        </div>
      </section>

      {/* ---------- Données ---------- */}
      <section className="lp-section" id="donnees" style={{ background: 'var(--paper)' }}>
        <div className="lp-wrap">
          <div className="lp-section-head">
            <span className="lp-kicker">Nos données</span>
            <h2>La valeur, <em>sans le risque.</em></h2>
            <p>MapSmart s'appuie sur des sources publiques officielles, réutilisables librement et mises à jour automatiquement.</p>
          </div>
          <div className="lp-sources-grid">
            <Source tag="Prix" title="DVF">Demandes de valeurs foncières : les ventes immobilières publiées par la DGFiP.</Source>
            <Source tag="Parcelles" title="Cadastre">Plan cadastral informatisé diffusé par Etalab : sections, numéros, contenances.</Source>
            <Source tag="Adresses" title="Base Adresse Nationale">Le référentiel officiel des adresses françaises pour la recherche et le géocodage.</Source>
            <Source tag="Fond & trajets" title="OpenStreetMap">Fond de carte et réseau routier utilisés pour calculer les temps de trajet.</Source>
          </div>
          <div className="lp-trust">
            <Icon name="shield" size={26} />
            <span>
              <b>Aucune donnée personnelle collectée sur des portails tiers.</b> Le produit repose sur l'open data et sur vos fichiers ;
              chaque agence dispose d'un espace cloisonné, inaccessible aux autres comptes.
            </span>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section className="lp-section" id="faq">
        <div className="lp-wrap">
          <div className="lp-section-head center">
            <span className="lp-kicker">FAQ</span>
            <h2>Questions fréquentes</h2>
          </div>
          <div className="lp-faq">
            <Faq q="D'où viennent les prix affichés ?">
              Des Demandes de valeurs foncières (DVF), publiées par la Direction générale des Finances publiques. Ce sont les ventes
              réellement enregistrées, pas des prix d'annonce. Elles sont publiées deux fois par an, avec quelques mois de décalage.
            </Faq>
            <Faq q="Puis-je importer mes terrains depuis Google My Maps ?">
              Oui. Dans Google My Maps, exportez votre carte au format KML, puis importez le fichier dans MapSmart. Les calques
              (dossiers) sont conservés et deviennent des filtres.
            </Faq>
            <Faq q="Comment sont calculées les zones en temps de trajet ?">
              Par un moteur de calcul d'itinéraires sur le réseau routier OpenStreetMap. La zone correspond aux endroits atteignables
              en voiture dans le temps ou la distance choisis, depuis l'adresse de départ.
            </Faq>
            <Faq q="Quelles zones géographiques sont couvertes ?">
              Les ventes et le cadastre sont chargés département par département selon les besoins des agences. En dehors, les ventes
              DVF restent consultables autour d'une adresse.
            </Faq>
            <Faq q="Mes terrains sont-ils visibles par d'autres agences ?">
              Non. Chaque compte agence dispose d'un espace isolé : vos cartes, vos terrains et vos zones ne sont visibles que par
              votre agence.
            </Faq>
            <Faq q="Faut-il installer quelque chose ?">
              Non, MapSmart fonctionne dans le navigateur, sur ordinateur comme sur tablette.
            </Faq>
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="lp-wrap">
        <div className="lp-cta">
          <div>
            <h2>Prêt à analyser votre premier secteur ?</h2>
            <p>Créez votre compte, importez vos terrains et obtenez votre première analyse en quelques minutes.</p>
          </div>
          <div className="lp-hero-ctas">
            <Link to={user ? '/app' : '/register'} className="btn btn-light">
              {user ? 'Ouvrir mes cartes' : 'Créer un compte'} <Arrow />
            </Link>
          </div>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer-top">
            <div>
              <Logo size={30} />
              <p>La cartographie et l'analyse de secteur pour les agences immobilières et foncières.</p>
            </div>
            <div className="lp-footer-links">
              <div>
                <b>Produit</b>
                <a href="#fonctionnalites">Fonctionnalités</a>
                <a href="#comment">Comment ça marche</a>
                <a href="#faq">FAQ</a>
              </div>
              <div>
                <b>Compte</b>
                <Link to="/login">Se connecter</Link>
                <Link to="/register">Créer un compte</Link>
                <Link to="/forgot-password">Mot de passe oublié</Link>
              </div>
            </div>
          </div>
          <div className="lp-footer-bottom">
            <span>© {new Date().getFullYear()} MapSmart</span>
            <span>Données : DVF © DGFiP · Cadastre © DGFiP / Etalab · © contributeurs OpenStreetMap</span>
          </div>
        </div>
      </footer>
    </div>
  )
}

function Stat({ value, label }: { value: string; label: string }) {
  return <div className="lp-stat"><strong>{value}</strong><span>{label}</span></div>
}

function Feature({ icon, tint, color, title, children }: { icon: IconName; tint: string; color: string; title: string; children: ReactNode }) {
  return (
    <article className="lp-feature">
      <div className="lp-icon" style={{ background: tint, color }}><Icon name={icon} size={22} /></div>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <article className="lp-step">
      <span className="lp-step-num">{n}</span>
      <h3>{title}</h3>
      <p>{children}</p>
    </article>
  )
}

function Check({ children }: { children: ReactNode }) {
  return <li><span className="lp-check"><Icon name="check" size={16} /></span><span>{children}</span></li>
}

function Bar({ color, label, value, pct }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div className="lp-bar-row">
      <span><span className="sw" style={{ background: color }} />{label}</span>
      <span className="lp-bar"><i style={{ width: `${pct}%`, background: color }} /></span>
      <b>{value}</b>
    </div>
  )
}

function Source({ tag, title, children }: { tag: string; title: string; children: ReactNode }) {
  return <article className="lp-source"><small>{tag}</small><h3>{title}</h3><p>{children}</p></article>
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return <details><summary>{q}</summary><p>{children}</p></details>
}

function Arrow() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
}

type IconName = 'upload' | 'clock' | 'euro' | 'grid' | 'users' | 'shield' | 'check'

const ICONS: Record<IconName, ReactNode> = {
  upload: <><path d="M12 15V3M7 8l5-5 5 5" /><path d="M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  euro: <><path d="M17 6.5A7 7 0 1 0 17 17.5" /><path d="M4 10h9M4 14h9" /></>,
  grid: <><path d="M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  )
}
