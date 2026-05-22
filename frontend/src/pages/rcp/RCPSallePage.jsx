import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { accountsService } from '../../services/accountsService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// ─── Constantes ──────────────────────────────────────────────────────────────
const STATUT_CFG = {
  planifiee: { color: '#0077cc', label: 'Planifiée' },
  en_cours:  { color: '#00c896', label: 'En cours',  pulse: true },
  terminee:  { color: '#6b7280', label: 'Terminée' },
  annulee:   { color: '#e45c5c', label: 'Annulée' },
  reportee:  { color: '#e2a03f', label: 'Reportée' },
};

const DECISION_COLORS = {
  chir: '#e45c5c', chimio: '#0077cc', radio: '#e2a03f', hormono: '#00c896',
  immuno: '#8b5cf6', radiochim: '#f97316', surveill: '#38bdf8', support: '#8b5cf6',
  palliatif: '#6b7280', essai: '#a855f7', second: '#9ca3af', bilan: '#60a5fa',
  abstention: '#94a3b8', autre: '#9ca3af',
};
const DECISION_LABELS = {
  chir: 'Chirurgie', chimio: 'Chimiothérapie', radio: 'Radiothérapie',
  hormono: 'Hormonothérapie', immuno: 'Immunothérapie / Thérapie ciblée',
  radiochim: 'Radiochimiothérapie concomitante', surveill: 'Surveillance active',
  support: 'Soins de support', palliatif: 'Soins palliatifs',
  essai: 'Inclusion essai clinique', bilan: 'Bilan complémentaire',
  abstention: 'Abstention thérapeutique', second: 'Demande second avis', autre: 'Autre',
};
const PRIORITE_COLORS = { urgente: '#e45c5c', rapide: '#e2a03f', normale: '#0077cc', differee: '#9ca3af' };
const PRIORITE_LABELS  = { urgente: 'Urgente', rapide: 'Rapide', normale: 'Normale', differee: 'Différée' };
const ROLES = { onco: 'Oncologue', chir: 'Chirurgien', radio: 'Radiologue', radiot: 'Radiothérapeute', anapath: 'Anapath.', ref: 'Méd. référent', autre: 'Autre' };
const ROLE_COLORS = { onco: '#0077cc', chir: '#e45c5c', radio: '#e2a03f', radiot: '#f97316', anapath: '#8b5cf6', ref: '#00c896', autre: '#9ca3af' };

