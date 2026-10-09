import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AppLayout } from '../../components/layout/Sidebar';
import usePermissions from '../../hooks/usePermissions';
import { examenService } from '../../services/examenService';
import { createPatientSidebarContext } from '../../utils/patientSidebar';

const CATEGORY_LABELS = { biologie:'Analyses biologiques', imagerie:'Imagerie / Radiologie', anapath:'Anatomopathologie', endoscopie:'Endoscopie', cardiologie:'Cardiologie' };
const STATUS_COLORS = { prescrit:'#7c3aed', en_attente:'#d97706', realise:'#0891b2', resultat_disponible:'#16a34a', annule:'#dc2626' };
const formatDate = value => value ? new Date(`${value}T00:00:00`).toLocaleDateString('fr-DZ', { day:'numeric', month:'long', year:'numeric' }) : '—';

export default function ExamenDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can, role, user } = usePermissions();
  const [examen, setExamen] = useState(null);
  const [noteMedecin, setNoteMedecin] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    examenService.get(id)
      .then(({ data }) => { setExamen(data); setNoteMedecin(data.note_medecin || ''); })
      .catch(() => { toast.error('Examen introuvable ou accès non autorisé.'); navigate('/examens', { replace:true }); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const patient = examen ? {
    id: examen.patient,
    patient_id: examen.patient,
    registration_number: examen.patient_numero,
    full_name: examen.patient_nom,
  } : null;

  if (loading) return <AppLayout title="Résultat d’examen"><div style={centerStyle}>Chargement…</div></AppLayout>;
  if (!examen) return null;

  const statusColor = STATUS_COLORS[examen.statut] || '#64748b';
  const canAddMedicalNote = ['doctor', 'doctor_chef'].includes(role) && String(user?.id) === String(examen.prescrit_par);
  const saveMedicalNote = async (event) => {
    event.preventDefault();
    setSavingNote(true);
    try {
      const { data } = await examenService.update(examen.id, { note_medecin: noteMedecin });
      setExamen(data);
      toast.success('Votre note a été ajoutée au compte rendu.');
    } catch (error) {
      toast.error(error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Impossible d’enregistrer la note.');
    } finally { setSavingNote(false); }
  };
  return <AppLayout title="Résultat d’examen" patientContext={createPatientSidebarContext(patient, 'examens', navigate, { can, role })}>
    <div style={{ maxWidth:960, margin:'0 auto', display:'grid', gap:16 }}>
   
      <section style={cardStyle}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14, paddingBottom:18, borderBottom:'1px solid #e5edf7' }}>
          <div>
            <div style={eyebrowStyle}>{CATEGORY_LABELS[examen.categorie] || examen.categorie}</div>
            <h2 style={{ margin:'6px 0', fontSize:21, color:'#0f172a' }}>{examen.nom_examen}</h2>
            <div style={mutedStyle}>{examen.patient_numero} · {examen.patient_nom}</div>
          </div>
          <span style={{ ...statusStyle, color:statusColor, background:`${statusColor}14`, borderColor:`${statusColor}35` }}>{examen.statut_label || examen.statut}</span>
        </div>
        <div style={metaGrid}>
          <Info label="Date de prescription" value={formatDate(examen.date_prescription)} />
          <Info label="Date de réalisation" value={formatDate(examen.date_realisation)} />
          <Info label="Médecin prescripteur" value={examen.prescrit_par_info?.display_name || '—'} />
        </div>
      </section>

      <section style={cardStyle}>
        <h3 style={sectionHeading}>Compte rendu et résultats</h3>
        <div style={resultStyle}>{examen.resultat?.trim() || 'Aucun compte rendu saisi pour le moment.'}</div>
        {examen.observations && <Info label="Consignes de la demande" value={examen.observations} />}
      </section>

      {(canAddMedicalNote || examen.note_medecin) && <section style={cardStyle}>
        <h3 style={sectionHeading}>Note du médecin prescripteur</h3>
        {canAddMedicalNote ? <form onSubmit={saveMedicalNote}>
          <textarea value={noteMedecin} onChange={event => setNoteMedecin(event.target.value)} rows={4} placeholder="Ajouter une précision ou une conclusion clinique au compte rendu…" style={noteInputStyle} />
          <div style={{ display:'flex', justifyContent:'flex-end', marginTop:12 }}>
            <button type="submit" disabled={savingNote} style={saveButtonStyle}>{savingNote ? 'Enregistrement…' : 'Ajouter au compte rendu'}</button>
          </div>
        </form> : <div style={resultStyle}>{examen.note_medecin}</div>}
      </section>}

      <section style={cardStyle}>
        <h3 style={sectionHeading}>Documents joints</h3>
        <div style={{ display:'grid', gap:10 }}>
          {examen.fichier_dicom_url && <DocumentLink href={examen.fichier_dicom_url} label="Document joint à la demande" />}
          {examen.fichier_resultat && <DocumentLink href={examen.fichier_resultat} label="Résultat transmis par le service" />}
          {!examen.fichier_dicom_url && !examen.fichier_resultat && <p style={mutedStyle}>Aucun document importé.</p>}
        </div>
      </section>
    </div>
  </AppLayout>;
}

function Info({ label, value }) {
  return <div style={{ padding:'11px 0', borderBottom:'1px solid #e5edf7' }}><div style={eyebrowStyle}>{label}</div><div style={{ marginTop:5, color:'#0f172a', fontSize:13.5, whiteSpace:'pre-wrap' }}>{value || '—'}</div></div>;
}
function DocumentLink({ href, label }) {
  return <a href={href} target="_blank" rel="noreferrer" style={documentStyle}><span>{label}</span><strong>Télécharger / ouvrir ↗</strong></a>;
}
const cardStyle = { background:'#fff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16, padding:'24px 28px', boxShadow:'0 8px 24px rgba(15,23,42,0.03)' };
const eyebrowStyle = { color:'#64748b', fontSize:10.5, fontWeight:700, letterSpacing:.7, textTransform:'uppercase' };
const mutedStyle = { color:'#64748b', fontSize:12.5 };
const sectionHeading = { margin:'0 0 14px', paddingBottom:10, borderBottom:'1px solid rgba(37,99,235,0.12)', color:'#64748b', fontSize:12, fontWeight:700, letterSpacing:.7, textTransform:'uppercase' };
const metaGrid = { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))', gap:'0 24px', marginTop:10 };
const statusStyle = { padding:'6px 12px', border:'1px solid', borderRadius:20, fontSize:11.5, fontWeight:700 };
const resultStyle = { color:'#0f172a', fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap', minHeight:55 };
const documentStyle = { display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, padding:'13px 15px', background:'#f8fafc', border:'1px solid #e2e8f0', borderRadius:10, color:'#334155', textDecoration:'none', fontSize:13 };
const backStyle = { justifySelf:'start', padding:0, border:0, background:'none', color:'#2563eb', cursor:'pointer', fontSize:12.5 };
const centerStyle = { display:'grid', placeItems:'center', minHeight:260, color:'#64748b' };
const noteInputStyle = { width:'100%', boxSizing:'border-box', padding:'12px 14px', border:'1px solid #dbe5f2', borderRadius:10, background:'#f8fafc', color:'#0f172a', fontFamily:'var(--font-body)', fontSize:13, lineHeight:1.6, resize:'vertical' };
const saveButtonStyle = { padding:'10px 16px', border:0, borderRadius:9, background:'#2563eb', color:'#fff', fontSize:12.5, fontWeight:700, cursor:'pointer' };
