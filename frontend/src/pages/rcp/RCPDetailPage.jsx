import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { rcpService } from '../../services/rcpService';
import { accountsService } from '../../services/accountsService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

// Constants
const STATUT_CFG = {
  planifiee:{ color:'#7c3aed', label:'Planifiee'  },
  en_cours: { color:'#2563eb', label:'En cours'   },
  terminee: { color:'#16a34a', label:'Terminee'   },
  annulee:  { color:'#dc2626', label:'Annulee'    },
  reportee: { color:'#d97706', label:'Reportee'   },
};
const DECISION_COLORS = {
  chir:'#dc2626', chimio:'#2563eb', radio:'#d97706', hormono:'#16a34a',
  immuno:'#9333ea', radiochim:'#ea580c', surveill:'#0891b2', support:'#7c3aed',
  palliatif:'#6b7280', essai:'#a78bfa', second:'#9ca3af', bilan:'#60a5fa',
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

// Chat message storage (keyed by dossier id)
const chatStore = {};

// Main component
export default function RCPDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState('dossiers');

  const [showDecisionModal, setShowDecisionModal] = useState(null);
  const [showChatPanel, setShowChatPanel]         = useState(null);
  const [showDossierDetail, setShowDossierDetail] = useState(null);
  const [showVoteModal, setShowVoteModal]         = useState(null);
  const [showAIAssist, setShowAIAssist]           = useState(null);
  const [showPresenceModal, setShowPresenceModal] = useState(false);
  const [showAjouterMedecinModal, setShowAjouterMedecinModal] = useState(false);

  const [decisionForm, setDecisionForm] = useState({
    type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'',
  });
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [votes, setVotes] = useState({});
  const [medecins, setMedecins] = useState([]);
  const [loadingMedecins, setLoadingMedecins] = useState(false);
  const [presenceForm, setPresenceForm] = useState({
    medecin: '', specialite: 'onco', role: '', present: true,
  });
  const [submittingPresence, setSubmittingPresence] = useState(false);

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
      toast.success('Statut mis a jour');
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

  const ajouterPresence = async () => {
    if (!presenceForm.medecin) { toast.error('Selectionnez un medecin'); return; }
    setSubmittingPresence(true);
    try {
      await rcpService.reunions.ajouterPresence(id, presenceForm);
      toast.success('Medecin ajoute a la RCP');
      setShowPresenceModal(false);
      setPresenceForm({ medecin: '', specialite: 'onco', role: '', present: true });
      reload();
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setSubmittingPresence(false); }
  };

  const ajouterMedecinPresence = async (medecinId) => {
    setSubmittingPresence(true);
    try {
      const medecin = medecins.find(m => m.id == medecinId);
      if (!medecin) { toast.error('Medecin introuvable'); return; }

      const presenceData = {
        medecin: medecinId,
        specialite: medecin.role === 'anapath' ? 'anapath' : 'onco',
        role: medecin.role,
        present: true
      };

      await rcpService.reunions.ajouterPresence(id, presenceData);
      toast.success('Medecin ajoute a la RCP');
      reload();
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setSubmittingPresence(false); }
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
    const dossierRows = (data.dossiers || []).map(d => `
      <tr>
        <td>${d.ordre_passage}</td>
        <td><strong>${d.patient_nom}</strong><br/><small>${d.patient_numero}</small></td>
        <td>${d.type_label}</td>
        <td>${d.statut_label}</td>
        <td>${d.question_posee || '-'}</td>
        <td>${d.nb_decisions} decision(s)</td>
      </tr>`).join('');
    win.document.write(`
      <!DOCTYPE html><html><head><meta charset="UTF-8">
      <title>Compte Rendu - ${data.titre}</title>
      <style>
        body { font-family: 'Times New Roman', serif; margin: 40px; color: #1a1a1a; }
        h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #000; padding-bottom: 12px; }
        .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 20px 0; font-size: 13px; }
        .meta div { padding: 6px 10px; background: #f5f5f5; border-radius: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
        th { background: #1a1a2e; color: white; padding: 8px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { margin-top: 40px; font-size: 11px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; text-align: center; }
      </style></head><body>
      <h1>Compte Rendu - ${data.titre}</h1>
      <div class="meta">
        <div><strong>Date :</strong> ${new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
        <div><strong>Type :</strong> ${data.type_label}</div>
        <div><strong>Lieu :</strong> ${data.lieu || '-'}</div>
        <div><strong>Coordinateur :</strong> ${data.coordinateur_nom || '-'}</div>
        <div><strong>Membres presents :</strong> ${data.nombre_membres_presents}</div>
        <div><strong>Dossiers :</strong> ${data.nombre_dossiers}</div>
      </div>
      ${data.objectif ? `<h3>Ordre du jour</h3><p style="font-size:13px">${data.objectif}</p>` : ''}
      <h3>Dossiers presentes</h3>
      <table><thead><tr><th>#</th><th>Patient</th><th>Type</th><th>Statut</th><th>Question</th><th>Decisions</th></tr></thead>
      <tbody>${dossierRows}</tbody></table>
      ${data.compte_rendu ? `<h3>Compte rendu</h3><p style="font-size:13px; line-height:1.8">${data.compte_rendu}</p>` : ''}
      <div class="footer">Document genere le ${new Date().toLocaleString('fr-DZ')} - Confidentiel medical</div>
      </body></html>`);
    win.document.close();
    win.print();
  };

  if (loading) return <AppLayout title="RCP"><Loader /></AppLayout>;
  if (!data)   return null;

  const sc = STATUT_CFG[data.statut] || { color:'#64748b', label:'-' };
  const totalDecisions = data.dossiers?.reduce((s, d) => s + (d.nb_decisions || 0), 0) || 0;

  return (
    <AppLayout title="Reunion RCP">

      {/* HEADER */}
      <div style={{ background:'#ffffff', border:`1px solid ${sc.color}25`, borderRadius:'16px', padding:'20px 24px', marginBottom:20, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', right:-20, top:-20, width:120, height:120, borderRadius:'50%', background:`${sc.color}08`, pointerEvents:'none' }} />

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6, flexWrap:'wrap' }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:19, fontWeight:800, color:'#0f172a' }}>{data.titre}</h2>
              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:600, background:`${sc.color}18`, color:sc.color, border:`1px solid ${sc.color}30` }}>
                {sc.label}
              </span>
              <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, color:'#64748b', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)' }}>{data.type_label}</span>
            </div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <Chip label="Date"          val={new Date(data.date_reunion).toLocaleDateString('fr-DZ', { weekday:'long', day:'numeric', month:'long', year:'numeric' })} />
              <Chip label="Heure"         val={`${data.heure_debut?.slice(0,5)}${data.heure_fin ? ' - '+data.heure_fin.slice(0,5) : ''}`} />
              {data.lieu             && <Chip label="Lieu"          val={data.lieu} />}
              {data.salle            && <Chip label="Salle"         val={data.salle} />}
              {data.coordinateur_nom && <Chip label="Coordinateur"  val={data.coordinateur_nom} />}
            </div>
          </div>

          <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
            {data.statut === 'planifiee' && <BtnAction label="Demarrer"  color="#2563eb" onClick={() => changerStatut('en_cours')} />}
            {data.statut === 'en_cours'  && <BtnAction label="Terminer"  color="#16a34a" onClick={() => changerStatut('terminee')} />}
            {(data.statut === 'planifiee'||data.statut === 'en_cours') && (
              <BtnAction label="Reporter"  color="#d97706" onClick={() => changerStatut('reportee')} />
            )}
            {(data.statut === 'planifiee'||data.statut === 'en_cours') && (
              <BtnAction label="Annuler"   color="#dc2626" onClick={() => changerStatut('annulee')} />
            )}
            <button onClick={handlePrintCR}
              style={{ padding:'8px 14px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#64748b', fontSize:12, cursor:'pointer' }}>
              Imprimer CR
            </button>
            <Link to="/rcp" style={{ textDecoration:'none' }}>
              <button style={{ padding:'8px 14px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#64748b', fontSize:12, cursor:'pointer' }}>Retour</button>
            </Link>
          </div>
        </div>

        <div style={{ display:'flex', gap:24, marginTop:16, paddingTop:14, borderTop:'1px solid rgba(37,99,235,0.12)', flexWrap:'wrap' }}>
          {[
            { label:'Dossiers',         val:data.nombre_dossiers,         color:'#7c3aed' },
            { label:'Membres presents', val:data.nombre_membres_presents, color:'#2563eb' },
            { label:'Decisions prises', val:totalDecisions,               color:'#16a34a' },
            { label:'Dossiers prevus',  val:data.nombre_dossiers_prevus,  color:'#d97706' },
          ].map(m => (
            <div key={m.label} style={{ display:'flex', flexDirection:'column', gap:2 }}>
              <span style={{ fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', color:m.color, lineHeight:1 }}>{m.val}</span>
              <span style={{ fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5 }}>{m.label}</span>
            </div>
          ))}
          {data.objectif && (
            <div style={{ flex:1, minWidth:200, padding:'6px 12px', background:'rgba(155,138,251,0.05)', borderRadius:8, border:'1px solid rgba(155,138,251,0.15)' }}>
              <div style={{ fontSize:9, color:'#7c3aed', textTransform:'uppercase', fontWeight:700, letterSpacing:0.5, marginBottom:3 }}>Ordre du jour</div>
              <div style={{ fontSize:11.5, color:'#334155', lineHeight:1.5 }}>{data.objectif.slice(0, 120)}{data.objectif.length > 120 ? '...' : ''}</div>
            </div>
          )}
        </div>
      </div>

      {/* TABS */}
      <div style={{ display:'flex', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:16 }}>
        {[
          { key:'dossiers',  label:`Dossiers (${data.nombre_dossiers})`,          color:'#7c3aed' },
          { key:'presences', label:`Presences (${data.nombre_membres_presents})`, color:'#2563eb' },
          { key:'cr',        label:'Compte rendu',                                color:'#16a34a' },
          { key:'suivi',     label:`Suivi decisions (${totalDecisions})`,         color:'#d97706' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ flex:1, padding:'12px 8px', background:'none', border:'none', borderBottom:`2px solid ${activeTab===t.key?t.color:'transparent'}`, color:activeTab===t.key?t.color:'#64748b', fontSize:12, fontWeight:activeTab===t.key?600:400, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.15s', whiteSpace:'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* DOSSIERS TAB */}
      {activeTab === 'dossiers' && (
        <div>
          <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:12 }}>
            <Link to={`/rcp/dossier/nouveau?reunion=${id}`} style={{ textDecoration:'none' }}>
              <button style={{ padding:'8px 16px', background:'linear-gradient(135deg,#7c3aed,#7c6fcd)', border:'none', borderRadius:'12px', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                + Ajouter un dossier
              </button>
            </Link>
          </div>

          {!data.dossiers?.length ? (
            <EmptyState text="Aucun dossier patient ajoute" />
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {data.dossiers.map(d => (
                <DossierCard
                  key={d.id}
                  d={d}
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

      {/* PRESENCES TAB */}
      {activeTab === 'presences' && (
        <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          <div style={{ padding:'12px 18px', background:'#f1f5f9', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#334155' }}>Membres de la RCP</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#64748b' }}>{data.nombre_membres_presents} present(s)</span>
              <button onClick={() => setShowAjouterMedecinModal(true)}
                style={{ padding:'6px 12px', background:'linear-gradient(135deg,#2563eb,#2563eb)', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer' }}>
                + Ajouter medecin
              </button>
            </div>
          </div>
          {!data.presences?.length ? (
            <EmptyState text="Aucune presence enregistree" />
          ) : (
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'#f1f5f9' }}>
                  {['Medecin','Specialite','Role','Presence'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:10, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.presences.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom:'1px solid rgba(37,99,235,0.12)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(155,138,251,0.15)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#7c3aed' }}>
                          {(p.medecin_nom||'?').charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{p.medecin_nom}</span>
                      </div>
                    </td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#334155' }}>{p.specialite_label}</td>
                    <td style={{ padding:'11px 14px', fontSize:12, color:'#64748b' }}>{p.role || '-'}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ fontSize:12, fontWeight:500, color: p.present ? '#16a34a' : '#dc2626' }}>
                        {p.present ? 'Present' : 'Absent'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* COMPTE RENDU TAB */}
      {activeTab === 'cr' && (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {data.objectif && (
            <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'18px 22px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Ordre du jour</div>
              <p style={{ fontSize:13, color:'#334155', lineHeight:1.8, whiteSpace:'pre-wrap', margin:0 }}>{data.objectif}</p>
            </div>
          )}
          <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', padding:'18px 22px' }}>
            {data.compte_rendu ? (
              <>
                <div style={{ fontSize:11, fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Compte rendu</div>
                <p style={{ fontSize:13, color:'#334155', lineHeight:1.9, whiteSpace:'pre-wrap', margin:0 }}>{data.compte_rendu}</p>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:32 }}>
                <div style={{ fontSize:13, color:'#64748b', marginBottom:16 }}>Compte rendu non encore redige</div>
                <button style={{ padding:'8px 20px', background:'linear-gradient(135deg,#16a34a,#00c080)', border:'none', borderRadius:8, color:'#000', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                  Rediger le compte rendu
                </button>
              </div>
            )}
          </div>
          <button onClick={handlePrintCR}
            style={{ alignSelf:'flex-end', padding:'9px 20px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#334155', fontSize:12, cursor:'pointer' }}>
            Imprimer / Exporter PDF
          </button>
        </div>
      )}

      {/* SUIVI DECISIONS TAB */}
      {activeTab === 'suivi' && (
        <SuiviDecisions dossiers={data.dossiers} onMarkRealise={marquerDecisionRealisee} reload={reload} />
      )}

      {/* MODAL: Ajouter decision */}
      {showDecisionModal && (
        <Modal onClose={() => { setShowDecisionModal(null); setDecisionForm({ type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'' }); }}>
          <div style={{ fontSize:16, fontWeight:700, fontFamily:'var(--font-display)', color:'#0f172a', marginBottom:20 }}>
            Ajouter une decision therapeutique
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={labelSt}>Type de decision *</label>
            <select value={decisionForm.type_decision} onChange={e => setDecisionForm(p => ({...p, type_decision:e.target.value}))} style={modalSelSt}>
              {Object.entries(DECISION_LABELS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>
            <div>
              <label style={labelSt}>Priorite</label>
              <select value={decisionForm.priorite} onChange={e => setDecisionForm(p => ({...p, priorite:e.target.value}))} style={modalSelSt}>
                <option value="urgente">Urgente (&lt;1 sem.)</option>
                <option value="rapide">Rapide (&lt;1 mois)</option>
                <option value="normale">Normale (1-3 mois)</option>
                <option value="differee">Differee (&gt;3 mois)</option>
              </select>
            </div>
            <div>
              <label style={labelSt}>Protocole</label>
              <input value={decisionForm.protocole} onChange={e => setDecisionForm(p => ({...p, protocole:e.target.value}))} placeholder="Ex: AC-T, FOLFOX..." style={modalInputSt} />
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={labelSt}>Delai de mise en oeuvre (semaines)</label>
            <input type="number" min={0} value={decisionForm.delai_semaines} onChange={e => setDecisionForm(p => ({...p, delai_semaines:e.target.value}))} placeholder="Ex: 4" style={modalInputSt} />
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={labelSt}>Description de la decision *</label>
            <textarea value={decisionForm.description} onChange={e => setDecisionForm(p => ({...p, description:e.target.value}))} rows={3} placeholder="Chirurgie conservatrice du sein gauche avec curage axillaire..." style={{ ...modalInputSt, resize:'vertical', lineHeight:1.6 }} />
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => { setShowDecisionModal(null); setDecisionForm({ type_decision:'chimio', priorite:'normale', description:'', protocole:'', delai_semaines:'' }); }}
              style={{ flex:'0 0 90px', padding:'10px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#334155', fontSize:13, cursor:'pointer' }}>Annuler</button>
            <button onClick={() => ajouterDecision(showDecisionModal)} disabled={submittingDecision}
              style={{ flex:1, padding:'10px', background:'linear-gradient(135deg,#16a34a,#00c080)', border:'none', borderRadius:8, color:'#000', fontSize:13, fontWeight:700, cursor:submittingDecision?'not-allowed':'pointer', opacity:submittingDecision?0.7:1 }}>
              {submittingDecision ? 'Enregistrement...' : 'Confirmer la decision'}
            </button>
          </div>
        </Modal>
      )}

      {/* MODAL: Vote */}
      {showVoteModal && (
        <Modal onClose={() => setShowVoteModal(null)} maxWidth={440}>
          <div style={{ fontSize:15, fontWeight:700, fontFamily:'var(--font-display)', color:'#0f172a', marginBottom:6 }}>Vote collegial</div>
          <div style={{ fontSize:12, color:'#64748b', marginBottom:20 }}>Enregistrez votre avis sur la strategie therapeutique proposee</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {[
              { val:'pour',       label:'Pour',                       color:'#16a34a' },
              { val:'contre',     label:'Contre',                     color:'#dc2626' },
              { val:'abstention', label:'Abstention',                 color:'#64748b' },
              { val:'info_comp',  label:'Information complementaire', color:'#d97706' },
            ].map(v => (
              <button key={v.val} onClick={() => handleVote(showVoteModal, v.val)}
                style={{ padding:'14px 10px', background:`${v.color}10`, border:`1px solid ${v.color}30`, borderRadius:10, color:v.color, fontSize:13, fontWeight:600, cursor:'pointer', textAlign:'center', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background=`${v.color}20`; e.currentTarget.style.transform='scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background=`${v.color}10`; e.currentTarget.style.transform='scale(1)'; }}>
                {v.label}
              </button>
            ))}
          </div>
          {votes[showVoteModal] && Object.keys(votes[showVoteModal]).length > 0 && (
            <div style={{ marginTop:16, padding:'12px', background:'#f1f5f9', borderRadius:8, border:'1px solid rgba(37,99,235,0.12)' }}>
              <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>Resultats actuels</div>
              {Object.entries(votes[showVoteModal]).map(([k, n]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:'#334155', marginBottom:4 }}>
                  <span>{k}</span><span style={{ fontWeight:700 }}>{n}</span>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* MODAL: Ajouter medecin a la presence */}
      <AjouterMedecinModal
        isOpen={showAjouterMedecinModal}
        onClose={() => setShowAjouterMedecinModal(false)}
        onAjouter={ajouterMedecinPresence}
        medecins={medecins}
        loading={loadingMedecins}
      />

      {/* PANEL: Chat medecins */}
      {showChatPanel && (
        <ChatPanel dossier={showChatPanel} onClose={() => setShowChatPanel(null)} />
      )}

      {/* PANEL: Aide IA */}
      {showAIAssist && (
        <AIAssistPanel dossier={showAIAssist} onClose={() => setShowAIAssist(null)} />
      )}
    </AppLayout>
  );
}

// DossierCard
function DossierCard({ d, votes, isExpanded, onToggleExpand, onAddDecision, onOpenChat, onVote, onAIAssist, onMarkRealise }) {
  const voteCount = Object.values(votes).reduce((a, b) => a + b, 0);

  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'14px 18px', background:'#f1f5f9', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid rgba(37,99,235,0.12)', flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, flex:1, minWidth:0 }}>
          <span style={{ fontFamily:'var(--font-mono)', fontSize:11, padding:'2px 8px', borderRadius:6, background:'rgba(155,138,251,0.1)', color:'#7c3aed', border:'1px solid rgba(155,138,251,0.2)', flexShrink:0 }}>#{d.ordre_passage}</span>
          <div style={{ minWidth:0 }}>
            <div style={{ fontWeight:700, fontSize:13.5, color:'#0f172a', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{d.patient_nom}</div>
            <div style={{ fontSize:10, color:'#2563eb', fontFamily:'var(--font-mono)' }}>{d.patient_numero}</div>
          </div>
          <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, background:'rgba(0,168,255,0.08)', color:'#2563eb', border:'1px solid rgba(0,168,255,0.15)', flexShrink:0 }}>{d.type_label}</span>
          <DossierStatutBadge statut={d.statut} label={d.statut_label} />
          {d.presenteur_nom && <span style={{ fontSize:11, color:'#64748b', flexShrink:0 }}>{d.presenteur_nom}</span>}
        </div>

        <div style={{ display:'flex', gap:6, flexShrink:0, flexWrap:'wrap' }}>
          <ActionBtn label="Voter"      color="#d97706" count={voteCount||null} onClick={onVote} />
          <ActionBtn label="Chat"       color="#2563eb" onClick={onOpenChat} />
          <ActionBtn label="IA"         color="#9333ea" onClick={onAIAssist} />
          <ActionBtn label="+ Decision" color="#16a34a" onClick={onAddDecision} />
          <button onClick={onToggleExpand}
            style={{ padding:'6px 10px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#64748b', fontSize:11, cursor:'pointer' }}>
            {isExpanded ? '-' : '+'}
          </button>
        </div>
      </div>

      {d.question_posee && (
        <div style={{ padding:'10px 18px', borderBottom:'1px solid rgba(37,99,235,0.12)', background:'rgba(245,166,35,0.03)' }}>
          <span style={{ fontSize:10, color:'#d97706', fontWeight:700, textTransform:'uppercase', letterSpacing:0.5 }}>Question RCP : </span>
          <span style={{ fontSize:12, color:'#334155' }}>{d.question_posee}</span>
        </div>
      )}

      {voteCount > 0 && (
        <div style={{ padding:'8px 18px', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', gap:8, alignItems:'center' }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:600, flexShrink:0 }}>Votes ({voteCount}) :</span>
          {Object.entries(votes).map(([k, n]) => {
            const colors = { pour:'#16a34a', contre:'#dc2626', abstention:'#9ca3af', info_comp:'#d97706' };
            const labels = { pour:'Pour', contre:'Contre', abstention:'Abstention', info_comp:'Info req.' };
            return (
              <span key={k} style={{ padding:'1px 8px', borderRadius:12, fontSize:10, background:`${colors[k]||'#9ca3af'}15`, color:colors[k]||'#9ca3af', border:`1px solid ${colors[k]||'#9ca3af'}25` }}>
                {labels[k]||k}: {n}
              </span>
            );
          })}
        </div>
      )}

      {d.nb_decisions > 0 && (
        <div style={{ padding:'10px 18px', display:'flex', gap:6, flexWrap:'wrap', borderBottom: isExpanded ? '1px solid rgba(37,99,235,0.12)' : 'none' }}>
          <span style={{ fontSize:10, color:'#64748b', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, alignSelf:'center' }}>Decisions :</span>
          <span style={{ fontSize:10, color:'#16a34a', padding:'2px 8px', borderRadius:12, background:'rgba(0,229,160,0.08)', border:'1px solid rgba(0,229,160,0.15)' }}>
            {d.nb_decisions} decision(s) enregistree(s)
          </span>
        </div>
      )}

      {isExpanded && <DossierExpandedDetail dossierId={d.id} onMarkRealise={onMarkRealise} />}
    </div>
  );
}

// DossierExpandedDetail
function DossierExpandedDetail({ dossierId, onMarkRealise }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    rcpService.dossiers.get(dossierId)
      .then(({ data }) => setDetail(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [dossierId]);

  if (loading) return <div style={{ padding:20, textAlign:'center', color:'#64748b', fontSize:12 }}>Chargement...</div>;
  if (!detail) return null;

  return (
    <div style={{ padding:'14px 18px', background:'rgba(0,0,0,0.08)' }}>
      {detail.resume_clinique && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>Resume clinique</div>
          <p style={{ fontSize:12.5, color:'#334155', lineHeight:1.7, margin:0, whiteSpace:'pre-wrap' }}>{detail.resume_clinique}</p>
        </div>
      )}

      {detail.decisions?.length > 0 && (
        <div>
          <div style={{ fontSize:10, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>Decisions therapeutiques</div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {detail.decisions.map(dec => {
              const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
              return (
                <div key={dec.id} style={{ padding:'12px 14px', background:'#ffffff', border:`1px solid ${col}20`, borderRadius:'12px', borderLeft:`3px solid ${col}` }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <span style={{ fontSize:12.5, fontWeight:700, color:col }}>{dec.type_label || DECISION_LABELS[dec.type_decision] || dec.type_decision}</span>
                        {dec.protocole && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, background:`${col}15`, color:col, border:`1px solid ${col}25` }}>{dec.protocole}</span>}
                        <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, background:`${PRIORITE_COLORS[dec.priorite]||'#9ca3af'}12`, color:PRIORITE_COLORS[dec.priorite]||'#9ca3af', border:`1px solid ${PRIORITE_COLORS[dec.priorite]||'#9ca3af'}20` }}>
                          {PRIORITE_LABELS[dec.priorite] || dec.priorite}
                        </span>
                      </div>
                      <p style={{ fontSize:12, color:'#334155', margin:0, lineHeight:1.6 }}>{dec.description}</p>
                      {dec.delai_semaines && <div style={{ fontSize:10, color:'#64748b', marginTop:4 }}>Delai : {dec.delai_semaines} semaine(s)</div>}
                    </div>
                    <div style={{ flexShrink:0 }}>
                      {dec.realise ? (
                        <span style={{ fontSize:11, color:'#16a34a', fontWeight:600 }}>Realise{dec.date_realisation ? ` le ${dec.date_realisation}` : ''}</span>
                      ) : (
                        <button onClick={() => onMarkRealise(dec.id)}
                          style={{ padding:'5px 12px', background:'rgba(0,229,160,0.1)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:6, color:'#16a34a', fontSize:11, cursor:'pointer', fontWeight:600 }}>
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

      {!detail.resume_clinique && !detail.decisions?.length && (
        <div style={{ textAlign:'center', padding:20, color:'#64748b', fontSize:12 }}>Aucune information complementaire disponible</div>
      )}
    </div>
  );
}

// SuiviDecisions tab
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

  const filtered = filter === 'all' ? allDecisions
    : filter === 'pending' ? allDecisions.filter(d => !d.realise)
    : allDecisions.filter(d => d.realise);

  const counts = {
    all:     allDecisions.length,
    pending: allDecisions.filter(d => !d.realise).length,
    done:    allDecisions.filter(d =>  d.realise).length,
  };

  if (loading) return (
    <div style={{ padding:40, textAlign:'center', color:'#64748b' }}>
      <div style={{ width:28, height:28, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#d97706', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 10px' }} />
      Chargement...
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        {[
          { k:'all',     l:`Toutes (${counts.all})`,         c:'#9ca3af' },
          { k:'pending', l:`En attente (${counts.pending})`, c:'#d97706' },
          { k:'done',    l:`Realisees (${counts.done})`,     c:'#16a34a' },
        ].map(f => (
          <button key={f.k} onClick={() => setFilter(f.k)}
            style={{ padding:'7px 14px', background: filter===f.k ? `${f.c}15` : '#ffffff', border:`1px solid ${filter===f.k ? f.c+'40' : 'rgba(37,99,235,0.08)'}`, borderRadius:'12px', color: filter===f.k ? f.c : '#64748b', fontSize:12, fontWeight: filter===f.k ? 600 : 400, cursor:'pointer' }}>
            {f.l}
          </button>
        ))}
      </div>

      {!filtered.length ? (
        <EmptyState text="Aucune decision dans cette categorie" />
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(dec => {
            const col = DECISION_COLORS[dec.type_decision] || '#9ca3af';
            return (
              <div key={dec.id} style={{ background:'#ffffff', border:`1px solid ${col}20`, borderRadius:'12px', padding:'12px 16px', borderLeft:`3px solid ${col}`, display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12, flexWrap:'wrap' }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{ fontSize:12.5, fontWeight:700, color:col }}>{dec.type_label || DECISION_LABELS[dec.type_decision] || dec.type_decision}</span>
                    {dec.protocole && <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, background:`${col}12`, color:col }}>{dec.protocole}</span>}
                    <span style={{ fontSize:10, color:'#64748b' }}>- {dec.patientNom} ({dec.patientNumero})</span>
                    <span style={{ fontSize:10, padding:'1px 7px', borderRadius:8, background:`${PRIORITE_COLORS[dec.priorite]||'#9ca3af'}12`, color:PRIORITE_COLORS[dec.priorite]||'#9ca3af' }}>
                      {PRIORITE_LABELS[dec.priorite] || dec.priorite}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:'#334155', margin:0, lineHeight:1.6 }}>{dec.description}</p>
                </div>
                <div style={{ flexShrink:0 }}>
                  {dec.realise ? (
                    <span style={{ fontSize:11, color:'#16a34a', fontWeight:600 }}>Realise</span>
                  ) : (
                    <button onClick={async () => { await onMarkRealise(dec.id); reload(); }}
                      style={{ padding:'5px 12px', background:'rgba(0,229,160,0.1)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:6, color:'#16a34a', fontSize:11, cursor:'pointer', fontWeight:600, whiteSpace:'nowrap' }}>
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

// ChatPanel
function ChatPanel({ dossier, onClose }) {
  if (!chatStore[dossier.id]) chatStore[dossier.id] = [];
  const [messages, setMessages] = useState([...chatStore[dossier.id]]);
  const [input, setInput]       = useState('');
  const [author, setAuthor]     = useState('');
  const [role, setRole]         = useState('onco');
  const endRef = useRef(null);

  const ROLES = { onco:'Oncologue', chir:'Chirurgien', radio:'Radiologue', radiot:'Radiotherapeute', anapath:'Anapath.', ref:'Med. referent', autre:'Autre' };
  const ROLE_COLORS = { onco:'#2563eb', chir:'#dc2626', radio:'#d97706', radiot:'#ea580c', anapath:'#9333ea', ref:'#16a34a', autre:'#9ca3af' };

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const sendMessage = () => {
    const txt = input.trim();
    if (!txt) return;
    const authorName = author.trim() || 'Medecin';
    const msg = { id: Date.now(), author: authorName, role, text: txt, ts: new Date().toLocaleTimeString('fr-DZ', { hour:'2-digit', minute:'2-digit' }), type:'user' };
    chatStore[dossier.id] = [...chatStore[dossier.id], msg];
    setMessages([...chatStore[dossier.id]]);
    setInput('');
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  return (
    <SidePanel onClose={onClose} title={`Discussion - ${dossier.patient_nom}`} subtitle={dossier.patient_numero} color="#2563eb">
      <div style={{ padding:'10px 14px', background:'#f1f5f9', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', gap:8 }}>
        <input value={author} onChange={e => setAuthor(e.target.value)} placeholder="Votre nom..."
          style={{ flex:1, padding:'6px 10px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:6, color:'#0f172a', fontSize:12, outline:'none' }} />
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding:'6px 10px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:6, color:'#334155', fontSize:12, outline:'none', cursor:'pointer' }}>
          {Object.entries(ROLES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:10 }}>
        {!messages.length ? (
          <div style={{ textAlign:'center', padding:40, color:'#64748b' }}>
            <div style={{ fontSize:13, marginBottom:4 }}>Aucun message pour ce dossier.</div>
            <div style={{ fontSize:11 }}>Demarrez la discussion collegiale.</div>
          </div>
        ) : messages.map(msg => {
          const rc = ROLE_COLORS[msg.role] || '#9ca3af';
          return (
            <div key={msg.id} style={{ display:'flex', flexDirection:'column', gap:3 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:`${rc}20`, border:`1px solid ${rc}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:rc, flexShrink:0 }}>
                  {(msg.author||'?').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize:11.5, fontWeight:700, color:'#0f172a' }}>{msg.author}</span>
                <span style={{ fontSize:10, padding:'1px 6px', borderRadius:8, background:`${rc}15`, color:rc, border:`1px solid ${rc}25` }}>{ROLES[msg.role]||msg.role}</span>
                <span style={{ fontSize:10, color:'#64748b', marginLeft:'auto' }}>{msg.ts}</span>
              </div>
              <div style={{ marginLeft:30, padding:'8px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'0 10px 10px 10px', fontSize:12.5, color:'#334155', lineHeight:1.7, whiteSpace:'pre-wrap' }}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div style={{ padding:'8px 14px', borderTop:'1px solid rgba(37,99,235,0.12)', display:'flex', gap:6, flexWrap:'wrap' }}>
        {['Accord avec la proposition', 'Demande bilan complementaire', 'Second avis recommande', 'Discute, decision reportee'].map(s => (
          <button key={s} onClick={() => setInput(s)}
            style={{ padding:'3px 8px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:12, color:'#64748b', fontSize:10, cursor:'pointer' }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(37,99,235,0.12)', display:'flex', gap:8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={2}
          placeholder="Saisissez votre commentaire... (Entree pour envoyer)"
          style={{ flex:1, padding:'8px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#0f172a', fontSize:12.5, outline:'none', resize:'none', fontFamily:'var(--font-body)', lineHeight:1.5 }} />
        <button onClick={sendMessage}
          style={{ padding:'8px 14px', background:'linear-gradient(135deg,#2563eb,#2563eb)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:'pointer', alignSelf:'flex-end', flexShrink:0 }}>
          Envoyer
        </button>
      </div>
    </SidePanel>
  );
}

// AIAssistPanel
function AIAssistPanel({ dossier, onClose }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:`Bonjour. Je suis votre assistant oncologique IA.\n\nJe vais vous aider a analyser le dossier de ${dossier.patient_nom} (${dossier.patient_numero}).\n\nQue souhaitez-vous explorer ? Vous pouvez me poser des questions sur les protocoles, les guidelines, les interactions medicamenteuses, ou me demander un resume de la situation clinique.` }
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const SYSTEM_PROMPT = `Tu es un assistant medical specialise en oncologie, integre dans un systeme de RCP (Reunion de Concertation Pluridisciplinaire) hospitalier algerien.
Tu aides les medecins a analyser des dossiers oncologiques, a consulter les guidelines (NCCN, ESMO, INCa), et a preparer les decisions therapeutiques.

Contexte du dossier en discussion :
- Patient : ${dossier.patient_nom} (${dossier.patient_numero})
- Type de presentation : ${dossier.type_label || dossier.type_presentation}
- Statut : ${dossier.statut_label || dossier.statut}
- Question posee a la RCP : ${dossier.question_posee || 'Non precisee'}

Reponds en francais, de facon structuree et professionnelle. Cite les guidelines pertinentes quand possible. Rappelle toujours que les decisions finales appartiennent aux medecins de la RCP.`;

  const sendMessage = async () => {
    const txt = input.trim();
    if (!txt || loading) return;

    const userMsg = { role:'user', content: txt };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const reply = data.content?.map(b => b.text || '').join('') || 'Pas de reponse.';
      setMessages(prev => [...prev, { role:'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role:'assistant', content: 'Erreur de connexion a l assistant IA. Veuillez reessayer.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };

  const QUICK = [
    'Quelles sont les guidelines ESMO pour ce type de cancer ?',
    'Quels protocoles de chimiotherapie sont recommandes ?',
    'Y a-t-il des essais cliniques pertinents ?',
    'Quels examens complementaires sont indiques ?',
    'Resume les options therapeutiques disponibles',
  ];

  return (
    <SidePanel onClose={onClose} title={`Assistant IA - ${dossier.patient_nom}`} subtitle="Aide a la decision oncologique" color="#9333ea">
      <div style={{ padding:'8px 14px', borderBottom:'1px solid rgba(37,99,235,0.12)', background:'rgba(192,132,252,0.05)' }}>
        <div style={{ fontSize:10, color:'#9333ea', fontWeight:600, marginBottom:5 }}>Questions rapides</div>
        <div style={{ display:'flex', gap:5, flexWrap:'wrap' }}>
          {QUICK.map(q => (
            <button key={q} onClick={() => setInput(q)}
              style={{ padding:'3px 8px', background:'rgba(192,132,252,0.1)', border:'1px solid rgba(192,132,252,0.2)', borderRadius:12, color:'#9333ea', fontSize:10, cursor:'pointer', lineHeight:1.4 }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'14px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', flexDirection:'column', gap:4, alignItems: msg.role==='user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ fontSize:10, color:'#64748b', padding:'0 4px' }}>
              {msg.role === 'user' ? 'Vous' : 'Assistant IA'}
            </div>
            <div style={{ maxWidth:'88%', padding:'10px 14px', background: msg.role==='user' ? 'rgba(0,168,255,0.12)' : 'rgba(192,132,252,0.08)', border:`1px solid ${msg.role==='user' ? 'rgba(0,168,255,0.25)' : 'rgba(192,132,252,0.2)'}`, borderRadius: msg.role==='user' ? '12px 12px 0 12px' : '12px 12px 12px 0', fontSize:12.5, color:'#334155', lineHeight:1.75, whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', alignItems:'center', gap:8, color:'#64748b', fontSize:12 }}>
            <div style={{ display:'flex', gap:3 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'#9333ea', animation:'pulse 1.2s ease-in-out infinite', animationDelay:`${i*0.2}s`, opacity:0.6 }} />)}
            </div>
            Analyse en cours...
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding:'10px 14px', borderTop:'1px solid rgba(37,99,235,0.12)', display:'flex', gap:8 }}>
        <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey} rows={2}
          placeholder="Posez votre question medicale... (Entree pour envoyer)"
          disabled={loading}
          style={{ flex:1, padding:'8px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#0f172a', fontSize:12.5, outline:'none', resize:'none', fontFamily:'var(--font-body)', lineHeight:1.5, opacity:loading?0.6:1 }} />
        <button onClick={sendMessage} disabled={loading}
          style={{ padding:'8px 14px', background:'linear-gradient(135deg,#9333ea,#9333ea)', border:'none', borderRadius:8, color:'#fff', fontSize:13, cursor:loading?'not-allowed':'pointer', alignSelf:'flex-end', flexShrink:0, opacity:loading?0.7:1 }}>
          Envoyer
        </button>
      </div>
      <div style={{ padding:'6px 14px', background:'rgba(192,132,252,0.03)', borderTop:'1px solid rgba(37,99,235,0.12)' }}>
        <p style={{ fontSize:9.5, color:'#64748b', margin:0, lineHeight:1.5 }}>L assistant IA est un outil d aide a la decision. Les decisions therapeutiques finales relevent exclusivement de la responsabilite des medecins.</p>
      </div>
    </SidePanel>
  );
}

// SidePanel
function SidePanel({ children, onClose, title, subtitle, color }) {
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:998 }} />
      <div style={{ position:'fixed', right:0, top:0, bottom:0, width:Math.min(480, window.innerWidth), background:'#ffffff', borderLeft:`1px solid ${color}30`, zIndex:999, display:'flex', flexDirection:'column', boxShadow:'-8px 0 32px rgba(0,0,0,0.4)' }}>
        <div style={{ padding:'14px 18px', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', justifyContent:'space-between', alignItems:'center', background:'#f1f5f9', flexShrink:0 }}>
          <div>
            <div style={{ fontSize:14, fontWeight:700, color:'#0f172a', fontFamily:'var(--font-display)' }}>{title}</div>
            {subtitle && <div style={{ fontSize:10, color:'#64748b', fontFamily:'var(--font-mono)', marginTop:2 }}>{subtitle}</div>}
          </div>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:'50%', background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', color:'#64748b', fontSize:14, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>x</button>
        </div>
        {children}
      </div>
    </>
  );
}

// Modal
function Modal({ children, onClose, maxWidth = 520 }) {
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:16 }}>
      <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'16px', padding:'24px 28px', width:'100%', maxWidth, boxShadow:'0 24px 64px rgba(0,0,0,0.5)', maxHeight:'90vh', overflowY:'auto' }}>
        {children}
      </div>
    </div>
  );
}

// Sub-components
function BtnAction({ label, color, onClick }) {
  return (
    <button onClick={onClick}
      style={{ padding:'8px 14px', background:`${color}15`, border:`1px solid ${color}30`, borderRadius:8, color, fontSize:12, fontWeight:600, cursor:'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background=`${color}25`}
      onMouseLeave={e => e.currentTarget.style.background=`${color}15`}>
      {label}
    </button>
  );
}

function ActionBtn({ label, color, onClick, count }) {
  return (
    <button onClick={onClick}
      style={{ position:'relative', padding:'5px 12px', background:`${color}10`, border:`1px solid ${color}25`, borderRadius:8, color, fontSize:11, fontWeight:600, cursor:'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background=`${color}20`}
      onMouseLeave={e => e.currentTarget.style.background=`${color}10`}>
      {label}
      {count != null && <span style={{ position:'absolute', top:-5, right:-5, width:14, height:14, borderRadius:'50%', background:color, color:'#000', fontSize:8, display:'flex', alignItems:'center', justifyContent:'center', fontWeight:800 }}>{count}</span>}
    </button>
  );
}

function DossierStatutBadge({ statut, label }) {
  const colors = { attente:'#9ca3af', discute:'#16a34a', reporte:'#d97706', annule:'#dc2626' };
  const c = colors[statut] || '#9ca3af';
  return <span style={{ padding:'2px 8px', borderRadius:6, fontSize:10, background:`${c}15`, color:c, border:`1px solid ${c}25`, flexShrink:0 }}>{label}</span>;
}

function Chip({ label, val }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:'#334155' }}>
      <span style={{ fontSize:10, color:'#64748b' }}>{label} :</span>{val}
    </span>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding:56, textAlign:'center' }}>
      <div style={{ fontSize:13, color:'#64748b' }}>{text}</div>
    </div>
  );
}

function Loader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
      <div style={{ width:36, height:36, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
    </div>
  );
}

const labelSt      = { display:'block', fontSize:11.5, fontWeight:500, color:'#334155', marginBottom:5 };
const modalInputSt = { width:'100%', padding:'9px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', color:'#0f172a', fontSize:13, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
const modalSelSt   = { ...modalInputSt, cursor:'pointer' };

// Modal pour ajouter un médecin à la présence
function AjouterMedecinModal({ isOpen, onClose, onAjouter, medecins, loading }) {
  const [selectedMedecin, setSelectedMedecin] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedMedecin) {
      onAjouter(selectedMedecin);
      setSelectedMedecin('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <Modal onClose={onClose} maxWidth={400}>
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#0f172a' }}>
          Ajouter un médecin à la présence
        </h3>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 20 }}>
          <label style={labelSt}>Sélectionner un médecin</label>
          <select
            value={selectedMedecin}
            onChange={(e) => setSelectedMedecin(e.target.value)}
            style={modalSelSt}
            required
          >
            <option value="">Choisir un médecin...</option>
            {loading ? (
              <option disabled>Chargement...</option>
            ) : (
              medecins.map(medecin => (
                <option key={medecin.id} value={medecin.id}>
                  {medecin.full_name || `${medecin.first_name || ''} ${medecin.last_name || ''}`.trim() || medecin.email} ({medecin.role})
                </option>
              ))
            )}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              border: '1px solid rgba(37,99,235,0.12)',
              borderRadius: '12px',
              color: '#334155',
              fontSize: 13,
              cursor: 'pointer'
            }}
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={!selectedMedecin || loading}
            style={{
              padding: '8px 16px',
              background: selectedMedecin && !loading ? '#2563eb' : 'var(--bg-disabled)',
              border: '1px solid transparent',
              borderRadius: '12px',
              color: '#fff',
              fontSize: 13,
              cursor: selectedMedecin && !loading ? 'pointer' : 'not-allowed'
            }}
          >
            Ajouter
          </button>
        </div>
      </form>
    </Modal>
  );
}