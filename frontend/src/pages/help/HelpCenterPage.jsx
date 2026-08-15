import { useState } from 'react';
import { Headphones, Mail, Phone, Play, Sparkles } from 'lucide-react';
import { AppLayout } from '../../components/layout/Sidebar';

export default function HelpCenterPage() {
  // --- Video Google Drive : on utilise le lien /preview dans un iframe.
  // Le lien "uc?export=download" ne fonctionne pas de façon fiable avec <video>
  // car Google Drive renvoie parfois une page HTML intermédiaire (scan antivirus)
  // au lieu du flux vidéo brut. Le mode /preview est conçu pour être intégré en iframe.
  const videoFileId = '1UoaEDf4n5j-pQGTSC3UrJOc7MxAoWV4d';
  const videoEmbedUrl = `https://drive.google.com/file/d/${videoFileId}/preview`;
  const videoOpenUrl = `https://drive.google.com/file/d/${videoFileId}/view`;
  const handleVideo = () => window.open(videoOpenUrl, '_blank', 'noopener,noreferrer');

  return (
    <AppLayout title="Centre d'Aide">
      <div style={pageStyle}>
        <section style={sectionStyle}>
          <SectionTitle icon={Play} title="Video tutoriel" subtitle="Un parcours court : login, patient, statistiques et export." />
          <div style={videoPanelStyle}>
            <div style={videoPreviewStyle}>
              <iframe
                src={videoEmbedUrl}
                style={videoPlayerStyle}
                title="Vidéo de démonstration RegistreCancer.dz"
                allow="autoplay"
                allowFullScreen
              />
            </div>
            <div style={videoTextStyle}>
              <h3 style={panelTitleStyle}>Regarder la video de demonstration</h3>
              <p style={bodyTextStyle}>La video presente les etapes principales : connexion, creation patient, diagnostic, statistiques et export PDF/Excel.</p>
              <button type="button" onClick={handleVideo} style={secondaryButtonStyle}><Play size={15} /> Ouvrir dans un nouvel onglet</button>
            </div>
          </div>
        </section>

        <section style={supportSectionStyle}>
          <SectionTitle icon={Headphones} title="Support technique" subtitle="Contactez l'equipe support en cas de blocage." />
          <div style={supportGridStyle}>
            <a href="mailto:support@registrecancer.dz" style={supportCardStyle}><Mail size={18} /> support@registrecancer.dz</a>
            <a href="tel:+213000000000" style={supportCardStyle}><Phone size={18} /> +213 XXX XX XX XX</a>
          </div>
          <div style={tipStyle}><Sparkles size={18} /><span>Astuce : utilisez la saisie vocale pour gagner du temps lors de la saisie medicale.</span></div>
        </section>
      </div>
    </AppLayout>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={sectionTitleWrapStyle}>
      <div style={sectionIconStyle}><Icon size={18} /></div>
      <div><h2 style={sectionTitleStyle}>{title}</h2><p style={sectionSubtitleStyle}>{subtitle}</p></div>
    </div>
  );
}

const pageStyle = { display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 900, margin: '0 auto' };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 12 };
const sectionTitleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10 };
const sectionIconStyle = { width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sectionTitleStyle = { fontFamily: 'var(--font-display)', fontSize: 17, color: '#0f172a', marginBottom: 2 };
const sectionSubtitleStyle = { color: '#64748b', fontSize: 11.5 };
const bodyTextStyle = { color: '#64748b', fontSize: 12, lineHeight: 1.6 };
const panelTitleStyle = { color: '#0f172a', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)' };
const videoPanelStyle = { display: 'grid', gridTemplateColumns: '420px minmax(0, 1fr)', gap: 16, background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 16, padding: 16 };
const videoPreviewStyle = { minHeight: 236, borderRadius: 12, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const videoPlayerStyle = { width: '100%', height: '100%', minHeight: 236, display: 'block', background: '#0f172a', border: 'none' };
const videoTextStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 };
const secondaryButtonStyle = { minHeight: 36, borderRadius: 10, border: '1px solid rgba(37,99,235,0.16)', background: '#ffffff', color: '#2563eb', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' };
const supportSectionStyle = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8 };
const supportGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 };
const supportCardStyle = { minHeight: 54, background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', fontSize: 13, fontWeight: 800 };
const tipStyle = { background: '#eff6ff', border: '1px solid rgba(37,99,235,0.14)', color: '#1d4ed8', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 700 };
const emptyStyle = { gridColumn: '1 / -1', background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 };