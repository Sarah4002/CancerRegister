import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { traitementService } from '../../services/traitementService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

const TYPE_CONFIG = {
  chimio:    { label: 'Chimiothérapie',    color: '#2563eb' },
  radio:     { label: 'Radiothérapie',     color: '#d97706' },
  chirurgie: { label: 'Chirurgie',         color: '#dc2626' },
  hormono:   { label: 'Hormonothérapie',   color: '#16a34a' },
  immuno:    { label: 'Immunothérapie',    color: '#9333ea' },
  ciblee:    { label: 'Thérapie ciblée',  color: '#8b5cf6' },
};

const STATUT_COLORS = {
  planifie:  { bg:'rgba(155,138,251,0.12)', color:'#7c3aed' },
  en_cours:  { bg:'rgba(0,168,255,0.12)',   color:'#2563eb' },
  termine:   { bg:'rgba(0,229,160,0.12)',   color:'#16a34a' },
  suspendu:  { bg:'rgba(245,166,35,0.12)',  color:'#d97706' },
  abandonne: { bg:'rgba(255,77,106,0.12)',  color:'#dc2626' },
};

const REPONSE_COLORS = {
  RC:'#16a34a', RP:'#2563eb', SD:'#d97706', PD:'#dc2626', NE:'#9ca3af', NA:'#6b7280',
};

const MARGES_COLORS = { R0:'#16a34a', R1:'#d97706', R2:'#dc2626', RX:'#9ca3af' };

