import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const EVOLUTION_COLORS = {
  stable:     { color:'#2563eb', label:'Stable' },
  regression: { color:'#16a34a', label:'Régression' },
  progression:{ color:'#dc2626', label:'Progression' },
  remission:  { color:'#22c55e', label:'Rémission' },
  inconnu:    { color:'#64748b', label:'Non évaluable' },
};
const STATUT_COLORS = {
  planifiee:{ color:'#7c3aed' }, realisee:{ color:'#16a34a' },
  annulee:  { color:'#dc2626' }, reportee:{ color:'#d97706' },
};
const PS_COLORS = ['#16a34a','#22c55e','#d97706','#ff7832','#dc2626'];

const TABAC_LABELS = { non:'Non-fumeur', ex:'Ex-fumeur', actif:'Fumeur actif', inconnu:'Inconnu' };
const ALCOOL_LABELS = { non:'Non', oui:'Oui', inconnu:'Inconnu' };
const ACTIVITE_LABELS = { sedentaire:'Sédentaire', leger:'Légère', modere:'Modérée', intense:'Intense', inconnu:'Inconnu' };


const STATUT_VITAL_LABELS = {
  vivant: 'Vivant', decede: 'Décédé', perdu_de_vue: 'Perdu de vue', inconnu: 'Inconnu'
};
function StatutVitalChip({ statut }) {
  if (!statut) return null;
  const isDeces = statut === 'decede';
  const color   = isDeces ? '#6b7280' : '#16a34a';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div>
        <div style={{ fontSize:11, color:'#64748b', marginBottom:1 }}>Statut vital</div>
        <span style={{ padding:'2px 10px', borderRadius:6, fontSize:12, fontWeight:600,
          background:`${color}18`, color, border:`1px solid ${color}30` }}>
          {STATUT_VITAL_LABELS[statut] || statut}
        </span>
      </div>
    </div>
  );
}

