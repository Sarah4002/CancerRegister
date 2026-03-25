import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { rcpService } from '../../services/rcpService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';

// ── Nouvelle Réunion RCP ──────────────────────────────────────────
export default function NewRCPPage() {
  const navigate    = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { type_rcp:'generale', statut:'planifiee', heure_debut:'09:00', nombre_dossiers_prevus:0 }
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      const { data: result } = await rcpService.reunions.create(payload);
      toast.success('Réunion RCP créée !');
      navigate(`/rcp/${result.id}`);
    } catch (err) {
      toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur');
    } finally { setSubmitting(false); }
  };

  return (
    <AppLayout title="Nouvelle Réunion RCP">
      <div style={{ maxWidth:700, margin:'0 auto' }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid rgba(0,168,255,0.2)', borderRadius:'var(--radius-lg)', padding:'28px 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:24 }}>🏥</span>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>Planifier une réunion RCP</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Section title="Informations générales">
              <Field label="Titre de la réunion *" error={errors.titre?.message}>
                <input {...register('titre', { required:'Champ requis' })} placeholder="Ex: RCP Sein – Janvier 2026" style={inputSt} />
              </Field>
              <Row2>
                <Field label="Type de RCP">
                  <select {...register('type_rcp')} style={selSt}>
                    <option value="sein">🎀 RCP Sein</option>
                    <option value="digestif">🫁 RCP Digestif</option>
                    <option value="poumon">💨 RCP Thoracique / Poumon</option>
                    <option value="orl">👂 RCP ORL / Tête & Cou</option>
                    <option value="gyneco">♀️ RCP Gynécologique</option>
                    <option value="uro">🫘 RCP Urologique</option>
                    <option value="hemato">🩸 RCP Hématologique</option>
                    <option value="neuro">🧠 RCP Neurologique</option>
                    <option value="dermato">🫀 RCP Dermatologique</option>
                    <option value="pediatrique">👶 RCP Pédiatrique</option>
                    <option value="palliative">🕊️ RCP Soins palliatifs</option>
                    <option value="generale">🏥 RCP Générale / Autre</option>
                  </select>
                </Field>
                <Field label="Statut initial">
                  <select {...register('statut')} style={selSt}>
                    <option value="planifiee">Planifiée</option>
                    <option value="en_cours">En cours</option>
                  </select>
                </Field>
              </Row2>
            </Section>

            <Section title="Date & Lieu">
              <Row3>
                <Field label="Date *" error={errors.date_reunion?.message}>
                  <input type="date" {...register('date_reunion', { required:'Champ requis' })} style={inputSt} />
                </Field>
                <Field label="Heure début *" error={errors.heure_debut?.message}>
                  <input type="time" {...register('heure_debut', { required:'Champ requis' })} style={inputSt} />
                </Field>
                <Field label="Heure fin">
                  <input type="time" {...register('heure_fin')} style={inputSt} />
                </Field>
              </Row3>
              <Row2>
                <Field label="Lieu / Établissement">
                  <input {...register('lieu')} placeholder="CHU Oran – Service Oncologie" style={inputSt} />
                </Field>
                <Field label="Salle">
                  <input {...register('salle')} placeholder="Salle de réunion B" style={inputSt} />
                </Field>
              </Row2>
            </Section>

            <Section title="Organisation">
              <Row2>
                <Field label="Nombre de dossiers prévus">
                  <input type="number" {...register('nombre_dossiers_prevus')} min={0} style={inputSt} />
                </Field>
                <Field label="Établissement organisateur">
                  <input {...register('etablissement')} placeholder="CHU Oran" style={inputSt} />
                </Field>
              </Row2>
              <Field label="Ordre du jour / Objectifs">
                <textarea {...register('objectif')} rows={3} placeholder="Présentation de 5 nouveaux dossiers sein, 2 récidives digestives..." style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }} />
              </Field>
            </Section>

            <div style={{ display:'flex', gap:10, paddingTop:20, borderTop:'1px solid var(--border)' }}>
              <button type="button" onClick={() => navigate('/rcp')} style={{ flex:'0 0 110px', padding:'12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer' }}>← Annuler</button>
              <button type="submit" disabled={submitting} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg,#00a8ff,#0080cc)', border:'none', borderRadius:'var(--radius-md)', color:'#fff', fontSize:13.5, fontWeight:600, cursor:submitting?'not-allowed':'pointer', fontFamily:'var(--font-display)', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:submitting?0.7:1 }}>
                {submitting ? <><Spin/>Enregistrement...</> : '🏥 Créer la réunion RCP'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Nouveau Dossier Patient ───────────────────────────────────────
export function NewDossierRCPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reunionId = searchParams.get('reunion');
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients]     = useState([]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { reunion: reunionId || '', type_presentation:'nouveau', statut:'attente', ordre_passage:1 }
  });

  useEffect(() => {
    patientService.list({ page_size:200 }).then(({ data }) => setPatients(data.results || data)).catch(() => {});
  }, []);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });
      await rcpService.dossiers.create(payload);
      toast.success('Dossier ajouté à la RCP !');
      navigate(reunionId ? `/rcp/${reunionId}` : '/rcp');
    } catch (err) {
      toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur');
    } finally { setSubmitting(false); }
  };

  return (
    <AppLayout title="Ajouter un dossier à la RCP">
      <div style={{ maxWidth:660, margin:'0 auto' }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid rgba(155,138,251,0.2)', borderRadius:'var(--radius-lg)', padding:'28px 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid var(--border)' }}>
            <span style={{ fontSize:24 }}>📋</span>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>Nouveau dossier RCP</h2>
          </div>
          <form onSubmit={handleSubmit(onSubmit)}>
            <Section title="Patient & Présentation">
              <Field label="Patient *" error={errors.patient?.message}>
                <select {...register('patient', { required:'Champ requis' })} style={selSt}>
                  <option value="">Sélectionner un patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.registration_number} – {p.full_name}</option>)}
                </select>
              </Field>
              <Row2>
                <Field label="Type de présentation">
                  <select {...register('type_presentation')} style={selSt}>
                    <option value="nouveau">Nouveau dossier</option>
                    <option value="recidive">Récidive / Rechute</option>
                    <option value="reval">Réévaluation</option>
                    <option value="post_trt">Post-traitement</option>
                    <option value="second">Second avis</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
                <Field label="Ordre de passage">
                  <input type="number" {...register('ordre_passage')} min={1} style={inputSt} />
                </Field>
              </Row2>
              <Field label="Question clinique posée à la RCP">
                <textarea {...register('question_posee')} rows={2} placeholder="Quelle stratégie thérapeutique pour cette patiente HER2+ stade III ?" style={{ ...inputSt, resize:'vertical' }} />
              </Field>
              <Field label="Résumé clinique">
                <textarea {...register('resume_clinique')} rows={4} placeholder="Patiente de 52 ans, cancer du sein droit HER2+, cT3N1M0, bilan d'extension négatif. Traitement chimio néo-adjuvant AC×4 terminé. Réponse partielle à l'imagerie..." style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }} />
              </Field>
            </Section>

            <div style={{ display:'flex', gap:10, paddingTop:16, borderTop:'1px solid var(--border)' }}>
              <button type="button" onClick={() => navigate(reunionId ? `/rcp/${reunionId}` : '/rcp')} style={{ flex:'0 0 110px', padding:'11px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-md)', color:'var(--text-secondary)', fontSize:13, cursor:'pointer' }}>← Annuler</button>
              <button type="submit" disabled={submitting} style={{ flex:1, padding:'11px', background:'linear-gradient(135deg,#9b8afb,#7c6fcd)', border:'none', borderRadius:'var(--radius-md)', color:'#fff', fontSize:13, fontWeight:600, cursor:submitting?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:submitting?0.7:1 }}>
                {submitting ? <><Spin/>Enregistrement...</> : '📋 Ajouter le dossier'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--border)' }}>{title}</div>
      {children}
    </div>
  );
}
function Row2({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>{children}</div>; }
function Row3({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 12px' }}>{children}</div>; }
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11.5, fontWeight:500, color:'var(--text-secondary)', marginBottom:5 }}>{label}</label>}
      {children}
      {error && <p style={{ marginTop:3, fontSize:11, color:'var(--danger)' }}>⚠ {error}</p>}
    </div>
  );
}
function Spin() { return <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />; }
const inputSt = { width:'100%', padding:'9px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', color:'var(--text-primary)', fontSize:13, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
const selSt   = { ...inputSt, cursor:'pointer' };