const chatStore = {};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function RCPSallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('dossiers');
  const [chrono, setChrono] = useState(0);
  const [chronoRunning, setChronoRunning] = useState(false);

  // Modales
  const [showDecisionModal, setShowDecisionModal] = useState(null);
  const [showChatPanel, setShowChatPanel] = useState(null);
  const [showDossierDetail, setShowDossierDetail] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(null);
  const [showAIAssist, setShowAIAssist] = useState(null);
  const [showAjouterMedecinModal, setShowAjouterMedecinModal] = useState(false);
  const [showCRModal, setShowCRModal] = useState(false);
  const [showQuorumPanel, setShowQuorumPanel] = useState(false);

  const [decisionForm, setDecisionForm] = useState({
    type_decision: 'chimio', priorite: 'normale', description: '', protocole: '', delai_semaines: '',
  });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [votes, setVotes] = useState({});
  const [medecins, setMedecins] = useState([]);
  const [loadingMedecins, setLoadingMedecins] = useState(false);

  // Chrono
  useEffect(() => {
    let interval;
    if (chronoRunning) interval = setInterval(() => setChrono(c => c + 1), 1000);
    return () => clearInterval(interval);
  }, [chronoRunning]);

  const fmtTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  const reload = useCallback(() => {
    rcpService.reunions.get(id)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('RCP introuvable'); navigate('/rcp'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { reload(); }, [reload]);

  useEffect(() => {
    setLoadingMedecins(true);
    accountsService.medecins()
      .then(({ data }) => setMedecins(data.medecins || []))
      .catch(() => {})
      .finally(() => setLoadingMedecins(false));
  }, []);

  const changerStatut = async (statut) => {
    try {
      await rcpService.reunions.changerStatut(id, statut);
      if (statut === 'en_cours') { setChronoRunning(true); toast.success('Réunion démarrée ✓'); }
      else if (statut === 'terminee') { setChronoRunning(false); toast.success('Réunion terminée ✓'); }
      else toast.success('Statut mis à jour');
      reload();
    } catch { toast.error('Erreur'); }
  };

  const ajouterDecision = async (dossierId) => {
    if (!decisionForm.description) { toast.error('Description requise'); return; }
    setSubmittingDecision(true);
    try {
      await rcpService.dossiers.ajouterDecision(dossierId, decisionForm);
      toast.success('Décision enregistrée ✓');
      setShowDecisionModal(null);
      setDecisionForm({ type_decision: 'chimio', priorite: 'normale', description: '', protocole: '', delai_semaines: '' });
      reload();
    } catch { toast.error('Erreur'); }
    finally { setSubmittingDecision(false); }
  };

  const marquerDecisionRealisee = async (decisionId) => {
    try {
      await rcpService.decisions.marquerRealise(decisionId);
      toast.success('Décision marquée réalisée ✓');
      reload();
    } catch { toast.error('Erreur'); }
  };

  const ajouterMedecinPresence = async (medecinId) => {
    try {
      const medecin = medecins.find(m => m.id == medecinId);
      if (!medecin) { toast.error('Médecin introuvable'); return; }
      await rcpService.reunions.ajouterPresence(id, {
        medecin: medecinId,
        specialite: medecin.role === 'anapath' ? 'anapath' : 'onco',
        role: medecin.role,
        present: true
      });
      toast.success('Médecin ajouté ✓');
      reload();
    } catch { toast.error('Erreur lors de l\'ajout'); }
  };

  const handleVote = (dossierId, vote) => {
    setVotes(prev => {
      const current = prev[dossierId] || {};
      return { ...prev, [dossierId]: { ...current, [vote]: (current[vote] || 0) + 1 } };
    });
    toast.success('Vote enregistré ✓');
    setShowVoteModal(null);
  };

  const handlePrintCR = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    const specialitesPresentes = [...new Set((data.presences || []).map(p => p.specialite_label))].join(', ');
    const dossierRows = (data.dossiers || []).map((d, i) => `
      <tr style="background:${i%2===0?'#f9fafb':'#fff'}">
        <td style="padding:10px 12px;font-weight:600;color:#374151">${d.ordre_passage}</td>
        <td style="padding:10px 12px"><strong>${d.patient_nom}</strong><br/><small style="color:#6b7280;font-family:monospace">${d.patient_numero}</small></td>
        <td style="padding:10px 12px;color:#6b7280">${d.type_label || '-'}</td>
        <td style="padding:10px 12px"><span style="padding:2px 8px;border-radius:12px;background:#dbeafe;color:#1d4ed8;font-size:11px">${d.statut_label || '-'}</span></td>
        <td style="padding:10px 12px;color:#374151;font-size:12px">${d.question_posee || '—'}</td>
        <td style="padding:10px 12px;font-weight:700;color:#0077cc">${d.nb_decisions || 0}</td>
      </tr>`).join('');

    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Compte Rendu RCP — ${data.titre}</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;background:#fff;padding:40px; }
        .header { text-align:center;border-bottom:3px solid #0077cc;padding-bottom:20px;margin-bottom:24px; }
        .header h1 { font-size:20px;color:#0077cc;letter-spacing:0.5px;margin-bottom:6px; }
        .header .subtitle { font-size:13px;color:#6b7280; }
        .badge { display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;background:#dbeafe;color:#1d4ed8; }
        .section { margin-bottom:24px; }
        .section h2 { font-size:13px;font-weight:700;color:#0077cc;text-transform:uppercase;letter-spacing:1px;border-left:3px solid #0077cc;padding-left:10px;margin-bottom:12px; }
        .meta-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px; }
        .meta-item { padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;font-size:12px; }
        .meta-item strong { color:#374151; }
        table { width:100%;border-collapse:collapse;font-size:12px; }
        th { background:#0077cc;color:#fff;padding:10px 12px;text-align:left;font-weight:600; }
        td { border-bottom:1px solid #e2e8f0;vertical-align:top; }
        .participants { display:flex;flex-wrap:wrap;gap:8px;margin-top:8px; }
        .participant { padding:4px 12px;background:#eff6ff;border-radius:16px;font-size:11px;color:#1d4ed8;border:1px solid #bfdbfe; }
        .footer { margin-top:40px;padding-top:16px;border-top:2px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af; }
        .sig-zone { margin-top:50px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px; }
        .sig-box { border-top:1px solid #374151;padding-top:8px;font-size:11px;text-align:center;color:#6b7280; }
        @media print { body { padding:20px; } }
      </style></head><body>
      <div class="header">
        <div style="font-size:11px;color:#9ca3af;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px">CENTRE HOSPITALIER — REGISTRE NATIONAL DU CANCER</div>
        <h1>Compte Rendu de Réunion de Concertation Pluridisciplinaire</h1>
        <div class="subtitle">${data.type_label} &nbsp;·&nbsp; ${new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </div>

      <div class="meta-grid">
        <div class="meta-item"><strong>Titre :</strong> ${data.titre}</div>
        <div class="meta-item"><strong>N° RCP :</strong> <span style="font-family:monospace">${data.id}</span></div>
        <div class="meta-item"><strong>Heure :</strong> ${data.heure_debut?.slice(0,5)} ${data.heure_fin ? '– ' + data.heure_fin.slice(0,5) : ''}</div>
        <div class="meta-item"><strong>Lieu :</strong> ${data.lieu || data.salle || '—'}</div>
        <div class="meta-item"><strong>Coordinateur :</strong> ${data.coordinateur_nom || '—'}</div>
        <div class="meta-item"><strong>Statut :</strong> <span class="badge">${data.statut_label || data.statut}</span></div>
      </div>

      <div class="section">
        <h2>Participants (${data.nombre_membres_presents})</h2>
        <div class="participants">
          ${(data.presences || []).map(p => `<span class="participant">${p.medecin_nom} — ${p.specialite_label}</span>`).join('')}
        </div>
        ${specialitesPresentes ? `<div style="margin-top:8px;font-size:11px;color:#6b7280">Spécialités représentées : ${specialitesPresentes}</div>` : ''}
      </div>

      ${data.objectif ? `<div class="section"><h2>Ordre du jour</h2><p style="font-size:13px;line-height:1.8;color:#374151">${data.objectif}</p></div>` : ''}

      <div class="section">
        <h2>Dossiers présentés (${data.nombre_dossiers})</h2>
        <table>
          <thead><tr><th>#</th><th>Patient</th><th>Type</th><th>Statut</th><th>Question posée</th><th>Décisions</th></tr></thead>
          <tbody>${dossierRows}</tbody>
        </table>
      </div>

      ${data.compte_rendu ? `<div class="section"><h2>Compte rendu</h2><p style="font-size:13px;line-height:1.9;color:#374151;white-space:pre-wrap">${data.compte_rendu}</p></div>` : ''}

      <div class="sig-zone">
        <div class="sig-box">Coordinateur RCP<br/>${data.coordinateur_nom || '_______________'}</div>
        <div class="sig-box">Secrétaire médicale<br/>_______________</div>
        <div class="sig-box">Date de validation<br/>${new Date().toLocaleDateString('fr-DZ')}</div>
      </div>

      <div class="footer">
        <span>Document confidentiel — Usage médical strictement réservé</span>
        <span>Généré le ${new Date().toLocaleString('fr-DZ')} — RNC Algérie</span>
      </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (loading) return <AppLayout title="RCP"><Loader /></AppLayout>;
  if (!data) return null;

  const sc = STATUT_CFG[data.statut] || { color: '#9ca3af', label: '-' };
  const totalDecisions = data.dossiers?.reduce((s, d) => s + (d.nb_decisions || 0), 0) || 0;

  // Quorum check: nb de spécialités différentes
  const specialitesPresentes = [...new Set((data.presences || []).map(p => p.specialite))];
  const quorumOk = specialitesPresentes.length >= 3;

  return (
    <AppLayout title="Salle RCP">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── HEADER RÉUNION ── */}
        <div style={{ background: 'var(--bg-card)', border: `1px solid ${sc.color}25`, borderRadius: 'var(--radius-lg)', padding: '20px 24px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', right: -30, top: -30, width: 140, height: 140, borderRadius: '50%', background: sc.color + '06', pointerEvents: 'none' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 900, color: 'var(--text-primary)' }}>{data.titre}</h2>
                <StatutBadge statut={data.statut} label={sc.label} color={sc.color} pulse={sc.pulse} />
                <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}>{data.type_label}</span>
                {/* Quorum */}
                <QuorumBadge ok={quorumOk} count={specialitesPresentes.length} />
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <InfoPill icon="" val={new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoPill icon="" val={`${data.heure_debut?.slice(0,5)}${data.heure_fin ? ' – ' + data.heure_fin.slice(0,5) : ''}`} />
                {data.lieu && <InfoPill icon="" val={data.lieu} />}
                {data.salle && <InfoPill icon="" val={data.salle} />}
                {data.coordinateur_nom && <InfoPill icon="" val={data.coordinateur_nom} />}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
              {/* Chrono */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>⏱</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 15, fontWeight: 700, color: chronoRunning ? '#00c896' : 'var(--text-muted)', minWidth: 60 }}>{fmtTime(chrono)}</span>
                <button onClick={() => setChronoRunning(r => !r)} style={{ padding: '3px 8px', background: chronoRunning ? '#e45c5c15' : '#00c89615', border: `1px solid ${chronoRunning ? '#e45c5c' : '#00c896'}30`, borderRadius: 6, color: chronoRunning ? '#e45c5c' : '#00c896', fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                  {chronoRunning ? '⏸' : '▶'}
                </button>
              </div>
              {/* Actions */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.statut === 'planifiee' && <ActionBtn label="Démarrer" color="#00c896" onClick={() => changerStatut('en_cours')} />}
                {data.statut === 'en_cours'  && <ActionBtn label="Terminer" color="#6b7280" onClick={() => changerStatut('terminee')} />}
                {(data.statut === 'planifiee' || data.statut === 'en_cours') && (
                  <ActionBtn label="Suspendre" color="#e2a03f" onClick={() => changerStatut('reportee')} />
                )}
                <button onClick={() => setShowCRModal(true)} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                  Compte Rendu
                </button>
                <button onClick={handlePrintCR} style={{ padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
                  Imprimer
                </button>
                <Link to="/rcp" style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '8px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 12, cursor: 'pointer' }}>← Retour</button>
                </Link>
              </div>
            </div>
          </div>

          {/* Métriques rapides */}
          <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', flexWrap: 'wrap' }}>
            {[
              { label: 'Dossiers',          val: data.nombre_dossiers,          color: '#8b5cf6' },
              { label: 'Membres présents',  val: data.nombre_membres_presents,  color: '#0077cc' },
              { label: 'Décisions prises',  val: totalDecisions,                color: '#00c896' },
              { label: 'Dossiers prévus',   val: data.nombre_dossiers_prevus,   color: '#e2a03f' },
            ].map(m => (
              <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', color: m.color, lineHeight: 1 }}>{m.val}</span>
                <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</span>
              </div>
            ))}
            {data.objectif && (
              <div style={{ flex: 1, minWidth: 200, padding: '6px 14px', background: 'rgba(139,92,246,0.05)', borderRadius: 8, border: '1px solid rgba(139,92,246,0.15)' }}>
                <div style={{ fontSize: 9, color: '#8b5cf6', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>Ordre du jour</div>
                <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{data.objectif.slice(0, 140)}{data.objectif.length > 140 ? '…' : ''}</div>
              </div>
            )}
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {[
            { key: 'dossiers',  label: `Dossiers (${data.nombre_dossiers})`,        color: '#8b5cf6' },
            { key: 'presences', label: `Présences (${data.nombre_membres_presents})`, color: '#0077cc' },
            { key: 'cr',        label: 'Compte Rendu',                               color: '#00c896' },
            { key: 'suivi',     label: `Suivi (${totalDecisions})`,                  color: '#e2a03f' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '13px 8px', background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t.key ? t.color : 'transparent'}`, color: activeTab === t.key ? t.color : 'var(--text-muted)', fontSize: 12, fontWeight: activeTab === t.key ? 700 : 400, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: DOSSIERS ── */}
        {activeTab === 'dossiers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {data.statut === 'en_cours' && <span style={{ color: '#00c896', fontWeight: 600 }}>Réunion en cours</span>}
              </span>
              <Link to={`/rcp/dossier/nouveau?reunion=${id}`} style={{ textDecoration: 'none' }}>
                <button style={{ padding: '8px 16px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  + Ajouter un dossier
                </button>
              </Link>
            </div>

            {!data.dossiers?.length ? (
              <EmptyState icon="" text="Aucun dossier patient ajouté à cette réunion" sub="Cliquez sur '+ Ajouter un dossier' pour commencer" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.dossiers.map((d, i) => (
                  <DossierCard key={d.id} d={d} index={i}
                    votes={votes[d.id] || {}}
                    isExpanded={showDossierDetail === d.id}
                    onToggleExpand={() => setShowDossierDetail(prev => prev === d.id ? null : d.id)}
                    onAddDecision={() => setShowDecisionModal(d.id)}
                    onOpenChat={() => setShowChatPanel(d)}
                    onVote={() => setShowVoteModal(d.id)}
                    onAIAssist={() => setShowAIAssist(d)}
                    onMarkRealise={marquerDecisionRealisee}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PRÉSENCES ── */}
        {activeTab === 'presences' && (
          <PresencesTab data={data} medecins={medecins} loadingMedecins={loadingMedecins}
            onAjouter={() => setShowAjouterMedecinModal(true)}
            quorumOk={quorumOk} specialitesPresentes={specialitesPresentes}
          />
        )}

        {/* ── TAB: COMPTE RENDU ── */}
        {activeTab === 'cr' && (
          <CompteRenduTab data={data} onPrint={handlePrintCR} reload={reload} />
        )}

        {/* ── TAB: SUIVI ── */}
        {activeTab === 'suivi' && (
          <SuiviDecisions dossiers={data.dossiers} onMarkRealise={marquerDecisionRealisee} reload={reload} />
        )}
      </div>

      {/* ── MODAL: Décision ── */}
      {showDecisionModal && (
        <Modal onClose={() => { setShowDecisionModal(null); setDecisionForm({ type_decision: 'chimio', priorite: 'normale', description: '', protocole: '', delai_semaines: '' }); }}>
          <ModalTitle icon="⚕️">Décision thérapeutique</ModalTitle>
          <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
            <div>
              <Label>Type de décision *</Label>
              <select value={decisionForm.type_decision} onChange={e => setDecisionForm(p => ({ ...p, type_decision: e.target.value }))} style={modalSelSt}>
                {Object.entries(DECISION_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <Label>Priorité</Label>
                <select value={decisionForm.priorite} onChange={e => setDecisionForm(p => ({ ...p, priorite: e.target.value }))} style={modalSelSt}>
                  <option value="urgente">🔴 Urgente (&lt;1 sem.)</option>
                  <option value="rapide">🟡 Rapide (&lt;1 mois)</option>
                  <option value="normale">🔵 Normale (1-3 mois)</option>
                  <option value="differee">⚪ Différée (&gt;3 mois)</option>
                </select>
              </div>
              <div>
                <Label>Protocole</Label>
                <input value={decisionForm.protocole} onChange={e => setDecisionForm(p => ({ ...p, protocole: e.target.value }))} placeholder="Ex: AC-T, FOLFOX, BEP…" style={modalInputSt} />
              </div>
            </div>
            <div>
              <Label>Délai de mise en œuvre (semaines)</Label>
              <input type="number" min={0} value={decisionForm.delai_semaines} onChange={e => setDecisionForm(p => ({ ...p, delai_semaines: e.target.value }))} placeholder="Ex: 4" style={modalInputSt} />
            </div>
            <div>
              <Label>Description de la décision *</Label>
              <textarea value={decisionForm.description} onChange={e => setDecisionForm(p => ({ ...p, description: e.target.value }))} rows={4}
                placeholder="Décrivez la décision thérapeutique collégiale retenue…" style={{ ...modalInputSt, resize: 'vertical', lineHeight: 1.6 }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowDecisionModal(null)} style={{ flex: '0 0 100px', padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
            <button onClick={() => ajouterDecision(showDecisionModal)} disabled={submittingDecision}
              style={{ flex: 1, padding: '10px', background: 'linear-gradient(135deg, #00c896, #00a07a)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 700, cursor: submittingDecision ? 'not-allowed' : 'pointer', opacity: submittingDecision ? 0.7 : 1 }}>
              {submittingDecision ? 'Enregistrement…' : '✓ Confirmer la décision'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Vote ── */}
      {showVoteModal && (
        <Modal onClose={() => setShowVoteModal(null)} maxWidth={460}>
          <ModalTitle icon="🗳️">Vote collégial</ModalTitle>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18, lineHeight: 1.6 }}>Enregistrez votre avis sur la stratégie thérapeutique proposée pour ce dossier.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            {[
              { val: 'pour',       label: '✓ Pour',                     color: '#00c896', desc: 'Je soutiens la proposition' },
              { val: 'contre',     label: '✗ Contre',                   color: '#e45c5c', desc: 'Je m\'oppose à la proposition' },
              { val: 'abstention', label: '— Abstention',               color: '#9ca3af', desc: 'Je m\'abstiens de voter' },
              { val: 'info_comp',  label: '? Infos complémentaires',    color: '#e2a03f', desc: 'Des données manquent' },
            ].map(v => (
              <button key={v.val} onClick={() => handleVote(showVoteModal, v.val)}
                style={{ padding: '16px 12px', background: v.color + '10', border: `1px solid ${v.color}30`, borderRadius: 10, color: v.color, fontSize: 13, fontWeight: 700, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', lineHeight: 1.4 }}
                onMouseEnter={e => { e.currentTarget.style.background = v.color + '20'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = v.color + '10'; e.currentTarget.style.transform = 'none'; }}>
                <div>{v.label}</div>
                <div style={{ fontSize: 10, fontWeight: 400, marginTop: 4, opacity: 0.7 }}>{v.desc}</div>
              </button>
            ))}
          </div>
          {votes[showVoteModal] && Object.keys(votes[showVoteModal]).length > 0 && (
            <div style={{ padding: '12px', background: 'var(--bg-elevated)', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Résultats en temps réel</div>
              <VoteResults votes={votes[showVoteModal]} />
            </div>
          )}
        </Modal>
      )}

      {/* ── MODAL: Ajouter médecin ── */}
      {showAjouterMedecinModal && (
        <AjouterMedecinModal
          isOpen={true}
          onClose={() => setShowAjouterMedecinModal(false)}
          onAjouter={ajouterMedecinPresence}
          medecins={medecins}
          loading={loadingMedecins}
          dejaPresents={(data?.presences || []).map(p => p.medecin)}
        />
      )}

      {/* ── MODAL: Compte rendu rapide ── */}
      {showCRModal && (
        <CompteRenduModal data={data} onClose={() => setShowCRModal(false)} onPrint={handlePrintCR} reload={reload} />
      )}

      {/* ── PANEL: Chat ── */}
      {showChatPanel && <ChatPanel dossier={showChatPanel} onClose={() => setShowChatPanel(null)} />}

      {/* ── PANEL: IA ── */}
      {showAIAssist && <AIAssistPanel dossier={showAIAssist} onClose={() => setShowAIAssist(null)} />}
    </AppLayout>
  );
}

// ─── DossierCard ──────────────────────────────────────────────────────────────
function DossierCard({ d, index, votes, isExpanded, onToggleExpand, onAddDecision, onOpenChat, onVote, onAIAssist, onMarkRealise }) {
  const voteCount = Object.values(votes).reduce((a, b) => a + b, 0);
  const PRIO_COLORS = { urgente: '#e45c5c', rapide: '#e2a03f', normale: '#0077cc', differee: '#9ca3af' };

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden', animation: `fadeUp 0.3s ease ${index * 0.05}s both` }}>
      {/* Header dossier */}
      <div style={{ padding: '14px 18px', background: 'var(--bg-elevated)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, padding: '2px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.1)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.2)', flexShrink: 0, fontWeight: 700 }}>#{d.ordre_passage}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.patient_nom}</div>
            <div style={{ fontSize: 10, color: '#0077cc', fontFamily: 'var(--font-mono)', marginTop: 1 }}>{d.patient_numero}</div>
          </div>
          <TypeBadge label={d.type_label} />
          <DossierStatutBadge statut={d.statut} label={d.statut_label} />
          {d.presenteur_nom && <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>👤 {d.presenteur_nom}</span>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
          <SmallBtn label={` Voter${voteCount > 0 ? ` (${voteCount})` : ''}`} color="#e2a03f" onClick={onVote} />
          <SmallBtn label=" Chat" color="#0077cc" onClick={onOpenChat} />
          <SmallBtn label=" IA" color="#8b5cf6" onClick={onAIAssist} />
          <SmallBtn label="+ Décision" color="#00c896" onClick={onAddDecision} />
          <button onClick={onToggleExpand} style={{ padding: '5px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer', fontWeight: 700 }}>
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Question posée */}
      {d.question_posee && (
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--border)', background: 'rgba(226,160,63,0.04)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#e2a03f', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0, marginTop: 1 }}>Question RCP</span>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{d.question_posee}</span>
        </div>
      )}

      {/* Votes en cours */}
      {voteCount > 0 && (
        <div style={{ padding: '8px 18px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600 }}>Votes ({voteCount}) :</span>
          {Object.entries(votes).map(([k, n]) => {
            const colors = { pour: '#00c896', contre: '#e45c5c', abstention: '#9ca3af', info_comp: '#e2a03f' };
            const labels = { pour: '✓ Pour', contre: '✗ Contre', abstention: '— Abst.', info_comp: '? Info' };
            return (
              <span key={k} style={{ padding: '2px 10px', borderRadius: 12, fontSize: 10, background: (colors[k] || '#9ca3af') + '15', color: colors[k] || '#9ca3af', border: `1px solid ${colors[k] || '#9ca3af'}25`, fontWeight: 600 }}>
                {labels[k] || k}: {n}
              </span>
            );
          })}
          <VoteMiniBar votes={votes} />
        </div>
      )}

      {/* Décisions */}
      {d.nb_decisions > 0 && (
        <div style={{ padding: '8px 18px', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', borderBottom: isExpanded ? '1px solid var(--border)' : 'none' }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Décisions :</span>
          <span style={{ fontSize: 10, color: '#00c896', padding: '2px 10px', borderRadius: 12, background: 'rgba(0,200,150,0.08)', border: '1px solid rgba(0,200,150,0.2)', fontWeight: 600 }}>
            ✓ {d.nb_decisions} décision(s) collégiale(s) enregistrée(s)
          </span>
        </div>
      )}

      {/* Détail expandable */}
      {isExpanded && <DossierExpandedDetail dossierId={d.id} onMarkRealise={onMarkRealise} />}
    </div>
  );
}

function VoteMiniBar({ votes }) {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  if (!total) return null;
  const colors = { pour: '#00c896', contre: '#e45c5c', abstention: '#9ca3af', info_comp: '#e2a03f' };
  return (
    <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', width: 80, background: 'var(--bg-elevated)' }}>
      {Object.entries(votes).map(([k, n]) => (
        <div key={k} style={{ width: `${(n / total) * 100}%`, background: colors[k] || '#9ca3af', transition: 'width 0.3s' }} />
      ))}
    </div>
  );
}

function VoteResults({ votes }) {
  const total = Object.values(votes).reduce((a, b) => a + b, 0);
  const colors = { pour: '#00c896', contre: '#e45c5c', abstention: '#9ca3af', info_comp: '#e2a03f' };
  const labels = { pour: '✓ Pour', contre: '✗ Contre', abstention: '— Abstention', info_comp: '? Infos comp.' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {Object.entries(votes).map(([k, n]) => (
        <div key={k}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>
            <span style={{ color: colors[k], fontWeight: 600 }}>{labels[k] || k}</span>
            <span style={{ fontWeight: 700 }}>{n} / {total}</span>
          </div>
          <div style={{ height: 4, background: 'var(--bg-deep)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(n / total) * 100}%`, background: colors[k], borderRadius: 2, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── DossierExpandedDetail ────────────────────────────────────────────────────
function DossierExpandedDetail({ dossierId, onMarkRealise }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rcpService.dossiers.get(dossierId)
      .then(({ data }) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dossierId]);

  if (loading) return <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Chargement du dossier…</div>;
  if (!detail) return null;

  return (
    <div style={{ padding: '16px 20px', background: 'rgba(0,0,0,0.03)', borderTop: '1px solid var(--border)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {detail.resume_clinique && (
          <div>
            <SectionTitle>Résumé clinique</SectionTitle>
            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{detail.resume_clinique}</p>
          </div>
        )}
        {detail.decisions?.length > 0 && (
          <div>
            <SectionTitle>Décisions thérapeutiques ({detail.decisions.length})</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {detail.decisions.map(dec => {
                const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
                return (
                  <div key={dec.id} style={{ padding: '10px 14px', background: 'var(--bg-card)', border: `1px solid ${col}20`, borderRadius: 8, borderLeft: `3px solid ${col}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{dec.type_label || DECISION_LABELS[dec.type_decision]}</span>
                          {dec.protocole && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: col + '15', color: col }}>{dec.protocole}</span>}
                          <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: (PRIORITE_COLORS[dec.priorite] || '#9ca3af') + '12', color: PRIORITE_COLORS[dec.priorite] || '#9ca3af' }}>
                            {PRIORITE_LABELS[dec.priorite] || dec.priorite}
                          </span>
                        </div>
                        <p style={{ fontSize: 11.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{dec.description}</p>
                        {dec.delai_semaines && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>⏱ Délai : {dec.delai_semaines} sem.</div>}
                      </div>
                      <div style={{ flexShrink: 0 }}>
                        {dec.realise ? (
                          <span style={{ fontSize: 11, color: '#00c896', fontWeight: 700 }}>✓ Réalisé</span>
                        ) : (
                          <button onClick={() => onMarkRealise(dec.id)}
                            style={{ padding: '4px 10px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.25)', borderRadius: 6, color: '#00c896', fontSize: 10, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            Marquer ✓
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {!detail.resume_clinique && !detail.decisions?.length && (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 12 }}>Aucune information complémentaire disponible pour ce dossier.</div>
      )}
    </div>
  );
}

// ─── PresencesTab ────────────────────────────────────────────────────────────
function PresencesTab({ data, medecins, loadingMedecins, onAjouter, quorumOk, specialitesPresentes }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Quorum Banner */}
      <div style={{ padding: '12px 18px', borderRadius: 'var(--radius-md)', background: quorumOk ? 'rgba(0,200,150,0.08)' : 'rgba(228,92,92,0.08)', border: `1px solid ${quorumOk ? '#00c896' : '#e45c5c'}30`, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}></span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: quorumOk ? '#00c896' : '#e45c5c', marginBottom: 2 }}>
            {quorumOk ? `Quorum validé — ${specialitesPresentes.length} spécialités présentes` : `Quorum insuffisant — ${specialitesPresentes.length}/3 spécialités requises`}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {quorumOk ? 'La réunion RCP peut se tenir conformément aux recommandations.' : 'La RCP nécessite au minimum 3 spécialités médicales différentes.'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {specialitesPresentes.map(s => (
            <span key={s} style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, background: '#0077cc15', color: '#0077cc', border: '1px solid #0077cc25', fontWeight: 600 }}>{s}</span>
          ))}
        </div>
      </div>

      {/* Table présences */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>👥 Membres de la RCP</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '3px 10px', borderRadius: 12, border: '1px solid var(--border)' }}>{data.nombre_membres_presents} présent(s)</span>
            <button onClick={onAjouter} style={{ padding: '7px 14px', background: 'linear-gradient(135deg, #0077cc, #005fa3)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
              + Ajouter médecin
            </button>
          </div>
        </div>
        {!data.presences?.length ? (
          <EmptyState icon="👥" text="Aucune présence enregistrée" sub="Ajoutez les médecins participants à la réunion" />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Médecin', 'Spécialité', 'Rôle', 'Présence', 'Heure arrivée'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.presences.map((p, i) => {
                const rc = ROLE_COLORS[p.specialite] || '#9ca3af';
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.015)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: rc + '20', border: `1px solid ${rc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: rc, flexShrink: 0 }}>
                          {(p.medecin_nom || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>{p.medecin_nom}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 11, background: rc + '15', color: rc, border: `1px solid ${rc}25`, fontWeight: 600 }}>{p.specialite_label}</span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{p.role || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.present ? '#00c896' : '#e45c5c' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: p.present ? '#00c896' : '#e45c5c', flexShrink: 0 }} />
                        {p.present ? 'Présent' : 'Absent'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.heure_arrivee || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ─── CompteRenduTab ───────────────────────────────────────────────────────────
function CompteRenduTab({ data, onPrint, reload }) {
  const [editing, setEditing] = useState(false);
  const [crText, setCrText] = useState(data.compte_rendu || '');
  const [saving, setSaving] = useState(false);

  const saveCR = async () => {
    setSaving(true);
    try {
      await rcpService.reunions.patch(data.id, { compte_rendu: crText });
      toast.success('Compte rendu enregistré ✓');
      setEditing(false);
      reload();
    } catch { toast.error('Erreur de sauvegarde'); }
    finally { setSaving(false); }
  };

  const genAutoCR = () => {
    const participants = (data.presences || []).map(p => `${p.medecin_nom} (${p.specialite_label})`).join(', ');
    const decisions = (data.dossiers || []).flatMap(d => []);
    const dossiersSummary = (data.dossiers || []).map(d => `- ${d.patient_nom} (${d.patient_numero}) : ${d.nb_decisions || 0} décision(s) — ${d.question_posee || 'Bilan thérapeutique'}`).join('\n');
    const auto = `RÉUNION DE CONCERTATION PLURIDISCIPLINAIRE — ${data.type_label?.toUpperCase() || 'ONCOLOGIE'}
Date : ${new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
Coordinateur : ${data.coordinateur_nom || '—'}
Lieu : ${data.lieu || data.salle || '—'}

PARTICIPANTS PRÉSENTS (${data.nombre_membres_presents}) :
${participants || '—'}

DOSSIERS DISCUTÉS (${data.nombre_dossiers}) :
${dossiersSummary || '—'}

${data.objectif ? `ORDRE DU JOUR :\n${data.objectif}\n` : ''}
DÉCISIONS ET CONCLUSIONS :
Les décisions thérapeutiques ont été prises collégialement, conformément aux recommandations nationales et internationales (INCa, ESMO, NCCN).

Le présent compte rendu est établi sous la responsabilité du coordinateur RCP.
Il sera intégré au dossier médical de chaque patient concerné.

Fait le ${new Date().toLocaleDateString('fr-DZ')}`;
    setCrText(auto);
    setEditing(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {data.objectif && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', padding: '16px 20px' }}>
          <SectionTitle color="#8b5cf6">Ordre du jour</SectionTitle>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>{data.objectif}</p>
        </div>
      )}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <SectionTitle color="#00c896">Compte rendu de réunion</SectionTitle>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editing && <button onClick={genAutoCR} style={{ padding: '6px 12px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 8, color: '#8b5cf6', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🤖 Générer auto.</button>}
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{ padding: '6px 12px', background: 'rgba(0,119,204,0.1)', border: '1px solid rgba(0,119,204,0.3)', borderRadius: 8, color: '#0077cc', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✏️ Rédiger</button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} style={{ padding: '6px 12px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-muted)', fontSize: 11, cursor: 'pointer' }}>Annuler</button>
                <button onClick={saveCR} disabled={saving} style={{ padding: '6px 14px', background: '#00c896', border: 'none', borderRadius: 8, color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Enregistrement…' : '✓ Enregistrer'}</button>
              </>
            )}
          </div>
        </div>
        <div style={{ padding: '18px 20px' }}>
          {editing ? (
            <textarea value={crText} onChange={e => setCrText(e.target.value)} rows={18}
              placeholder="Rédigez le compte rendu de la réunion RCP…&#10;&#10;Incluez : résumé de la réunion, dossiers présentés, décisions prises, suivis requis, signatures."
              style={{ width: '100%', padding: '12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 13, outline: 'none', resize: 'vertical', lineHeight: 1.8, fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          ) : crText ? (
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.9, whiteSpace: 'pre-wrap', margin: 0 }}>{crText}</p>
          ) : (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}></div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>Compte rendu non encore rédigé</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 20 }}>Utilisez "Générer auto." pour un brouillon ou "Rédiger" pour saisir manuellement.</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button onClick={onPrint} style={{ padding: '10px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
          🖨️ Imprimer / Exporter PDF
        </button>
      </div>
    </div>
  );
}

// ─── SuiviDecisions ───────────────────────────────────────────────────────────
function SuiviDecisions({ dossiers, onMarkRealise, reload }) {
  const [filter, setFilter] = useState('all');
  const [allDecisions, setAllDecisions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!dossiers?.length) { setLoading(false); return; }
    Promise.all(
      dossiers.map(d => rcpService.dossiers.get(d.id).then(r => r.data).catch(() => null))
    ).then(results => {
      const decs = results.filter(Boolean).flatMap(d =>
        (d.decisions || []).map(dec => ({ ...dec, patientNom: d.patient_nom, patientNumero: d.patient_numero, dossierOrdre: d.ordre_passage }))
      );
      setAllDecisions(decs);
    }).finally(() => setLoading(false));
  }, [dossiers]);

  const counts = { all: allDecisions.length, pending: allDecisions.filter(d => !d.realise).length, done: allDecisions.filter(d => d.realise).length };
  const filtered = filter === 'all' ? allDecisions : filter === 'pending' ? allDecisions.filter(d => !d.realise) : allDecisions.filter(d => d.realise);

  if (loading) return <LoadSpinner />;

  return (
    <div>
      {/* Stats barre */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 14 }}>
        {[
          { k: 'all', l: 'Toutes', n: counts.all, c: '#8b5cf6' },
          { k: 'pending', l: 'En attente', n: counts.pending, c: '#e2a03f' },
          { k: 'done', l: 'Réalisées', n: counts.done, c: '#00c896' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding: '10px', background: filter === f.k ? f.c + '15' : 'var(--bg-card)', border: `1px solid ${filter === f.k ? f.c + '40' : 'var(--border-light)'}`, borderRadius: 'var(--radius-md)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: f.c, fontFamily: 'var(--font-display)' }}>{f.n}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{f.l}</div>
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState icon="✅" text="Aucune décision dans cette catégorie" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(dec => {
            const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
            const pc = PRIORITE_COLORS[dec.priorite] || '#9ca3af';
            return (
              <div key={dec.id} style={{ background: 'var(--bg-card)', border: `1px solid ${col}20`, borderRadius: 'var(--radius-md)', padding: '14px 18px', borderLeft: `3px solid ${col}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: col }}>{dec.type_label || DECISION_LABELS[dec.type_decision]}</span>
                    {dec.protocole && <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: col + '12', color: col, fontWeight: 600 }}>{dec.protocole}</span>}
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>— {dec.patientNom} ({dec.patientNumero})</span>
                    <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 6, background: pc + '12', color: pc, fontWeight: 600 }}>{PRIORITE_LABELS[dec.priorite] || dec.priorite}</span>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>{dec.description}</p>
                  {dec.delai_semaines && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>⏱ Délai : {dec.delai_semaines} semaine(s)</div>}
                </div>
                <div style={{ flexShrink: 0 }}>
                  {dec.realise ? (
                    <span style={{ fontSize: 11, color: '#00c896', fontWeight: 700 }}>✓ Réalisé</span>
                  ) : (
                    <button onClick={async () => { await onMarkRealise(dec.id); reload(); }}
                      style={{ padding: '6px 12px', background: 'rgba(0,200,150,0.1)', border: '1px solid rgba(0,200,150,0.2)', borderRadius: 6, color: '#00c896', fontSize: 11, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      Marquer ✓
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ChatPanel ────────────────────────────────────────────────────────────────
function ChatPanel({ dossier, onClose }) {
  if (!chatStore[dossier.id]) chatStore[dossier.id] = [];
  const [messages, setMessages] = useState([...chatStore[dossier.id]]);
  const [input, setInput] = useState('');
  const [author, setAuthor] = useState('');
  const [role, setRole] = useState('onco');
  const [typing, setTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    const txt = input.trim();
    if (!txt) return;
    const authorName = author.trim() || 'Médecin';
    const msg = { id: Date.now(), author: authorName, role, text: txt, ts: new Date().toLocaleTimeString('fr-DZ', { hour: '2-digit', minute: '2-digit' }), type: 'user' };
    chatStore[dossier.id] = [...chatStore[dossier.id], msg];
    setMessages([...chatStore[dossier.id]]);
    setInput('');
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const rc = (r) => ROLE_COLORS[r] || '#9ca3af';

  return (
    <SidePanel onClose={onClose} title={`💬 Discussion — ${dossier.patient_nom}`} subtitle={dossier.patient_numero} color="#0077cc">
      {/* Identité */}
      <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Votre nom…"
          style={{ flex: 1, padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-primary)', fontSize: 12, outline: 'none' }} />
        <select value={role} onChange={e => setRole(e.target.value)} style={{ padding: '7px 10px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, color: 'var(--text-secondary)', fontSize: 12, outline: 'none', cursor: 'pointer' }}>
          {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {!messages.length ? (
          <div style={{ textAlign: 'center', padding: 50, color: 'var(--text-muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
            <div style={{ fontSize: 13, marginBottom: 4 }}>Aucun message pour ce dossier.</div>
            <div style={{ fontSize: 11 }}>Démarrez la discussion collégiale.</div>
          </div>
        ) : messages.map(msg => {
          const color = rc(msg.role);
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: color + '20', border: `1px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
                  {(msg.author || '?').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{msg.author}</span>
                <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 8, background: color + '15', color, border: `1px solid ${color}25`, fontWeight: 600 }}>{ROLES[msg.role] || msg.role}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{msg.ts}</span>
              </div>
              <div style={{ marginLeft: 33, padding: '9px 13px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: '0 10px 10px 10px', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {typing && <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 33 }}>En train d'écrire…</div>}
        <div ref={endRef} />
      </div>
      {/* Quick replies */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {['Accord avec la proposition', 'Demande bilan complémentaire', 'Second avis recommandé', 'Discuté, décision reportée', 'Traitement déjà initié'].map(s => (
          <button key={s} onClick={() => setInput(s)} style={{ padding: '3px 8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 12, color: 'var(--text-muted)', fontSize: 10, cursor: 'pointer' }}>
            {s}
          </button>
        ))}
      </div>
      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={2}
          placeholder="Saisissez votre commentaire… (Entrée pour envoyer)"
          style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5, outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5 }} />
        <button onClick={sendMessage} style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #0077cc, #005fa3)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: 'pointer', alignSelf: 'flex-end', fontWeight: 700 }}>
          ↑
        </button>
      </div>
    </SidePanel>
  );
}

// ─── AIAssistPanel ─────────────────────────────────────────────────────────────
function AIAssistPanel({ dossier, onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Bonjour. Je suis votre assistant oncologique.\n\nJe vais vous aider à analyser le dossier de **${dossier.patient_nom}** (${dossier.patient_numero}).\n\nQue souhaitez-vous explorer ? Protocoles, guidelines ESMO/NCCN/INCa, interactions médicamenteuses, essais cliniques, ou résumé clinique.` }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const SYSTEM_PROMPT = `Tu es un assistant médical expert en oncologie, intégré dans un système RCP (Réunion de Concertation Pluridisciplinaire) hospitalier algérien — Registre National du Cancer (RNC).
Tu aides les médecins oncologues à analyser des dossiers oncologiques, consulter les guidelines internationales (NCCN, ESMO, INCa), préparer les décisions thérapeutiques, et identifier les essais cliniques pertinents.

Dossier en discussion :
- Patient : ${dossier.patient_nom} (${dossier.patient_numero})
- Type de présentation : ${dossier.type_label || dossier.type_presentation || 'Non spécifié'}
- Statut : ${dossier.statut_label || dossier.statut || 'Non spécifié'}
- Question posée à la RCP : ${dossier.question_posee || 'Non précisée'}

Réponds en français, de façon structurée, professionnelle, concise. Cite les guidelines pertinentes. Rappelle toujours que les décisions finales appartiennent aux médecins de la RCP.`;

  const sendMessage = async () => {
    const txt = input.trim();
    if (!txt || loading) return;
    const userMsg = { role: 'user', content: txt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_GROQ_API_KEY || ''}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 1200,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || 'Aucune réponse.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erreur de connexion à l\'assistant IA. Vérifiez la clé API GROQ (VITE_GROQ_API_KEY).' }]);
    } finally { setLoading(false); }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const QUICK = [
    'Quelles sont les guidelines ESMO pour ce type de cancer ?',
    'Quels protocoles de chimiothérapie sont recommandés ?',
    'Y a-t-il des essais cliniques pertinents ?',
    'Quels examens complémentaires sont indiqués ?',
    'Résume les options thérapeutiques disponibles',
    'Quelles sont les contre-indications à surveiller ?',
  ];

  return (
    <SidePanel onClose={onClose} title={`🤖 Assistant IA — ${dossier.patient_nom}`} subtitle="Aide à la décision oncologique (GROQ / LLaMA)" color="#8b5cf6">
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', background: 'rgba(139,92,246,0.04)' }}>
        <div style={{ fontSize: 10, color: '#8b5cf6', fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Questions rapides</div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInput(q)} style={{ padding: '3px 9px', background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', borderRadius: 12, color: '#8b5cf6', fontSize: 10, cursor: 'pointer', lineHeight: 1.4, fontWeight: 500 }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', padding: '0 4px' }}>
              {msg.role === 'user' ? '👤 Vous' : '🤖 Assistant IA'}
            </div>
            <div style={{ maxWidth: '90%', padding: '11px 14px', background: msg.role === 'user' ? 'rgba(0,119,204,0.1)' : 'rgba(139,92,246,0.07)', border: `1px solid ${msg.role === 'user' ? 'rgba(0,119,204,0.2)' : 'rgba(139,92,246,0.18)'}`, borderRadius: msg.role === 'user' ? '14px 14px 0 14px' : '14px 14px 14px 0', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12, paddingLeft: 4 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#8b5cf6', animation: 'pulse-glow 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s`, opacity: 0.7 }} />)}
            </div>
            Analyse en cours…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={2}
          placeholder="Posez votre question médicale… (Entrée pour envoyer)"
          disabled={loading}
          style={{ flex: 1, padding: '9px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontSize: 12.5, outline: 'none', resize: 'none', fontFamily: 'var(--font-body)', lineHeight: 1.5, opacity: loading ? 0.6 : 1 }} />
        <button onClick={sendMessage} disabled={loading}
          style={{ padding: '9px 16px', background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', alignSelf: 'flex-end', opacity: loading ? 0.7 : 1, fontWeight: 700 }}>
          ↑
        </button>
      </div>
      <div style={{ padding: '6px 14px', background: 'rgba(139,92,246,0.03)', borderTop: '1px solid var(--border)' }}>
        <p style={{ fontSize: 9.5, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>⚠️ L'assistant IA est un outil d'aide à la décision uniquement. Les décisions thérapeutiques relèvent exclusivement de la responsabilité des médecins.</p>
      </div>
    </SidePanel>
  );
}

// ─── CompteRenduModal ─────────────────────────────────────────────────────────
function CompteRenduModal({ data, onClose, onPrint, reload }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>📄 Compte Rendu RCP</div>
          <button onClick={onClose} style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-elevated)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ flex: 1, overflow: 'auto' }}>
          <CompteRenduTab data={data} onPrint={onPrint} reload={reload} />
        </div>
      </div>
    </div>
  );
}

// ─── AjouterMedecinModal ──────────────────────────────────────────────────────
function AjouterMedecinModal({ isOpen, onClose, onAjouter, medecins, loading, dejaPresents = [] }) {
  const [query, setQuery] = useState('');
  const [selectedMedecin, setSelectedMedecin] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedMedecin('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const presentIds = new Set((dejaPresents || []).map(String));
  const filtered = (medecins || []).filter(m => !presentIds.has(String(m.id)));

  const normalizedQ = query.trim().toLowerCase();
  const visible = !normalizedQ
    ? filtered
    : filtered.filter(m => {
        const full = (m.full_name || '').toLowerCase();
        const role = (m.role || '').toLowerCase();
        const email = (m.email || '').toLowerCase();
        const inst = (m.institution || '').toLowerCase();
        const spec = (m.speciality || '').toLowerCase();
        return full.includes(normalizedQ) || role.includes(normalizedQ) || email.includes(normalizedQ) || inst.includes(normalizedQ) || spec.includes(normalizedQ);
      });

  return (
    <Modal onClose={onClose} maxWidth={520}>
      <ModalTitle icon="👤">Ajouter un médecin à la présence</ModalTitle>

      <div style={{ display: 'grid', gap: 12, marginBottom: 6 }}>
        <div>
          <Label>Recherche</Label>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Nom, email, spécialité, institution…"
            style={modalInputSt}
          />
        </div>

        <div style={{
          border: '1px solid var(--border)',
          borderRadius: 10,
          overflow: 'hidden',
          background: 'var(--bg-elevated)',
          maxHeight: 320,
        }}>
          {loading ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>Chargement…</div>
          ) : !visible.length ? (
            <div style={{ padding: 14, color: 'var(--text-muted)', fontSize: 12 }}>
              {filtered.length === 0 ? 'Aucun médecin disponible (tous déjà présents).' : 'Aucun résultat pour votre recherche.'}
            </div>
          ) : (
            visible.map(m => {
              const label = m.full_name || m.email || `${m.first_name || ''} ${m.last_name || ''}`.trim() || '—';
              const sub = [m.speciality, m.institution].filter(Boolean).join(' · ') || m.role;
              const isSelected = String(m.id) === String(selectedMedecin);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setSelectedMedecin(m.id)}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom: '1px solid var(--border)',
                    background: isSelected ? 'rgba(0,119,204,0.10)' : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                  }}
                >
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'rgba(0,119,204,0.12)',
                    border: '1px solid rgba(0,119,204,0.25)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#0077cc',
                    flexShrink: 0,
                  }}>
                    {(label || '?').charAt(0).toUpperCase()}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>
                  </div>

                  {isSelected && <div style={{ fontSize: 12, fontWeight: 900, color: '#0077cc', flexShrink: 0 }}>✓</div>}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
        <button
          onClick={onClose}
          style={{ flex: 1, padding: '10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer' }}
        >
          Annuler
        </button>
        <button
          onClick={() => {
            if (!selectedMedecin) return;
            onAjouter(selectedMedecin);
            setSelectedMedecin('');
            onClose();
          }}
          disabled={!selectedMedecin || loading}
          style={{
            flex: 1,
            padding: '10px',
            background: selectedMedecin ? 'linear-gradient(135deg, #0077cc, #005fa3)' : 'var(--bg-elevated)',
            border: 'none',
            borderRadius: 8,
            color: selectedMedecin ? '#fff' : 'var(--text-muted)',
            fontSize: 13,
            fontWeight: 700,
            cursor: selectedMedecin ? 'pointer' : 'not-allowed',
          }}
        >
          Ajouter
        </button>
      </div>
    </Modal>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────────
function SidePanel({ children, onClose, title, subtitle, color }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998 }} />
      <div style={{ position: 'fixed', right: 0, top: 0, bottom: 0, width: Math.min(500, window.innerWidth), background: 'var(--bg-card)', borderLeft: `2px solid ${color}30`, zIndex: 999, display: 'flex', flexDirection: 'column', boxShadow: '-12px 0 40px rgba(0,0,0,0.3)' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-elevated)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>{title}</div>
            {subtitle && <div style={{ fontSize: 10, color, fontFamily: 'var(--font-mono)', marginTop: 2, fontWeight: 600 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>×</button>
        </div>
        {children}
      </div>
    </>
  );
}

function Modal({ children, onClose, maxWidth = 540 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '24px 28px', width: '100%', maxWidth, boxShadow: '0 28px 72px rgba(0,0,0,0.5)', maxHeight: '90vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function StatutBadge({ statut, label, color, pulse }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: color + '15', color, border: `1px solid ${color}30` }}>
      {pulse && <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, animation: 'pulse-glow 1.5s infinite', flexShrink: 0 }} />}
      {label}
    </span>
  );
}

function QuorumBadge({ ok, count }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: ok ? 'rgba(0,200,150,0.12)' : 'rgba(228,92,92,0.12)', color: ok ? '#00c896' : '#e45c5c', border: `1px solid ${ok ? '#00c896' : '#e45c5c'}25` }}>
      {ok ? '✅' : '⚠️'} Quorum {count}/3
    </span>
  );
}

function TypeBadge({ label }) {
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 11, background: 'rgba(0,119,204,0.08)', color: '#0077cc', border: '1px solid rgba(0,119,204,0.15)', flexShrink: 0, fontWeight: 500 }}>{label}</span>;
}

function DossierStatutBadge({ statut, label }) {
  const colors = { attente: '#9ca3af', discute: '#00c896', reporte: '#e2a03f', annule: '#e45c5c' };
  const c = colors[statut] || '#9ca3af';
  return <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, background: c + '15', color: c, border: `1px solid ${c}25`, flexShrink: 0, fontWeight: 600 }}>{label}</span>;
}

function InfoPill({ icon, val }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: 'var(--text-secondary)' }}>
      <span style={{ fontSize: 11 }}>{icon}</span>{val}
    </span>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '8px 16px', background: color + '15', border: `1px solid ${color}30`, borderRadius: 8, color, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = color + '25'}
      onMouseLeave={e => e.currentTarget.style.background = color + '15'}>
      {label}
    </button>
  );
}

function SmallBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding: '5px 12px', background: color + '10', border: `1px solid ${color}25`, borderRadius: 8, color, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background = color + '20'}
      onMouseLeave={e => e.currentTarget.style.background = color + '10'}>
      {label}
    </button>
  );
}

function SectionTitle({ children, color = '#0077cc' }) {
  return <div style={{ fontSize: 10, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>{children}</div>;
}

function ModalTitle({ children, icon }) {
  return <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--font-display)', color: 'var(--text-primary)', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}><span>{icon}</span>{children}</div>;
}

function Label({ children }) {
  return <label style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{children}</label>;
}

function EmptyState({ icon = '📂', text, sub }) {
  return (
    <div style={{ padding: 56, textAlign: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)' }}>
      <div style={{ fontSize: 32, marginBottom: 10 }}>{icon}</div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: sub ? 4 : 0 }}>{text}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function Loader() {
  return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
    <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: '#0077cc', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
  </div>;
}

function LoadSpinner() {
  return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
    <div style={{ width: 28, height: 28, border: '3px solid var(--border)', borderTopColor: '#e2a03f', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
    Chargement…
  </div>;
}

const modalInputSt = { width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' };
const modalSelSt = { ...modalInputSt, cursor: 'pointer' };
