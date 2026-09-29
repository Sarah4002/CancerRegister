import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/* ─────────────────────────────────────────────────────────────────────────────
   Décor de fond — repris tel quel du style de LoginPage (grille + halos bleus)
───────────────────────────────────────────────────────────────────────────── */
function BgDecoration() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />
      <div style={{ position: 'absolute', top: '-8%', right: '-6%', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)', animation: 'float 10s ease-in-out infinite' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-6%', width: 380, height: 380, borderRadius: '50%', background: 'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)', animation: 'float 14s ease-in-out infinite reverse' }} />
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Icônes (traits simples, cohérents avec les svg déjà utilisés dans le projet)
───────────────────────────────────────────────────────────────────────────── */
const ICONS = {
  patients:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-6.13a4 4 0 110 8 4 4 0 010-8zm7 3a3 3 0 11-6 0 3 3 0 016 0zM8 8a3 3 0 11-6 0 3 3 0 016 0z" />,
  diagnostic: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 3v4M15 3v4M4 10h16M5 7h14a1 1 0 011 1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1zM9.5 15.5l2 2 3.5-4" />,
  traitements: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.5 9.5l5 5M8 16l-2.5 2.5a2.121 2.121 0 01-3-3L5 13m9-9l2.5-2.5a2.121 2.121 0 013 3L17 7m-9 9l9-9" />,
  rdv:       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  rcp:       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m5-6.13a4 4 0 110 8 4 4 0 010-8zm7 3a3 3 0 11-6 0 3 3 0 016 0zM8 8a3 3 0 11-6 0 3 3 0 016 0z" />,
  stats:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 19V9m6 10V5m6 14v-7m6 7V11" />,
  carto:     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />,
  rapports:  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
};

const FEATURES = [
  { key: 'patients',    color: '#2563eb', title: 'Gestion des patients', desc: "Centralisation des informations administratives et médicales dans un dossier patient sécurisé." },
  { key: 'diagnostic',  color: '#0d9488', title: 'Diagnostic', desc: "Saisie et suivi des diagnostics, examens et résultats d'imagerie." },
  { key: 'traitements', color: '#7c3aed', title: 'Traitements', desc: 'Gestion des protocoles thérapeutiques, suivi des prescriptions et de la pharmacie.' },
  { key: 'rdv',         color: '#d97706', title: 'Rendez-vous', desc: 'Planification des consultations, gestion des salles et des ressources.' },
  { key: 'rcp',         color: '#dc2626', title: 'RCP', desc: 'Organisation des réunions multidisciplinaires, gestion des dossiers et suivi des décisions.' },
  { key: 'stats',       color: '#0891b2', title: 'Statistiques & Analyses', desc: 'Tableaux de bord, rapports et analyses épidémiologiques.' },
  { key: 'carto',       color: '#2563eb', title: 'Cartographie', desc: 'Visualisation géographique des données et des zones à risque.' },
  { key: 'rapports',    color: '#4338ca', title: 'Rapports & IA', desc: "Génération de rapports et recommandations basées sur l'intelligence artificielle." },
];

const PREVIEWS = [
  { title: 'Tableau de bord',  desc: 'Vue d’ensemble des données clés' },
  { title: 'Liste des patients', desc: 'Recherche et gestion des dossiers' },
  { title: 'Dossier patient',  desc: 'Informations médicales complètes' },
  { title: 'Réunion RCP',      desc: 'Suivi des décisions et recommandations' },
  { title: 'Cartographie',     desc: 'Analyse géographique des données' },
];

const TRUST_STATS = [
  { icon: '🛡', label: 'Données sécurisées' },
  { icon: '👥', label: 'Équipe pluridisciplinaire' },
  { icon: '📈', label: 'Suivi en temps réel' },
  { icon: '🎯', label: 'Meilleure prise en charge' },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Petits composants
───────────────────────────────────────────────────────────────────────────── */
function Logo() {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #2563eb, #60a5fa)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(37,99,235,0.3)', flexShrink: 0 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
          <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.15 }}>RegistreCancer.dz</div>
        <div style={{ fontSize: 9.5, color: '#94a3b8', letterSpacing: 0.8 }}>MINISTÈRE DE LA SANTÉ</div>
      </div>
    </div>
  );
}