export default function ConsultationDetailPage() {
  const { id }    = useParams();
  const navigate  = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    suiviService.consultations.get(id)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('Consultation introuvable'); navigate('/suivi'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout title="Consultation">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:36, height:36, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:'#7c3aed', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    </AppLayout>
  );
  if (!data) return null;

  const sc  = STATUT_COLORS[data.statut]   || { color:'#64748b' };
  const ec  = EVOLUTION_COLORS[data.evolution_maladie];
  const psColor = data.ps_ecog !== null && data.ps_ecog !== undefined ? PS_COLORS[data.ps_ecog] : '#9ca3af';

  const openEdit = () => {
    setForm({ ...data });
    setEditMode(true);
  };
  const cancelEdit = () => {
    setForm({});
    setEditMode(false);
  };
  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        date_consultation: form.date_consultation,
        type_consultation: form.type_consultation,
        statut: form.statut,
        poids_kg: form.poids_kg || null,
        taille_cm: form.taille_cm || null,
        ta_systolique: form.ta_systolique || null,
        ta_diastolique: form.ta_diastolique || null,
        frequence_cardiaque: form.frequence_cardiaque || null,
        temperature: form.temperature || null,
        evolution_maladie: form.evolution_maladie || null,
        motif: form.motif || '',
        examen_clinique: form.examen_clinique || '',
        conclusion: form.conclusion || '',
        conduite_a_tenir: form.conduite_a_tenir || '',
      };
      const { data: updated } = await suiviService.consultations.patch(id, payload);
      setData(updated);
      setEditMode(false);
      toast.success('Consultation mise à jour.');
    } catch (error) {
      toast.error(error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Erreur lors de la mise à jour.');
    } finally {
      setSaving(false);
    }
  };
  const updateField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <AppLayout title="Consultation de Suivi">
      <button
        type="button"
        onClick={() => navigate(-1)}
        style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', color:'#64748b', fontSize:12.5, cursor:'pointer', marginBottom:14, padding:0 }}
      >
        <span aria-hidden="true">←</span> Retour
      </button>
      {/* Header */}
      <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'16px', padding:'24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14, boxShadow:'0 8px 24px rgba(15,23,42,0.03)' }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'rgba(155,138,251,0.15)', border:'1px solid rgba(155,138,251,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#7c3aed', fontWeight:700 }}>CS</div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#0f172a' }}>
                {data.type_label}
              </h2>
              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, background:`${sc.color}18`, color:sc.color, border:`1px solid ${sc.color}30` }}>{data.statut_label}</span>
              {ec && <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, background:`${ec.color}18`, color:ec.color, border:`1px solid ${ec.color}30` }}>{ec.label}</span>}
            </div>
            <div style={{ display:'flex', gap:14, flexWrap:'wrap' }}>
              <Chip val={data.patient_nom} sub={data.patient_numero} />
              <Chip val={new Date(data.date_consultation).toLocaleDateString('fr-DZ', { day:'numeric', month:'long', year:'numeric' })} />
              {data.medecin_nom && <Chip val={data.medecin_nom} />}
              {data.etablissement && <Chip val={data.etablissement} />}
              <StatutVitalChip statut={data.patient_statut_vital} />
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {!editMode && <button type="button" onClick={openEdit} style={{ padding:'9px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600 }}>Modifier</button>}
          <Link to={`/patients/${data.patient}`} style={{ textDecoration:'none' }}>
            <button style={btnSt('#7c3aed')}>Patient</button>
          </Link>
        </div>
      </div>

      {editMode ? (
        <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16, padding:24, boxShadow:'0 8px 24px rgba(15,23,42,0.025)' }}>
          <SectionLabel>Modifier la consultation</SectionLabel>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'0 24px' }}>
            <EditField label="Date de consultation" type="date" value={form.date_consultation} onChange={(value) => updateField('date_consultation', value)} />
            <EditField label="Type de consultation" as="select" value={form.type_consultation} onChange={(value) => updateField('type_consultation', value)} options={[
              ['initiale', 'Consultation initiale'], ['suivi', 'Suivi standard'], ['post_trt', 'Post-traitement'], ['urgence', 'Urgence'], ['bilan', "Bilan d'extension"], ['annonce', "Consultation d'annonce"], ['palliative', 'Soins palliatifs'],
            ]} />
            <EditField label="Statut" as="select" value={form.statut} onChange={(value) => updateField('statut', value)} options={[
              ['planifiee', 'Planifiée'], ['realisee', 'Réalisée'], ['annulee', 'Annulée'], ['reportee', 'Reportée'],
            ]} />
            <EditField label="Évolution" as="select" value={form.evolution_maladie} onChange={(value) => updateField('evolution_maladie', value)} options={[
              ['stable', 'Stable'], ['regression', 'Régression'], ['progression', 'Progression'], ['remission', 'Rémission'], ['inconnu', 'Non évaluable'],
            ]} />
            <EditField label="Poids (kg)" type="number" value={form.poids_kg} onChange={(value) => updateField('poids_kg', value)} />
            <EditField label="Taille (cm)" type="number" value={form.taille_cm} onChange={(value) => updateField('taille_cm', value)} />
            <EditField label="Tension systolique" type="number" value={form.ta_systolique} onChange={(value) => updateField('ta_systolique', value)} />
            <EditField label="Tension diastolique" type="number" value={form.ta_diastolique} onChange={(value) => updateField('ta_diastolique', value)} />
            <EditField label="Fréquence cardiaque" type="number" value={form.frequence_cardiaque} onChange={(value) => updateField('frequence_cardiaque', value)} />
            <EditField label="Température (°C)" type="number" value={form.temperature} onChange={(value) => updateField('temperature', value)} />
            <EditField label="Motif" as="textarea" value={form.motif} onChange={(value) => updateField('motif', value)} />
            <EditField label="Examen clinique" as="textarea" value={form.examen_clinique} onChange={(value) => updateField('examen_clinique', value)} />
            <EditField label="Conclusion" as="textarea" value={form.conclusion} onChange={(value) => updateField('conclusion', value)} />
            <EditField label="Conduite à tenir" as="textarea" value={form.conduite_a_tenir} onChange={(value) => updateField('conduite_a_tenir', value)} />
          </div>
          <div style={{ display:'flex', justifyContent:'flex-end', gap:10, marginTop:18, paddingTop:18, borderTop:'1px solid rgba(37,99,235,0.12)' }}>
            <button type="button" onClick={cancelEdit} disabled={saving} style={secondaryButtonStyle}>Annuler</button>
            <button type="button" onClick={saveEdit} disabled={saving} style={primaryButtonStyle}>{saving ? 'Enregistrement…' : 'Enregistrer'}</button>
          </div>
        </div>
      ) : <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Parametres cliniques */}
        <Card title="Parametres cliniques" color="#7c3aed">
          {data.ps_ecog !== null && data.ps_ecog !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
              <span style={{ fontSize:11, color:'#64748b', width:120 }}>Performance Status</span>
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, background:`${psColor}18`, color:psColor, border:`1px solid ${psColor}30`, fontFamily:'var(--font-mono)' }}>
                PS {data.ps_ecog} — {data.ps_ecog_label}
              </span>
            </div>
          )}
          {data.poids_kg   && <InfoRow label="Poids"   value={`${data.poids_kg} kg`} />}
          {data.taille_cm  && <InfoRow label="Taille"  value={`${data.taille_cm} cm`} />}
          {data.imc && (
            <InfoRow label="IMC" value={
              <span style={{ fontFamily:'var(--font-mono)', color: data.imc < 18.5 ? '#d97706' : data.imc > 30 ? '#dc2626' : '#16a34a' }}>
                {data.imc} kg/m²
              </span>
            } />
          )}
          {(data.ta_systolique || data.ta_diastolique) && (
            <InfoRow label="Tension artérielle" value={<span style={{ fontFamily:'var(--font-mono)' }}>{data.ta_systolique}/{data.ta_diastolique} mmHg</span>} />
          )}
          {data.frequence_cardiaque && <InfoRow label="FC"          value={`${data.frequence_cardiaque} bpm`} />}
          {data.temperature         && <InfoRow label="Température" value={`${data.temperature} °C`} />}
          {data.marqueurs_biologiques && <InfoRow label="Marqueurs bio." value={data.marqueurs_biologiques} />}
        </Card>

        {/* Evolution & Planning */}
        <Card title="Evolution & Planning" color="#2563eb">
          {data.evolution_maladie && ec && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
              <span style={{ fontSize:11, color:'#64748b', width:120 }}>Evolution tumorale</span>
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:`${ec.color}18`, color:ec.color, border:`1px solid ${ec.color}30` }}>{ec.label}</span>
            </div>
          )}
          {data.rechute && (
            <InfoRow label="Rechute" value={
              <span style={{ color:'#dc2626', fontWeight:600 }}>
                Oui — {data.nombre_rechutes || 1} fois
                {data.date_derniere_rechute && ` (dernière : ${new Date(data.date_derniere_rechute).toLocaleDateString('fr-DZ')})`}
              </span>
            } />
          )}
          {data.prochaine_consultation && (
            <InfoRow label="Prochain RDV" value={
              <span style={{ fontFamily:'var(--font-mono)', color:'#2563eb' }}>
                {new Date(data.prochaine_consultation).toLocaleDateString('fr-DZ', { day:'numeric', month:'long', year:'numeric' })}
              </span>
            } />
          )}
          {data.date_dernier_rdv && (
            <InfoRow label="Dernier RDV" value={
              <span style={{ fontFamily:'var(--font-mono)' }}>
                {new Date(data.date_dernier_rdv).toLocaleDateString('fr-DZ', { day:'numeric', month:'long', year:'numeric' })}
              </span>
            } />
          )}
          {data.patient_statut_vital && data.patient_statut_vital === 'decede' && (
            <InfoRow label="Statut patient" value={
              <span style={{ color:'#6b7280', fontWeight:600 }}>
                Décédé
                {data.patient_cause_deces && ` — Cause : ${data.patient_cause_deces}`}
              </span>
            } />
          )}
          <InfoRow label="Date création"   value={new Date(data.date_creation).toLocaleDateString('fr-DZ')} />
          <InfoRow label="Dernière modif." value={new Date(data.date_modification).toLocaleDateString('fr-DZ')} />
          {data.qualite_vie_id && (
            <div style={{ marginTop:12 }}>
              <Link to={`/suivi/qualite-vie/${data.qualite_vie_id}`} style={{ textDecoration:'none' }}>
                <button style={{ padding:'7px 14px', background:'rgba(0,229,160,0.1)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:8, color:'#16a34a', fontSize:12, cursor:'pointer' }}>
                  Voir évaluation QdV associée
                </button>
              </Link>
            </div>
          )}
        </Card>

        {/* Rechute & Pathologies */}
        {(data.pathologies_chroniques) && (
          <Card title="Antécédents & Pathologies" color="#d97706">
            {data.pathologies_chroniques && <InfoRow label="Pathologies chroniques" value={data.pathologies_chroniques} />}
          </Card>
        )}

        {/* Habitudes de vie */}
        {(data.tabac || data.alcool || data.activite_physique || data.exposition_toxique) && (
          <Card title="Habitudes de vie" color="#16a34a">
            {data.tabac && <InfoRow label="Tabac" value={
              <span>
                {TABAC_LABELS[data.tabac] || data.tabac}
                {data.tabac_paquets_annee && <span style={{ fontFamily:'var(--font-mono)', color:'#64748b', marginLeft:8 }}>{data.tabac_paquets_annee} paquets/an</span>}
              </span>
            } />}
            {data.alcool           && <InfoRow label="Alcool"            value={ALCOOL_LABELS[data.alcool] || data.alcool} />}
            {data.activite_physique && <InfoRow label="Activité physique" value={ACTIVITE_LABELS[data.activite_physique] || data.activite_physique} />}
            {data.alimentation     && <InfoRow label="Alimentation"       value={data.alimentation} />}
            {data.exposition_toxique && (
              <InfoRow label="Exposition toxique" value={
                <span style={{ color:'#d97706' }}>
                  Oui{data.exposition_toxique_detail && ` — ${data.exposition_toxique_detail}`}
                </span>
              } />
            )}
          </Card>
        )}

        {/* Compte rendu */}
        {(data.motif || data.examen_clinique || data.conclusion || data.conduite_a_tenir) && (
          <div style={{ gridColumn:'1 / -1' }}>
            <Card title="Compte rendu clinique" color="#7c3aed">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                {data.motif            && <InfoRow label="Motif"            value={data.motif} />}
                {data.conclusion       && <InfoRow label="Conclusion"       value={data.conclusion} />}
                {data.examen_clinique  && <InfoRow label="Examen clinique"  value={data.examen_clinique} />}
                {data.conduite_a_tenir && <InfoRow label="Conduite à tenir" value={data.conduite_a_tenir} />}
              </div>
            </Card>
          </div>
        )}
      </div>}
    </AppLayout>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize:11, fontWeight:700, letterSpacing:0.8, textTransform:'uppercase', color:'#64748b', marginBottom:14, paddingBottom:10, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>{children}</div>;
}

