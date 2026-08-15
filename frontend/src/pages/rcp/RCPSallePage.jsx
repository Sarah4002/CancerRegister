import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { accountsService } from '../../services/accountsService';
import { AppLayout } from '../../components/layout/Sidebar';
import AjouterMedecinModal from './AjouterMedecinModal';
import toast from 'react-hot-toast';

const ADMIN_CARD = {
  background: '#ffffff',
  border: '1px solid rgba(37,99,235,0.08)',
  borderRadius: '12px',
};

const ADMIN_ELEVATED = {
  background: '#f8fafc',
  border: '1px solid rgba(37,99,235,0.10)',
};

// ─── Constantes ───────────────────────────────────────────────────────────────
const STATUT_CFG = {
  planifiee: { color: '#2563eb', label: 'Planifiée' },
  en_cours:  { color: '#16a34a', label: 'En cours', pulse: true },
  terminee:  { color: '#6b7280', label: 'Terminée' },
  annulee:   { color: '#dc2626', label: 'Annulée' },
  reportee:  { color: '#d97706', label: 'Reportée' },
};

const DECISION_COLORS = {
  chir:'#dc2626', chimio:'#2563eb', radio:'#d97706', hormono:'#16a34a',
  immuno:'#7c3aed', radiochim:'#ea580c', surveill:'#0891b2', support:'#7c3aed',
  palliatif:'#6b7280', essai:'#a855f7', second:'#9ca3af', bilan:'#0891b2',
  abstention:'#94a3b8', autre:'#9ca3af',
};
const DECISION_LABELS = {
  chir:'Chirurgie', chimio:'Chimiotherapie', radio:'Radiotherapie',
  hormono:'Hormonotherapie', immuno:'Immunotherapie / Therapie ciblee',
  radiochim:'Radiochimiotherapie concomitante', surveill:'Surveillance active',
  support:'Soins de support', palliatif:'Soins palliatifs',
  essai:'Inclusion essai clinique', bilan:'Bilan complementaire',
  abstention:'Abstention therapeutique', second:'Demande second avis', autre:'Autre',
};
const PRIORITE_COLORS = { urgente:'#dc2626', rapide:'#d97706', normale:'#2563eb', differee:'#9ca3af' };
const PRIORITE_LABELS  = { urgente:'Urgente', rapide:'Rapide', normale:'Normale', differee:'Differee' };
const ROLES = {
  onco:'Oncologue', chir:'Chirurgien', radio:'Radiologue',
  radiot:'Radiotherapeute', anapath:'Anapath.', ref:'Med. referent', autre:'Autre',
};
const ROLE_COLORS = {
  onco:'#2563eb', chir:'#dc2626', radio:'#d97706',
  radiot:'#ea580c', anapath:'#7c3aed', ref:'#16a34a', autre:'#9ca3af',
};

const FICHIER_TYPES = [
  { value:'dicom',    label:'Image DICOM' },
  { value:'scanner',  label:'Scanner / TDM' },
  { value:'irm',      label:'IRM' },
  { value:'radio',    label:'Radiographie' },
  { value:'echo',     label:'Echographie' },
  { value:'anapath',  label:'Anatomopathologie' },
  { value:'biologie', label:'Bilan biologique' },
  { value:'autre',    label:'Autre document' },
];