function FeatureCard({ icon, color, title, desc }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#fff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16,
        padding: '24px 22px', transition: 'all 0.2s ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered ? '0 12px 28px rgba(37,99,235,0.12)' : '0 2px 8px rgba(15,23,42,0.04)',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke={color}>{icon}</svg>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 6, fontFamily: 'var(--font-display)' }}>{title}</div>
      <p style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, margin: 0 }}>{desc}</p>
    </div>
  );
}

/* Mini-maquette de l'interface (sans image externe) pour le hero et les vignettes */
function InterfaceMock({ compact }) {
  const barW = compact ? 22 : 28;
  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', background: '#fff' }}>
      <div style={{ width: barW, flexShrink: 0, background: '#f8fafc', borderRight: '1px solid rgba(37,99,235,0.08)', display: 'flex', flexDirection: 'column', gap: 5, padding: '10px 5px' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ height: 5, borderRadius: 3, background: i === 0 ? '#2563eb' : 'rgba(37,99,235,0.15)' }} />
        ))}
      </div>
      <div style={{ flex: 1, padding: compact ? 8 : 14, display: 'flex', flexDirection: 'column', gap: compact ? 6 : 10 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {['#2563eb', '#16a34a', '#d97706', '#7c3aed'].map(c => (
            <div key={c} style={{ flex: 1, height: compact ? 14 : 20, borderRadius: 6, background: `${c}18`, border: `1px solid ${c}30` }} />
          ))}
        </div>
        <div style={{ flex: 1, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1.4, borderRadius: 6, background: 'rgba(37,99,235,0.06)', border: '1px solid rgba(37,99,235,0.1)' }} />
          <div style={{ flex: 1, borderRadius: 6, background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)' }} />
        </div>
      </div>
    </div>
  );
}

function PrimaryButton({ children, to, style: extra }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '13px 24px', borderRadius: 12,
          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)',
          display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          transition: 'all 0.2s ease', letterSpacing: 0.3,
          transform: hovered ? 'translateY(-1px)' : 'none',
          boxShadow: hovered ? '0 8px 24px rgba(37,99,235,0.32)' : '0 4px 16px rgba(37,99,235,0.24)',
          ...extra,
        }}
      >
        {children}
      </div>
    </Link>
  );
}

