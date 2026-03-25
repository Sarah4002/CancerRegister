import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import { WILAYAS, COMMUNES_PAR_WILAYA } from './communesAlgerie';
import toast from 'react-hot-toast';

const MOBILE_APP_BASE_URL =
  import.meta.env.VITE_MOBILE_APP_URL || 'https://votre-app-mobile.com/patient';

const ANTECEDENT_LABELS = {
  cancer_sein:         'Cancer du sein',
  cancer_colorectal:   'Cancer colorectal',
  cancer_col_uterus:   "Cancer du col de l'uterus",
  cancer_estomac:      "Cancer de l'estomac",
  cancer_poumon:       'Cancer du poumon',
  cancer_foie:         'Cancer du foie',
  cancer_prostate:     'Cancer de la prostate',
  cancer_autre:        'Autre cancer',
  diabete:             'Diabete',
  maladies_cardiaques: 'Maladies cardiaques',
  hypertension:        'Hypertension arterielle',
  aucun:               'Aucun antecedent connu',
};

function parseAntecedents(raw) {
  if (!raw) return { coches: [], commentaire: '' };
  if (raw.includes('||')) {
    const idx   = raw.indexOf('||');
    const part1 = raw.slice(0, idx);
    const part2 = raw.slice(idx + 2);
    return { coches: part1.split('|').filter(Boolean), commentaire: part2 };
  }
  return { coches: [], commentaire: raw };
}

const STATUT_COLORS = {
  nouveau:    { bg: 'rgba(155,138,251,0.15)', color: '#9b8afb', border: 'rgba(155,138,251,0.3)' },
  traitement: { bg: 'rgba(0,168,255,0.12)',   color: '#00a8ff', border: 'rgba(0,168,255,0.3)'  },
  remission:  { bg: 'rgba(0,229,160,0.12)',   color: '#00e5a0', border: 'rgba(0,229,160,0.3)'  },
  perdu:      { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623', border: 'rgba(245,166,35,0.3)' },
  decede:     { bg: 'rgba(255,77,106,0.12)',  color: '#ff4d6a', border: 'rgba(255,77,106,0.3)' },
  archive:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)'},
};

const COLOR_VARS = {
  success: { color: '#00e5a0', bg: 'rgba(0,229,160,0.1)',  border: 'rgba(0,229,160,0.25)'  },
  warning: { color: '#f5a623', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)' },
  danger:  { color: '#ff4d6a', bg: 'rgba(255,77,106,0.1)', border: 'rgba(255,77,106,0.25)' },
  muted:   { color: '#9ca3af', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.25)'},
};