export default function TraitementDetailPage() {
  const { type, id } = useParams();
  const navigate     = useNavigate();
  const cfg          = TYPE_CONFIG[type] || TYPE_CONFIG.chimio;
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const svc = traitementService[type];
    if (!svc) { navigate('/traitements'); return; }
    svc.get(id)
      .then(({ data }) => setData(data))
      .catch(() => { toast.error('Traitement introuvable'); navigate('/traitements'); })
      .finally(() => setLoading(false));
  }, [type, id]);

  if (loading) return <AppLayout title="Traitement"><Loader color={cfg.color} /></AppLayout>;
  if (!data)   return null;

  const sc = STATUT_COLORS[data.statut] || STATUT_COLORS.planifie;

  return (
    <AppLayout title={`${cfg.icon} ${cfg.label}`}>
      {/* Header */}
      <div style={{ background:'#ffffff', border:`1px solid ${cfg.color}20`, borderRadius:'16px', padding:'20px 24px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
        <div style={{ display:'flex', gap:14, alignItems:'flex-start' }}>
          <div style={{ width:46, height:46, borderRadius:12, background:`${cfg.color}18`, border:`1px solid ${cfg.color}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{cfg.icon}</div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <h2 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, color:'#0f172a' }}>{cfg.label}</h2>
              <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500, ...sc, border:`1px solid ${sc.color}30` }}>{data.statut_label}</span>
              <span style={{ padding:'2px 8px', borderRadius:6, fontSize:11, color:'#64748b', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)' }}>{data.intention_label}</span>
            </div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <Chip  val={data.patient_nom} sub={data.patient_numero} />
              <Chip  val={`${new Date(data.date_debut).toLocaleDateString('fr-DZ')}${data.date_fin ? ' → '+new Date(data.date_fin).toLocaleDateString('fr-DZ') : ''}`} sub="Période" />
              {data.etablissement && <Chip  val={data.etablissement} />}
            </div>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <Link to={`/patients/${data.patient}`} style={{ textDecoration:'none' }}>
            <button style={{ padding:'8px 14px', background:`${cfg.color}12`, border:`1px solid ${cfg.color}25`, borderRadius:8, color:cfg.color, fontSize:12, cursor:'pointer' }}>👤 Patient</button>
          </Link>
          <Link to="/traitements" style={{ textDecoration:'none' }}>
            <button style={{ padding:'8px 14px', background:'#f1f5f9', border:'1px solid rgba(37,99,235,0.12)', borderRadius:8, color:'#64748b', fontSize:12, cursor:'pointer' }}>← Retour</button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Commun */}
        <Card title="Informations générales" color={cfg.color}>
          <InfoRow label="Statut"           value={data.statut_label} />
          <InfoRow label="Intention"        value={data.intention_label} />
          <InfoRow label="Date début"       value={new Date(data.date_debut).toLocaleDateString('fr-DZ')} />
          {data.date_fin && <InfoRow label="Date fin" value={new Date(data.date_fin).toLocaleDateString('fr-DZ')} />}
          <InfoRow label="Établissement"    value={data.etablissement || '—'} />
          <InfoRow label="Médecin"          value={data.medecin || '—'} />
          {data.observations && <InfoRow label="Observations" value={data.observations} />}
        </Card>

        {/* Spécifique chimio */}
        {type === 'chimio' && (
          <Card title="Protocole" color={cfg.color}>
            <InfoRow label="Protocole"   value={<span style={{ fontFamily:'var(--font-mono)', color:cfg.color }}>{data.protocole || '—'}</span>} />
            <InfoRow label="Ligne"       value={`${data.ligne}ère ligne`} />
            <InfoRow label="Cycles"      value={`${data.cycles_realises ?? 0} / ${data.nombre_cycles ?? '?'}`} />
            {data.intervalle_jours && <InfoRow label="Intervalle" value={`${data.intervalle_jours} jours`} />}
            <InfoRow label="Voie"        value={data.voie_label} />
            {data.reponse_tumorale && (
              <InfoRow label="Réponse" value={<span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: REPONSE_COLORS[data.reponse_tumorale] || '#9ca3af' }}>{data.reponse_label}</span>} />
            )}
            {data.toxicite_grade !== null && data.toxicite_grade !== undefined && (
              <InfoRow label="Toxicité grade" value={<span style={{ color: data.toxicite_grade >= 3 ? '#dc2626' : data.toxicite_grade >= 2 ? '#d97706' : '#16a34a' }}>Grade {data.toxicite_grade}</span>} />
            )}
          </Card>
        )}

        {/* Spécifique radio */}
        {type === 'radio' && (
          <Card title="Paramètres" color={cfg.color}>
            <InfoRow label="Site irradié" value={data.site_irradie} />
            <InfoRow label="Technique"    value={data.technique_label} />
            {data.dose_totale_gy && <InfoRow label="Dose totale" value={<span style={{ fontFamily:'var(--font-mono)', color:cfg.color }}>{data.dose_totale_gy} Gy</span>} />}
            {data.dose_par_seance_gy && <InfoRow label="Dose/séance" value={`${data.dose_par_seance_gy} Gy`} />}
            <InfoRow label="Séances" value={`${data.seances_realisees} / ${data.nombre_seances ?? '?'}`} />
            {data.energie_mev && <InfoRow label="Énergie" value={data.energie_mev} />}
            <InfoRow label="Radiochimiothérapie" value={data.association_chimio ? '✓ Oui' : 'Non'} />
            {data.toxicite_aigue && <InfoRow label="Toxicité aiguë" value={data.toxicite_aigue} />}
          </Card>
        )}

        {/* Spécifique chirurgie */}
        {type === 'chirurgie' && (
          <Card title="Acte chirurgical" color={cfg.color}>
            <InfoRow label="Acte"   value={data.intitule_acte} />
            <InfoRow label="Type"   value={data.type_label} />
            <InfoRow label="Voie"   value={data.voie_label} />
            {data.chirurgien && <InfoRow label="Chirurgien" value={data.chirurgien} />}
            {data.marges_resection && (
              <InfoRow label="Marges" value={<span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: MARGES_COLORS[data.marges_resection] || '#9ca3af' }}>{data.marges_label}</span>} />
            )}
            {data.curage_ganglionnaire && (
              <InfoRow label="Curage" value={`${data.nb_ganglions_preleves ?? '?'} prélevés / ${data.nb_ganglions_envahis ?? '?'} envahis`} />
            )}
            {data.duree_hospitalisation && <InfoRow label="Hospitalisation" value={`${data.duree_hospitalisation} jours`} />}
          </Card>
        )}

        {/* Spécifique hormono */}
        {type === 'hormono' && (
          <Card title="Hormonothérapie" color={cfg.color}>
            <InfoRow label="Type"     value={data.type_label} />
            <InfoRow label="Molécule" value={<span style={{ fontFamily:'var(--font-mono)', color:cfg.color }}>{data.molecule}</span>} />
            {data.dose_mg_jour && <InfoRow label="Dose / jour" value={`${data.dose_mg_jour} mg`} />}
            {data.duree_mois_prevue && <InfoRow label="Durée prévue" value={`${data.duree_mois_prevue} mois`} />}
          </Card>
        )}

        {/* Spécifique immuno / thérapie ciblée */}
        {(type === 'immuno' || type === 'ciblee') && (
          <Card title={type === 'ciblee' ? 'Thérapie ciblée' : 'Immunothérapie'} color={cfg.color}>
            <InfoRow label="Type"         value={data.type_label} />
            <InfoRow label="Molécule"     value={<span style={{ fontFamily:'var(--font-mono)', color:cfg.color }}>{data.molecule}</span>} />
            {data.dose && <InfoRow label="Dose" value={data.dose} />}
            {data.nombre_cycles && <InfoRow label="Cycles" value={data.nombre_cycles} />}
            {data.biomarqueur_cible && <InfoRow label="Biomarqueur" value={data.biomarqueur_cible} />}
            {data.reponse_tumorale && (
              <InfoRow label="Réponse" value={<span style={{ fontFamily:'var(--font-mono)', fontWeight:700, color: REPONSE_COLORS[data.reponse_tumorale] || '#9ca3af' }}>{data.reponse_tumorale}</span>} />
            )}
          </Card>
        )}

        {/* Médicaments chimio */}
        {type === 'chimio' && data.medicaments?.length > 0 && (
          <div style={{ gridColumn:'1 / -1' }}>
            <Card title="Médicaments du protocole" color={cfg.color}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr>
                    {['DCI', 'Dose', 'Unité', 'Jours admin.'].map(h => (
                      <th key={h} style={{ padding:'8px 10px', textAlign:'left', fontSize:10, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, borderBottom:'1px solid rgba(37,99,235,0.12)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.medicaments.map(m => (
                    <tr key={m.id} style={{ borderBottom:'1px solid rgba(37,99,235,0.12)' }}>
                      <td style={{ padding:'10px 10px', fontWeight:600, color:'#0f172a', fontFamily:'var(--font-mono)' }}>{m.dci}</td>
                      <td style={{ padding:'10px 10px', color:'#334155' }}>{m.dose ?? '—'}</td>
                      <td style={{ padding:'10px 10px', color:'#334155' }}>{m.unite_dose || '—'}</td>
                      <td style={{ padding:'10px 10px', color:'#334155' }}>{m.jour_administration || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* Compte rendu chir */}
        {type === 'chirurgie' && (data.compte_rendu_operatoire || data.complications) && (
          <div style={{ gridColumn:'1 / -1' }}>
            <Card title="Compte rendu & Complications" color={cfg.color}>
              {data.complications && <InfoRow label="Complications" value={data.complications} />}
              {data.compte_rendu_operatoire && <InfoRow label="Compte rendu" value={data.compte_rendu_operatoire} />}
            </Card>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// ── Sub-components ────────────────────────────────────────────────
function Card({ title, color, children }) {
  return (
    <div style={{ background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:'12px', overflow:'hidden' }}>
      <div style={{ padding:'10px 16px', background:'#f1f5f9', borderBottom:'1px solid rgba(37,99,235,0.12)', fontSize:11, fontWeight:600, color:'#64748b', textTransform:'uppercase', letterSpacing:0.5, borderLeft:`3px solid ${color}` }}>
        {title}
      </div>
      <div style={{ padding:'4px 16px 12px' }}>{children}</div>
    </div>
  );
}
function Chip({ icon, val, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
      <span style={{ fontSize:12 }}>{icon}</span>
      <div>
        <div style={{ fontSize:12.5, color:'#0f172a', fontWeight:500 }}>{val}</div>
        {sub && <div style={{ fontSize:10, color:'#64748b' }}>{sub}</div>}
      </div>
    </div>
  );
}
function InfoRow({ label, value }) {
  return (
    <div style={{ padding:'9px 0', borderBottom:'1px solid rgba(37,99,235,0.12)', display:'grid', gridTemplateColumns:'120px 1fr', gap:12, alignItems:'start' }}>
      <span style={{ fontSize:11, color:'#64748b', paddingTop:2 }}>{label}</span>
      <span style={{ fontSize:13, color:'#0f172a' }}>{value}</span>
    </div>
  );
}
function Loader({ color }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'#64748b' }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ width:36, height:36, border:'3px solid rgba(37,99,235,0.12)', borderTopColor:color, borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
        Chargement...
      </div>
    </div>
  );
}
