import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { examenService } from '../../services/examenService';
import { diagnosticService } from '../../services/diagnosticService';
import { traitementService } from '../../services/traitementService';
import { suiviService } from '../../services/suiviService';
import { AppLayout } from '../../components/layout/Sidebar';
import ExamenModal from '../../components/patients/ExamenModal';
import { WILAYAS, COMMUNES_PAR_WILAYA } from './communesAlgerie';
import toast from 'react-hot-toast';

const MOBILE_APP_BASE_URL = (
  import.meta.env.VITE_MOBILE_APP_URL || 'https://patientlifestyleform.vercel.app/patient'
).replace(/\/+$/, '');

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
  nouveau:    { bg: 'rgba(155,138,251,0.15)', color: '#7c3aed', border: 'rgba(155,138,251,0.3)' },
  traitement: { bg: 'rgba(0,168,255,0.12)',   color: '#2563eb', border: 'rgba(0,168,255,0.3)'  },
  remission:  { bg: 'rgba(0,229,160,0.12)',   color: '#16a34a', border: 'rgba(0,229,160,0.3)'  },
  perdu:      { bg: 'rgba(245,166,35,0.12)',  color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  decede:     { bg: 'rgba(255,77,106,0.12)',  color: '#dc2626', border: 'rgba(255,77,106,0.3)' },
  archive:    { bg: 'rgba(107,114,128,0.12)', color: '#9ca3af', border: 'rgba(107,114,128,0.3)'},
};

const COLOR_VARS = {
  success: { color: '#16a34a', bg: 'rgba(0,229,160,0.1)',  border: 'rgba(0,229,160,0.25)'  },
  warning: { color: '#d97706', bg: 'rgba(245,166,35,0.1)', border: 'rgba(245,166,35,0.25)' },
  danger:  { color: '#dc2626', bg: 'rgba(255,77,106,0.1)', border: 'rgba(255,77,106,0.25)' },
  muted:   { color: '#9ca3af', bg: 'rgba(107,114,128,0.1)',border: 'rgba(107,114,128,0.25)'},
};

const EXAMEN_STATUT_COLORS = {
  prescrit:   { bg: 'rgba(155,138,251,0.1)', color: '#7c3aed' },
  en_attente: { bg: 'rgba(245,166,35,0.1)',  color: '#d97706' },
  realise:    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a' },
  annule:     { bg: 'rgba(255,77,106,0.1)',  color: '#dc2626' },
};

// ── Reprises du design de DiagnosticsPage pour garder une cohérence visuelle ──
const STADE_COLORS = {
  '0':    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'I':    { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IA':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'IB':   { bg: 'rgba(0,229,160,0.12)',  color: '#16a34a', border: 'rgba(0,229,160,0.3)' },
  'II':   { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIA':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'IIB':  { bg: 'rgba(245,166,35,0.12)', color: '#d97706', border: 'rgba(245,166,35,0.3)' },
  'III':  { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIA': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIB': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IIIC': { bg: 'rgba(255,120,50,0.12)', color: '#ff7832', border: 'rgba(255,120,50,0.3)' },
  'IV':   { bg: 'rgba(255,77,106,0.12)', color: '#dc2626', border: 'rgba(255,77,106,0.3)' },
  'U':    { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af', border: 'rgba(107,114,128,0.2)' },
};

function StageBadge({ stade, label }) {
  const c = STADE_COLORS[stade] || STADE_COLORS['U'];
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      fontFamily: 'var(--font-mono)',
    }}>{label || stade}</span>
  );
}

function TNMBadge({ tnm }) {
  if (!tnm || tnm === '—') return <span style={{ color: '#64748b', fontSize: 12 }}>—</span>;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 6, fontSize: 11,
      background: 'rgba(0,168,255,0.08)',
      border: '1px solid rgba(0,168,255,0.2)',
      color: '#2563eb', fontFamily: 'var(--font-mono)', fontWeight: 600,
    }}>{tnm}</span>
  );
}

