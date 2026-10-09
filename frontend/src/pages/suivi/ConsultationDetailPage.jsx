import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { suiviService } from '../../services/suiviService';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import usePermissions from '../../hooks/usePermissions';
import useAuthStore from '../../hooks/useAuth';
import { getVisiblePatientSections } from '../../utils/patientSidebar';

/* ── Tables de configuration ── */
const EVOLUTION_COLORS = {
  stable:      { color: '#2563eb', label: 'Stable' },
  regression:  { color: '#16a34a', label: 'Régression' },
  progression: { color: '#dc2626', label: 'Progression' },
  remission:   { color: '#22c55e', label: 'Rémission' },
  inconnu:     { color: '#64748b', label: 'Non évaluable' },
};
const STATUT_COLORS = {
  planifiee: { color: '#7c3aed' }, realisee: { color: '#16a34a' },
  annulee:   { color: '#dc2626' }, reportee: { color: '#d97706' },
};
const PS_COLORS = ['#16a34a', '#22c55e', '#d97706', '#ff7832', '#dc2626'];

const TABAC_LABELS     = { non: 'Non-fumeur', ex: 'Ex-fumeur', actif: 'Fumeur actif', inconnu: 'Inconnu' };
const ALCOOL_LABELS    = { non: 'Non', oui: 'Oui', inconnu: 'Inconnu' };
const ACTIVITE_LABELS  = { sedentaire: 'Sédentaire', leger: 'Légère', modere: 'Modérée', intense: 'Intense', inconnu: 'Inconnu' };
const STATUT_VITAL_LABELS = { vivant: 'Vivant', decede: 'Décédé', perdu_de_vue: 'Perdu de vue', inconnu: 'Inconnu' };

const TYPE_OPTIONS = [
  ['initiale', 'Consultation initiale'], ['suivi', 'Suivi standard'], ['post_trt', 'Post-traitement'],
  ['urgence', 'Urgence'], ['bilan', "Bilan d'extension"], ['annonce', "Consultation d'annonce"], ['palliative', 'Soins palliatifs'],
];
const STATUT_OPTIONS = [
  ['planifiee', 'Planifiée'], ['realisee', 'Réalisée'], ['annulee', 'Annulée'], ['reportee', 'Reportée'],
];
const EVOLUTION_OPTIONS = [
  ['stable', 'Stable'], ['regression', 'Régression'], ['progression', 'Progression'], ['remission', 'Rémission'], ['inconnu', 'Non évaluable'],
];

const fmtDate = (d, long) => d
  ? new Date(d).toLocaleDateString('fr-DZ', long ? { day: 'numeric', month: 'long', year: 'numeric' } : undefined)
  : '—';

/* ─────────────────────────────────────────────────────────────────────────────
   MICRO-COMPONENTS — même langage visuel que DiagnosticDetailPage
───────────────────────────────────────────────────────────────────────────── */
function Pill({ color, children, mono }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: `${color}18`, color, border: `1px solid ${color}30`,
      fontFamily: mono ? 'var(--font-mono)' : 'inherit',
    }}>{children}</span>
  );
}

