import { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Bot,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Download,
  FileBarChart,
  Headphones,
  HelpCircle,
  LockKeyhole,
  Mail,
  Mic,
  MonitorPlay,
  Phone,
  Play,
  Search,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserPlus,
} from 'lucide-react';
import { AppLayout } from '../../components/layout/Sidebar';

const SECTIONS = [
  ['introduction', 'Introduction'],
  ['guide', 'Guide rapide'],
  ['tutoriels', 'Tutoriels'],
  ['captures', 'Captures ecran'],
  ['faq', 'FAQ'],
  ['videos', 'Videos'],
  ['support', 'Support'],
];

const QUICK_GUIDES = [
  {
    title: 'Connexion',
    arabic: 'تسجيل الدخول',
    description: 'Acceder au systeme avec email et mot de passe.',
    icon: LockKeyhole,
    tags: ['login', 'connexion', 'mot de passe'],
    answer: 'Pour se connecter : ouvrez /login, saisissez votre email et mot de passe, puis validez. Si le mot de passe est oublie, contactez un administrateur.',
  },
  {
    title: 'Ajouter patient',
    arabic: 'إضافة مريض',
    description: 'Creer un dossier patient complet et verifier les doublons.',
    icon: UserPlus,
    tags: ['patient', 'ajouter', 'dossier', 'nouveau'],
    answer: 'Pour ajouter un patient : allez dans Patients, cliquez sur Ajouter, remplissez les informations, verifiez les doublons puis enregistrez.',
  },
  {
    title: 'Diagnostic',
    arabic: 'إدخال التشخيص',
    description: 'Saisir la topographie, morphologie, stade et examens.',
    icon: Stethoscope,
    tags: ['diagnostic', 'cancer', 'stade', 'examen'],
    answer: 'Pour ajouter un diagnostic : ouvrez Diagnostics, cliquez sur Nouveau, renseignez topographie, morphologie, stade et examens, puis sauvegardez.',
  },
  {
    title: 'Traitement',
    arabic: 'إضافة العلاج',
    description: 'Ajouter chirurgie, chimiotherapie, radiotherapie ou suivi.',
    icon: ClipboardList,
    tags: ['traitement', 'suivi', 'chirurgie', 'chimio', 'radio'],
    answer: 'Pour ajouter un traitement : ouvrez Traitements, choisissez le type de traitement, completez les dates et details, puis enregistrez.',
  },
  {
    title: 'Recherche',
    arabic: 'البحث',
    description: 'Retrouver rapidement un patient, un dossier ou une statistique.',
    icon: Search,
    tags: ['recherche', 'filtre', 'chercher'],
    answer: 'Pour chercher : utilisez la barre de recherche ou les filtres dans les listes. Essayez le nom, numero dossier, wilaya ou diagnostic.',
  },
  {
    title: 'Export',
    arabic: 'تصدير الملفات',
    description: 'Exporter les rapports en PDF, Excel ou format CanReg.',
    icon: Download,
    tags: ['export', 'pdf', 'excel', 'rapport', 'canreg'],
    answer: 'Pour exporter : ouvrez Statistiques ou le dossier patient, cliquez sur Exporter, puis choisissez PDF, Excel, CSV ou CanReg.',
  },
];

const TUTORIALS = [
  {
    title: 'Ajouter un patient',
    icon: UserPlus,
    tags: ['patient', 'ajouter', 'dossier'],
    steps: [
      'Aller vers le module Patients.',
      'Cliquer sur Ajouter un patient.',
      'Remplir les informations administratives et medicales.',
      'Verifier les doublons proposes par le systeme.',
      'Cliquer sur Enregistrer.',
    ],
  },
  {
    title: 'Utiliser la saisie vocale',
    icon: Mic,
    tags: ['microphone', 'vocale', 'dictee'],
    steps: [
      'Ouvrir un formulaire compatible avec la dictee.',
      'Cliquer sur l’icone microphone.',
      'Autoriser le micro dans le navigateur.',
      'Parler clairement avec des phrases courtes.',
      'Verifier le texte insere puis enregistrer.',
    ],
  },
  {
    title: 'Exporter un rapport',
    icon: FileBarChart,
    tags: ['export', 'pdf', 'excel', 'rapport'],
    steps: [
      'Ouvrir Statistiques ou le dossier patient.',
      'Choisir les filtres et la periode.',
      'Cliquer sur Exporter.',
      'Choisir PDF, Excel ou CSV.',
      'Telecharger le fichier genere.',
    ],
  },
];