// Champs editables par onglet
const EDIT_FIELDS = {
  identite: [
    { key: 'nom',                  label: 'Nom',                   type: 'text'                                                     },
    { key: 'prenom',               label: 'Prenom',                type: 'text'                                                     },
    { key: 'id_national',          label: 'N Identite nationale',  type: 'text'                                                     },
    { key: 'num_securite_sociale', label: 'N Securite sociale',    type: 'text'                                                     },
    { key: 'sexe',                 label: 'Sexe',                  type: 'select',
      options: [{ v:'M', l:'Masculin' }, { v:'F', l:'Feminin' }, { v:'U', l:'Inconnu' }]                                            },
    { key: 'date_naissance',       label: 'Date de naissance',     type: 'date'                                                     },
    { key: 'lieu_naissance',       label: 'Lieu de naissance',     type: 'text'                                                     },
    { key: 'nationalite',          label: 'Nationalite',           type: 'text'                                                     },
    { key: 'statut_vital',         label: 'Statut vital',          type: 'select',
      options: [{ v:'vivant', l:'Vivant' }, { v:'decede', l:'Decede' }, { v:'perdu', l:'Perdu de vue' }, { v:'inconnu', l:'Inconnu' }] },
    { key: 'date_deces',           label: 'Date de deces',         type: 'date'                                                     },
    { key: 'cause_deces',          label: 'Cause du deces',        type: 'text'                                                     },
  ],
  coordonnees: [
    { key: 'adresse',     label: 'Adresse',     type: 'textarea' },
    { key: 'wilaya',      label: 'Wilaya',      type: 'wilaya'   },
    { key: 'commune',     label: 'Commune',     type: 'commune'  },
    { key: 'code_postal', label: 'Code postal', type: 'text'     },
    { key: 'telephone',   label: 'Telephone',   type: 'text'     },
    { key: 'telephone2',  label: 'Telephone 2', type: 'text'     },
    { key: 'email',       label: 'Email',       type: 'email'    },
  ],
  profil: [
    { key: 'niveau_instruction', label: "Niveau d instruction", type: 'select',
      options: [{ v:'9', l:'Inconnu' }, { v:'0', l:'Aucun' }, { v:'1', l:'Primaire' }, { v:'2', l:'Moyen' }, { v:'3', l:'Secondaire' }, { v:'4', l:'Superieur' }] },
    { key: 'profession', label: 'Profession', type: 'select',
      options: [{ v:'INC', l:'Inconnu' }, { v:'AGR', l:'Agriculteur' }, { v:'FON', l:'Fonctionnaire' }, { v:'COM', l:'Commercant' }, { v:'ART', l:'Artisan' }, { v:'ETU', l:'Etudiant' }, { v:'RET', l:'Retraite' }, { v:'SEM', l:'Sans emploi' }, { v:'FFO', l:'Femme au foyer' }, { v:'PSA', l:'Professionnel de sante' }, { v:'AUT', l:'Autre' }] },
    { key: 'situation_familiale', label: 'Situation familiale', type: 'select',
      options: [{ v:'inconnu', l:'Inconnu' }, { v:'celibataire', l:'Celibataire' }, { v:'marie', l:'Marie(e)' }, { v:'divorce', l:'Divorce(e)' }, { v:'veuf', l:'Veuf/Veuve' }] },
    { key: 'nombre_enfants',    label: "Nombre d enfants",     type: 'number'  },
    { key: 'etablissement_pec', label: 'Etablissement de PEC', type: 'text'    },
    { key: 'statut_dossier',    label: 'Statut dossier',       type: 'select',
      options: [{ v:'nouveau', l:'Nouveau' }, { v:'traitement', l:'En traitement' }, { v:'remission', l:'Remission' }, { v:'perdu', l:'Perdu de vue' }, { v:'decede', l:'Decede' }, { v:'archive', l:'Archive' }] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  antecedents: [
    { key: 'antecedents_personnels', label: 'Antecedents personnels', type: 'textarea' },
    { key: 'antecedents_familiaux',  label: 'Antecedents familiaux',  type: 'textarea' },
  ],
};

// Composant champ editable
function EditField({ field, value, onChange, allValues }) {
  const base = {
    width: '100%', padding: '9px 11px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13,
    fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  };

  if (field.type === 'select') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
        <option value="">— Selectionner —</option>
        {field.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  }
  if (field.type === 'wilaya') {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
        <option value="">— Selectionner —</option>
        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
      </select>
    );
  }
  if (field.type === 'commune') {
    const wilaya   = allValues?.wilaya || '';
    const communes = wilaya ? (COMMUNES_PAR_WILAYA[wilaya] || []).sort() : [];
    return communes.length > 0 ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
        <option value="">— Selectionner —</option>
        {communes.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    ) : (
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Saisir la commune" style={base} />
    );
  }
  if (field.type === 'textarea') {
    return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} style={{ ...base, resize: 'vertical', lineHeight: 1.5 }} />;
  }
  return <input type={field.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} style={base} />;
}