const EDIT_FIELDS = {
  identite: [
    { key: 'nom',                  label: 'Nom',                   type: 'text' },
    { key: 'prenom',               label: 'Prenom',                type: 'text' },
    { key: 'nom_jeune_fille',      label: 'Nom de jeune fille',    type: 'text' },
    { key: 'id_national',          label: 'N Identite nationale',  type: 'text' },
    { key: 'num_securite_sociale', label: 'N Securite sociale',    type: 'text' },
    { key: 'num_matricule',        label: 'Matricule',             type: 'text' },
    { key: 'sexe',                 label: 'Sexe',                  type: 'select',
      options: [{ v:'M', l:'Masculin' }, { v:'F', l:'Feminin' }, { v:'U', l:'Inconnu' }] },
    { key: 'date_naissance',       label: 'Date de naissance',     type: 'date' },
    { key: 'lieu_naissance',       label: 'Lieu de naissance',     type: 'text' },
    { key: 'nationalite',          label: 'Nationalite',           type: 'text' },
    { key: 'statut_vital',         label: 'Statut vital',          type: 'select',
      options: [{ v:'vivant', l:'Vivant' }, { v:'decede', l:'Decede' }, { v:'perdu', l:'Perdu de vue' }, { v:'inconnu', l:'Inconnu' }] },
    { key: 'date_deces',           label: 'Date de deces',         type: 'date' },
    { key: 'cause_deces',          label: 'Cause du deces',        type: 'text' },
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
    { key: 'service_clinique',  label: 'Service/Clinique',     type: 'text'    },
    { key: 'statut_dossier',    label: 'Statut dossier',       type: 'select',
      options: [{ v:'nouveau', l:'Nouveau' }, { v:'traitement', l:'En traitement' }, { v:'remission', l:'Remission' }, { v:'perdu', l:'Perdu de vue' }, { v:'decede', l:'Decede' }, { v:'archive', l:'Archive' }] },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
  antecedents: [
    { key: 'antecedents_personnels', label: 'Antecedents personnels', type: 'textarea' },
    { key: 'antecedents_familiaux',  label: 'Antecedents familiaux',  type: 'textarea' },
  ],
};

// ── Sections affichées dans le sidebar global lorsqu'on est sur la fiche patient ──
const PATIENT_SECTIONS = [
  { key: 'identite',    label: 'Identité & Profil'  },
  { key: 'clinique',    label: 'Infos Cliniques'    },
  { key: 'diagnostic',  label: 'Diagnostic'         },
  { key: 'examens',     label: 'Examens & Bilans'   },
  { key: 'traitements', label: 'Traitements'        },
  { key: 'suivi',       label: 'Suivi Clinique'     },
];

function EditField({ field, value, onChange, allValues }) {
  const base = { width: '100%', padding: '9px 11px', background: '#f1f5f9', border: '1px solid #2563eb', borderRadius: '12px', color: '#0f172a', fontSize: 13, fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' };
  if (field.type === 'select') return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
      <option value="">— Selectionner —</option>{field.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
  if (field.type === 'wilaya') return (
    <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
      <option value="">— Selectionner —</option>{WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
    </select>
  );
  if (field.type === 'commune') {
    const wilaya = allValues?.wilaya || '';
    const communes = wilaya ? (COMMUNES_PAR_WILAYA[wilaya] || []).sort() : [];
    return communes.length > 0 ? (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={{ ...base, cursor: 'pointer' }}>
        <option value="">— Selectionner —</option>{communes.map(c => <option key={c} value={c}>{c}</option>)}
      </select>
    ) : <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="Saisir la commune" style={base} />;
  }
  if (field.type === 'textarea') return <textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={3} style={{ ...base, resize: 'vertical', lineHeight: 1.5 }} />;
  return <input type={field.type || 'text'} value={value || ''} onChange={e => onChange(e.target.value)} style={base} />;
}

function QRCodeCard({ patient }) {
  const publicUrl = `${MOBILE_APP_BASE_URL}/${encodeURIComponent(patient.id)}`;
  const mobileUrl = `${publicUrl}?ref=${encodeURIComponent(patient.registration_number)}&token=${encodeURIComponent(patient.registration_number)}`;
  const qrApiUrl  = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=' + encodeURIComponent(mobileUrl) + '&color=2d5a3d&bgcolor=ffffff&format=png';
  const [copied, setCopied] = useState(false);
  const copyUrl = () => { navigator.clipboard.writeText(mobileUrl).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  return (
    <div style={{ border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px', padding: '20px 24px', display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 20 }}>
      <div style={{ width: 120, height: 120, borderRadius: '12px', border: '2px solid rgba(37,99,235,0.08)', overflow: 'hidden', flexShrink: 0, background: '#fff' }}>
        <img src={qrApiUrl} alt="QR Code" width={120} height={120} style={{ display: 'block' }} onError={e => { e.target.style.display = 'none'; }} />
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#0f172a', marginBottom: 8 }}>QR Code — Application mobile</div>
        <p style={{ fontSize: 12, color: '#334155', marginBottom: 12, lineHeight: 1.6 }}>Presentez ce code au patient pour qu'il renseigne ses habitudes de vie via son smartphone. Son identite sera pre-remplie automatiquement.</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', padding: '8px 12px', marginBottom: 10 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{mobileUrl}</span>
          <button onClick={copyUrl} style={{ flexShrink: 0, padding: '4px 10px', background: copied ? 'rgba(0,229,160,0.1)' : '#ffffff', border: '1px solid ' + (copied ? 'rgba(0,229,160,0.4)' : 'rgba(37,99,235,0.12)'), borderRadius: 6, fontSize: 11, cursor: 'pointer', color: copied ? '#16a34a' : '#334155' }}>{copied ? 'Copie' : 'Copier'}</button>
        </div>
        <a href={qrApiUrl} download={'qr-' + patient.registration_number + '.png'} target="_blank" rel="noreferrer" style={{ display: 'inline-block', padding: '7px 14px', background: 'rgba(0,168,255,0.08)', border: '1px solid rgba(0,168,255,0.25)', borderRadius: '12px', color: '#2563eb', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>Telecharger le QR code</a>
      </div>
    </div>
  );
}

export default function PatientDossierPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [examens, setExamens] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [traitements, setTraitements] = useState({});
  const [suivi, setSuivi] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  const [activeMainTab, setActiveMainTab] = useState('identite');
  const [activeSubTab, setActiveSubTab] = useState('clinique');
  const [activeIdentiteTab, setActiveIdentiteTab] = useState('identite');
  
  const [showExamenModal, setShowExamenModal] = useState(false);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const [dossierEditMode, setDossierEditMode] = useState(false);
  const [dossierForm, setDossierForm] = useState({});

  useEffect(() => {
    const invalid = id === undefined || id === null || id === '' || id === 'undefined';
    if (invalid) {
      console.warn('[PatientDossierPage] invalid route param id:', id);
      toast.error('Identifiant patient manquant');
      navigate('/patients');
      return;
    }

    loadAllData();
  }, [id, navigate]);

  const loadAllData = async () => {
    if (id === undefined || id === null || id === '' || id === 'undefined') return;
    setLoading(true);
    try {
      const [ resPatient, resDossier, resExamens, resDiag, resTrt, resSuiv ] = await Promise.all([
        patientService.get(id).catch(e => { toast.error('Patient introuvable'); navigate('/patients'); throw e; }),
        patientService.getDossier(id).catch(() => ({ data: {} })),
        examenService.list({ patient: id }).catch(() => ({ data: [] })),
        diagnosticService.parPatient(id).catch(() => ({ data: [] })),
        traitementService.parPatient(id).catch(() => ({ data: {} })),
        suiviService.consultations.parPatient(id).catch(() => ({ data: [] }))
      ]);
      setPatient(resPatient.data);
      setDossier(resDossier.data);
      setExamens(resExamens.data?.results || resExamens.data || []);
      setDiagnostics(resDiag.data || []);
      setTraitements(resTrt.data || {});
      setSuivi(resSuiv.data || []);
    } catch (err) { } finally { setLoading(false); }
  };

  const handleEditMode = () => { setActiveMainTab('identite'); setActiveIdentiteTab('identite'); setEditData({ ...patient }); setEditMode(true); };
  const handleCancel = () => { setEditData({}); setEditMode(false); };

  const handleUpdatePatient = async () => {
    setSaving(true);
    try {
      const payload = { ...editData };
      const nonStringFields = ['date_naissance', 'age_diagnostic', 'nombre_enfants', 'date_deces'];
      Object.keys(payload).forEach(k => { 
        if (payload[k] === null && !nonStringFields.includes(k)) {
           payload[k] = '';
        }
        if (payload[k] === '') {
           payload[k] = nonStringFields.includes(k) ? null : '';
        }
      });
      await patientService.patch(id, payload);
      await loadAllData();
      setEditMode(false);
      setEditData({});
      toast.success('Dossier mis a jour avec succes');
    } catch (err) { 
        console.error(err);
        const msg = err.response?.data ? JSON.stringify(err.response.data) : 'Erreur lors de la sauvegarde';
        toast.error('Erreur API: ' + msg.substring(0, 100)); 
    } finally { setSaving(false); }
  };

  const handleUpdateDossier = async () => {
    setSaving(true);
    try {
      await patientService.updateDossier(id, dossierForm);
      await loadAllData();
      setDossierEditMode(false);
      toast.success('Dossier médical mis à jour');
    } catch (error) { toast.error('Erreur lors de la mise à jour'); } finally { setSaving(false); }
  };

  const updateField = (key, val) => {
    setEditData(prev => {
      const next = { ...prev, [key]: val };
      if (key === 'wilaya') next.commune = '';
      return next;
    });
  };

  // ── Mapping entre les sections du sidebar global et les onglets internes ──
  const activeSectionKey = activeMainTab === 'dossier' ? activeSubTab : activeMainTab;

  const handleSectionSelect = (key) => {
    if (['clinique', 'diagnostic', 'examens'].includes(key)) {
      setActiveMainTab('dossier');
      setActiveSubTab(key);
    } else {
      setActiveMainTab(key);
    }
  };

  const currentSectionLabel = PATIENT_SECTIONS.find(s => s.key === activeSectionKey)?.label || '';

  if (loading || !patient) return (
    <AppLayout title="Fiche Patient">
       <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#64748b' }}>
         <div style={{ textAlign: 'center' }}>
           <div style={{ width: 36, height: 36, border: '3px solid rgba(37,99,235,0.12)', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
           Chargement du dossier...
         </div>
       </div>
    </AppLayout>
  );

  const sc = STATUT_COLORS[patient.statut_dossier] || STATUT_COLORS.archive;
  const { coches, commentaire } = parseAntecedents(patient.antecedents_familiaux);
  const tabHasEdit = !!EDIT_FIELDS[activeIdentiteTab];

  const ID_TABS = [
    { key: 'identite',    label: 'Identite'        },
    { key: 'coordonnees', label: 'Coordonnees'      },
    { key: 'profil',      label: 'Profil'           },
    { key: 'antecedents', label: 'Antecedents'      },
    { key: 'habitudes',   label: 'Habitudes de vie' },
    { key: 'contacts',    label: 'Contacts'         },
    { key: 'qrcode',      label: 'QR Code'          },
  ];

  const DOSSIER_TABS = [
    { key: 'clinique',   label: 'Infos Cliniques' },
    { key: 'diagnostic', label: 'Diagnostic'      },
    { key: 'examens',    label: 'Examens & Bilans'},
  ];

  return (
    <AppLayout
      title="Fiche Patient"
      patientContext={{
        patient,
        sections: PATIENT_SECTIONS,
        activeKey: activeSectionKey,
        onSelect: handleSectionSelect,
      }}
      breadcrumb={[
        { label: 'Patients', onClick: () => navigate('/patients') },
        { label: `${patient.nom} ${patient.prenom}`, onClick: () => setActiveMainTab('identite') },
        { label: currentSectionLabel },
      ]}
    >
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
        .main-content { flex: 1; background: #ffffff; border: 1px solid rgba(37,99,235,0.08); border-radius: 12px; padding: 24px; min-height: 500px; }
        .input-st { width: 100%; padding: 8px 12px; background: #f1f5f9; border: 1px solid rgba(37,99,235,0.12); border-radius: 6px; color: #0f172a; font-size: 13px; outline: none; box-sizing: border-box; }
        .label-st { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-bottom: 6px; font-weight: 600; }
      `}</style>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:20, marginBottom:24, flexWrap:'wrap', padding:'18px 22px', background:'#ffffff', border:'1px solid rgba(37,99,235,0.08)', borderRadius:16 }}>
        
        
      </div>

      {editMode && activeMainTab === 'identite' && (
        <div style={{ marginBottom: 14, padding: '10px 16px', background: 'rgba(245,166,35,0.06)', border: '1px solid rgba(245,166,35,0.2)', borderRadius: '12px', fontSize: 12, color: '#d97706', display: 'flex', alignItems: 'center', gap: 8, animation: 'fadeIn 0.2s ease' }}>
          <span style={{ fontWeight: 700 }}>Mode edition actif</span>
          {tabHasEdit ? '— Modifiez les champs ci-dessous puis cliquez sur Enregistrer.' : "— Cet onglet n'est pas editable. Naviguez vers un autre onglet pour modifier."}
        </div>
      )}

      {/* ── Contenu (la navigation entre sections se fait désormais via le sidebar global) ── */}
      <div className="main-content">
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
         
         
        </div>
          {/* == IDENTITe & PROFIL == */}
          {activeMainTab === 'identite' && (
            <>
             <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
               <button type="button" onClick={handleEditMode} style={{ padding:'10px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                 Modifier le patient
               </button>
             </div>
              <div style={{ display: 'flex', marginBottom: 16, background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                {ID_TABS.map(t => (
                  <button key={t.key} onClick={() => setActiveIdentiteTab(t.key)} style={{ flex: 1, padding: '12px 6px', background: 'none', border: 'none', borderBottom: '2px solid ' + (activeIdentiteTab === t.key ? '#2563eb' : 'transparent'), color: activeIdentiteTab === t.key ? '#2563eb' : '#64748b', fontSize: 11.5, fontWeight: activeIdentiteTab === t.key ? 600 : 400, cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
                    {t.label}
                  </button>
                ))}
              </div>

              {!editMode || !tabHasEdit ? (
                <>
                  {activeIdentiteTab === 'identite' && (
                    <Grid>
                      <InfoRow label="N Enregistrement"    value={patient.registration_number} mono />
                      <InfoRow label="N Identite nationale" value={patient.id_national || '—'} mono />
                      <InfoRow label="N Securite sociale"   value={patient.num_securite_sociale || '—'} mono />
                      <InfoRow label="Matricule"            value={patient.num_matricule || '—'} mono />
                      <InfoRow label="Nom complet"          value={patient.nom + ' ' + patient.prenom} />
                      <InfoRow label="Nom de jeune fille"   value={patient.nom_jeune_fille || '—'} />
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
                  {activeIdentiteTab === 'coordonnees' && (
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
                  {activeIdentiteTab === 'profil' && (
                    <Grid>
                      <InfoRow label="Niveau d instruction"  value={patient.instruction_label || patient.niveau_instruction} />
                      <InfoRow label="Profession"            value={patient.profession_label || patient.profession} />
                      <InfoRow label="Situation familiale"   value={patient.situation_familiale || '—'} />
                      <InfoRow label="Nombre d enfants"      value={patient.nombre_enfants ?? '—'} />
                      <InfoRow label="Etablissement de PEC"  value={patient.etablissement_pec || '—'} />
                      <InfoRow label="Service Clinique"      value={patient.service_clinique || '—'} />
                      <InfoRow label="Medecin referent"      value={patient.medecin_referent_info?.full_name || '—'} />
                      <InfoRow label="Statut dossier"        value={patient.statut_label} />
                      {patient.notes && <InfoRow label="Notes" value={patient.notes} full />}
                      <InfoRow label="Enregistre le"         value={new Date(patient.date_enregistrement).toLocaleString('fr-DZ')} />
                      <InfoRow label="Derniere modification" value={new Date(patient.date_modification).toLocaleString('fr-DZ')} />
                    </Grid>
                  )}
                  {activeIdentiteTab === 'antecedents' && (
                    <Grid>
                      <InfoRow label="Antecedents personnels" value={patient.antecedents_personnels || 'Aucun renseigne'} full />
                    </Grid>
                  )}
                  {activeIdentiteTab === 'habitudes' && (
                    <div>
                      <div style={{ marginBottom: 20, padding: '10px 14px', background: 'rgba(0,168,255,0.06)', border: '1px solid rgba(0,168,255,0.15)', borderRadius: '12px', fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                        Ces informations sont renseignees par le patient via l'application mobile. Consultez l'onglet <strong style={{ color: '#2563eb' }}>QR Code</strong> pour generer le lien de saisie.
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
                        <p style={{ fontSize: 13, color: '#64748b', fontStyle: 'italic', padding: '6px 0' }}>Non renseigne.</p>
                      ) : (
                        <div>
                          {coches.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: commentaire ? 12 : 0 }}>
                              {coches.map(val => (
                                <span key={val} style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 500, background: val === 'aucun' ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,106,0.08)', border: '1px solid ' + (val === 'aucun' ? 'rgba(0,229,160,0.3)' : 'rgba(255,77,106,0.2)'), color: val === 'aucun' ? '#16a34a' : '#dc2626' }}>
                                  {ANTECEDENT_LABELS[val] || val}
                                </span>
                              ))}
                            </div>
                          )}
                          {commentaire && (
                            <div style={{ padding: '12px 14px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
                              <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5, color: '#64748b', display: 'block', marginBottom: 4 }}>Precisions</span>
                              {commentaire}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {activeIdentiteTab === 'qrcode' && <QRCodeCard patient={patient} />}
                  {activeIdentiteTab === 'contacts' && (
                    <div>
                      {patient.contacts_urgence?.length > 0 ? (
                        patient.contacts_urgence.map((c, i) => (
                          <div key={i} style={{ padding: '14px 18px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', marginBottom: 10, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                            <InfoRow label="Nom"         value={c.nom + ' ' + c.prenom} />
                            <InfoRow label="Lien"        value={c.lien} />
                            <InfoRow label="Telephone"   value={c.telephone} mono />
                            {c.telephone2 && <InfoRow label="Telephone 2" value={c.telephone2} mono />}
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: 'center', padding: 32, color: '#64748b', fontSize: 13 }}>Aucun contact d'urgence enregistre</div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 28px' }}>
                    {EDIT_FIELDS[activeIdentiteTab].map(field => (
                      <div key={field.key} style={{ marginBottom: 18, gridColumn: field.type === 'textarea' ? '1 / -1' : 'auto' }}>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                          {field.label}
                        </label>
                        <EditField field={field} value={editData[field.key] ?? ''} onChange={val => updateField(field.key, val)} allValues={editData} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)', justifyContent: 'flex-end' }}>
                    <button onClick={handleCancel} style={{ padding: '10px 20px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px', color: '#334155', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Annuler</button>
                    <button onClick={handleUpdatePatient} disabled={saving} style={{ padding: '10px 26px', background: saving ? 'rgba(37,99,235,0.12)' : 'linear-gradient(135deg, #16a34a, #00b38a)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: 8 }}>
                      {saving ? 'Enregistrement en cours...' : 'Enregistrer les modifications'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* == DOSSIER MeDICAL == */}
          {activeMainTab === 'dossier' && (
             <div>
               {/* Onglets internes conservés pour naviguer entre Clinique / Diagnostic / Examens
                   (également synchronisés avec le sidebar global via activeSubTab) */}
              

               {activeSubTab === 'clinique' && (
                 <div style={{ animation: 'fadeIn 0.2s ease' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <SectionLabel style={{ margin: 0 }}>Constantes & Actes</SectionLabel>
                     {!dossierEditMode ? (
                       <button onClick={() => { setDossierForm(dossier || {}); setDossierEditMode(true); }} style={btnSt}>Modifier le dossier</button>
                     ) : (
                       <div style={{ display: 'flex', gap: 10 }}>
                         <button onClick={() => setDossierEditMode(false)} style={btnStSecondary}>Annuler</button>
                         <button onClick={handleUpdateDossier} disabled={saving} style={btnStSuccess}>Enregistrer</button>
                       </div>
                     )}
                   </div>

                   {!dossierEditMode ? (
                     <Grid>
                       <InfoRow label="Tension arterielle" value={dossier?.tension_arterielle} />
                       <InfoRow label="Temperature" value={dossier?.temperature ? `${dossier.temperature} °C` : '—'} />
                       <InfoRow label="Pouls" value={dossier?.pouls ? `${dossier.pouls} bpm` : '—'} />
                       <InfoRow label="Glycemie" value={dossier?.glycemie ? `${dossier.glycemie} g/L` : '—'} />
                       <InfoRow label="Taille / Poids" value={dossier?.taille_cm || dossier?.poids_kg ? `${dossier?.taille_cm || '—'} cm / ${dossier?.poids_kg || '—'} kg` : '—'} />
                       <InfoRow label="Allergies connues" value={dossier?.allergies} full />
                       <InfoRow label="Acte chirurgical precedent" value={dossier?.acte_chirurgical} full />
                     </Grid>
                   ) : (
                     <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px', animation: 'fadeIn 0.2s ease' }}>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Tension arterielle</label><input className="input-st" value={dossierForm.tension_arterielle || ''} onChange={e => setDossierForm({...dossierForm, tension_arterielle: e.target.value})} /></div>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Temperature (°C)</label><input className="input-st" type="number" value={dossierForm.temperature || ''} onChange={e => setDossierForm({...dossierForm, temperature: e.target.value})} /></div>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Pouls (bpm)</label><input className="input-st" type="number" value={dossierForm.pouls || ''} onChange={e => setDossierForm({...dossierForm, pouls: e.target.value})} /></div>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Glycemie (g/L)</label><input className="input-st" type="number" step="0.01" value={dossierForm.glycemie || ''} onChange={e => setDossierForm({...dossierForm, glycemie: e.target.value})} /></div>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Taille (cm)</label><input className="input-st" type="number" value={dossierForm.taille_cm || ''} onChange={e => setDossierForm({...dossierForm, taille_cm: e.target.value})} /></div>
                       <div style={{ marginBottom: 14 }}><label className="label-st">Poids (kg)</label><input className="input-st" type="number" value={dossierForm.poids_kg || ''} onChange={e => setDossierForm({...dossierForm, poids_kg: e.target.value})} /></div>
                       <div style={{ gridColumn: '1 / -1', marginBottom: 14 }}><label className="label-st">Allergies</label><textarea className="input-st" value={dossierForm.allergies || ''} onChange={e => setDossierForm({...dossierForm, allergies: e.target.value})} rows={3} style={{resize: 'vertical'}} /></div>
                       <div style={{ gridColumn: '1 / -1', marginBottom: 14 }}><label className="label-st">Acte chirurgical precedent</label><textarea className="input-st" value={dossierForm.acte_chirurgical || ''} onChange={e => setDossierForm({...dossierForm, acte_chirurgical: e.target.value})} rows={3} style={{resize: 'vertical'}} /></div>
                     </div>
                   )}
                 </div>
               )}

               {activeSubTab === 'diagnostic' && (
                 <div style={{ animation: 'fadeIn 0.2s ease' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <SectionLabel style={{ margin: 0 }}>Diagnostic(s) associé(s)</SectionLabel>
                     <Link to={`/diagnostics/nouveau?patient=${id}`} state={{ patientContext: patient }} style={{ textDecoration: 'none' }}>
                       <button style={addBtnStyle}>
                         <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                         </svg>
                         Ajouter un diagnostic
                       </button>
                     </Link>
                   </div>

                   {diagnostics.length === 0 ? (
                     <div style={{ padding: 48, textAlign: 'center' }}>
                       <div style={{ fontSize: 40, marginBottom: 12 }}></div>
                       <div style={{ fontSize: 14, color: '#64748b' }}>Aucun diagnostic recensé</div>
                     </div>
                   ) : (
                     <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: '#f1f5f9' }}>
                             {['Date', 'Localisation', 'Morphologie', 'TNM', 'Stade', 'Grade', 'Base Diag.', ''].map(h => (
                               <th key={h} style={thStyle}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {diagnostics.map((d, i) => (
                             <tr key={d.id}
                               onClick={() => navigate(`/diagnostics/${d.id}`)}
                               style={{ cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                               onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                               onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                             >
                               <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                 {d.date_diagnostic ? new Date(d.date_diagnostic).toLocaleDateString('fr-DZ') : '—'}
                               </td>
                               <td style={tdStyle}>
                                 <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#2563eb', marginBottom: 2 }}>
                                   {d.categorie_cancer === 'liquide' ? 'HEMATO' : d.topographie_code}
                                 </div>
                                 <div style={{ fontSize: 11.5, color: '#334155', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                   {d.diagnostic_resume || d.topographie_libelle || '—'}
                                 </div>
                               </td>
                               <td style={tdStyle}>
                                 <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#7c3aed', marginBottom: 2 }}>{d.morphologie_code}</div>
                                 <div style={{ fontSize: 11, color: '#64748b', maxWidth: 150, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.morphologie_libelle || '—'}</div>
                               </td>
                               <td style={tdStyle}><TNMBadge tnm={d.tnm_complet} /></td>
                               <td style={tdStyle}><StageBadge stade={d.stade_ajcc} label={d.stade_label} /></td>
                               <td style={{ ...tdStyle, fontSize: 11, color: '#64748b' }}>{d.grade_label || '—'}</td>
                               <td style={{ ...tdStyle, fontSize: 11, color: '#64748b' }}>{d.base_diag_label || d.base_diagnostic || '—'}</td>
                               <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                 <Link to={`/diagnostics/${d.id}`} style={{ textDecoration: 'none' }}>
                                   <button style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                                 </Link>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                       </table>
                     </div>
                   )}
                 </div>
               )}

               {activeSubTab === 'examens' && (
                 <div style={{ animation: 'fadeIn 0.2s ease' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                     <SectionLabel style={{ margin: 0 }}>Examens & Bilans</SectionLabel>
                     <button onClick={() => setShowExamenModal(true)} style={addBtnStyle}>
                       <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                       </svg>
                       Prescrire un examen
                     </button>
                   </div>
                   <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                     <thead>
                       <tr style={{ borderBottom: '1px solid rgba(37,99,235,0.12)', color: '#64748b' }}>
                         <th style={{ padding: '12px 8px', textAlign: 'left' }}>Categorie</th>
                         <th style={{ padding: '12px 8px', textAlign: 'left' }}>Examen</th>
                         <th style={{ padding: '12px 8px', textAlign: 'left' }}>Valeur</th>
                         <th style={{ padding: '12px 8px', textAlign: 'left' }}>Statut</th>
                         <th style={{ padding: '12px 8px', textAlign: 'right' }}>Prescrit le</th>
                       </tr>
                     </thead>
                     <tbody>
                       {examens.length === 0 ? (
                         <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>Aucun examen enregistré.</td></tr>
                       ) : examens.map(ex => {
                         const st = EXAMEN_STATUT_COLORS[ex.statut] || EXAMEN_STATUT_COLORS.en_attente;
                         return (
                           <tr key={ex.id} style={{ borderBottom: '1px solid rgba(37,99,235,0.08)' }}>
                             <td style={{ padding: '12px 8px', color: '#0f172a', fontWeight: 500 }}>{ex.categorie}</td>
                             <td style={{ padding: '12px 8px', color: '#334155' }}>{ex.nom_examen}</td>
                             <td style={{ padding: '12px 8px', color: '#0f172a', fontWeight: 600 }}>{ex.valeur || '—'}</td>
                             <td style={{ padding: '12px 8px' }}><span style={{ padding: '4px 8px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>{ex.statut}</span></td>
                             <td style={{ padding: '12px 8px', textAlign: 'right', color: '#64748b' }}>{new Date(ex.date_prescription).toLocaleDateString('fr-DZ')}</td>
                           </tr>
                         );
                       })}
                     </tbody>
                   </table>
                 </div>
               )}
             </div>
          )}

          {/* == TRAITEMENTS == */}
          {activeMainTab === 'traitements' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionLabel style={{ margin: 0 }}>Historique des Traitements</SectionLabel>
                <Link to={`/traitements/nouveau?patient=${id}`} state={{ patientContext: patient }} style={{ textDecoration: 'none' }}>
                  <button style={addBtnStyle}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    Ajouter un traitement
                  </button>
                </Link>
              </div>

              {(() => {
                const allTraitements = Object.entries(traitements).flatMap(([type, list]) =>
                  (list || []).map(t => ({ ...t, _type: type }))
                );
                if (allTraitements.length === 0) {
                  return (
                    <div style={{ padding: 48, textAlign: 'center' }}>
                      <div style={{ fontSize: 14, color: '#64748b' }}>Aucun traitement trouvé.</div>
                    </div>
                  );
                }
                return (
                  <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f1f5f9' }}>
                          {['Type', 'Phase', 'Statut', 'Début', 'Fin', ''].map(h => (
                            <th key={h} style={thStyle}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allTraitements.map((t, i) => (
                          <tr key={t.id}
                            onClick={() => navigate(`/traitements/${t._type}/${t.id}`)}
                            style={{ cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                          >
                            <td style={{ ...tdStyle, textTransform: 'capitalize', color: '#2563eb', fontWeight: 600, fontSize: 12 }}>{t._type}</td>
                            <td style={{ ...tdStyle, fontSize: 12.5 }}>{t.phase_traitement || '—'}</td>
                            <td style={tdStyle}>
                              <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>
                                {t.statut_traitement || '—'}
                              </span>
                            </td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.date_debut ? new Date(t.date_debut).toLocaleDateString('fr-DZ') : '—'}</td>
                            <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{t.date_fin ? new Date(t.date_fin).toLocaleDateString('fr-DZ') : '—'}</td>
                            <td style={tdStyle} onClick={e => e.stopPropagation()}>
                              <button onClick={() => navigate(`/traitements/${t._type}/${t.id}`)} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </div>
          )}

          {/* == SUIVI CLINIQUE == */}
          {activeMainTab === 'suivi' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <SectionLabel style={{ margin: 0 }}>Consultations & Suivi</SectionLabel>
                 <Link to={`/suivi/consultations/nouveau?patient=${id}`} state={{ patientContext: patient }} style={{ textDecoration: 'none' }}>
                   <button style={addBtnStyle}>
                     <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                     </svg>
                     Ajouter un suivi clinique
                   </button>
                 </Link>
               </div>

               {suivi.length === 0 ? (
                 <div style={{ padding: 48, textAlign: 'center' }}>
                   <div style={{ fontSize: 14, color: '#64748b' }}>Aucune consultation enregistrée.</div>
                 </div>
               ) : (
                 <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                     <thead>
                       <tr style={{ background: '#f1f5f9' }}>
                         {['Date', 'Type', 'PS ECOG', 'Poids', 'Statut', ''].map(h => (
                           <th key={h} style={thStyle}>{h}</th>
                         ))}
                       </tr>
                     </thead>
                     <tbody>
                       {suivi.map((c, i) => (
                         <tr key={c.id}
                           onClick={() => navigate(`/suivi/consultations/${c.id}`)}
                           style={{ cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                           onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                           onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                         >
                           <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.date_consultation ? new Date(c.date_consultation).toLocaleDateString('fr-DZ') : '—'}</td>
                           <td style={{ ...tdStyle, fontSize: 12.5 }}>{c.type_consultation_label || c.type_consultation || '—'}</td>
                           <td style={{ ...tdStyle, fontSize: 12.5 }}>{c.ps_ecog ?? '—'}</td>
                           <td style={{ ...tdStyle, fontSize: 12.5 }}>{c.poids_kg ? `${c.poids_kg} kg` : '—'}</td>
                           <td style={tdStyle}>
                             <span style={{ padding: '4px 10px', borderRadius: 20, background: 'rgba(37,99,235,0.1)', color: '#2563eb', fontSize: 11, fontWeight: 600 }}>
                               {c.statut_label || c.statut || '—'}
                             </span>
                           </td>
                           <td style={tdStyle} onClick={e => e.stopPropagation()}>
                             <button onClick={() => navigate(`/suivi/consultations/${c.id}`)} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               )}
            </div>
          )}
      </div>

      {showExamenModal && (
        <ExamenModal patientId={id} onClose={() => setShowExamenModal(false)} onSuccess={() => { loadAllData(); setShowExamenModal(false); }} />
      )}
    </AppLayout>
  );
}

// Micro-components originaux conservés
function Info({ val, mono }) { return <span style={{ fontSize: 12.5, color: '#334155' }}><span style={{ fontFamily: mono ? 'var(--font-mono)' : 'inherit', color: '#0f172a' }}>{val}</span></span>; }
function Grid({ children }) { return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px' }}>{children}</div>; }
function SectionLabel({ children, style: s }) { return <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: '#64748b', marginBottom: 12, ...s }}>{children}</div>; }
function InfoRow({ label, value, mono, full }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '1px solid rgba(37,99,235,0.12)', gridColumn: full ? '1 / -1' : 'auto' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 3, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 13.5, color: '#0f172a', fontFamily: mono ? 'var(--font-mono)' : 'inherit' }}>{value || '—'}</div>
    </div>
  );
}
function HabitudeRow({ label, value, colorMap, labelMap }) {
  const cv = COLOR_VARS[colorMap[value] || 'muted'];
  return (
    <div style={{ padding: '12px 0', borderBottom: '1px solid rgba(37,99,235,0.12)' }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>{label}</div>
      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: cv.bg, color: cv.color, border: '1px solid ' + cv.border }}>
        {labelMap[value] || value || '—'}
      </span>
    </div>
  );
}

const btnSt = { padding: '8px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 };
const btnStSecondary = { padding: '8px 16px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', color: '#334155', borderRadius: 6, cursor: 'pointer', fontSize: 13 };
const btnStSuccess = { padding: '8px 16px', background: 'linear-gradient(135deg, #16a34a, #00b38a)', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500 };
const addBtnStyle = { padding: '9px 18px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' };
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(37,99,235,0.12)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '11px 12px', verticalAlign: 'middle' };