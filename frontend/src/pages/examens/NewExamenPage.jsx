import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import usePermissions from '../../hooks/usePermissions';
import { patientService } from '../../services/patientService';
import { examenService } from '../../services/examenService';
import { createPatientSidebarContext } from '../../utils/patientSidebar';
import { CATEGORIES_EXAMENS, EXAMENS_PREDEFINIS } from '../../utils/examensDataset';

const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const serviceForRole = { radiologist: 'imagerie', anapath: 'anapath', laboratory: 'biologie' };
const serviceLabel = { radiologist: 'Radiologie', anapath: 'Anatomopathologie', laboratory: 'Analyses biologiques' };
const fieldStyle = { width:'100%', boxSizing:'border-box', padding:'10px 12px', border:'1px solid rgba(37,99,235,0.08)', borderRadius:12, background:'#f1f5f9', color:'#0f172a', fontSize:13, outline:'none', fontFamily:'var(--font-body)' };

export default function NewExamenPage() {
  const { role, can } = usePermissions();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const patientParam = params.get('patient') || '';
  const examenParam = params.get('examen') || '';
  const isSpecialist = Boolean(serviceForRole[role]);
  const [patients, setPatients] = useState([]);
  const [examens, setExamens] = useState([]);
  const [patient, setPatient] = useState(patientParam);
  const [categorie, setCategorie] = useState(serviceForRole[role] || 'imagerie');
  const [nom, setNom] = useState('');
  const [date, setDate] = useState(today());
  const [observations, setObservations] = useState('');
  const [resultat, setResultat] = useState('');
  const [dateRealisation, setDateRealisation] = useState(today());
  const [fichier, setFichier] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedPatient = useMemo(() => patients.find(p => String(p.id) === String(patient)), [patients, patient]);
  const refresh = async () => {
    try {
      const { data } = await examenService.list(patientParam ? { patient: patientParam } : {});
      setExamens(data.results || data || []);
    } catch { toast.error('Impossible de charger les examens.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    setPatient(patientParam);
    if (!isSpecialist) {
      Promise.all([
        patientService.list({ page_size: 300 }).catch(() => ({ data: [] })),
        patientParam ? patientService.get(patientParam).catch(() => null) : Promise.resolve(null),
      ]).then(([{ data }, selectedResponse]) => {
        const list = data.results || data || [];
        const selected = selectedResponse?.data;
        setPatients(selected ? [selected, ...list.filter(item => String(item.id) !== String(selected.id))] : list);
      });
    } else if (patientParam) {
      patientService.get(patientParam).then(({ data }) => setPatients(current => [data, ...current.filter(p => String(p.id) !== String(data.id))])).catch(() => {});
    }
    refresh();
  }, [role, patientParam]);
  useEffect(() => {
    if (!examenParam || !isSpecialist) { setSelectedExam(null); return; }
    examenService.get(examenParam).then(({ data }) => {
      setSelectedExam(data); setResultat(data.resultat || '');
      setDateRealisation(data.date_realisation || today());
    }).catch(() => toast.error('Demande introuvable.'));
  }, [examenParam, isSpecialist]);

  const submitRequest = async (event) => {
    event.preventDefault();
    if (!patient || !nom.trim()) { toast.error('Sélectionnez un patient et un examen.'); return; }
    setSaving(true);
    try {
      const form = new FormData();
      form.append('patient', patient); form.append('categorie', categorie);
      form.append('nom_examen', nom); form.append('date_prescription', date);
      form.append('observations', observations);
      if (fichier) form.append('fichier_dicom', fichier);
      const { data } = await examenService.create(form);
      toast.success('Demande transmise au service concerné.');
      navigate(`/patients/${data.patient}`, { state:{ returnSection:'examens' } });
    } catch (error) {
      toast.error(error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Échec de la demande.');
    } finally { setSaving(false); }
  };

  const submitResult = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const form = new FormData();
      form.append('resultat', resultat); form.append('date_realisation', dateRealisation);
      form.append('statut', 'resultat_disponible');
      if (fichier) form.append('fichier_resultat', fichier);
      await examenService.update(selectedExam.id, form);
      toast.success('Résultat envoyé au médecin prescripteur.');
      setSelectedExam(null); setFichier(null); await refresh();
      navigate('/examens');
    } catch (error) {
      toast.error(error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Échec de l’envoi du résultat.');
    } finally { setSaving(false); }
  };

  const title = isSpecialist ? serviceLabel[role] : 'Nouvel examen';
  return <AppLayout title={title} patientContext={createPatientSidebarContext(selectedPatient, 'examens', navigate, { can, role })}>
    <div style={{ maxWidth:isSpecialist ? 980 : 800, margin:'0 auto', display:'grid', gap:18 }}>
      {isSpecialist ? <>
        <section style={cardStyle}>
          <h2 style={headingStyle}>Demandes à traiter</h2>
          {patientParam && <button type="button" onClick={() => navigate('/examens')} style={linkButton}>Voir toutes les demandes</button>}
          {loading ? <p style={muted}>Chargement…</p> : examens.length === 0 ? <p style={muted}>Aucune demande en attente.</p> : (
            <div style={{ display:'grid', gap:9 }}>
              {examens.map(ex => <button key={ex.id} type="button" onClick={() => navigate(`/examens?examen=${ex.id}`)} style={{ ...requestStyle, borderColor:String(selectedExam?.id) === String(ex.id) ? '#2563eb' : '#e2e8f0' }}>
                <strong>{ex.nom_examen}</strong><span>{ex.patient_nom || `Dossier patient #${ex.patient}`} · {ex.patient_numero || ''} · Prescrit le {ex.date_prescription}</span><small>{ex.statut_label || ex.statut}</small>
              </button>)}
            </div>
          )}
        </section>
        {selectedExam && <form onSubmit={submitResult} style={cardStyle}>
          <h2 style={headingStyle}>Réaliser l’examen et envoyer le résultat</h2>
          <p style={muted}><b>{selectedExam.nom_examen}</b> · {selectedExam.patient_numero} — {selectedExam.patient_nom} <button type="button" onClick={() => navigate(`/patients/${selectedExam.patient}`)} style={linkButton}>Ouvrir le dossier</button></p>
          {selectedExam.fichier_dicom_url && <a href={selectedExam.fichier_dicom_url} target="_blank" rel="noreferrer">Ouvrir le document joint à la demande</a>}
          <label style={labelStyle}>Compte rendu / résultats<textarea required value={resultat} onChange={e => setResultat(e.target.value)} rows={5} style={{ ...fieldStyle, marginTop:7, resize:'vertical' }} /></label>
          <label style={labelStyle}>Date de réalisation<input required type="date" value={dateRealisation} onChange={e => setDateRealisation(e.target.value)} style={{ ...fieldStyle, marginTop:7 }} /></label>
          <FileInput fichier={fichier} onChange={setFichier} label="Importer le résultat ou les images" />
          {selectedExam.fichier_resultat && <a href={selectedExam.fichier_resultat} target="_blank" rel="noreferrer">Consulter le fichier de résultat actuel</a>}
          <button disabled={saving} style={primaryButton}>{saving ? 'Envoi…' : 'Envoyer au médecin'}</button>
        </form>}
      </> : <>
      {patientParam && examens.length > 0 && <section style={cardStyle}>
        <h2 style={headingStyle}>Examens de ce dossier</h2>
        <div style={{ display:'grid', gap:10 }}>{examens.map(ex => <div key={ex.id} style={{ padding:'12px 14px', border:'1px solid #e2e8f0', borderRadius:10 }}>
          <div style={{ display:'flex', justifyContent:'space-between', gap:12 }}><strong>{ex.nom_examen}</strong><span style={muted}>{ex.statut_label || ex.statut}</span></div>
          {ex.resultat && <p style={{ margin:'8px 0', color:'#334155', fontSize:13 }}>{ex.resultat}</p>}
          {ex.fichier_resultat && <a href={ex.fichier_resultat} target="_blank" rel="noreferrer">Télécharger le résultat joint</a>}
        </div>)}</div>
      </section>}
      <form onSubmit={submitRequest} style={{ ...cardStyle, padding:'28px 32px' }}>
        <div style={{ paddingBottom:17, marginBottom:19, borderBottom:'1px solid #e5edf7' }}><div style={{ color:'#2563eb', fontSize:11, fontWeight:700, letterSpacing:1, textTransform:'uppercase' }}>Prescription médicale</div><h2 style={{ ...headingStyle, margin:'7px 0 0' }}>Demander un examen</h2></div>
        <div style={sectionTitle}>Patient et examen</div>
        <div style={gridStyle}>
          <label style={labelStyle}>Patient *<select required value={patient} onChange={e => setPatient(e.target.value)} style={{ ...fieldStyle, marginTop:7 }}><option value="">Sélectionner un patient…</option>{patients.map(p => <option key={p.id} value={p.id}>{p.registration_number} — {p.full_name || `${p.nom} ${p.prenom}`}</option>)}</select></label>
          <label style={labelStyle}>Date de prescription *<input required type="date" value={date} onChange={e => setDate(e.target.value)} style={{ ...fieldStyle, marginTop:7 }} /></label>
          <label style={labelStyle}>Service demandé *<select value={categorie} onChange={e => { setCategorie(e.target.value); setNom(''); }} style={{ ...fieldStyle, marginTop:7 }}>{CATEGORIES_EXAMENS.filter(c => ['biologie','imagerie','anapath'].includes(c.value)).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></label>
          <label style={labelStyle}>Examen *<select required value={nom} onChange={e => setNom(e.target.value)} style={{ ...fieldStyle, marginTop:7 }}><option value="">Sélectionner un examen…</option>{(EXAMENS_PREDEFINIS[categorie] || []).map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        </div>
        <label style={{ ...labelStyle, display:'block', marginTop:18 }}>Consignes<textarea value={observations} onChange={e => setObservations(e.target.value)} rows={4} placeholder="Motif, région à examiner, renseignements utiles…" style={{ ...fieldStyle, marginTop:7, resize:'vertical' }} /></label>
        {selectedPatient && <div style={patientChip}>
          <strong>{selectedPatient.full_name || `${selectedPatient.prenom || ''} ${selectedPatient.nom || ''}`}</strong>
          {selectedPatient.sexe && <span style={{ color:'#2563eb' }}>{selectedPatient.sexe === 'F' ? 'Femme' : selectedPatient.sexe === 'M' ? 'Homme' : 'Inconnu'}</span>}
          {(selectedPatient.age || selectedPatient.age_diagnostic) && <span style={muted}>{selectedPatient.age || selectedPatient.age_diagnostic} ans</span>}
          <span style={muted}>{selectedPatient.registration_number}</span>
        </div>}
        <FileInput fichier={fichier} onChange={setFichier} label="Joindre une ordonnance ou un document" />
        <div style={{ marginTop:23, display:'flex', justifyContent:'space-between', alignItems:'center', gap:12 }}>
          <span style={muted}>{selectedPatient ? `Dossier : ${selectedPatient.registration_number} · ${selectedPatient.full_name || selectedPatient.nom}` : 'La demande sera envoyée au service correspondant.'}</span>
          <button disabled={saving} style={primaryButton}>{saving ? 'Envoi…' : 'Envoyer la demande'}</button>
        </div>
      </form></>}
    </div>
  </AppLayout>;
}

function FileInput({ fichier, onChange, label }) {
  return <label style={{ ...labelStyle, display:'block', marginTop:17 }}>{label}<input type="file" accept=".pdf,.jpg,.jpeg,.png,.dcm,.doc,.docx" onChange={e => onChange(e.target.files?.[0] || null)} style={{ ...fieldStyle, marginTop:7, background:'#fff' }} />{fichier && <small style={{ display:'block', color:'#64748b', marginTop:5 }}>{fichier.name}</small>}</label>;
}
const cardStyle = { background:'#fff', border:'1px solid rgba(37,99,235,.1)', borderRadius:16, padding:'25px 28px', boxShadow:'0 8px 24px rgba(15,23,42,.035)' };
const headingStyle = { fontSize:18, color:'#0f172a', fontWeight:700 };
const muted = { color:'#64748b', fontSize:12.5 };
const labelStyle = { color:'#334155', display:'block', fontSize:12, fontWeight:600 };
const sectionTitle = { fontSize:12, fontWeight:700, color:'#64748b', letterSpacing:.8, textTransform:'uppercase', marginBottom:14, paddingBottom:8, borderBottom:'1px solid rgba(37,99,235,0.12)' };
const gridStyle = { display:'grid', gridTemplateColumns:'repeat(2,minmax(0,1fr))', gap:'14px 20px' };
const primaryButton = { padding:'11px 20px', background:'#2563eb', color:'#fff', border:0, borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer' };
const linkButton = { padding:0, marginBottom:12, border:0, background:'none', color:'#2563eb', cursor:'pointer' };
const requestStyle = { display:'grid', gridTemplateColumns:'1fr auto', gap:'5px 12px', textAlign:'left', padding:'13px 15px', border:'1px solid #e2e8f0', borderRadius:10, background:'#fff', cursor:'pointer', color:'#0f172a' };
const patientChip = { display:'flex', alignItems:'center', gap:10, padding:'8px 12px', margin:'0 0 15px', background:'rgba(37,99,235,0.06)', border:'1px solid rgba(37,99,235,0.15)', borderRadius:9, flexWrap:'wrap', fontSize:12 };