function QRCodeCard({ patient }) {
  const mobileUrl = MOBILE_APP_BASE_URL + '/' + patient.id + '?ref=' + encodeURIComponent(patient.registration_number);
  const qrApiUrl  = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(mobileUrl) + '&color=2d5a3d&bgcolor=ffffff&format=png';
  const [copied, setCopied] = useState(false);
  const copyUrl = () => {
    navigator.clipboard.writeText(mobileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
      <div style={{ width: 120, height: 120, borderRadius: 'var(--radius-md)', border: '2px solid var(--border-light)', overflow: 'hidden', flexShrink: 0, background: '#fff' }}>
        <img src={qrApiUrl} alt="QR Code" width={120} height={120} style={{ display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 8 }}>QR Code — Application mobile</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
          Presentez ce code au patient pour qu'il renseigne ses habitudes de vie via son smartphone. Son identite sera pre-remplie automatiquement.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mobileUrl}</span>
          <button onClick={copyUrl} style={{ flexShrink: 0, padding: '4px 10px', background: copied ? 'rgba(0,229,160,0.1)' : 'var(--bg-card)', border: '1px solid ' + (copied ? 'rgba(0,229,160,0.4)' : 'var(--border)'), borderRadius: 6, fontSize: 11, cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-secondary)' }}>
            {copied ? 'Copie' : 'Copier'}
          </button>
        </div>
        <a href={qrApiUrl} download={'qr-' + patient.registration_number + '.png'} target="_blank" rel="noreferrer"
          style={{ display: 'inline-block', padding: '7px 14px', background: 'rgba(0,168,255,0.08)', border: '1px solid rgba(0,168,255,0.25)', borderRadius: 'var(--radius-md)', color: 'var(--accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
          Telecharger le QR code
        </a>
      </div>
    </div>
  );
}

export default function PatientDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [patient, setPatient]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('identite');

  // Mode edition
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    patientService.get(id)
      .then(({ data }) => setPatient(data))
      .catch(() => { toast.error('Patient introuvable'); navigate('/patients'); })
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleEditMode = () => {
    setEditData({ ...patient });
    setEditMode(true);
  };

  const handleCancel = () => {
    setEditData({});
    setEditMode(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...editData };
      Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });
      const { data: updated } = await patientService.update(id, payload);
      setPatient(updated);
      setEditMode(false);
      setEditData({});
      toast.success('Dossier mis a jour avec succes');
    } catch (err) {
      const errs = err.response?.data;
      const msg  = errs ? Object.values(errs).flat().join(' ') : 'Erreur lors de la sauvegarde';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key, val) => {
    setEditData(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'wilaya') next.commune = '';
      return next;
    });
  };

  if (loading) return (
    <AppLayout title="Fiche Patient">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          Chargement du dossier...
        </div>
      </div>
    </AppLayout>
  );
  if (!patient) return null;

  const sc = STATUT_COLORS[patient.statut_dossier] || STATUT_COLORS.archive;
  const { coches, commentaire } = parseAntecedents(patient.antecedents_familiaux);
  const tabHasEdit = !!EDIT_FIELDS[activeTab];

  const TABS = [
    { key: 'identite',    label: 'Identite'        },
    { key: 'coordonnees', label: 'Coordonnees'      },
    { key: 'profil',      label: 'Profil'           },
    { key: 'antecedents', label: 'Antecedents'      },
    { key: 'habitudes',   label: 'Habitudes de vie' },
    { key: 'contacts',    label: 'Contacts'         },
    { key: 'qrcode',      label: 'QR Code'          },
  ];

  return (
    <AppLayout title="Fiche Patient">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', flexShrink: 0, background: patient.sexe === 'F' ? 'linear-gradient(135deg, rgba(245,101,196,0.2), rgba(245,101,196,0.1))' : 'linear-gradient(135deg, rgba(0,168,255,0.2), rgba(0,168,255,0.1))', border: '2px solid ' + (patient.sexe === 'F' ? 'rgba(245,101,196,0.3)' : 'rgba(0,168,255,0.3)'), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: patient.sexe === 'F' ? 'rgba(245,101,196,0.9)' : 'rgba(0,168,255,0.9)' }}>
            {((patient.nom?.[0] || '') + (patient.prenom?.[0] || '')).toUpperCase()}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>
                {patient.nom} {patient.prenom}
              </h2>
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: sc.bg, color: sc.color, border: '1px solid ' + sc.border }}>
                {patient.statut_label}
              </span>
              {editMode && (
                <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: 'rgba(245,166,35,0.12)', color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)', animation: 'fadeIn 0.2s ease' }}>
                  Mode edition
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <Info val={patient.registration_number} mono />
              <Info val={patient.age ? patient.age + ' ans' : '—'} />
              <Info val={patient.wilaya || '—'} />
              <Info val={patient.commune || ''} />
              <Info val={patient.medecin_referent_info?.full_name || '—'} />
            </div>
          </div>
        </div>

        {/* Boutons header */}
        <div style={{ display: 'flex', gap: 10 }}>
          {!editMode ? (
            <>
              <button onClick={handleEditMode} style={{ padding: '9px 20px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Modifier
              </button>
              <Link to="/patients" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '9px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer' }}>
                  Retour
                </button>
              </Link>
            </>
          ) : (
            <>
              <button onClick={handleCancel} style={{ padding: '9px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 22px', background: saving ? 'var(--border)' : 'linear-gradient(135deg, #00e5a0, #00b38a)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? <><Spinner /> Enregistrement...</> : 'Enregistrer'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Bandeau mode edition ── */}
      {editMode && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: 'var(--radius-md)', fontSize: 12, color: '#f5a623', display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease' }}>
          <span style={{ fontWeight: 700 }}>Mode edition actif</span>
          {tabHasEdit
            ? '— Modifiez les champs ci-dessous puis cliquez sur Enregistrer.'
            : "— Cet onglet n'est pas editable. Naviguez vers un autre onglet pour modifier."}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', marginBottom: 16, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ flex: 1, padding: '12px 6px', background: 'none', border: 'none', borderBottom: '2px solid ' + (activeTab === t.key ? 'var(--accent)' : 'transparent'), color: activeTab === t.key ? 'var(--accent)' : 'var(--text-muted)', fontSize: 11.5, fontWeight: activeTab === t.key ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Contenu ── */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid ' + (editMode && tabHasEdit ? 'rgba(245,166,35,0.25)' : 'var(--border-light)'), borderRadius: 'var(--radius-lg)', padding: '24px', transition: 'border-color 0.2s' }}>

        {/* ══ MODE LECTURE (tous onglets quand pas en edition, ou onglets sans edition) ══ */}
        {(!editMode || !tabHasEdit) && (
          <>
            {activeTab === 'identite' && (
              <Grid>
                <InfoRow label="N Enregistrement"    value={patient.registration_number} mono />
                <InfoRow label="N Identite nationale" value={patient.id_national || '—'} mono />
                <InfoRow label="N Securite sociale"   value={patient.num_securite_sociale || '—'} mono />
                <InfoRow label="Nom complet"          value={patient.nom + ' ' + patient.prenom} />
                <InfoRow label="Sexe"                 value={patient.sexe_label} />
                <InfoRow label="Date de naissance"    value={patient.date_naissance ? new Date(patient.date_naissance).toLocaleDateString('fr-DZ') : '—'} />
                <InfoRow label="Age"                  value={patient.age ? patient.age + ' ans' : patient.age_diagnostic ? patient.age_diagnostic + ' ans (au diagnostic)' : '—'} />
                <InfoRow label="Lieu de naissance"    value={patient.lieu_naissance || '—'} />
                <InfoRow label="Nationalite"          value={patient.nationalite || '—'} />
                <InfoRow label="Statut vital"         value={patient.statut_vital_label} />
                {patient.date_deces  && <InfoRow label="Date de deces"  value={new Date(patient.date_deces).toLocaleDateString('fr-DZ')} />}
                {patient.cause_deces && <InfoRow label="Cause du deces" value={patient.cause_deces} />}
              </Grid>
            )}
            {activeTab === 'coordonnees' && (
              <Grid>
                <InfoRow label="Adresse"     value={patient.adresse || '—'} full />
                <InfoRow label="Commune"     value={patient.commune || '—'} />
                <InfoRow label="Wilaya"      value={patient.wilaya || '—'} />
                <InfoRow label="Code postal" value={patient.code_postal || '—'} mono />
                <InfoRow label="Telephone"   value={patient.telephone || '—'} mono />
                <InfoRow label="Telephone 2" value={patient.telephone2 || '—'} mono />
                <InfoRow label="Email"       value={patient.email || '—'} />
              </Grid>
            )}
            {activeTab === 'profil' && (
              <Grid>
                <InfoRow label="Niveau d instruction"  value={patient.instruction_label || patient.niveau_instruction} />
                <InfoRow label="Profession"            value={patient.profession_label || patient.profession} />
                <InfoRow label="Situation familiale"   value={patient.situation_familiale || '—'} />
                <InfoRow label="Nombre d enfants"      value={patient.nombre_enfants ?? '—'} />
                <InfoRow label="Etablissement de PEC"  value={patient.etablissement_pec || '—'} />
                <InfoRow label="Medecin referent"      value={patient.medecin_referent_info?.full_name || '—'} />
                <InfoRow label="Statut dossier"        value={patient.statut_label} />
                {patient.notes && <InfoRow label="Notes" value={patient.notes} full />}
                <InfoRow label="Enregistre le"         value={new Date(patient.date_enregistrement).toLocaleString('fr-DZ')} />
                <InfoRow label="Derniere modification" value={new Date(patient.date_modification).toLocaleString('fr-DZ')} />
              </Grid>
            )}
            {activeTab === 'antecedents' && (
              <Grid>
                <InfoRow label="Antecedents personnels" value={patient.antecedents_personnels || 'Aucun renseigne'} full />
              </Grid>
            )}
            {activeTab === 'habitudes' && (
              <div>
                <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(0,168,255,0.06)', border: '1px solid rgba(0,168,255,0.15)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Ces informations sont renseignees par le patient via l'application mobile. Consultez l'onglet <strong style={{ color: 'var(--accent)' }}>QR Code</strong> pour generer le lien de saisie.
                </div>
                <SectionLabel>Habitudes de vie</SectionLabel>
                <Grid>
                  <HabitudeRow label="Tabagisme"         value={patient.tabagisme}         colorMap={{ non:'success', ex:'warning', actif:'danger', inconnu:'muted' }}                                    labelMap={{ non:'Non-fumeur', ex:'Ex-fumeur', actif:'Fumeur actif', inconnu:'Non renseigne' }} />
                  <HabitudeRow label="Alcool"            value={patient.alcool}            colorMap={{ non:'success', oui:'danger', inconnu:'muted' }}                                                    labelMap={{ non:'Non', oui:'Oui', inconnu:'Non renseigne' }} />
                  <HabitudeRow label="Activite physique" value={patient.activite_physique} colorMap={{ sedentaire:'danger', moderee:'warning', active:'success', inconnu:'muted' }}                       labelMap={{ sedentaire:'Sedentaire', moderee:'Moderee', active:'Active', inconnu:'Non renseigne' }} />
                  <HabitudeRow label="Alimentation"      value={patient.alimentation}      colorMap={{ equilibree:'success', grasse:'warning', sucree:'warning', vegetarienne:'success', inconnu:'muted' }} labelMap={{ equilibree:'Equilibree', grasse:'Riche en graisses', sucree:'Riche en sucres', vegetarienne:'Vegetarienne/Vegane', inconnu:'Non renseigne' }} />
                </Grid>
                <SectionLabel style={{ marginTop: 24 }}>Antecedents familiaux</SectionLabel>
                {coches.length === 0 && !commentaire ? (
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', padding: '6px 0' }}>Non renseigne.</p>
                ) : (
                  <div>
                    {coches.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: commentaire ? 12 : 0 }}>
                        {coches.map(val => (
                          <span key={val} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, background: val === 'aucun' ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,106,0.08)', border: '1px solid ' + (val === 'aucun' ? 'rgba(0,229,160,0.3)' : 'rgba(255,77,106,0.2)'), color: val === 'aucun' ? '#00e5a0' : '#ff4d6a' }}>
                            {ANTECEDENT_LABELS[val] || val}
                          </span>
                        ))}
                      </div>
                    )}
                    {commentaire && (
                      <div style={{ padding: '12px 14px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Precisions</span>
                        {commentaire}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {activeTab === 'qrcode' && (
              <div>
                <QRCodeCard patient={patient} />
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 2 }}>
                  <strong style={{ color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Comment ca marche</strong>
                  1. Presentez le QR code au patient sur tablette ou imprime-le.<br />
                  2. Le patient scanne avec son smartphone.<br />
                  3. La page web s'ouvre avec son identite pre-remplie.<br />
                  4. Il coche ses habitudes de vie section par section.<br />
                  5. Les donnees sont enregistrees dans son dossier en temps reel.
                </div>
              </div>
            )}
            {activeTab === 'contacts' && (
              <div>
                {patient.contacts_urgence?.length > 0 ? (
                  patient.contacts_urgence.map((c, i) => (
                    <div key={i} style={{ padding: '14px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', marginBottom: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                      <InfoRow label="Nom"         value={c.nom + ' ' + c.prenom} />
                      <InfoRow label="Lien"        value={c.lien} />
                      <InfoRow label="Telephone"   value={c.telephone} mono />
                      {c.telephone2 && <InfoRow label="Telephone 2" value={c.telephone2} mono />}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>Aucun contact d'urgence enregistre</div>
                )}
              </div>
            )}
          </>
        )}

        {/* ══ MODE EDITION ══ */}
        {editMode && tabHasEdit && (
          <div style={{ animation: 'fadeIn 0.2s ease' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
              {EDIT_FIELDS[activeTab].map(field => (
                <div key={field.key} style={{ marginBottom: 18, gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {field.label}
                  </label>
                  <EditField field={field} value={editData[field.key] ?? ''} onChange={val => updateField(field.key, val)} allValues={editData} />
                </div>
              ))}
            </div>
            {/* Boutons bas de formulaire */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', justifyContent: 'flex-end' }}>
              <button onClick={handleCancel} style={{ padding: '10px 20px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Annuler</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 26px', background: saving ? 'var(--border)' : 'linear-gradient(135deg, #00e5a0, #00b38a)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {saving ? <><Spinner /> Enregistrement...</> : 'Enregistrer les modifications'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

// Composants utilitaires
function Spinner() {
  return <div style={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
function Info({ val, mono }) {
  return <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}><span style={{ fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: 'var(--text-primary)' }}>{val}</span></span>;
}
function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>{children}</div>;
}
function SectionLabel({ children, style: s }) {
  return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, ...s }}>{children}</div>;
}
function InfoRow({ label, value, mono, full }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: 'var(--text-primary)', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}
function HabitudeRow({ label, value, colorMap, labelMap }) {
  const cv = COLOR_VARS[colorMap[value] || 'muted'];
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: cv.bg, color: cv.color, border: '1px solid ' + cv.border }}>
        {labelMap[value] || value || '—'}
      </span>
    </div>
  );
}