// ─── Composant principal ──────────────────────────────────────────────────────
export default function RCPSallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab] = useState('dossiers');
  const [chrono, setChrono] = useState(0);
  const [chronoRunning, setChronoRunning] = useState(false);

  const [showDecisionModal, setShowDecisionModal] = useState(null);
  const [showChatPanel, setShowChatPanel]         = useState(null);
  const [showDossierDetail, setShowDossierDetail] = useState(null);
  const [showVoteModal, setShowVoteModal]         = useState(null);
  const [showAIAssist, setShowAIAssist]           = useState(null);
  const [showAjouterMedecinModal, setShowAjouterMedecinModal] = useState(false);
  const [showCRModal, setShowCRModal]             = useState(false);
  const [showUploadModal, setShowUploadModal]     = useState(null); // dossierId

  const [decisionForm, setDecisionForm] = useState({
    type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'',
  });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [votes, setVotes] = useState({});
 

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
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const reload = useCallback(() => {
    rcpService.reunions.get(id)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('RCP introuvable'); navigate('/rcp'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  useEffect(() => { reload(); }, [reload]);

  

  const changerStatut = async (statut) => {
    try {
      await rcpService.reunions.changerStatut(id, statut);
      if (statut === 'en_cours') { setChronoRunning(true); toast.success('Reunion demarree'); }
      else if (statut === 'terminee') { setChronoRunning(false); toast.success('Reunion terminee'); }
      else toast.success('Statut mis a jour');
      reload();
    } catch { toast.error('Erreur'); }
  };

  const ajouterDecision = async (dossierId) => {
    if (!decisionForm.description) { toast.error('Description requise'); return; }
    setSubmittingDecision(true);
    try {
      await rcpService.dossiers.ajouterDecision(dossierId, decisionForm);
      toast.success('Decision enregistree');
      setShowDecisionModal(null);
      setDecisionForm({ type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'' });
      reload();
    } catch { toast.error('Erreur'); }
    finally { setSubmittingDecision(false); }
  };

  const marquerDecisionRealisee = async (decisionId) => {
    try {
      await rcpService.decisions.marquerRealise(decisionId);
      toast.success('Decision marquee realisee');
      reload();
    } catch { toast.error('Erreur'); }
  };

  const ajouterMedecinPresence = async (medecinId) => {
  try {
    await rcpService.reunions.ajouterPresence(id, {
      medecin: medecinId,
      specialite: 'onco',  // valeur valide dans les choix
      present: true,
    });
    toast.success('Medecin ajoute');
    reload();
  } catch (err) {
    const msg = err.response?.data?.error || 'Erreur lors de l\'ajout';
    toast.error(msg);
  }
};


  const handleVote = (dossierId, vote) => {
    setVotes(prev => {
      const current = prev[dossierId] || {};
      return { ...prev, [dossierId]: { ...current, [vote]: (current[vote] || 0) + 1 } };
    });
    toast.success('Vote enregistre');
    setShowVoteModal(null);
  };

  const handlePrintCR = () => {
    if (!data) return;
    const win = window.open('', '_blank');
    const specialitesPresentes = [...new Set((data.presences || []).map(p => p.specialite_label))].join(', ');
    const dossierRows = (data.dossiers || []).map((d, i) => `
      <tr style="background:${i % 2 === 0 ? '#f9fafb' : '#fff'}">
        <td style="padding:10px 12px;font-weight:600">${d.ordre_passage}</td>
        <td style="padding:10px 12px"><strong>${d.patient_nom}</strong><br/><small style="color:#6b7280;font-family:monospace">${d.patient_numero}</small></td>
        <td style="padding:10px 12px;color:#6b7280">${d.type_label || '-'}</td>
        <td style="padding:10px 12px">${d.statut_label || '-'}</td>
        <td style="padding:10px 12px;font-size:12px">${d.question_posee || '—'}</td>
        <td style="padding:10px 12px;font-weight:700">${d.nb_decisions || 0}</td>
      </tr>`).join('');
    win.document.write(`<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
      <title>Compte Rendu RCP — ${data.titre}</title>
      <style>
        * { margin:0;padding:0;box-sizing:border-box; }
        body { font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;padding:40px; }
        h1 { font-size:20px;text-align:center;border-bottom:2px solid #1e3a5f;padding-bottom:16px;margin-bottom:20px;color:#1e3a5f; }
        .meta-grid { display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:20px; }
        .meta-item { padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;font-size:12px; }
        h2 { font-size:12px;font-weight:700;color:#1e3a5f;text-transform:uppercase;letter-spacing:1px;margin:16px 0 10px;border-left:3px solid #1e3a5f;padding-left:10px; }
        table { width:100%;border-collapse:collapse;font-size:12px; }
        th { background:#1e3a5f;color:#fff;padding:10px 12px;text-align:left;font-weight:600; }
        td { border-bottom:1px solid #e2e8f0;vertical-align:top; }
        .footer { margin-top:40px;padding-top:12px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af; }
        .sig-zone { margin-top:50px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px; }
        .sig-box { border-top:1px solid #374151;padding-top:8px;font-size:11px;text-align:center;color:#6b7280; }
        @media print { body { padding:20px; } }
      </style></head><body>
      <h1>Compte Rendu de Reunion de Concertation Pluridisciplinaire</h1>
      <div class="meta-grid">
        <div class="meta-item"><strong>Titre :</strong> ${data.titre}</div>
        <div class="meta-item"><strong>Type :</strong> ${data.type_label}</div>
        <div class="meta-item"><strong>Date :</strong> ${new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
        <div class="meta-item"><strong>Heure :</strong> ${data.heure_debut?.slice(0,5)}${data.heure_fin ? ' – ' + data.heure_fin.slice(0,5) : ''}</div>
        <div class="meta-item"><strong>Lieu :</strong> ${data.lieu || data.salle || '—'}</div>
        <div class="meta-item"><strong>Coordinateur :</strong> ${data.coordinateur_nom || '—'}</div>
      </div>
      <h2>Participants (${data.nombre_membres_presents})</h2>
      <p style="font-size:12px;margin-bottom:12px">${(data.presences || []).map(p => `${p.medecin_nom} (${p.specialite_label})`).join(' — ') || '—'}</p>
      ${data.objectif ? `<h2>Ordre du jour</h2><p style="font-size:13px;line-height:1.8;margin-bottom:16px">${data.objectif}</p>` : ''}
      <h2>Dossiers presentes (${data.nombre_dossiers})</h2>
      <table>
        <thead><tr><th>#</th><th>Patient</th><th>Type</th><th>Statut</th><th>Question posee</th><th>Decisions</th></tr></thead>
        <tbody>${dossierRows}</tbody>
      </table>
      ${data.compte_rendu ? `<h2>Compte rendu</h2><p style="font-size:13px;line-height:1.9;white-space:pre-wrap">${data.compte_rendu}</p>` : ''}
      <div class="sig-zone">
        <div class="sig-box">Coordinateur RCP<br/>${data.coordinateur_nom || '_______________'}</div>
        <div class="sig-box">Secretaire medicale<br/>_______________</div>
        <div class="sig-box">Date de validation<br/>${new Date().toLocaleDateString('fr-DZ')}</div>
      </div>
      <div class="footer">
        <span>Document confidentiel — Usage medical strictement reserve</span>
        <span>Genere le ${new Date().toLocaleString('fr-DZ')}</span>
      </div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (loading) return <AppLayout title="RCP"><Loader /></AppLayout>;
  if (!data) return null;

  const sc = STATUT_CFG[data.statut] || { color:'#9ca3af', label:'-' };
  const totalDecisions = data.dossiers?.reduce((s, d) => s + (d.nb_decisions || 0), 0) || 0;
  const specialitesPresentes = [...new Set((data.presences || []).map(p => p.specialite))];
  const quorumOk = specialitesPresentes.length >= 3;

  return (
    <AppLayout title="Salle RCP">
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── HEADER ── */}
        <div style={{ ...ADMIN_CARD, padding:'20px 24px', boxShadow:'0 10px 30px rgba(15,23,42,0.04)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
                <div style={{ width:42, height:42, borderRadius:12, background:'rgba(37,99,235,0.12)', border:'1px solid rgba(37,99,235,0.20)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color:'#2563eb' }}>RCP</div>
                <div>
                  <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:800, color:'#0f172a', marginBottom:2 }}>Salle RCP</h2>
                  <p style={{ fontSize:11, color:'#64748b' }}>Coordination pluridisciplinaire - Dossiers - Presences - Compte rendu</p>
                </div>
              </div>
              {/* Fil d'Ariane + titre */}
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                <button
                  onClick={() => navigate('/rcp')}
                  title="Retour a la liste des RCP"
                  style={{
                    display:'flex', alignItems:'center', gap:5,
                    padding:'5px 10px',
                    background:'var(--bg-elevated)',
                    border:'1px solid var(--border)',
                    borderRadius:8,
                    color:'var(--text-secondary)',
                    fontSize:12,
                    cursor:'pointer',
                    flexShrink:0,
                    transition:'all 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = sc.color+'60'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                >
                  <BackArrowIcon />
                  <span>Reunions RCP</span>
                </button>
                <span style={{ color:'var(--text-muted)', fontSize:12 }}>/</span>
                <span style={{ fontSize:12, color:'var(--text-muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {data.titre}
                </span>
              </div>

             

              <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
                <InfoPill label="Date" val={new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} />
                <InfoPill label="Heure" val={`${data.heure_debut?.slice(0,5)}${data.heure_fin ? ' – '+data.heure_fin.slice(0,5) : ''}`} />
                {data.lieu && <InfoPill label="Lieu" val={data.lieu} />}
                {data.salle && <InfoPill label="Salle" val={data.salle} />}
                {data.coordinateur_nom && <InfoPill label="Coord." val={data.coordinateur_nom} />}
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:10 }}>
              {/* Chrono */}
              <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.10)', borderRadius:10 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:15, fontWeight:700, color:chronoRunning?'#16a34a':'var(--text-muted)', minWidth:60 }}>
                  {fmtTime(chrono)}
                </span>
                <button
                  onClick={() => setChronoRunning(r => !r)}
                  style={{ padding:'3px 8px', background:chronoRunning?'rgba(220,38,38,0.08)':'rgba(22,163,74,0.08)', border:`1px solid ${chronoRunning?'rgba(220,38,38,0.3)':'rgba(22,163,74,0.3)'}`, borderRadius:6, color:chronoRunning?'#dc2626':'#16a34a', fontSize:10, cursor:'pointer', fontWeight:700 }}>
                  {chronoRunning ? 'Pause' : 'Demarrer'}
                </button>
              </div>

              {/* Actions statut */}
              
            </div>
          </div>

          {/* Metriques rapides */}
        </div>

        {/* ── TABS ── */}
        <div style={{ display:'flex', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          {[
            { key:'dossiers',  label:`Dossiers (${data.nombre_dossiers})`,          color:'#2563eb' },
            { key:'presences', label:`Presences (${data.nombre_membres_presents})`, color:'#2563eb' },
            { key:'cr',        label:'Compte Rendu',                                color:'#16a34a' },

          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ flex:1, padding:'13px 8px', background:'none', border:'none', borderBottom:`2px solid ${activeTab===t.key?t.color:'transparent'}`, color:activeTab===t.key?t.color:'#64748b', fontSize:12, fontWeight:activeTab===t.key?700:400, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.15s', whiteSpace:'nowrap' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: DOSSIERS ── */}
        {activeTab === 'dossiers' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:12, color:'var(--text-muted)' }}>
                {data.statut === 'en_cours' && <span style={{ color:'#16a34a', fontWeight:600 }}>Reunion en cours</span>}
              </span>
              <Link to={`/rcp/dossier/nouveau?reunion=${id}`} style={{ textDecoration:'none' }}>
                <button style={{ padding:'8px 16px', background:'linear-gradient(135deg,#7c3aed,#6d28d9)', border:'none', borderRadius:8, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                  + Ajouter un dossier
                </button>
              </Link>
            </div>
            {!data.dossiers?.length ? (
              <EmptyState text="Aucun dossier patient ajoute a cette reunion" sub="Cliquez sur '+ Ajouter un dossier' pour commencer" />
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
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
                    onUploadFichier={() => setShowUploadModal(d.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: PRESENCES ── */}
        {activeTab === 'presences' && (
          <PresencesTab data={data} 
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

      {/* ── MODAL: Decision ── */}
      {showDecisionModal && (
        <Modal onClose={() => { setShowDecisionModal(null); setDecisionForm({ type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'' }); }}>
          <ModalTitle>Decision therapeutique</ModalTitle>
          <div style={{ display:'grid', gap:12, marginBottom:20 }}>
            <div>
              <Label>Type de decision *</Label>
              <select value={decisionForm.type_decision} onChange={e => setDecisionForm(p => ({...p, type_decision:e.target.value}))} style={modalSelSt}>
                {Object.entries(DECISION_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div>
                <Label>Priorite</Label>
                <select value={decisionForm.priorite} onChange={e => setDecisionForm(p => ({...p, priorite:e.target.value}))} style={modalSelSt}>
                  <option value="urgente">Urgente (&lt;1 sem.)</option>
                  <option value="rapide">Rapide (&lt;1 mois)</option>
                  <option value="normale">Normale (1-3 mois)</option>
                  <option value="differee">Differee (&gt;3 mois)</option>
                </select>
              </div>
              <div>
                <Label>Protocole</Label>
                <input value={decisionForm.protocole} onChange={e => setDecisionForm(p => ({...p, protocole:e.target.value}))} placeholder="Ex: AC-T, FOLFOX..." style={modalInputSt} />
              </div>
            </div>
            <div>
              <Label>Delai de mise en oeuvre (semaines)</Label>
              <input type="number" min={0} value={decisionForm.delai_semaines} onChange={e => setDecisionForm(p => ({...p, delai_semaines:e.target.value}))} placeholder="Ex: 4" style={modalInputSt} />
            </div>
            <div>
              <Label>Description *</Label>
              <textarea value={decisionForm.description} onChange={e => setDecisionForm(p => ({...p, description:e.target.value}))} rows={4}
                placeholder="Decrivez la decision therapeutique collegiale retenue..." style={{ ...modalInputSt, resize:'vertical', lineHeight:1.6 }} />
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setShowDecisionModal(null)} style={{ flex:'0 0 100px', padding:'10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:13, cursor:'pointer' }}>Annuler</button>
            <button onClick={() => ajouterDecision(showDecisionModal)} disabled={submittingDecision}
              style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#16a34a,#15803d)', border:'none', borderRadius:8, color:'#fff', fontSize:13, fontWeight:700, cursor:submittingDecision?'not-allowed':'pointer', opacity:submittingDecision?0.7:1 }}>
              {submittingDecision ? 'Enregistrement...' : 'Confirmer la decision'}
            </button>
          </div>
        </Modal>
      )}

      {/* ── MODAL: Vote ── */}
      {showVoteModal && (
        <Modal onClose={() => setShowVoteModal(null)} maxWidth={460}>
          <ModalTitle>Vote collegial</ModalTitle>
          <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:18, lineHeight:1.6 }}>Enregistrez votre avis sur la strategie therapeutique proposee.</p>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
            {[
              { val:'pour',       label:'Pour',                    color:'#16a34a', desc:'Je soutiens la proposition' },
              { val:'contre',     label:'Contre',                  color:'#dc2626', desc:'Je m\'oppose a la proposition' },
              { val:'abstention', label:'Abstention',              color:'#9ca3af', desc:'Je m\'abstiens de voter' },
              { val:'info_comp',  label:'Infos complementaires',   color:'#d97706', desc:'Des donnees manquent' },
            ].map(v => (
              <button key={v.val} onClick={() => handleVote(showVoteModal, v.val)}
                style={{ padding:'16px 12px', background:v.color+'10', border:`1px solid ${v.color}30`, borderRadius:10, color:v.color, fontSize:13, fontWeight:700, cursor:'pointer', textAlign:'left', lineHeight:1.4 }}>
                <div>{v.label}</div>
                <div style={{ fontSize:10, fontWeight:400, marginTop:4, opacity:0.7 }}>{v.desc}</div>
              </button>
            ))}
          </div>
          {votes[showVoteModal] && Object.keys(votes[showVoteModal]).length > 0 && (
            <VoteResults votes={votes[showVoteModal]} />
          )}
        </Modal>
      )}

      {/* ── MODAL: Ajouter medecin ── */}
      {showAjouterMedecinModal && (
        <AjouterMedecinModal
          onClose={() => setShowAjouterMedecinModal(false)}
          onAjouter={ajouterMedecinPresence}
          dejaPresents={(data?.presences || []).map(p => p.medecin)}
        />
      )}


      {/* ── MODAL: Compte rendu rapide ── */}
      {showCRModal && (
        <Modal onClose={() => setShowCRModal(false)} maxWidth={700}>
          <ModalTitle>Compte Rendu RCP</ModalTitle>
          <CompteRenduTab data={data} onPrint={handlePrintCR} reload={reload} />
        </Modal>
      )}

      {/* ── MODAL: Upload fichier / DICOM ── */}
      {showUploadModal && (
        <UploadFichierModal
          dossierId={showUploadModal}
          onClose={() => setShowUploadModal(null)}
          onSuccess={() => { setShowUploadModal(null); reload(); toast.success('Fichier telecharge'); }}
        />
      )}

      {/* ── PANEL: Chat ── */}
      {showChatPanel && (
        <ChatPanel reunionId={id} dossier={showChatPanel} onClose={() => setShowChatPanel(null)} />
      )}

      
    </AppLayout>
  );
}

// ─── DossierCard ──────────────────────────────────────────────────────────────
function DossierCard({ d, index, votes, isExpanded, onToggleExpand, onAddDecision, onOpenChat, onVote, onAIAssist, onMarkRealise, onUploadFichier }) {
  const voteCount = Object.values(votes).reduce((a, b) => a + b, 0);
  return (
    <div style={{ ...ADMIN_CARD, overflow:'hidden', animation:`fadeUp 0.3s ease ${index*0.05}s both`, boxShadow:'0 8px 24px rgba(15,23,42,0.03)' }}>
      <div style={{ padding:'14px 18px', background:'#f8fafc', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(37,99,235,0.08)', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(37,99,235,0.08)', color:'#2563eb', border:'1px solid rgba(37,99,235,0.18)', flexShrink:0, fontWeight:700 }}>#{d.ordre_passage}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:14, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.patient_nom}</div>
            <div style={{ fontSize:10, color:'#2563eb', fontFamily:'var(--font-mono)', marginTop:1 }}>{d.patient_numero}</div>
          </div>
          <TypeBadge label={d.type_label} />
          <DossierStatutBadge statut={d.statut} label={d.statut_label} />
          {d.presenteur_nom && <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{d.presenteur_nom}</span>}
          {(d.nb_fichiers > 0) && (
            <span style={{ fontSize:10, padding:'2px 7px', borderRadius:6, background:'rgba(37,99,235,0.06)', color:'#2563eb', border:'1px solid rgba(37,99,235,0.14)' }}>
              {d.nb_fichiers} fichier{d.nb_fichiers > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
          <SmallBtn label={`Voter${voteCount > 0 ? ` (${voteCount})` : ''}`} color="#d97706" onClick={onVote} />
          <SmallBtn label="Chat" color="#2563eb" onClick={onOpenChat} />
          <SmallBtn label="IA" color="#2563eb" onClick={onAIAssist} />
          <SmallBtn label="+ Decision" color="#16a34a" onClick={onAddDecision} />
          <button onClick={onToggleExpand}
            style={{ padding:'5px 10px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'var(--text-muted)', fontSize:11, cursor:'pointer', fontWeight:700 }}>
            {isExpanded ? 'Reduire' : 'Voir'}
          </button>
        </div>
      </div>

      {d.question_posee && (
        <div style={{ padding:'10px 18px', borderBottom:'1px solid rgba(37,99,235,0.08)', background:'rgba(37,99,235,0.03)', display:'flex', alignItems:'flex-start', gap:8 }}>
          <span style={{ fontSize:10, color:'#2563eb', fontWeight:800, textTransform:'uppercase', letterSpacing:0.5, flexShrink:0, marginTop:1 }}>Question RCP</span>
          <span style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.5 }}>{d.question_posee}</span>
        </div>
      )}

      {voteCount > 0 && (
        <div style={{ padding:'8px 18px', borderBottom:'1px solid rgba(37,99,235,0.08)', display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600 }}>Votes ({voteCount}) :</span>
          {Object.entries(votes).map(([k, n]) => {
            const colors = { pour:'#16a34a', contre:'#dc2626', abstention:'#9ca3af', info_comp:'#d97706' };
            const labels = { pour:'Pour', contre:'Contre', abstention:'Abst.', info_comp:'Info' };
            return (
              <span key={k} style={{ padding:'2px 10px', borderRadius:12, fontSize:10, background:(colors[k]||'#9ca3af')+'15', color:colors[k]||'#9ca3af', border:`1px solid ${colors[k]||'#9ca3af'}25`, fontWeight:600 }}>
                {labels[k]||k}: {n}
              </span>
            );
          })}
        </div>
      )}

      {d.nb_decisions > 0 && (
        <div style={{ padding:'8px 18px', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center', borderBottom:isExpanded?'1px solid rgba(37,99,235,0.08)':'none' }}>
          <span style={{ fontSize:10, color:'var(--text-muted)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Decisions :</span>
          <span style={{ fontSize:10, color:'#16a34a', padding:'2px 10px', borderRadius:12, background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', fontWeight:600 }}>
            {d.nb_decisions} decision{d.nb_decisions > 1 ? 's' : ''} enregistree{d.nb_decisions > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {isExpanded && <DossierExpandedDetail dossierId={d.id} onMarkRealise={onMarkRealise} />}
    </div>
  );
}

function DossierExpandedDetail({ dossierId, onMarkRealise }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rcpService.dossiers.get(dossierId)
      .then(({ data }) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dossierId]);

  if (loading) return <div style={{ padding:24, textAlign:'center', color:'var(--text-muted)', fontSize:12 }}>Chargement du dossier...</div>;
  if (!detail) return null;

  return (
    <div style={{ padding:'16px 20px', background:'#ffffff', borderTop:'1px solid rgba(37,99,235,0.08)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {detail.resume_clinique && (
          <div>
            <SectionTitle>Resume clinique</SectionTitle>
            <p style={{ fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>{detail.resume_clinique}</p>
          </div>
        )}
        {detail.decisions?.length > 0 && (
          <div>
            <SectionTitle>Decisions therapeutiques ({detail.decisions.length})</SectionTitle>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {detail.decisions.map(dec => {
                const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
                return (
                  <div key={dec.id} style={{ padding:'10px 14px', background:'#ffffff', border:`1px solid ${col}18`, borderRadius:8, borderLeft:`3px solid ${col}` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4, flexWrap:'wrap' }}>
                          <span style={{ fontSize:12, fontWeight:700, color:col }}>{dec.type_label || DECISION_LABELS[dec.type_decision]}</span>
                          {dec.protocole && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:col+'15', color:col }}>{dec.protocole}</span>}
                          <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:(PRIORITE_COLORS[dec.priorite]||'#9ca3af')+'12', color:PRIORITE_COLORS[dec.priorite]||'#9ca3af' }}>
                            {PRIORITE_LABELS[dec.priorite]||dec.priorite}
                          </span>
                        </div>
                        <p style={{ fontSize:11.5, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>{dec.description}</p>
                        {dec.delai_semaines && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:3 }}>Delai : {dec.delai_semaines} semaine(s)</div>}
                      </div>
                      <div style={{ flexShrink:0 }}>
                        {dec.realise ? (
                          <span style={{ fontSize:11, color:'#16a34a', fontWeight:700 }}>Realise{dec.date_realisation ? ` le ${dec.date_realisation}` : ''}</span>
                        ) : (
                          <button onClick={() => onMarkRealise(dec.id)}
                            style={{ padding:'4px 10px', background:'rgba(22,163,74,0.1)', border:'1px solid rgba(22,163,74,0.25)', borderRadius:6, color:'#16a34a', fontSize:10, cursor:'pointer', fontWeight:600 }}>
                            Marquer realise
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

      {/* Fichiers / DICOM */}
      {detail.fichiers?.length > 0 && (
        <div>
          <SectionTitle>Fichiers et imagerie ({detail.fichiers.length})</SectionTitle>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {detail.fichiers.map(f => (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer"
                style={{ padding:'8px 12px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.10)', borderRadius:8, textDecoration:'none', display:'flex', alignItems:'center', gap:8, minWidth:180 }}>
                <FileTypeIcon type={f.type_fichier} />
                <div>
                  <div style={{ fontSize:11.5, fontWeight:600, color:'var(--text-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:140 }}>{f.nom_original}</div>
                  <div style={{ fontSize:10, color:'var(--text-muted)' }}>{f.type_label} {f.taille_bytes ? `— ${(f.taille_bytes/1024).toFixed(0)} Ko` : ''}</div>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {!detail.resume_clinique && !detail.decisions?.length && !detail.fichiers?.length && (
        <div style={{ textAlign:'center', padding:20, color:'var(--text-muted)', fontSize:12 }}>Aucune information complementaire disponible.</div>
      )}
    </div>
  );
}

// ─── PresencesTab ────────────────────────────────────────────────────────────
function PresencesTab({ data, onAjouter, quorumOk, specialitesPresentes }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
    
      
      {/* Table */}
      <div style={{ ...ADMIN_CARD, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', background:'#f8fafc', borderBottom:'1px solid rgba(37,99,235,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:12, fontWeight:700, color:'var(--text-secondary)' }}>Membres de la RCP</span>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <span style={{ fontSize:11, color:'#2563eb', background:'rgba(37,99,235,0.06)', padding:'3px 10px', borderRadius:12, border:'1px solid rgba(37,99,235,0.14)' }}>{data.nombre_membres_presents} present(s)</span>
            <button onClick={onAjouter} style={{ padding:'7px 14px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>
              + Ajouter medecin
            </button>
          </div>
        </div>
        {!data.presences?.length ? (
          <EmptyState text="Aucune presence enregistree" sub="Ajoutez les medecins participants a la reunion" />
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
                <tr style={{ background:'#f8fafc' }}>
                {['Medecin','Specialite','Role','Presence'].map(h => (
                  <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:10, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.6, borderBottom:'1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.presences.map((p, i) => {
                const rc = ROLE_COLORS[p.specialite] || '#9ca3af';
                return (
                  <tr key={p.id} style={{ borderBottom:'1px solid rgba(37,99,235,0.08)', background:i%2===0?'transparent':'rgba(37,99,235,0.01)' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:rc+'15', border:`1px solid ${rc}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:rc, flexShrink:0 }}>
                          {(p.medecin_nom||'?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)' }}>{p.medecin_nom}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:12, fontSize:11, background:rc+'12', color:rc, border:`1px solid ${rc}20`, fontWeight:600 }}>{p.specialite_label}</span>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-muted)' }}>{p.role || '—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:p.present?'#16a34a':'#dc2626' }}>
                        <span style={{ width:7, height:7, borderRadius:'50%', background:p.present?'#16a34a':'#dc2626', flexShrink:0 }} />
                        {p.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
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

// ─── CompteRenduTab ────────────────────────────────────────────────────────────
function CompteRenduTab({ data, onPrint, reload }) {
  const [editing, setEditing] = useState(false);
  const [crText, setCrText] = useState(data.compte_rendu || '');
  const [saving, setSaving] = useState(false);

  const saveCR = async () => {
    setSaving(true);
    try {
      await rcpService.reunions.patch(data.id, { compte_rendu: crText });
      toast.success('Compte rendu enregistre');
      setEditing(false);
      reload();
    } catch { toast.error('Erreur de sauvegarde'); }
    finally { setSaving(false); }
  };

  const genAutoCR = () => {
    const participants = (data.presences || []).map(p => `${p.medecin_nom} (${p.specialite_label})`).join(', ');
    const dossiersSummary = (data.dossiers || []).map(d => `- ${d.patient_nom} (${d.patient_numero}) : ${d.nb_decisions || 0} decision(s) — ${d.question_posee || 'Bilan therapeutique'}`).join('\n');
    setCrText(`REUNION DE CONCERTATION PLURIDISCIPLINAIRE — ${data.type_label?.toUpperCase() || 'ONCOLOGIE'}
Date : ${new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
Coordinateur : ${data.coordinateur_nom || '—'}
Lieu : ${data.lieu || data.salle || '—'}

PARTICIPANTS PRESENTS (${data.nombre_membres_presents}) :
${participants || '—'}

DOSSIERS DISCUTES (${data.nombre_dossiers}) :
${dossiersSummary || '—'}

${data.objectif ? `ORDRE DU JOUR :\n${data.objectif}\n` : ''}
DECISIONS ET CONCLUSIONS :
Les decisions therapeutiques ont ete prises collegialement, conformement aux recommandations nationales et internationales.

Fait le ${new Date().toLocaleDateString('fr-DZ')}`);
    setEditing(true);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      {data.objectif && (
        <div style={{ ...ADMIN_CARD, padding:'16px 20px' }}>
          <SectionTitle color="#2563eb">Ordre du jour</SectionTitle>
          <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.8, whiteSpace:'pre-wrap', margin:0 }}>{data.objectif}</p>
        </div>
      )}
      <div style={{ ...ADMIN_CARD, overflow:'hidden' }}>
        <div style={{ padding:'12px 18px', background:'#f8fafc', borderBottom:'1px solid rgba(37,99,235,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <SectionTitle color="#2563eb">Compte rendu de reunion</SectionTitle>
          <div style={{ display:'flex', gap:8 }}>
            {!editing && (
              <button onClick={genAutoCR} style={{ padding:'6px 12px', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.18)', borderRadius:8, color:'#2563eb', fontSize:11, cursor:'pointer', fontWeight:600 }}>Generer brouillon</button>
            )}
            {!editing ? (
              <button onClick={() => setEditing(true)} style={{ padding:'6px 12px', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, color:'#2563eb', fontSize:11, cursor:'pointer', fontWeight:600 }}>Rediger</button>
            ) : (
              <>
                <button onClick={() => setEditing(false)} style={{ padding:'6px 12px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'var(--text-muted)', fontSize:11, cursor:'pointer' }}>Annuler</button>
                <button onClick={saveCR} disabled={saving} style={{ padding:'6px 14px', background:'#16a34a', border:'none', borderRadius:8, color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer' }}>{saving ? 'Enregistrement...' : 'Enregistrer'}</button>
              </>
            )}
          </div>
        </div>
        <div style={{ padding:'18px 20px' }}>
          {editing ? (
            <textarea value={crText} onChange={e => setCrText(e.target.value)} rows={16}
              placeholder="Redigez le compte rendu de la reunion RCP..."
              style={{ width:'100%', padding:'12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:13, outline:'none', resize:'vertical', lineHeight:1.8, fontFamily:'var(--font-body)', boxSizing:'border-box' }} />
          ) : crText ? (
            <p style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.9, whiteSpace:'pre-wrap', margin:0 }}>{crText}</p>
          ) : (
            <div style={{ textAlign:'center', padding:40 }}>
              <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:6 }}>Compte rendu non encore redige</div>
              <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:20 }}>Utilisez "Generer brouillon" ou "Rediger" pour saisir manuellement.</div>
            </div>
          )}
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button onClick={onPrint} style={{ padding:'10px 20px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, cursor:'pointer', fontWeight:600 }}>
          Imprimer / Exporter PDF
        </button>
      </div>
    </div>
  );
}

// ─── SuiviDecisions ────────────────────────────────────────────────────────────
function SuiviDecisions({ dossiers, onMarkRealise, reload }) {
  const [filter, setFilter]           = useState('all');
  const [allDecisions, setAllDecisions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    if (!dossiers?.length) { setLoading(false); return; }
    Promise.all(
      dossiers.map(d => rcpService.dossiers.get(d.id).then(r => r.data).catch(() => null))
    ).then(results => {
      const decs = results.filter(Boolean).flatMap(d =>
        (d.decisions || []).map(dec => ({ ...dec, patientNom:d.patient_nom, patientNumero:d.patient_numero, dossierOrdre:d.ordre_passage }))
      );
      setAllDecisions(decs);
    }).finally(() => setLoading(false));
  }, [dossiers]);

  const counts = {
    all:     allDecisions.length,
    pending: allDecisions.filter(d => !d.realise).length,
    done:    allDecisions.filter(d =>  d.realise).length,
  };
  const filtered = filter === 'all' ? allDecisions
    : filter === 'pending' ? allDecisions.filter(d => !d.realise)
    : allDecisions.filter(d => d.realise);

  if (loading) return <LoadSpinner />;

  return (
    <div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:14 }}>
        {[
          { k:'all',     l:'Toutes',     n:counts.all,     c:'#2563eb' },
          { k:'pending', l:'En attente', n:counts.pending, c:'#d97706' },
          { k:'done',    l:'Realisees',  n:counts.done,    c:'#16a34a' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding:'10px', background:filter===f.k?f.c+'12':'#ffffff', border:`1px solid ${filter===f.k?f.c+'35':'rgba(37,99,235,0.08)'}`, borderRadius:'12px', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
            <div style={{ fontSize:22, fontWeight:900, color:f.c, fontFamily:'var(--font-display)' }}>{f.n}</div>
            <div style={{ fontSize:10, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5 }}>{f.l}</div>
          </button>
        ))}
      </div>
      {!filtered.length ? (
        <EmptyState text="Aucune decision dans cette categorie" />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(dec => {
            const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
            const pc  = PRIORITE_COLORS[dec.priorite] || '#9ca3af';
            return (
              <div key={dec.id} style={{ background:'#ffffff', border:`1px solid ${col}18`, borderRadius:'12px', padding:'14px 18px', borderLeft:`3px solid ${col}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12.5, fontWeight:700, color:col }}>{dec.type_label||DECISION_LABELS[dec.type_decision]}</span>
                    {dec.protocole && <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:col+'12', color:col, fontWeight:600 }}>{dec.protocole}</span>}
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>— {dec.patientNom} ({dec.patientNumero})</span>
                    <span style={{ fontSize:10, padding:'1px 6px', borderRadius:6, background:pc+'12', color:pc, fontWeight:600 }}>{PRIORITE_LABELS[dec.priorite]||dec.priorite}</span>
                  </div>
                  <p style={{ fontSize:12, color:'var(--text-secondary)', margin:0, lineHeight:1.6 }}>{dec.description}</p>
                  {dec.delai_semaines && <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>Delai : {dec.delai_semaines} semaine(s)</div>}
                </div>
                <div style={{ flexShrink:0 }}>
                  {dec.realise ? (
                    <span style={{ fontSize:11, color:'#16a34a', fontWeight:700 }}>Realise</span>
                  ) : (
                    <button onClick={async () => { await onMarkRealise(dec.id); reload(); }}
                      style={{ padding:'6px 12px', background:'rgba(22,163,74,0.08)', border:'1px solid rgba(22,163,74,0.2)', borderRadius:6, color:'#16a34a', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
                      Marquer realise
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

// ─── ChatPanel (real-time polling) ────────────────────────────────────────────
function ChatPanel({ reunionId, dossier, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingMsg, setLoadingMsg] = useState(false);
  const [lastId, setLastId]     = useState(0);
  const endRef  = useRef(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchMessages = useCallback(async (sinceId = 0) => {
    try {
      const params = { dossier_id: dossier.id };
      if (sinceId) params.since_id = sinceId;
      const { data } = await rcpService.reunions.messages(reunionId, params);
      if (data.length) {
        setMessages(prev => sinceId ? [...prev, ...data] : data);
        setLastId(data[data.length - 1].id);
      }
    } catch {}
  }, [reunionId, dossier.id]);

  useEffect(() => {
    fetchMessages(0);
    // Poll toutes les 4 secondes
    pollRef.current = setInterval(() => {
      setLastId(prev => { fetchMessages(prev); return prev; });
    }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const openVideoCall = () => {
    const roomName = `rnc-rcp-${reunionId}-${dossier.id}`;
    const url = `https://meet.jit.si/${encodeURIComponent(roomName)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
    toast.success('Salle video ouverte');
  };

  const sendMessage = async () => {
    const txt = input.trim();
    if ((!txt && !selectedFile) || loadingMsg) return;
    setLoadingMsg(true);
    const fileToSend = selectedFile;
    setInput('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      const formData = new FormData();
      formData.append('dossier', dossier.id);
      formData.append('contenu', txt);
      if (fileToSend) {
        formData.append('piece_jointe', fileToSend);
      }

      await rcpService.reunions.envoyerMessage(reunionId, formData);
      await fetchMessages(lastId);
    } catch {
      toast.error('Erreur envoi');
      setInput(txt);
      setSelectedFile(fileToSend);
    } finally {
      setLoadingMsg(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <SidePanel
      onClose={onClose}
      title={`Discussion — ${dossier.patient_nom}`}
      subtitle={dossier.patient_numero}
      color="#2563eb"
      actions={(
        <button
          type="button"
          onClick={openVideoCall}
          style={{
            padding:'6px 12px',
            background:'rgba(37,99,235,0.1)',
            border:'1px solid rgba(37,99,235,0.2)',
            borderRadius:8,
            color:'#2563eb',
            fontSize:11,
            fontWeight:700,
            cursor:'pointer',
            display:'inline-flex',
            alignItems:'center',
            gap:6,
          }}
        >
          <VideoCallIcon />
          Appel video
        </button>
      )}
    >
      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        {!messages.length ? (
          <div style={{ textAlign:'center', padding:50, color:'var(--text-muted)' }}>
            <div style={{ fontSize:13, marginBottom:4 }}>Aucun message pour ce dossier.</div>
            <div style={{ fontSize:11 }}>Demarrez la discussion collegiale.</div>
          </div>
        ) : messages.map(msg => {
          const color = ROLE_COLORS.onco;
          return (
            <div key={msg.id} style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                <div style={{ width:26, height:26, borderRadius:'50%', background:color+'15', border:`1px solid ${color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color, flexShrink:0 }}>
                  {msg.auteur_initiales || '?'}
                </div>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{msg.auteur_nom}</span>
                <span style={{ fontSize:10, color:'var(--text-muted)', marginLeft:'auto' }}>
                  {new Date(msg.date_envoi).toLocaleTimeString('fr-DZ', { hour:'2-digit', minute:'2-digit' })}
                </span>
              </div>
              <div style={{ marginLeft:33, padding:'9px 13px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'0 10px 10px 10px', fontSize:12.5, color:'var(--text-secondary)', lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                {msg.contenu || (!msg.piece_jointe_url ? 'Message sans texte' : null)}
                {msg.piece_jointe_url && (
                  <div style={{ marginTop:10, padding:'10px 12px', borderRadius:8, background:'rgba(37,99,235,0.05)', border:'1px solid rgba(37,99,235,0.14)', display:'flex', alignItems:'center', gap:10 }}>
                    <AttachmentIcon />
                    <div style={{ minWidth:0, flex:1 }}>
                      <div style={{ fontSize:11.5, fontWeight:700, color:'var(--text-primary)', marginBottom:2 }}>Piece jointe</div>
                      <a href={msg.piece_jointe_url} target="_blank" rel="noreferrer" style={{ fontSize:11.5, color:'#2563eb', textDecoration:'none', wordBreak:'break-word' }}>
                        {msg.piece_jointe_nom || 'Telecharger le fichier'}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ padding:'8px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:5, flexWrap:'wrap' }}>
        {['Accord avec la proposition', 'Demande bilan complementaire', 'Second avis recommande', 'Discute, decision reportee'].map(s => (
          <button key={s} onClick={() => setInput(s)} style={{ padding:'3px 8px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:12, color:'var(--text-muted)', fontSize:10, cursor:'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ padding:'10px 14px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={2}
          placeholder="Saisissez votre message... (Entree pour envoyer)"
          disabled={loadingMsg}
          style={{ flex:1, padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-primary)', fontSize:12.5, outline:'none', resize:'none', fontFamily:'var(--font-body)', lineHeight:1.5, opacity:loadingMsg?0.6:1 }} />
        <input
          ref={fileInputRef}
          type="file"
          onChange={e => setSelectedFile(e.target.files?.[0] || null)}
          style={{ display:'none' }}
        />
        <div style={{ display:'flex', flexDirection:'column', gap:6, minWidth:0 }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loadingMsg}
            style={{ padding:'8px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:11, cursor:loadingMsg?'not-allowed':'pointer', fontWeight:600, display:'inline-flex', alignItems:'center', gap:6 }}
          >
            <PaperclipIcon />
            Fichier
          </button>
          {selectedFile && (
            <div style={{ maxWidth:160, padding:'6px 8px', borderRadius:8, background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.14)', color:'var(--text-secondary)', fontSize:10.5, lineHeight:1.4 }}>
              <div style={{ fontWeight:700, color:'var(--text-primary)', wordBreak:'break-word' }}>{selectedFile.name}</div>
              <button
                type="button"
                onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                style={{ marginTop:4, padding:0, border:'none', background:'none', color:'#dc2626', fontSize:10, cursor:'pointer' }}
              >
                Retirer
              </button>
            </div>
          )}
        </div>
        <button onClick={sendMessage} disabled={loadingMsg}
          style={{ padding:'9px 16px', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:loadingMsg?'not-allowed':'pointer', alignSelf:'flex-end', fontWeight:700, opacity:loadingMsg?0.7:1 }}>
          Envoyer
        </button>
      </div>
    </SidePanel>
  );
}


function Modal({ children, onClose, maxWidth = 540 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:'24px 28px', width:'100%', maxWidth, boxShadow:'0 24px 64px rgba(0,0,0,0.4)', maxHeight:'90vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function StatutBadge({ statut, label, color, pulse }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 12px', borderRadius:20, fontSize:11, fontWeight:700, background:color+'12', color, border:`1px solid ${color}25` }}>
      {pulse && <span style={{ width:6, height:6, borderRadius:'50%', background:color, animation:'pulse-glow 1.5s infinite', flexShrink:0 }} />}
      {label}
    </span>
  );
}

function QuorumBadge({ ok, count }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:ok?'rgba(22,163,74,0.1)':'rgba(220,38,38,0.1)', color:ok?'#16a34a':'#dc2626', border:`1px solid ${ok?'rgba(22,163,74,0.25)':'rgba(220,38,38,0.25)'}` }}>
      Quorum {count}/3 {ok ? '— OK' : '— Insuffisant'}
    </span>
  );
}

function TypeBadge({ label }) {
  return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, background:'rgba(37,99,235,0.07)', color:'#2563eb', border:'1px solid rgba(37,99,235,0.15)', flexShrink:0, fontWeight:500 }}>{label}</span>;
}

function DossierStatutBadge({ statut, label }) {
  const colors = { attente:'#9ca3af', discute:'#16a34a', reporte:'#d97706', annule:'#dc2626' };
  const c = colors[statut] || '#9ca3af';
  return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, background:c+'12', color:c, border:`1px solid ${c}20`, flexShrink:0, fontWeight:600 }}>{label}</span>;
}

function InfoPill({ label, val }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:'var(--text-secondary)' }}>
      <span style={{ fontSize:10, color:'var(--text-muted)' }}>{label} :</span>{val}
    </span>
  );
}

function ActionBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'8px 16px', background:color+'12', border:`1px solid ${color}25`, borderRadius:8, color, fontSize:12, fontWeight:700, cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background=color+'22'}
      onMouseLeave={e => e.currentTarget.style.background=color+'12'}>
      {label}
    </button>
  );
}

function SmallBtn({ label, color, onClick }) {
  return (
    <button onClick={onClick} style={{ padding:'5px 12px', background:color+'0d', border:`1px solid ${color}20`, borderRadius:8, color, fontSize:11, fontWeight:600, cursor:'pointer', transition:'all 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.background=color+'1a'}
      onMouseLeave={e => e.currentTarget.style.background=color+'0d'}>
      {label}
    </button>
  );
}

function SectionTitle({ children, color = '#2563eb' }) {
  return <div style={{ fontSize:10, fontWeight:700, color, textTransform:'uppercase', letterSpacing:0.8, marginBottom:8 }}>{children}</div>;
}

function ModalTitle({ children }) {
  return <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', color:'var(--text-primary)', marginBottom:18 }}>{children}</div>;
}

function Label({ children }) {
  return <label style={{ display:'block', fontSize:11.5, fontWeight:600, color:'var(--text-secondary)', marginBottom:5 }}>{children}</label>;
}

function EmptyState({ text, sub }) {
  return (
    <div style={{ padding:56, textAlign:'center', background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)' }}>
      <div style={{ fontSize:13, color:'var(--text-muted)', marginBottom:sub?4:0 }}>{text}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>}
    </div>
  );
}

function Loader() {
  return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
    <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
  </div>;
}

function LoadSpinner() {
  return <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
    <div style={{ width:28, height:28, border:'3px solid var(--border)', borderTopColor:'#d97706', borderRadius:'50%', animation:'spin 0.7s linear infinite', margin:'0 auto 10px' }} />
    Chargement...
  </div>;
}

function FileTypeIcon({ type }) {
  const colors = { dicom:'#2563eb', scanner:'#0891b2', irm:'#7c3aed', radio:'#d97706', echo:'#16a34a', anapath:'#dc2626', biologie:'#ea580c', autre:'#9ca3af' };
  const c = colors[type] || '#9ca3af';
  return (
    <div style={{ width:28, height:28, borderRadius:6, background:c+'12', border:`1px solid ${c}25`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ margin:'0 auto', display:'block' }}>
      <polyline points="16 16 12 12 8 16" />
      <line x1="12" y1="12" x2="12" y2="21" />
      <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
    </svg>
  );
}

function PaperclipIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 1 1 4.95 4.95l-8.5 8.49a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78" />
    </svg>
  );
}

function VideoCallIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 10l4.55-2.27A1 1 0 0 1 21 8.62v6.76a1 1 0 0 1-1.45.89L15 14" />
      <rect x="3" y="6" width="12" height="12" rx="2" ry="2" />
    </svg>
  );
}

function AttachmentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink:0 }}>
      <path d="M21.44 11.05l-8.49 8.49a5.5 5.5 0 0 1-7.78-7.78l8.49-8.49a3.5 3.5 0 1 1 4.95 4.95l-8.5 8.49a1.5 1.5 0 0 1-2.12-2.12l7.78-7.78" />
    </svg>
  );
}

const btnSecondary = { padding:'8px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text-secondary)', fontSize:12, cursor:'pointer' };
const modalInputSt = { width:'100%', padding:'10px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:13, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
const modalSelSt   = { ...modalInputSt, cursor:'pointer' };