const FAQ = [
  {
    question: 'Comment reinitialiser le mot de passe ?',
    answer: 'Un administrateur peut ouvrir Administration, choisir l’utilisateur puis utiliser Reinitialiser mot de passe.',
    tags: ['mot de passe', 'reset', 'connexion'],
  },
  {
    question: 'Comment exporter un PDF ?',
    answer: 'Dans Statistiques ou Patient, cliquez sur Exporter puis choisissez PDF.',
    tags: ['export', 'pdf', 'rapport'],
  },
  {
    question: 'Comment modifier un dossier patient ?',
    answer: 'Ouvrez le dossier patient depuis la liste, puis cliquez sur Modifier si votre role possede la permission.',
    tags: ['patient', 'modifier', 'dossier'],
  },
  {
    question: 'Comment activer le microphone ?',
    answer: 'Cliquez sur l’icone microphone, autorisez l’acces au micro dans le navigateur, puis parlez clairement.',
    tags: ['microphone', 'vocale', 'dictee'],
  },
  {
    question: 'Pourquoi je ne vois pas un bouton ?',
    answer: 'Certains boutons dependent du role et des permissions. Contactez l’administrateur si une action vous manque.',
    tags: ['permission', 'role', 'acces'],
  },
];

const SCREENSHOTS = [
  { title: 'Login', detail: 'Connexion securisee avec email et mot de passe.', color: '#2563eb', tags: ['login', 'connexion'] },
  { title: 'Dashboard', detail: 'Vue globale : indicateurs, activite et raccourcis.', color: '#0891b2', tags: ['dashboard', 'accueil'] },
  { title: 'Patient', detail: 'Formulaire patient pour les informations administratives et medicales.', color: '#16a34a', tags: ['patient', 'formulaire'] },
  { title: 'Statistiques', detail: 'Graphiques, filtres et indicateurs epidemiologiques.', color: '#7c3aed', tags: ['statistiques', 'graphique'] },
  { title: 'Export', detail: 'Generation PDF, Excel, CSV et CanReg.', color: '#d97706', tags: ['export', 'pdf', 'excel'] },
];

const DICTIONARY = [
  ...QUICK_GUIDES.map((item) => ({ title: item.title, section: 'guide', tags: item.tags, answer: item.answer })),
  ...TUTORIALS.map((item) => ({ title: item.title, section: 'tutoriels', tags: item.tags, answer: item.steps.join(' ') })),
  ...FAQ.map((item) => ({ title: item.question, section: 'faq', tags: item.tags, answer: item.answer })),
  ...SCREENSHOTS.map((item) => ({ title: item.title, section: 'captures', tags: item.tags, answer: item.detail })),
  { title: 'Support technique', section: 'support', tags: ['support', 'email', 'telephone', 'aide'], answer: 'Contactez support@registrecancer.dz ou +213 XXX XX XX XX.' },
  { title: 'Video tutoriel', section: 'videos', tags: ['video', 'demo', 'demonstration'], answer: 'La video montre le parcours login, patient, statistiques et export.' },
];