function OutlineButton({ children, to, style: extra }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link to={to} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '13px 24px', borderRadius: 12,
          background: hovered ? '#eff6ff' : '#fff',
          border: '1.5px solid rgba(37,99,235,0.25)',
          color: '#2563eb', fontSize: 14, fontWeight: 700, fontFamily: 'var(--font-display)',
          display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
          transition: 'all 0.2s ease', letterSpacing: 0.3,
          ...extra,
        }}
      >
        {children}
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f9', position: 'relative', fontFamily: 'var(--font-body)' }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        @keyframes fadeUp { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
      `}</style>

      {/* ── Navbar ── */}
      <header style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 56px', background: '#fff', borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
        <Logo />
        <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          {['Accueil', 'Fonctionnalités', 'À propos', 'Contact'].map((label, i) => (
            <a key={label} href={`#${label === 'Accueil' ? '' : label.toLowerCase().replace('à propos', 'apropos')}`} style={{ fontSize: 13.5, fontWeight: i === 0 ? 600 : 500, color: i === 0 ? '#2563eb' : '#475569', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <OutlineButton to="/login" style={{ padding: '9px 18px', fontSize: 13 }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 16l-4-4m0 0l4-4m-4 4h11m0-9h1a2 2 0 012 2v10a2 2 0 01-2 2h-1" /></svg>
            Se connecter
          </OutlineButton>
          <PrimaryButton to="#fonctionnalites" style={{ padding: '9px 18px', fontSize: 13 }}>
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            Découvrir la démo
          </PrimaryButton>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '72px 56px 88px' }}>
        <BgDecoration />
        <div style={{
          position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center', maxWidth: 1280, margin: '0 auto',
        }}>
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'all 0.6s ease' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 46, fontWeight: 800, lineHeight: 1.14, color: '#0f172a', marginBottom: 18 }}>
              Système de gestion<br />du <span style={{ color: '#2563eb' }}>registre du cancer</span>
            </h1>
            <p style={{ fontSize: 15.5, color: '#475569', lineHeight: 1.75, maxWidth: 460, marginBottom: 30 }}>
              Une plateforme moderne pour la gestion, le suivi et l'analyse des données oncologiques, au service des professionnels de santé et de la recherche.
            </p>
            <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
              <PrimaryButton to="/login">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Se connecter
              </PrimaryButton>
              <OutlineButton to="#fonctionnalites">
                <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                Découvrir la démo
              </OutlineButton>
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {['Sécurisé', 'Conforme RGPD', 'Accès réseau hospitalier'].map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#334155', fontWeight: 500 }}>
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#16a34a" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  {t}
                </div>
              ))}
            </div>
          </div>

          {/* Maquette d'écran (laptop) */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(12px)', transition: 'all 0.6s ease 0.12s', position: 'relative' }}>
            <div style={{ background: '#0f172a', borderRadius: '16px 16px 6px 6px', padding: '10px 10px 0', boxShadow: '0 24px 60px rgba(15,23,42,0.25)' }}>
              <div style={{ display: 'flex', gap: 5, padding: '4px 6px 8px' }}>
                {['#ef4444', '#f59e0b', '#22c55e'].map(c => <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />)}
              </div>
              <div style={{ height: 260, borderRadius: '4px 4px 0 0', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
                <InterfaceMock />
              </div>
            </div>
            <div style={{ height: 14, background: '#1e293b', borderRadius: '0 0 10px 10px', margin: '0 -6px' }} />
            <div style={{ position: 'absolute', top: -18, right: -18, background: '#fff', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 14, padding: '10px 16px', boxShadow: '0 8px 24px rgba(15,23,42,0.1)', fontSize: 11.5, color: '#334155', maxWidth: 150, lineHeight: 1.5 }}>
              Des données pour une meilleure prise en charge
            </div>
          </div>
        </div>
      </section>

      {/* ── Fonctionnalités ── */}
      <section id="fonctionnalites" style={{ padding: '70px 56px', background: '#fff' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>Nos fonctionnalités principales</h2>
            <div style={{ width: 48, height: 3, background: '#2563eb', borderRadius: 2, margin: '0 auto' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 18 }}>
            {FEATURES.map(f => (
              <FeatureCard key={f.key} icon={ICONS[f.key]} color={f.color} title={f.title} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Aperçu de l'interface ── */}
      <section style={{ padding: '70px 56px', background: '#f0f4f9' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 800, color: '#0f172a' }}>Découvrez notre interface</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16 }}>
            {PREVIEWS.map(p => (
              <div key={p.title}>
                <div style={{ height: 130, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(37,99,235,0.1)', boxShadow: '0 4px 14px rgba(15,23,42,0.06)', marginBottom: 10 }}>
                  <InterfaceMock compact />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>{p.title}</div>
                <div style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Bandeau engagement ── */}
      <section style={{ padding: '0 56px 56px' }}>
        <div style={{
          maxWidth: 1280, margin: '0 auto', background: 'linear-gradient(120deg, #0f2c52, #1e3a6a)',
          borderRadius: 20, padding: '30px 36px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 24, color: '#fff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, maxWidth: 480 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#fff"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.5 9.5l5 5M8 16l-2.5 2.5a2.121 2.121 0 01-3-3L5 13m9-9l2.5-2.5a2.121 2.121 0 013 3L17 7m-9 9l9-9" /></svg>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 700, marginBottom: 4 }}>Un outil au service de la lutte contre le cancer</div>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: 0 }}>
                Le registre oncologique est un levier essentiel pour améliorer la qualité des soins, faciliter la recherche et contribuer à une meilleure prévention.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {TRUST_STATS.map(s => (
              <div key={s.label} style={{ textAlign: 'center', minWidth: 90 }}>
                <div style={{ fontSize: 20, marginBottom: 6 }}>{s.icon}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ padding: '22px 56px', background: '#0f2c52', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontSize: 12 }}>© 2026 Registre Oncologique. Tous droits réservés.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Mentions légales', 'Confidentialité', 'Contact'].map(l => (
            <a key={l} href="#" style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>
    </div>
  );
}