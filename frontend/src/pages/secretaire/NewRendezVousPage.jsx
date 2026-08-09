import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { secretaryService } from '../../services/secretaryService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';

export default function NewRendezVousPage() {
  const navigate = useNavigate();
  const location = useRouterLocation();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const initialPatient = searchParams.get('patient') || location.state?.patientContext?.id || '';
  const initialDate = searchParams.get('date') || '';

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      patient: initialPatient,
      date: initialDate,
      heure: '09:00',
      type: 'consultation',
      statut: 'confirme',
      duree_minutes: 30,
      rappel_sms: true,
      rappel_email: false,
      premiere_visite: false,
    }
  });

  const patientIdWatch = watch('patient');
  const typeWatch = watch('type');
  const premiereVisite = watch('premiere_visite');

  useEffect(() => {
    patientService.list({ page_size: 200 }).then(({ data }) => {
      setPatients(data.results || data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (initialPatient && patients.length > 0) {
      const found = patients.find((p) => String(p.id) === String(initialPatient));
      if (found) {
        setValue('patient', String(found.id), { shouldValidate: true });
        setSelectedPatient(found);
      }
    }
  }, [initialPatient, patients, setValue]);

  useEffect(() => {
    if (!patientIdWatch) { setSelectedPatient(null); return; }
    const existing = patients.find((p) => String(p.id) === String(patientIdWatch)) || null;
    setSelectedPatient(existing);
  }, [patientIdWatch, patients]);

  const onSubmit = async (data) => {
    setSubmitting(true);
    try {
      const payload = { ...data };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      await secretaryService.createRendezVous(payload);
      toast.success('Rendez-vous ajouté au calendrier !');
      navigate('/secretaire');
    } catch (err) {
      toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur');
    } finally { setSubmitting(false); }
  };

  return (
    <AppLayout
      title="Nouveau Rendez-vous"
      patientContext={selectedPatient ? {
        patient: selectedPatient,
        backPath: `/patients/${selectedPatient.id}`,
        backLabel: 'Retour au patient',
      } : undefined}
    >
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'16px', padding:'28px 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
            <span style={{ fontSize:24 }}>📅</span>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#0f172a' }}>Rendez-vous</h2>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>

            {/* ── Patient & Contexte ── */}
            <Section title="Patient & Contexte">
              <Row2>
                <Field label="Patient *" error={errors.patient?.message}>
                  <select {...register('patient', { required: 'Champ requis' })} style={selSt}>
                    <option value="">Sélectionner un patient...</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.registration_number} – {p.full_name}</option>)}
                  </select>
                </Field>
                <Field label="">
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#334155', marginTop:22 }}>
                    <input type="checkbox" {...register('premiere_visite')} style={{ width:14, height:14, accentColor:'#2563eb' }} />
                    <span style={{ color: premiereVisite ? '#2563eb' : '#334155' }}>Première visite</span>
                  </label>
                </Field>
              </Row2>
              <Row2>
                <Field label="Médecin / Praticien">
                  <input {...register('medecin')} placeholder="Dr. Benali" style={inputSt} />
                </Field>
                <Field label="Établissement / Salle">
                  <input {...register('salle')} placeholder="CHU Oran – Salle de consultation 2" style={inputSt} />
                </Field>
              </Row2>
            </Section>

            {/* ── Date & Heure ── */}
            <Section title="Date & Heure">
              <Row3>
                <Field label="Date *" error={errors.date?.message}>
                  <input type="date" {...register('date', { required: 'Champ requis' })} style={inputSt} />
                </Field>
                <Field label="Heure *" error={errors.heure?.message}>
                  <input type="time" {...register('heure', { required: 'Champ requis' })} style={inputSt} />
                </Field>
                <Field label="Durée (minutes)">
                  <select {...register('duree_minutes')} style={selSt}>
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">1 heure</option>
                    <option value="90">1h30</option>
                  </select>
                </Field>
              </Row3>
              <Row2>
                <Field label="Type de rendez-vous">
                  <select {...register('type')} style={selSt}>
                    <option value="consultation">Consultation</option>
                    <option value="suivi">Consultation de suivi</option>
                    <option value="chimio">Séance de chimiothérapie</option>
                    <option value="radiotherapie">Séance de radiothérapie</option>
                    <option value="rcp">Réunion RCP</option>
                    <option value="bilan">Bilan / Examens</option>
                    <option value="chirurgie">Consultation pré-chirurgicale</option>
                    <option value="urgence">Urgence</option>
                    <option value="autre">Autre</option>
                  </select>
                </Field>
                <Field label="Statut">
                  <select {...register('statut')} style={selSt}>
                    <option value="confirme">Confirmé</option>
                    <option value="en_attente">En attente de confirmation</option>
                    <option value="annule">Annulé</option>
                    <option value="reporte">Reporté</option>
                    <option value="honore">Honoré</option>
                    <option value="absent">Patient absent</option>
                  </select>
                </Field>
              </Row2>
              {typeWatch === 'autre' && (
                <Field label="Précisez le type">
                  <input {...register('type_autre_detail')} placeholder="Détail du type de rendez-vous..." style={inputSt} />
                </Field>
              )}
            </Section>

            {/* ── Rappels ── */}
            <Section title="Rappels au patient">
              <Row2>
                <Field label="">
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#334155', marginTop:8 }}>
                    <input type="checkbox" {...register('rappel_sms')} style={{ width:14, height:14, accentColor:'#2563eb' }} />
                    Envoyer un rappel par SMS
                  </label>
                </Field>
                <Field label="">
                  <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer', fontSize:13, color:'#334155', marginTop:8 }}>
                    <input type="checkbox" {...register('rappel_email')} style={{ width:14, height:14, accentColor:'#2563eb' }} />
                    Envoyer un rappel par email
                  </label>
                </Field>
              </Row2>
              <div style={{
                fontSize:11, color:'#2563eb', background:'#eff6ff',
                border:'1px solid rgba(37,99,235,0.18)', borderRadius:10, padding:'8px 12px',
                display:'flex', alignItems:'center', gap:6,
              }}>
                Un rappel sera envoyé 72 heures avant le rendez-vous si activé.
              </div>
            </Section>

            {/* ── Notes ── */}
            <Section title="Notes complémentaires">
              <Field label="Motif du rendez-vous">
                <input {...register('motif')} placeholder="Ex: Contrôle post-chimiothérapie cycle 4..." style={inputSt} />
              </Field>
              <Field label="Notes internes (secrétariat)">
                <textarea {...register('notes')} rows={3} placeholder="Informations utiles pour l'organisation du rendez-vous..." style={{ ...inputSt, resize:'vertical', lineHeight:1.6 }} />
              </Field>
            </Section>

            <div style={{ display:'flex', gap:10, paddingTop:20, borderTop:'1px solid rgba(37,99,235,0.12)' }}>
              <button type="button" onClick={() => navigate('/secretaire')} style={{ flex:'0 0 110px', padding:'12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:'12px', color:'#334155', fontSize:13, cursor:'pointer' }}>← Annuler</button>
              <button type="submit" disabled={submitting} style={{ flex:1, padding:'12px', background:'linear-gradient(135deg, #2563eb, #1d4ed8)', border:'none', borderRadius:'12px', color:'#fff', fontSize:13.5, fontWeight:600, fontFamily:'var(--font-display)', cursor:submitting?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, opacity:submitting?0.7:1 }}>
                {submitting ? <><Spin/> Enregistrement...</> : 'Ajouter le rendez-vous'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}

// ── Helpers (identiques à NewConsultationPage.jsx) ───────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:24 }}>
      <div style={{ fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.8, marginBottom:12, paddingBottom:8, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>{title}</div>
      {children}
    </div>
  );
}
function Row2({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>{children}</div>; }
function Row3({ children }) { return <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'0 12px' }}>{children}</div>; }
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      {label && <label style={{ display:'block', fontSize:11.5, fontWeight:500, color:'#334155', marginBottom:5 }}>{label}</label>}
      {children}
      {error && <p style={{ marginTop:3, fontSize:11, color:'#dc2626' }}>{error}</p>}
    </div>
  );
}
function Spin() { return <div style={{ width:13, height:13, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />; }
const inputSt = { width:'100%', padding:'9px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', color:'#0f172a', fontSize:13, outline:'none', fontFamily:'var(--font-body)', boxSizing:'border-box' };
const selSt = { ...inputSt, cursor:'pointer' };