function SectionLabel({ children, style: s }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 12, ...s }}>{children}</div>;
}
function Grid({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>{children}</div>; }
function InfoRow({ label, value, mono, full }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(37,99,235,0.12)', gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#0f172a', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}

function Field({ label, full, children }) {
  return (
    <div style={{ marginBottom: 16, gridColumn: full ? '1 / -1' : 'auto' }}>
      <label className="label-st">{label}</label>
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function ConsultationDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const { user } = useAuthStore();

  const [data, setData]         = useState(null);
  const [patient, setPatient]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);

  const fetchData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: d } = await suiviService.consultations.get(id);
      setData(d);
      if (d.patient) {
        patientService.get(d.patient).then(res => setPatient(res.data)).catch(() => {});
      }
    } catch {
      toast.error('Consultation introuvable');
      navigate('/suivi');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSectionSelect = (key) => {
    if (!data?.patient) return;
    navigate(`/patients/${data.patient}`, { state: { returnSection: key } });
  };

  // Patient minimal construit depuis les champs dénormalisés (évite le flash du sidebar)
  const patientForSidebar = patient || (data?.patient ? {
    id: data.patient,
    nom: data.patient_nom || '',
    prenom: '',
    full_name: data.patient_nom || 'Patient',
    registration_number: data.patient_numero || '',
  } : null);
  const visiblePatientSections = getVisiblePatientSections(patientForSidebar, { can, role: user?.role });

  const set = (key, value) => setForm(cur => ({ ...cur, [key]: value }));

  const openEdit = () => { setForm({ ...data }); setEditMode(true); };
  const cancelEdit = () => { setForm({}); setEditMode(false); };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        date_consultation:   form.date_consultation,
        type_consultation:   form.type_consultation,
        statut:              form.statut,
        poids_kg:            form.poids_kg || null,
        taille_cm:           form.taille_cm || null,
        ta_systolique:       form.ta_systolique || null,
        ta_diastolique:      form.ta_diastolique || null,
        frequence_cardiaque: form.frequence_cardiaque || null,
        temperature:         form.temperature || null,
        evolution_maladie:   form.evolution_maladie || null,
        motif:               form.motif || '',
        examen_clinique:     form.examen_clinique || '',
        conclusion:          form.conclusion || '',
        conduite_a_tenir:    form.conduite_a_tenir || '',
      };
      const { data: updated } = await suiviService.consultations.patch(id, payload);
      setData(updated);
      setEditMode(false);
      toast.success('Consultation mise à jour');
    } catch (error) {
      toast.error(error.response?.data ? Object.values(error.response.data).flat().join(' ') : 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Consultation de suivi">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement de la consultation...
          </div>
        </div>
      </AppLayout>
    );
  }
  if (!data) return null;

  const sc = STATUT_COLORS[data.statut] || { color: '#64748b' };
  const ec = EVOLUTION_COLORS[data.evolution_maladie];
  const hasPs = data.ps_ecog !== null && data.ps_ecog !== undefined;
  const psColor = hasPs ? PS_COLORS[data.ps_ecog] : '#9ca3af';
  const vitalColor = data.patient_statut_vital === 'decede' ? '#6b7280' : '#16a34a';

  const hasParams = hasPs || data.poids_kg || data.taille_cm || data.imc || data.ta_systolique || data.ta_diastolique
    || data.frequence_cardiaque || data.temperature || data.marqueurs_biologiques;
  const hasHabitudes = data.tabac || data.alcool || data.activite_physique || data.alimentation || data.exposition_toxique;
  const hasCompteRendu = data.motif || data.examen_clinique || data.conclusion || data.conduite_a_tenir;

  const patientContext = patientForSidebar ? {
    patient: patientForSidebar,
    sections: visiblePatientSections,
    activeKey: 'suivi', // ← adaptez à la clé de section "suivi/consultations" de patientSidebar
    onSelect: handleSectionSelect,
    backPath: `/patients/${data.patient}`,
    backLabel: 'Retour au dossier patient',
  } : undefined;

  return (
    <AppLayout
      title="Consultation de suivi"
      patientContext={patientContext}
      breadcrumb={[
        { label: 'Suivi', onClick: () => navigate('/suivi') },
        { label: data.patient_nom || 'Consultation' },
      ]}
    >
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .input-st { width: 100%; padding: 9px 12px; background: #f1f5f9; border: 1px solid rgba(37,99,235,0.15); border-radius: 9px; color: #0f172a; font-size: 13px; outline: none; box-sizing: border-box; font-family: var(--font-body); }
        .label-st { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
      `}</style>

    

      {/* ── En-tête : badges + action Modifier ── */}
      {!editMode && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
         
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <button
              onClick={openEdit}
              style={{ padding: '10px 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            >
              Modifier
            </button>
          </div>
        </div>
      )}

      {/* ── Contenu ── */}
      <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: 16, padding: 24, boxShadow: '0 8px 24px rgba(15,23,42,0.025)' }}>
        {!editMode ? (
          <>
            <SectionLabel>Patient</SectionLabel>
            <Grid>
              <InfoRow label="Patient" value={data.patient_nom} />
              <InfoRow label="N° dossier" value={data.patient_numero} mono />
              <InfoRow label="Statut vital" value={data.patient_statut_vital
                ? <Pill color={vitalColor}>{STATUT_VITAL_LABELS[data.patient_statut_vital] || data.patient_statut_vital}</Pill>
                : null} />
              {data.patient_statut_vital === 'decede' && data.patient_cause_deces && (
                <InfoRow label="Cause du décès" value={data.patient_cause_deces} />
              )}
              <InfoRow label="Médecin" value={data.medecin_nom} />
              <InfoRow label="Établissement" value={data.etablissement} />
            </Grid>

            <SectionLabel style={{ marginTop: 28 }}>Consultation</SectionLabel>
            <Grid>
              <InfoRow label="Date de consultation" value={fmtDate(data.date_consultation, true)} />
              <InfoRow label="Type" value={data.type_label} />
              <InfoRow label="Statut" value={data.statut_label ? <Pill color={sc.color}>{data.statut_label}</Pill> : null} />
              <InfoRow label="Évolution tumorale" value={ec ? <Pill color={ec.color}>{ec.label}</Pill> : null} />
              {data.prochaine_consultation && <InfoRow label="Prochain RDV" value={fmtDate(data.prochaine_consultation, true)} mono />}
              {data.date_dernier_rdv && <InfoRow label="Dernier RDV" value={fmtDate(data.date_dernier_rdv, true)} mono />}
              {data.rechute && (
                <InfoRow label="Rechute" full value={
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>
                    Oui — {data.nombre_rechutes || 1} fois
                    {data.date_derniere_rechute && ` (dernière : ${fmtDate(data.date_derniere_rechute)})`}
                  </span>
                } />
              )}
            </Grid>

            {hasParams && (
              <>
                <SectionLabel style={{ marginTop: 28 }}>Paramètres cliniques</SectionLabel>
                <Grid>
                  {hasPs && (
                    <InfoRow label="Performance Status" value={
                      <Pill color={psColor} mono>PS {data.ps_ecog} — {data.ps_ecog_label}</Pill>
                    } />
                  )}
                  {data.poids_kg && <InfoRow label="Poids" value={`${data.poids_kg} kg`} />}
                  {data.taille_cm && <InfoRow label="Taille" value={`${data.taille_cm} cm`} />}
                  {data.imc && (
                    <InfoRow label="IMC" value={
                      <span style={{ fontFamily: 'var(--font-mono)', color: data.imc < 18.5 ? '#d97706' : data.imc > 30 ? '#dc2626' : '#16a34a' }}>
                        {data.imc} kg/m²
                      </span>
                    } />
                  )}
                  {(data.ta_systolique || data.ta_diastolique) && (
                    <InfoRow label="Tension artérielle" mono value={`${data.ta_systolique}/${data.ta_diastolique} mmHg`} />
                  )}
                  {data.frequence_cardiaque && <InfoRow label="Fréquence cardiaque" value={`${data.frequence_cardiaque} bpm`} />}
                  {data.temperature && <InfoRow label="Température" value={`${data.temperature} °C`} />}
                  {data.marqueurs_biologiques && <InfoRow label="Marqueurs biologiques" value={data.marqueurs_biologiques} full />}
                </Grid>
              </>
            )}

            {data.pathologies_chroniques && (
              <>
                <SectionLabel style={{ marginTop: 28 }}>Antécédents & Pathologies</SectionLabel>
                <Grid>
                  <InfoRow label="Pathologies chroniques" value={data.pathologies_chroniques} full />
                </Grid>
              </>
            )}

            {hasHabitudes && (
              <>
                <SectionLabel style={{ marginTop: 28 }}>Habitudes de vie</SectionLabel>
                <Grid>
                  {data.tabac && (
                    <InfoRow label="Tabac" value={
                      <span>
                        {TABAC_LABELS[data.tabac] || data.tabac}
                        {data.tabac_paquets_annee && <span style={{ fontFamily: 'var(--font-mono)', color: '#64748b', marginLeft: 8 }}>{data.tabac_paquets_annee} paquets/an</span>}
                      </span>
                    } />
                  )}
                  {data.alcool && <InfoRow label="Alcool" value={ALCOOL_LABELS[data.alcool] || data.alcool} />}
                  {data.activite_physique && <InfoRow label="Activité physique" value={ACTIVITE_LABELS[data.activite_physique] || data.activite_physique} />}
                  {data.alimentation && <InfoRow label="Alimentation" value={data.alimentation} />}
                  {data.exposition_toxique && (
                    <InfoRow label="Exposition toxique" full value={
                      <span style={{ color: '#d97706' }}>
                        Oui{data.exposition_toxique_detail && ` — ${data.exposition_toxique_detail}`}
                      </span>
                    } />
                  )}
                </Grid>
              </>
            )}

            {hasCompteRendu && (
              <>
                <SectionLabel style={{ marginTop: 28 }}>Compte rendu clinique</SectionLabel>
                <Grid>
                  {data.motif && <InfoRow label="Motif" value={data.motif} full />}
                  {data.examen_clinique && <InfoRow label="Examen clinique" value={data.examen_clinique} full />}
                  {data.conclusion && <InfoRow label="Conclusion" value={data.conclusion} full />}
                  {data.conduite_a_tenir && <InfoRow label="Conduite à tenir" value={data.conduite_a_tenir} full />}
                </Grid>
              </>
            )}

            <SectionLabel style={{ marginTop: 28 }}>Enregistrement</SectionLabel>
            <Grid>
              <InfoRow label="Date de création" value={data.date_creation ? new Date(data.date_creation).toLocaleString('fr-DZ') : '—'} />
              <InfoRow label="Dernière modification" value={data.date_modification ? new Date(data.date_modification).toLocaleString('fr-DZ') : '—'} />
            </Grid>

            {data.patient && (
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to={`/patients/${data.patient}`} style={{ textDecoration: 'none' }}>
                  <button style={{ padding: '9px 18px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12, color: '#334155', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Voir le dossier patient
                  </button>
                </Link>
                {data.qualite_vie_id && (
                  <Link to={`/suivi/qualite-vie/${data.qualite_vie_id}`} style={{ textDecoration: 'none' }}>
                    <button style={{ padding: '9px 18px', background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.2)', borderRadius: 12, color: '#16a34a', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Voir l'évaluation QdV associée
                    </button>
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <SectionLabel>Modifier la consultation</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Field label="Date de consultation">
                <input type="date" className="input-st" value={form.date_consultation || ''} onChange={e => set('date_consultation', e.target.value)} />
              </Field>
              <Field label="Type de consultation">
                <select className="input-st" style={{ cursor: 'pointer' }} value={form.type_consultation || ''} onChange={e => set('type_consultation', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {TYPE_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select className="input-st" style={{ cursor: 'pointer' }} value={form.statut || ''} onChange={e => set('statut', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {STATUT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Évolution">
                <select className="input-st" style={{ cursor: 'pointer' }} value={form.evolution_maladie || ''} onChange={e => set('evolution_maladie', e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {EVOLUTION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Poids (kg)">
                <input type="number" className="input-st" value={form.poids_kg ?? ''} onChange={e => set('poids_kg', e.target.value)} />
              </Field>
              <Field label="Taille (cm)">
                <input type="number" className="input-st" value={form.taille_cm ?? ''} onChange={e => set('taille_cm', e.target.value)} />
              </Field>
              <Field label="Tension systolique">
                <input type="number" className="input-st" value={form.ta_systolique ?? ''} onChange={e => set('ta_systolique', e.target.value)} />
              </Field>
              <Field label="Tension diastolique">
                <input type="number" className="input-st" value={form.ta_diastolique ?? ''} onChange={e => set('ta_diastolique', e.target.value)} />
              </Field>
              <Field label="Fréquence cardiaque">
                <input type="number" className="input-st" value={form.frequence_cardiaque ?? ''} onChange={e => set('frequence_cardiaque', e.target.value)} />
              </Field>
              <Field label="Température (°C)">
                <input type="number" className="input-st" value={form.temperature ?? ''} onChange={e => set('temperature', e.target.value)} />
              </Field>
              <Field label="Motif" full>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.motif ?? ''} onChange={e => set('motif', e.target.value)} />
              </Field>
              <Field label="Examen clinique" full>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.examen_clinique ?? ''} onChange={e => set('examen_clinique', e.target.value)} />
              </Field>
              <Field label="Conclusion" full>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.conclusion ?? ''} onChange={e => set('conclusion', e.target.value)} />
              </Field>
              <Field label="Conduite à tenir" full>
                <textarea className="input-st" rows={3} style={{ resize: 'vertical' }} value={form.conduite_a_tenir ?? ''} onChange={e => set('conduite_a_tenir', e.target.value)} />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)', justifyContent: 'flex-end' }}>
              <button onClick={cancelEdit} disabled={saving} style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 12, color: '#334155', fontSize: 13, cursor: 'pointer' }}>Annuler</button>
              <button onClick={saveEdit} disabled={saving} style={{ padding: '10px 26px', background: saving ? 'rgba(37,99,235,0.12)' : 'linear-gradient(135deg,#16a34a,#00b38a)', border: 'none', borderRadius: 12, color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}