export default function HelpCenterPage() {
  const [query, setQuery] = useState('');
  const [activeSection, setActiveSection] = useState('introduction');
  const [openFaq, setOpenFaq] = useState(0);
  const [selectedTutorial, setSelectedTutorial] = useState(TUTORIALS[0].title);
  const [selectedScreenshot, setSelectedScreenshot] = useState(SCREENSHOTS[0]);
  const [assistantText, setAssistantText] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState('Posez une question, par exemple : comment exporter PDF, ajouter patient ou activer microphone.');

  const sectionRefs = useRef({});
  const normalizedQuery = normalize(query);

  const searchResults = useMemo(() => {
    if (!normalizedQuery) return [];
    return DICTIONARY
      .map((item) => ({ ...item, score: scoreItem(item, normalizedQuery) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [normalizedQuery]);

  const filteredGuides = useMemo(() => filterByQuery(QUICK_GUIDES, normalizedQuery), [normalizedQuery]);
  const filteredTutorials = useMemo(() => filterByQuery(TUTORIALS, normalizedQuery), [normalizedQuery]);
  const filteredFaq = useMemo(() => filterByQuery(FAQ, normalizedQuery), [normalizedQuery]);
  const filteredScreens = useMemo(() => filterByQuery(SCREENSHOTS, normalizedQuery), [normalizedQuery]);

  const scrollToSection = (key) => {
    setActiveSection(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openSearchResult = (result) => {
    if (result.section === 'tutoriels') setSelectedTutorial(result.title);
    if (result.section === 'faq') {
      const faqIndex = FAQ.findIndex((item) => item.question === result.title);
      if (faqIndex >= 0) setOpenFaq(faqIndex);
    }
    if (result.section === 'captures') {
      const screen = SCREENSHOTS.find((item) => item.title === result.title);
      if (screen) setSelectedScreenshot(screen);
    }
    setAssistantAnswer(result.answer);
    scrollToSection(result.section);
  };

  const askAssistant = () => {
    const question = normalize(assistantText);
    if (!question) {
      setAssistantAnswer('Ecrivez votre question d’abord.');
      return;
    }
    const best = DICTIONARY
      .map((item) => ({ ...item, score: scoreItem(item, question) }))
      .sort((a, b) => b.score - a.score)[0];

    if (!best || best.score === 0) {
      setAssistantAnswer('Je n’ai pas trouve une reponse exacte. Essayez avec : patient, export, PDF, microphone, diagnostic ou mot de passe.');
      return;
    }
    setAssistantAnswer(best.answer);
    openSearchResult(best);
  };

  const handleVideo = () => window.open('/videos/video1.mp4', '_blank', 'noopener,noreferrer');
  const activeTutorial = TUTORIALS.find((item) => item.title === selectedTutorial) || TUTORIALS[0];

  return (
    <AppLayout title="Centre d'Aide">
      <div style={pageStyle}>
        <aside style={helpNavStyle}>
          <div style={navTitleStyle}><BookOpen size={18} /> Centre d'Aide</div>
          {SECTIONS.map(([key, label]) => (
            <button key={key} type="button" onClick={() => scrollToSection(key)} style={{ ...navButtonStyle, ...(activeSection === key ? navButtonActiveStyle : {}) }}>
              {label}
            </button>
          ))}
        </aside>

        <main style={contentStyle}>
          <section ref={(node) => { sectionRefs.current.introduction = node; }} style={heroStyle}>
            <div style={heroCopyStyle}>
              <div style={eyebrowStyle}>Guide Utilisateur / مركز المساعدة</div>
              <h2 style={heroTitleStyle}>Bienvenue dans RegistreCancer.dz</h2>
              <p style={heroTextStyle}>Cette page vous aide a utiliser le systeme rapidement : patients, diagnostics, export, recherche, saisie vocale et support.</p>
              <div style={searchBoxStyle}>
                <Search size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher : export, patient, microphone..." style={searchInputStyle} />
              </div>
              {searchResults.length > 0 && (
                <div style={searchResultsStyle}>
                  {searchResults.map((result) => (
                    <button key={`${result.section}-${result.title}`} type="button" onClick={() => openSearchResult(result)} style={searchResultButtonStyle}>
                      <span>{result.title}</span>
                      <small>{SECTIONS.find(([key]) => key === result.section)?.[1]}</small>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={assistantCardStyle}>
              <Bot size={26} />
              <div>
                <div style={assistantTitleStyle}>Assistant IA</div>
                <p style={assistantTextStyle}>Bonjour, comment puis-je vous aider ?</p>
              </div>
              <textarea value={assistantText} onChange={(event) => setAssistantText(event.target.value)} placeholder="Exemple : Comment exporter un rapport PDF ?" style={assistantInputStyle} />
              <button type="button" onClick={askAssistant} style={primaryButtonStyle}>Demander</button>
              <div style={assistantAnswerStyle}>{assistantAnswer}</div>
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.guide = node; }} style={sectionStyle}>
            <SectionTitle icon={Sparkles} title="Guide rapide" subtitle="Cliquez sur une fonction pour obtenir une reponse immediate." />
            <div style={quickGridStyle}>
              {filteredGuides.map(({ title, arabic, description, icon: Icon, answer }) => (
                <button key={title} type="button" onClick={() => setAssistantAnswer(answer)} style={quickCardStyle}>
                  <div style={quickIconStyle}><Icon size={20} /></div>
                  <div>
                    <h3 style={cardTitleStyle}>{title}</h3>
                    <div style={arabicStyle}>{arabic}</div>
                    <p style={bodyTextStyle}>{description}</p>
                  </div>
                </button>
              ))}
              {filteredGuides.length === 0 && <EmptySearch />}
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.tutoriels = node; }} style={sectionStyle}>
            <SectionTitle icon={ClipboardList} title="Tutoriels etape par etape" subtitle="Choisissez un tutoriel pour voir les etapes detaillees." />
            <div style={tutorialLayoutStyle}>
              <div style={tutorialListStyle}>
                {filteredTutorials.map(({ title, icon: Icon }) => (
                  <button key={title} type="button" onClick={() => setSelectedTutorial(title)} style={{ ...tutorialButtonStyle, ...(selectedTutorial === title ? tutorialButtonActiveStyle : {}) }}>
                    <Icon size={17} />
                    {title}
                  </button>
                ))}
              </div>
              <article style={panelStyle}>
                <div style={tutorialHeaderStyle}>
                  <div style={quickIconStyle}><activeTutorial.icon size={19} /></div>
                  <h3 style={panelTitleStyle}>{activeTutorial.title}</h3>
                </div>
                <ol style={stepsStyle}>
                  {activeTutorial.steps.map((step) => <li key={step} style={stepStyle}>{step}</li>)}
                </ol>
              </article>
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.captures = node; }} style={sectionStyle}>
            <SectionTitle icon={MonitorPlay} title="Images et captures ecran" subtitle="Cliquez sur une capture pour afficher son detail." />
            <div style={screensGridStyle}>
              {filteredScreens.map((screen) => (
                <button key={screen.title} type="button" onClick={() => setSelectedScreenshot(screen)} style={{ ...screenshotCardStyle, ...(selectedScreenshot.title === screen.title ? screenshotActiveStyle : {}) }}>
                  <FakeScreenshot screen={screen} />
                  <h3 style={cardTitleStyle}>{screen.title}</h3>
                  <p style={bodyTextStyle}>{screen.detail}</p>
                </button>
              ))}
              {filteredScreens.length === 0 && <EmptySearch />}
            </div>
            <div style={selectedScreenshotStyle}>
              <FakeScreenshot screen={selectedScreenshot} large />
              <div>
                <h3 style={panelTitleStyle}>{selectedScreenshot.title}</h3>
                <p style={bodyTextStyle}>{selectedScreenshot.detail}</p>
              </div>
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.faq = node; }} style={sectionStyle}>
            <SectionTitle icon={HelpCircle} title="FAQ - Questions frequentes" subtitle="Cliquez sur une question pour afficher la reponse." />
            <div style={faqWrapStyle}>
              {filteredFaq.map((item) => {
                const realIndex = FAQ.findIndex((faq) => faq.question === item.question);
                return (
                  <article key={item.question} style={faqItemStyle}>
                    <button type="button" onClick={() => setOpenFaq(openFaq === realIndex ? -1 : realIndex)} style={faqButtonStyle}>
                      <span>{item.question}</span>
                      <ChevronDown size={18} style={{ transform: openFaq === realIndex ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {openFaq === realIndex && <p style={faqAnswerStyle}>{item.answer}</p>}
                  </article>
                );
              })}
              {filteredFaq.length === 0 && <EmptySearch />}
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.videos = node; }} style={sectionStyle}>
            <SectionTitle icon={MonitorPlay} title="Video tutoriel" subtitle="Un parcours court : login, patient, statistiques et export." />
            <div style={videoPanelStyle}>
              <div style={videoPreviewStyle}>
                <video
  controls
  preload="metadata"
  style={videoPlayerStyle}
  aria-label="Vidéo de démonstration RegistreCancer.dz"
>
  <source
    src="https://app.heygen.com/videos/national-cancer-registry-platform-tutorial-a4f7264b4ab34677ae77a656f9d9da4c"
    type="video/mp4"
  />
  Votre navigateur ne peut pas lire cette vidéo.
</video>
              </div>
              <div style={videoTextStyle}>
                <h3 style={panelTitleStyle}>Regarder la video de demonstration</h3>
                <p style={bodyTextStyle}>La video presente les etapes principales : connexion, creation patient, diagnostic, statistiques et export PDF/Excel.</p>
                <button type="button" onClick={handleVideo} style={secondaryButtonStyle}><Play size={15} /> Ouvrir la video</button>
              </div>
            </div>
          </section>

          <section style={sectionStyle}>
            <SectionTitle icon={ShieldCheck} title="Securite & confidentialite" subtitle="Protection des donnees medicales et acces par role." />
            <div style={infoGridStyle}>
              {[
                ['Authentification securisee', 'Acces protege par session et permissions utilisateur.'],
                ['Confidentialite medicale', 'Les donnees patient doivent etre consultees uniquement par les profils autorises.'],
                ['Tracabilite', 'Les connexions et actions sensibles peuvent etre journalisees pour audit.'],
              ].map(([title, text]) => (
                <div key={title} style={infoCardStyle}>
                  <CheckCircle2 size={18} />
                  <div><h3 style={cardTitleStyle}>{title}</h3><p style={bodyTextStyle}>{text}</p></div>
                </div>
              ))}
            </div>
          </section>

          <section ref={(node) => { sectionRefs.current.support = node; }} style={supportSectionStyle}>
            <SectionTitle icon={Headphones} title="Support technique" subtitle="Contactez l’equipe support en cas de blocage." />
            <div style={supportGridStyle}>
              <a href="mailto:support@registrecancer.dz" style={supportCardStyle}><Mail size={18} /> support@registrecancer.dz</a>
              <a href="tel:+213000000000" style={supportCardStyle}><Phone size={18} /> +213 XXX XX XX XX</a>
            </div>
            <div style={tipStyle}><Sparkles size={18} /><span>Astuce : utilisez la saisie vocale pour gagner du temps lors de la saisie medicale.</span></div>
          </section>
        </main>
      </div>
    </AppLayout>
  );
}

function normalize(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function filterByQuery(items, query) {
  if (!query) return items;
  return items.filter((item) => scoreItem(item, query) > 0);
}

function scoreItem(item, query) {
  const haystack = normalize(`${item.title || ''} ${item.question || ''} ${item.description || ''} ${item.answer || ''} ${(item.tags || []).join(' ')}`);
  const words = query.split(/\s+/).filter(Boolean);
  return words.reduce((score, word) => score + (haystack.includes(word) ? 1 : 0), 0);
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div style={sectionTitleWrapStyle}>
      <div style={sectionIconStyle}><Icon size={18} /></div>
      <div><h2 style={sectionTitleStyle}>{title}</h2><p style={sectionSubtitleStyle}>{subtitle}</p></div>
    </div>
  );
}

function FakeScreenshot({ screen, large }) {
  return (
    <div style={{ ...fakeScreenshotStyle, ...(large ? fakeScreenshotLargeStyle : {}), borderTopColor: screen.color }}>
      <div style={fakeTopbarStyle}><span /><span /><span /></div>
      <div style={{ ...fakeLineStyle, width: '70%', background: screen.color }} />
      <div style={{ ...fakeLineStyle, width: '92%' }} />
      <div style={{ ...fakeLineStyle, width: '58%' }} />
      <div style={fakeGridStyle}><div /><div /><div /></div>
    </div>
  );
}

function EmptySearch() {
  return <div style={emptyStyle}>Aucun resultat trouve. Essayez avec patient, export, PDF ou microphone.</div>;
}

const pageStyle = { display: 'grid', gridTemplateColumns: '220px minmax(0, 1fr)', gap: 20, alignItems: 'start' };
const helpNavStyle = { position: 'sticky', top: 92, background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 12, boxShadow: '0 8px 24px rgba(15,23,42,0.05)' };
const navTitleStyle = { display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a', fontSize: 13, fontWeight: 800, marginBottom: 10 };
const navButtonStyle = { width: '100%', minHeight: 34, border: 'none', background: 'transparent', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0 10px', borderRadius: 9, cursor: 'pointer', fontSize: 12, fontWeight: 700, textAlign: 'left' };
const navButtonActiveStyle = { background: '#eff6ff', color: '#2563eb' };
const contentStyle = { display: 'flex', flexDirection: 'column', gap: 22, minWidth: 0 };
const heroStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 330px', gap: 16, alignItems: 'stretch', scrollMarginTop: 92 };
const heroCopyStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 16, padding: 24, boxShadow: '0 12px 32px rgba(15,23,42,0.06)' };
const eyebrowStyle = { color: '#2563eb', fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 };
const heroTitleStyle = { fontFamily: 'var(--font-display)', fontSize: 26, color: '#0f172a', marginBottom: 8 };
const heroTextStyle = { color: '#64748b', fontSize: 13, lineHeight: 1.7, maxWidth: 760, marginBottom: 18 };
const searchBoxStyle = { height: 46, display: 'flex', alignItems: 'center', gap: 10, background: '#f8fbff', border: '1px solid rgba(37,99,235,0.14)', borderRadius: 12, padding: '0 13px', color: '#2563eb' };
const searchInputStyle = { flex: 1, border: 'none', background: 'transparent', outline: 'none', color: '#0f172a', fontSize: 13 };
const searchResultsStyle = { marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 };
const searchResultButtonStyle = { border: '1px solid rgba(37,99,235,0.12)', background: '#ffffff', color: '#0f172a', borderRadius: 10, padding: '9px 10px', display: 'flex', justifyContent: 'space-between', gap: 8, cursor: 'pointer', fontSize: 12, fontWeight: 800 };
const assistantCardStyle = { background: '#111827', color: '#ffffff', borderRadius: 16, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, boxShadow: '0 14px 36px rgba(15,23,42,0.18)' };
const assistantTitleStyle = { fontSize: 15, fontWeight: 800 };
const assistantTextStyle = { color: '#cbd5e1', fontSize: 12, lineHeight: 1.5 };
const assistantInputStyle = { minHeight: 78, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.08)', color: '#ffffff', borderRadius: 10, padding: 10, resize: 'vertical', outline: 'none', fontSize: 12 };
const assistantAnswerStyle = { background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, padding: 10, color: '#dbeafe', fontSize: 12, lineHeight: 1.55 };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 92 };
const sectionTitleWrapStyle = { display: 'flex', alignItems: 'center', gap: 10 };
const sectionIconStyle = { width: 38, height: 38, borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1px solid rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const sectionTitleStyle = { fontFamily: 'var(--font-display)', fontSize: 17, color: '#0f172a', marginBottom: 2 };
const sectionSubtitleStyle = { color: '#64748b', fontSize: 11.5 };
const quickGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 };
const quickCardStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 15, display: 'flex', gap: 12, minHeight: 132, textAlign: 'left', cursor: 'pointer' };
const quickIconStyle = { width: 40, height: 40, borderRadius: 10, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };
const cardTitleStyle = { color: '#0f172a', fontSize: 13, fontWeight: 800, marginBottom: 3 };
const arabicStyle = { color: '#2563eb', fontSize: 12, fontWeight: 700, marginBottom: 5 };
const bodyTextStyle = { color: '#64748b', fontSize: 12, lineHeight: 1.6 };
const tutorialLayoutStyle = { display: 'grid', gridTemplateColumns: '260px minmax(0, 1fr)', gap: 12 };
const tutorialListStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const tutorialButtonStyle = { minHeight: 42, border: '1px solid rgba(37,99,235,0.1)', background: '#ffffff', color: '#334155', borderRadius: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, padding: '0 12px', fontSize: 12, fontWeight: 800 };
const tutorialButtonActiveStyle = { background: '#eff6ff', color: '#2563eb', borderColor: 'rgba(37,99,235,0.28)' };
const panelStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 16, boxShadow: '0 8px 24px rgba(15,23,42,0.04)' };
const panelTitleStyle = { color: '#0f172a', fontSize: 15, fontWeight: 800, fontFamily: 'var(--font-display)' };
const tutorialHeaderStyle = { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 };
const stepsStyle = { paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 };
const stepStyle = { color: '#334155', fontSize: 12, lineHeight: 1.5 };
const screensGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 };
const screenshotCardStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 12, textAlign: 'left', cursor: 'pointer' };
const screenshotActiveStyle = { borderColor: 'rgba(37,99,235,0.38)', boxShadow: '0 8px 24px rgba(37,99,235,0.1)' };
const selectedScreenshotStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 14, display: 'grid', gridTemplateColumns: '280px minmax(0, 1fr)', gap: 14, alignItems: 'center' };
const fakeScreenshotStyle = { minHeight: 116, border: '1px solid rgba(37,99,235,0.14)', borderTop: '4px solid #2563eb', borderRadius: 10, background: '#f8fbff', padding: 10, marginBottom: 10 };
const fakeScreenshotLargeStyle = { minHeight: 160, marginBottom: 0 };
const fakeTopbarStyle = { display: 'flex', gap: 4, marginBottom: 12 };
const fakeLineStyle = { height: 8, borderRadius: 8, background: '#dbeafe', marginBottom: 8 };
const fakeGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 10 };
const faqWrapStyle = { display: 'flex', flexDirection: 'column', gap: 8 };
const faqItemStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 12, overflow: 'hidden' };
const faqButtonStyle = { width: '100%', border: 'none', background: 'transparent', padding: '13px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: '#0f172a', cursor: 'pointer', fontSize: 13, fontWeight: 800, textAlign: 'left' };
const faqAnswerStyle = { padding: '0 14px 14px', color: '#64748b', fontSize: 12, lineHeight: 1.6 };
const videoPanelStyle = { display: 'grid', gridTemplateColumns: '420px minmax(0, 1fr)', gap: 16, background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 16, padding: 16 };
const videoPreviewStyle = { minHeight: 236, borderRadius: 12, background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' };
const videoPlayerStyle = { width: '100%', height: '100%', minHeight: 236, display: 'block', background: '#0f172a' };
const videoTextStyle = { display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 };
const primaryButtonStyle = { minHeight: 38, border: 'none', borderRadius: 10, background: '#2563eb', color: '#ffffff', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '0 14px' };
const secondaryButtonStyle = { minHeight: 36, borderRadius: 10, border: '1px solid rgba(37,99,235,0.16)', background: '#ffffff', color: '#2563eb', fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: '0 12px', display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start' };
const infoGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 };
const infoCardStyle = { background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 15, display: 'flex', gap: 10, color: '#2563eb' };
const supportSectionStyle = { display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 8, scrollMarginTop: 92 };
const supportGridStyle = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 };
const supportCardStyle = { minHeight: 54, background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, color: '#2563eb', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px', fontSize: 13, fontWeight: 800 };
const tipStyle = { background: '#eff6ff', border: '1px solid rgba(37,99,235,0.14)', color: '#1d4ed8', borderRadius: 14, padding: 14, display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, fontWeight: 700 };
const emptyStyle = { gridColumn: '1 / -1', background: '#ffffff', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 14, padding: 24, textAlign: 'center', color: '#64748b', fontSize: 13 };
