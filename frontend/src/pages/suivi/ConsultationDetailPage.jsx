import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const EVOLUTION_COLORS = {
  stable:     { color:'#00a8ff', label:'Stable' },
  regression: { color:'#00e5a0', label:'Régression' },
  progression:{ color:'#ff4d6a', label:'Progression' },
  remission:  { color:'#4ade80', label:'Rémission' },
  inconnu:    { color:'#9ca3af', label:'Non évaluable' },
};
const STATUT_COLORS = {
  planifiee:{ color:'#9b8afb' }, realisee:{ color:'#00e5a0' },
  annulee:  { color:'#ff4d6a' }, reportee:{ color:'#f5a623' },
};
const PS_COLORS = ['#00e5a0','#4ade80','#f5a623','#ff7832','#ff4d6a'];

const TABAC_LABELS = { non:'Non-fumeur', ex:'Ex-fumeur', actif:'Fumeur actif', inconnu:'Inconnu' };
const ALCOOL_LABELS = { non:'Non', oui:'Oui', inconnu:'Inconnu' };
const ACTIVITE_LABELS = { sedentaire:'Sédentaire', leger:'Légère', modere:'Modérée', intense:'Intense', inconnu:'Inconnu' };


const STATUT_VITAL_LABELS = {
  vivant: 'Vivant', decede: 'Décédé', perdu_de_vue: 'Perdu de vue', inconnu: 'Inconnu'
};
function StatutVitalChip({ statut }) {
  if (!statut) return null;
  const isDeces = statut === 'decede';
  const color   = isDeces ? '#6b7280' : '#00e5a0';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div>
        <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:1 }}>Statut vital</div>
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

  useEffect(() => {
    suiviService.consultations.get(id)
      .then(({ data: d }) => setData(d))
      .catch(() => { toast.error('Consultation introuvable'); navigate('/suivi'); })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <AppLayout title="Consultation">
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300 }}>
        <div style={{ width:36, height:36, border:'3px solid var(--border)', borderTopColor:'#9b8afb', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      </div>
    </AppLayout>
  );
  if (!data) return null;

  const sc  = STATUT_COLORS[data.statut]   || { color:'#9ca3af' };
  const ec  = EVOLUTION_COLORS[data.evolution_maladie];
  const psColor = data.ps_ecog !== null && data.ps_ecog !== undefined ? PS_COLORS[data.ps_ecog] : '#9ca3af';

  return (
    <AppLayout title="Consultation de Suivi">
      {/* Header */}
      <div style={{ background:'var(--bg-card)', border:'1px solid rgba(155,138,251,0.2)', borderRadius:'var(--radius-lg)', padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:14 }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{ width:46, height:46, borderRadius:12, background:'rgba(155,138,251,0.15)', border:'1px solid rgba(155,138,251,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, color:'#9b8afb', fontWeight:700 }}>CS</div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'var(--text-primary)' }}>
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
          <Link to={`/patients/${data.patient}`} style={{ textDecoration:'none' }}>
            <button style={btnSt('#9b8afb')}>Patient</button>
          </Link>
          <Link to="/suivi" style={{ textDecoration:'none' }}>
            <button style={btnSt('var(--text-muted)', true)}>Retour</button>
          </Link>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Parametres cliniques */}
        <Card title="Parametres cliniques" color="#9b8afb">
          {data.ps_ecog !== null && data.ps_ecog !== undefined && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', width:120 }}>Performance Status</span>
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:700, background:`${psColor}18`, color:psColor, border:`1px solid ${psColor}30`, fontFamily:'var(--font-mono)' }}>
                PS {data.ps_ecog} — {data.ps_ecog_label}
              </span>
            </div>
          )}
          {data.poids_kg   && <InfoRow label="Poids"   value={`${data.poids_kg} kg`} />}
          {data.taille_cm  && <InfoRow label="Taille"  value={`${data.taille_cm} cm`} />}
          {data.imc && (
            <InfoRow label="IMC" value={
              <span style={{ fontFamily:'var(--font-mono)', color: data.imc < 18.5 ? '#f5a623' : data.imc > 30 ? '#ff4d6a' : '#00e5a0' }}>
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
        <Card title="Evolution & Planning" color="#00a8ff">
          {data.evolution_maladie && ec && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:11, color:'var(--text-muted)', width:120 }}>Evolution tumorale</span>
              <span style={{ padding:'4px 12px', borderRadius:20, fontSize:12, fontWeight:600, background:`${ec.color}18`, color:ec.color, border:`1px solid ${ec.color}30` }}>{ec.label}</span>
            </div>
          )}
          {data.rechute && (
            <InfoRow label="Rechute" value={
              <span style={{ color:'#ff4d6a', fontWeight:600 }}>
                Oui — {data.nombre_rechutes || 1} fois
                {data.date_derniere_rechute && ` (dernière : ${new Date(data.date_derniere_rechute).toLocaleDateString('fr-DZ')})`}
              </span>
            } />
          )}
          {data.prochaine_consultation && (
            <InfoRow label="Prochain RDV" value={
              <span style={{ fontFamily:'var(--font-mono)', color:'#00a8ff' }}>
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
                <button style={{ padding:'7px 14px', background:'rgba(0,229,160,0.1)', border:'1px solid rgba(0,229,160,0.2)', borderRadius:8, color:'#00e5a0', fontSize:12, cursor:'pointer' }}>
                  Voir évaluation QdV associée
                </button>
              </Link>
            </div>
          )}
        </Card>

        {/* Rechute & Pathologies */}
        {(data.pathologies_chroniques) && (
          <Card title="Antécédents & Pathologies" color="#f5a623">
            {data.pathologies_chroniques && <InfoRow label="Pathologies chroniques" value={data.pathologies_chroniques} />}
          </Card>
        )}

        {/* Habitudes de vie */}
        {(data.tabac || data.alcool || data.activite_physique || data.exposition_toxique) && (
          <Card title="Habitudes de vie" color="#00e5a0">
            {data.tabac && <InfoRow label="Tabac" value={
              <span>
                {TABAC_LABELS[data.tabac] || data.tabac}
                {data.tabac_paquets_annee && <span style={{ fontFamily:'var(--font-mono)', color:'var(--text-muted)', marginLeft:8 }}>{data.tabac_paquets_annee} paquets/an</span>}
              </span>
            } />}
            {data.alcool           && <InfoRow label="Alcool"            value={ALCOOL_LABELS[data.alcool] || data.alcool} />}
            {data.activite_physique && <InfoRow label="Activité physique" value={ACTIVITE_LABELS[data.activite_physique] || data.activite_physique} />}
            {data.alimentation     && <InfoRow label="Alimentation"       value={data.alimentation} />}
            {data.exposition_toxique && (
              <InfoRow label="Exposition toxique" value={
                <span style={{ color:'#f5a623' }}>
                  Oui{data.exposition_toxique_detail && ` — ${data.exposition_toxique_detail}`}
                </span>
              } />
            )}
          </Card>
        )}

        {/* Compte rendu */}
        {(data.motif || data.examen_clinique || data.conclusion || data.conduite_a_tenir) && (
          <div style={{ gridColumn:'1 / -1' }}>
            <Card title="Compte rendu clinique" color="#9b8afb">
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 24px' }}>
                {data.motif            && <InfoRow label="Motif"            value={data.motif} />}
                {data.conclusion       && <InfoRow label="Conclusion"       value={data.conclusion} />}
                {data.examen_clinique  && <InfoRow label="Examen clinique"  value={data.examen_clinique} />}
                {data.conduite_a_tenir && <InfoRow label="Conduite à tenir" value={data.conduite_a_tenir} />}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Card({ title, color, children }) {
  return (
    <div style={{ background:'var(--bg-card)', border:'1px solid var(--border-light)', borderRadius:'var(--radius-md)', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:'var(--bg-elevated)', borderBottom:'1px solid var(--border)', fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:0.5, borderLeft:`3px solid ${color}` }}>{title}</div>
      <div style={{ padding:'4px 16px 14px' }}>{children}</div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', display:'grid', gridTemplateColumns:'130px 1fr', gap:12, alignItems:'start' }}>
      <span style={{ fontSize:11, color:'var(--text-muted)', paddingTop:2 }}>{label}</span>
      <span style={{ fontSize:13, color:'var(--text-primary)' }}>{value || '—'}</span>
    </div>
  );
}
function Chip({ val, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <div>
        <div style={{ fontSize:12.5, color:'var(--text-primary)', fontWeight:500 }}>{val}</div>
        {sub && <div style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{sub}</div>}
      </div>
    </div>
  );
}
const btnSt = (color, ghost) => ({
  padding:'8px 14px', background: ghost ? 'var(--bg-elevated)' : `${color}12`,
  border:`1px solid ${ghost ? 'var(--border)' : color+'25'}`,
  borderRadius:8, color, fontSize:12, cursor:'pointer',
});