function EditField({ label, value, onChange, type = 'text', as, options = [] }) {
  const fieldStyle = { width:'100%', padding:'10px 12px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:10, color:'#0f172a', fontSize:13, outline:'none', boxSizing:'border-box', fontFamily:'var(--font-body)' };
  const commonProps = { value: value ?? '', onChange: (event) => onChange(event.target.value), style:fieldStyle };
  return (
    <label style={{ display:'block', marginBottom:16, fontSize:11, fontWeight:600, color:'#64748b', letterSpacing:0.3, textTransform:'uppercase' }}>
      {label}
      {as === 'textarea' ? (
        <textarea {...commonProps} rows={3} style={{ ...fieldStyle, display:'block', marginTop:6, resize:'vertical', textTransform:'none' }} />
      ) : as === 'select' ? (
        <select {...commonProps} style={{ ...fieldStyle, display:'block', marginTop:6, textTransform:'none' }}>
          <option value="">— Sélectionner —</option>
          {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
        </select>
      ) : (
        <input {...commonProps} type={type} style={{ ...fieldStyle, display:'block', marginTop:6, textTransform:'none' }} />
      )}
    </label>
  );
}

const primaryButtonStyle = { padding:'10px 22px', background:'#2563eb', border:'none', borderRadius:12, color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer' };
const secondaryButtonStyle = { padding:'10px 20px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:12, color:'#334155', fontSize:13, cursor:'pointer' };

function Card({ title, color, children }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'16px', overflow:'hidden', boxShadow:'0 8px 24px rgba(15,23,42,0.025)' }}>
      <div style={{ padding:'14px 18px', background:'#ffffff', borderBottom:'1px solid rgba(37,99,235,0.12)', fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:0.8 }}>{title}</div>
      <div style={{ padding:'4px 18px 14px' }}>{children}</div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div style={{ padding:'11px 0', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'flex', flexDirection:'column', gap:4 }}>
      <span style={{ fontSize:10.5, color:'#64748b', letterSpacing:0.35, textTransform:'uppercase' }}>{label}</span>
      <span style={{ fontSize:13.5, color:'#0f172a' }}>{value || '—'}</span>
    </div>
  );
}
function Chip({ val, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div>
        <div style={{ fontSize:12.5, color:'#0f172a', fontWeight:500 }}>{val}</div>
        {sub && <div style={{ fontSize:10, color:'#64748b', fontFamily:'var(--font-mono)' }}>{sub}</div>}
      </div>
    </div>
  );
}
const btnSt = (color, ghost) => ({
  padding:'8px 14px', background: ghost ? '#f1f5f9' : `${color}12`,
  border:`1px solid ${ghost ? 'rgba(37,99,235,0.12)' : color+'25'}`,
  borderRadius:8, color, fontSize:12, cursor:'pointer',
});
