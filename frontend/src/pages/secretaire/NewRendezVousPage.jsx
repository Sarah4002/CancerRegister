import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation as useRouterLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { secretaryService } from '../../services/secretaryService';
import { patientService } from '../../services/patientService';
import { adminService } from '../../services/adminService';
import { medecinService } from '../../services/accountsService';
import { AppLayout } from '../../components/layout/Sidebar';
import { createPatientSidebarContext } from '../../utils/patientSidebar';
import usePermissions from '../../hooks/usePermissions';

// Rôles autorisés à apparaître dans la liste "Médecin / Praticien"
// (mêmes valeurs que ROLE_CFG dans AdminUsersPage.jsx).
const ROLE_MEDECIN_LABELS = {
  doctor_chef: 'Médecin Chef',
  doctor:      'Médecin Oncologue',
};

// ── Horaires de travail autorisés pour la prise de rendez-vous ──
// Ajustez ces bornes si les horaires réels de la structure diffèrent.
const WORK_START = '08:00';
const WORK_END   = '17:00';

function todayStr() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}
function nowHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function NewRendezVousPage() {
  const navigate = useNavigate();
  const { can, role } = usePermissions();
  const location = useRouterLocation();
  const [searchParams] = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(location.state?.patientContext || null);
  const [medecins, setMedecins] = useState([]);
  const [medecinsLoading, setMedecinsLoading] = useState(true);
  const [availability, setAvailability] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const initialPatient = searchParams.get('patient') || location.state?.patientContext?.id || '';
  const initialDate = searchParams.get('date') || todayStr();

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    mode: 'onSubmit',
    defaultValues: {
      patient: initialPatient,
      medecin: '',
      date: initialDate,
      heure: '09:00',
      type: 'consultation',
      statut: 'confirme',
      duree_minutes: 30,
      rappel_sms: true,
      rappel_email: false,
      premiere_visite: false,
      recurrent: false,
      recurrence_count: 3,
      recurrence_interval: 1,
    }
  });

  const patientIdWatch = watch('patient');
  const typeWatch = watch('type');
  const premiereVisite = watch('premiere_visite');
  const dateWatch = watch('date');
  const doctorWatch = watch('medecin');
  const roomWatch = watch('salle');

  useEffect(() => {
    patientService.list({ page_size: 200 }).then(({ data }) => {
      setPatients(data.results || data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!doctorWatch || !dateWatch) { setAvailability(null); return; }
    let active = true;
    setAvailability(null);
    setAvailabilityLoading(true);
    medecinService.availability(doctorWatch, dateWatch, roomWatch)
      .then(({ data }) => { if (active) setAvailability(data); })
      .catch(() => { if (active) setAvailability(null); })
      .finally(() => { if (active) setAvailabilityLoading(false); });
    return () => { active = false; };
  }, [doctorWatch, dateWatch, roomWatch]);

  // Médecins & médecins chef disponibles pour la sélection du praticien.
  useEffect(() => {
    setMedecinsLoading(true);
    // Utilise l'endpoint dédié /auth/medecins/ qui renvoie { medecins: [...] }
    // Ne pas filtrer côté requête pour récupérer doctor + doctor_chef
    medecinService.list({ page_size: 200 })
      .then(({ data }) => {
        const list = data.medecins || data.results || data || [];
        // Filtre pour ne garder que les rôles doctor/doctor_chef et tri alphabétique
        const filtered = list
          .filter(m => ['doctor', 'doctor_chef'].includes(m.role))
          .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username));
        setMedecins(filtered);
      })
      .catch(() => {
        toast.error('Impossible de charger la liste des médecins.');
      })
      .finally(() => setMedecinsLoading(false));
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
    if (data.medecin && availability) {
      const hours = availability.hours || {};
      if (availability.on_leave) { toast.error('Ce médecin est en congé à cette date.'); return; }
      if (!hours.active) { toast.error('Ce médecin ne consulte pas le jour sélectionné.'); return; }
      const [hour, minute] = data.heure.split(':').map(Number);
      const start = hour * 60 + minute;
      const duration = Number(data.duree_minutes) || 30;
      const toMinutes = (value) => { const [h, m] = (value || '08:00').split(':').map(Number); return h * 60 + m; };
      if (start < toMinutes(hours.start) || start + duration > toMinutes(hours.end)) { toast.error(`Choisissez un horaire entre ${hours.start} et ${hours.end}.`); return; }
      const conflict = (availability.booked || []).some((item) => {
        const [h, m] = item.heure.split(':').map(Number);
        const bookedStart = h * 60 + m;
        return start < bookedStart + Number(item.duree_minutes || 30) && bookedStart < start + duration;
      });
      if (conflict) { toast.error('Ce créneau est déjà pris pour ce médecin.'); return; }
      const roomConflict = (availability.room_booked || []).some((item) => {
        const [h, m] = item.heure.split(':').map(Number);
        const bookedStart = h * 60 + m;
        return start < bookedStart + Number(item.duree_minutes || 30) && bookedStart < start + duration;
      });
      if (roomConflict) { toast.error('Cette salle est déjà réservée à cette heure.'); return; }
    }
    setSubmitting(true);
    try {
      const payload = { ...data };
      Object.keys(payload).forEach(k => { if (payload[k] === '') delete payload[k]; });

      if (data.recurrent) {
        if (data.statut === 'annule') { toast.error('Une série ne peut pas être créée avec le statut annulé.'); return; }
        const { data: result } = await secretaryService.createRendezVousSeries(payload);
        toast.success(`${result.count} rendez-vous récurrents ajoutés au calendrier.`);
      } else {
        await secretaryService.createRendezVous(payload);
        toast.success('Rendez-vous ajouté au calendrier !');
      }
      navigate('/secretaire');
    } catch (err) {
      toast.error(err.response?.data ? Object.values(err.response.data).flat().join(' ') : 'Erreur');
    } finally { setSubmitting(false); }
  };

  return (
    <AppLayout
      title="Nouveau Rendez-vous"
      patientContext={createPatientSidebarContext(selectedPatient, 'rendezvous', navigate, { can, role })}
    >
      <div style={{ maxWidth:860, margin:'0 auto' }}>
        <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'16px', padding:'28px 32px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:24, paddingBottom:16, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
            <span style={{ fontSize:24 }}></span>
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
                  <select {...register('medecin')} style={selSt} disabled={medecinsLoading}>
                    <option value="">
                      {medecinsLoading ? 'Chargement des médecins...' : 'Sélectionner un médecin...'}
                    </option>
                    {medecins.map(m => (
                      <option key={m.id} value={m.id}>
                        Dr. {m.full_name || m.username} — {ROLE_MEDECIN_LABELS[m.role] || m.role}
                      </option>
                    ))}
                  </select>
                  {!medecinsLoading && medecins.length === 0 && (
                    <p style={{ marginTop:4, fontSize:11, color:'#94a3b8' }}>
                      Aucun médecin actif trouvé (rôle Médecin ou Médecin Chef).
                    </p>
                  )}
                  {doctorWatch && dateWatch && (
                    <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: availability?.on_leave || (availability && !availability.hours?.active) ? '#fff7ed' : '#f0f9ff', color: availability?.on_leave || (availability && !availability.hours?.active) ? '#9a3412' : '#075985', fontSize: 11.5 }}>
                      {availabilityLoading ? 'Chargement des disponibilités…' : !availability ? 'Disponibilités non chargées; la vérification sera faite lors de l’enregistrement.' : availability.on_leave ? 'Médecin en congé ce jour.' : !availability.hours?.active ? 'Aucune consultation prévue ce jour.' : <><div>Consultations {availability.hours.start}–{availability.hours.end}</div>{availability.booked?.length ? <div style={{ marginTop: 4 }}>Médecin : {availability.booked.map(item => `${item.heure} (${item.duree_minutes || 30} min)`).join(', ')}</div> : null}{availability.room_booked?.length ? <div style={{ marginTop: 4 }}>Salle : {availability.room_booked.map(item => `${item.heure}${item.medecin_nom ? ` avec ${item.medecin_nom}` : ''}`).join(', ')}</div> : null}{!availability.booked?.length && !availability.room_booked?.length ? <div style={{ marginTop: 4 }}>Aucun rendez-vous réservé.</div> : null}</>}
                    </div>
                  )}
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
                  <input
                    type="date"
                    min={todayStr()}
                    {...register('date', {
                      required: 'Champ requis',
                      validate: v => v >= todayStr() || 'La date ne peut pas être dans le passé',
                    })}
                    style={inputSt}
                  />
                </Field>
                <Field label="Heure *" error={errors.heure?.message}>
                  <input
                    type="time"
                    min={availability?.hours?.start || (doctorWatch ? undefined : WORK_START)}
                    max={availability?.hours?.end || (doctorWatch ? undefined : WORK_END)}
                    {...register('heure', {
                      required: 'Champ requis',
                      validate: v => {
                        if (!doctorWatch && (v < WORK_START || v > WORK_END)) {
                          return `L'heure doit être comprise entre ${WORK_START} et ${WORK_END}`;
                        }
                        if (dateWatch === todayStr() && v < nowHHMM()) {
                          return "L'heure ne peut pas être dans le passé";
                        }
                        return true;
                      },
                    })}
                    style={inputSt}
                  />
                  <p style={{ marginTop:4, fontSize:11, color:'#94a3b8' }}>
                    Horaires de travail : {WORK_START} – {WORK_END}
                  </p>
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

            <Section title="Rendez-vous récurrents">
              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#334155' }}>
                <input type="checkbox" {...register('recurrent')} /> Créer une série de suivis
              </label>
              {watch('recurrent') && <Row2>
                <Field label="Nombre de rendez-vous">
                  <select {...register('recurrence_count')} style={selSt}>{[2,3,4,5,6,9,12,18,24].map(count => <option key={count} value={count}>{count} rendez-vous</option>)}</select>
                </Field>
                <Field label="Répéter tous les">
                  <select {...register('recurrence_interval')} style={selSt}><option value="1">1 mois</option><option value="2">2 mois</option><option value="3">3 mois</option><option value="6">6 mois</option></select>
                </Field>
                <p style={{ gridColumn:'1 / -1', fontSize:11, color:'#64748b', marginTop:0 }}>La série est créée en une seule opération. Si une date tombe sur un congé ou un créneau déjà pris, toute la série est refusée afin d’éviter une série incomplète.</p>
              </Row2>}
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
