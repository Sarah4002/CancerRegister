import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { examenService } from '../../services/examenService';
import { diagnosticService } from '../../services/diagnosticService';
import { traitementService } from '../../services/traitementService';
import { suiviService } from '../../services/suiviService';
import { documentService } from '../../services/documentService';
import { medecinService } from '../../services/accountsService';
import { rcpService } from '../../services/rcpService';
import { AppLayout } from '../../components/layout/Sidebar';
import ExamenModal from '../../components/patients/ExamenModal';
import { WILAYAS, COMMUNES_PAR_WILAYA } from './communesAlgerie';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';
import { secretaryService } from '../../services/secretaryService';

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

const EXAMEN_STATUT_LABELS = {
  prescrit:   'Prescrit',
  en_attente: 'En attente',
  realise:    'Réalisé',
  annule:     'Annulé',
};

/* ── Config pour la section Rendez-vous (même langage visuel que Diagnostic/Examens) ── */
const RDV_STATUT_COLORS = {
  confirme:   { bg: 'rgba(0,168,255,0.1)',   color: '#2563eb' },
  en_attente: { bg: 'rgba(245,166,35,0.1)',  color: '#d97706' },
  annule:     { bg: 'rgba(255,77,106,0.1)',  color: '#dc2626' },
  termine:    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a' },
  absent:     { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
};
const RDV_STATUT_LABELS = {
  confirme: 'Confirmé', en_attente: 'En attente', annule: 'Annulé', termine: 'Terminé', absent: 'Absent',
};
const RDV_TYPE_LABELS = {
  consultation: 'Consultation', suivi: 'Suivi', chimio: 'Chimiothérapie',
  radiotherapie: 'Radiothérapie', examen: 'Examen', rcp: 'RCP',
  chirurgie: 'Chirurgie', urgence: 'Urgence', autre: 'Autre',
};

/* ── Config pour la section Documents administratifs (rôle secrétaire) ── */
const DOCUMENT_TYPE_OPTIONS = [
  { v: 'carte_identite', l: "Carte d'identité / Extrait de naissance" },
  { v: 'carte_chifa',    l: 'Carte Chifa / Sécurité sociale' },
  { v: 'ordonnance',     l: 'Ordonnance médicale' },
  { v: 'compte_rendu',   l: 'Compte rendu médical' },
  { v: 'imagerie',       l: "Résultat d'imagerie" },
  { v: 'biologie',       l: 'Résultat de biologie' },
  { v: 'prise_charge',   l: 'Attestation de prise en charge' },
  { v: 'autre',          l: 'Autre document' },
];

/* ── Config pour le statut d'envoi au médecin pour validation ── */
const VALIDATION_STATUT_CFG = {
  en_attente: { bg: 'rgba(217,119,6,0.08)', color: '#d97706', border: 'rgba(217,119,6,0.2)', label: 'En attente de validation' },
  valide:     { bg: 'rgba(22,163,74,0.08)', color: '#16a34a', border: 'rgba(22,163,74,0.2)', label: 'Validé par le médecin' },
  rejete:     { bg: 'rgba(220,38,38,0.08)', color: '#dc2626', border: 'rgba(220,38,38,0.2)', label: 'À corriger' },
};

/* ── Config pour la section RCP ── */
const RCP_STATUT_COLORS = {
  attente:   { bg: 'rgba(245,166,35,0.1)',  color: '#d97706' },
  presente:  { bg: 'rgba(0,168,255,0.1)',   color: '#2563eb' },
  discute:   { bg: 'rgba(155,138,251,0.1)', color: '#7c3aed' },
  decide:    { bg: 'rgba(0,229,160,0.1)',   color: '#16a34a' },
  reporte:   { bg: 'rgba(107,114,128,0.1)', color: '#9ca3af' },
  annule:    { bg: 'rgba(255,77,106,0.1)',  color: '#dc2626' },
};
const RCP_STATUT_LABELS = {
  attente: 'En attente', presente: 'Présenté', discute: 'Discuté',
  decide: 'Décision prise', reporte: 'Reporté', annule: 'Annulé',
};
const RCP_TYPE_PRESENTATION_LABELS = {
  nouveau: 'Nouveau dossier', recidive: 'Récidive / Rechute', reval: 'Réévaluation',
  post_trt: 'Post-traitement', second: 'Second avis', autre: 'Autre',
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
  { key: 'rcp',         label: 'RCP'                },
  { key: 'rendezvous',  label: 'Rendez-vous'        },
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

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — Ajouter un document administratif
───────────────────────────────────────────────────────────────────────────── */
function UploadDocumentModal({ onClose, onSubmit, loading }) {
  const [file, setFile] = useState(null);
  const [type, setType] = useState('autre');
  const [libelle, setLibelle] = useState('');
  const overlayRef = useRef(null);

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn .15s ease',
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(15,23,42,0.22)', overflow: 'hidden', animation: 'slideUp .2s ease' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#2563eb)' }} />
        <div style={{ padding: '24px 26px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>Ajouter un document administratif</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Type de document</label>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 9, color: '#0f172a', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {DOCUMENT_TYPE_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Libellé (optionnel)</label>
            <input value={libelle} onChange={e => setLibelle(e.target.value)} placeholder="Ex: Carte Chifa recto-verso" style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: '#f8fafc', border: '1px solid rgba(37,99,235,0.15)', borderRadius: 9, color: '#0f172a', fontSize: 13, outline: 'none' }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Fichier</label>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0] || null)} style={{ width: '100%', fontSize: 12.5, color: '#334155' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={() => { if (!file) { toast.error('Veuillez sélectionner un fichier'); return; } onSubmit({ file, type, libelle }); }}
              disabled={loading}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: loading ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#2563eb)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Envoi…' : 'Ajouter le document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MODAL — Envoyer le dossier pour validation
───────────────────────────────────────────────────────────────────────────── */
function SendValidationModal({ patient, medecins, onClose, onSubmit, loading }) {
  const [medecinId, setMedecinId] = useState('');
  const [note, setNote] = useState('');
  const overlayRef = useRef(null);

  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onClose(); }} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fadeIn .15s ease',
    }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(124,58,237,0.18)', overflow: 'hidden', animation: 'slideUp .2s ease' }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#a78bfa,#7c3aed)' }} />
        <div style={{ padding: '24px 26px' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>Envoyer le dossier pour validation</div>
          <div style={{ fontSize: 12.5, color: '#64748b', marginBottom: 16 }}>{patient?.nom} {patient?.prenom} — {patient?.registration_number}</div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Médecin destinataire</label>
            <select value={medecinId} onChange={e => setMedecinId(e.target.value)} style={{ width: '100%', padding: '9px 12px', background: '#f8fafc', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9, color: '#0f172a', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              <option value="">— Sélectionner un médecin —</option>
              {medecins.map(m => (
                <option key={m.id} value={m.id}>{m.full_name || `${m.first_name || ''} ${m.last_name || ''}`.trim()}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: .5 }}>Note (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} placeholder="Précisions pour le médecin..." style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', background: '#f8fafc', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 9, color: '#0f172a', fontSize: 13, outline: 'none', resize: 'vertical' }} />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={loading} style={{ flex: 1, padding: '11px', borderRadius: 10, border: '1px solid rgba(37,99,235,0.2)', background: 'transparent', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
            <button
              onClick={() => { if (!medecinId) { toast.error('Veuillez sélectionner un médecin'); return; } onSubmit({ medecinId, note }); }}
              disabled={loading}
              style={{ flex: 1, padding: '11px', borderRadius: 10, border: 'none', background: loading ? '#c4b5fd' : 'linear-gradient(135deg,#a78bfa,#7c3aed)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Envoi…' : 'Envoyer pour validation'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PatientDossierPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const isSecretary = user?.role === 'secretaire';

  const [patient, setPatient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [examens, setExamens] = useState([]);
  const [diagnostics, setDiagnostics] = useState([]);
  const [traitements, setTraitements] = useState({});
  const [suivi, setSuivi] = useState([]);
  const [rendezVous, setRendezVous] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [rcp, setRCPs] = useState([]);

  const [loading, setLoading] = useState(true);

  const [activeMainTab, setActiveMainTab] = useState('identite');
  const [activeSubTab, setActiveSubTab] = useState('clinique');
  const [activeIdentiteTab, setActiveIdentiteTab] = useState('identite');
  const [highlightedDiagnosticId, setHighlightedDiagnosticId] = useState(null);

  const [showExamenModal, setShowExamenModal] = useState(false);
  const [editingExamen, setEditingExamen] = useState(null);

  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const [dossierEditMode, setDossierEditMode] = useState(false);
  const [dossierForm, setDossierForm] = useState({});

  // ── Documents administratifs (secrétaire) ──
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState(null);

  // ── Envoi au médecin pour validation (secrétaire) ──
  const [showSendModal, setShowSendModal] = useState(false);
  const [medecins, setMedecins] = useState([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const invalid = id === undefined || id === null || id === '' || id === 'undefined';
    if (invalid) {
      console.warn('[PatientDossierPage] invalid route param id:', id);
      toast.error('Identifiant patient manquant');
      navigate('/patients');
      return;
    }

    loadAllData();

    if (location.state?.returnSection === 'diagnostic') {
      setActiveMainTab('dossier');
      setActiveSubTab('diagnostic');
      if (location.state?.newDiagnosticId) {
        setHighlightedDiagnosticId(location.state.newDiagnosticId);
        setTimeout(() => setHighlightedDiagnosticId(null), 3000);
      }
    }
  }, [id, navigate, location.state]);

  const loadAllData = async () => {
    if (id === undefined || id === null || id === '' || id === 'undefined') return;
    setLoading(true);
    try {
      const requests = [
        patientService.get(id).catch(e => { toast.error('Patient introuvable'); navigate('/patients'); throw e; }),
        secretaryService.getRendezVous({ patient: id }).catch(() => ({ data: [] })),
        documentService.list(id).catch(() => ({ data: [] })),
      ];
      if (!isSecretary) requests.push(
        patientService.getDossier(id).catch(() => ({ data: {} })),
        examenService.list({ patient: id }).catch(() => ({ data: [] })),
        diagnosticService.parPatient(id).catch(() => ({ data: [] })),
        traitementService.parPatient(id).catch(() => ({ data: {} })),
        suiviService.consultations.parPatient(id).catch(() => ({ data: [] })),
        rcpService.dossiers.parPatient(id).catch(() => ({ data: [] })),
      );
      const responses = await Promise.all(requests);
      const resPatient    = responses[0];
      const resRendezVous = responses[1] || { data: [] };
      const resDocuments  = responses[2] || { data: [] };
      const resDossier = isSecretary ? { data: {} } : (responses[3] || { data: {} });
      const resExamens = isSecretary ? { data: [] } : (responses[4] || { data: [] });
      const resDiag     = isSecretary ? { data: [] } : (responses[5] || { data: [] });
      const resTrt       = isSecretary ? { data: {} } : (responses[6] || { data: {} });
      const resSuiv      = isSecretary ? { data: [] } : (responses[7] || { data: [] });
      const resRcp       = isSecretary ? { data: [] } : (responses[8] || { data: [] });
      setPatient(resPatient.data);
      setDossier(resDossier.data);
      setExamens(resExamens.data?.results || resExamens.data || []);
      setDiagnostics(resDiag.data || []);
      setTraitements(resTrt.data || {});
      setSuivi(resSuiv.data || []);
      setRendezVous(resRendezVous.data || []);
      setDocuments(resDocuments.data?.results || resDocuments.data || []);
      setRCPs(resRcp.data?.results || resRcp.data || []);

      if (location.state?.returnSection === 'diagnostic' && location.state?.newDiagnosticId) {
        setHighlightedDiagnosticId(location.state.newDiagnosticId);
        setTimeout(() => setHighlightedDiagnosticId(null), 3000);
      }
      if (location.state?.returnSection === 'suivi' && location.state?.newConsultationId) {
        setHighlightedDiagnosticId(location.state.newConsultationId);
        setTimeout(() => setHighlightedDiagnosticId(null), 3000);
      }
      if (location.state?.returnSection === 'traitements' && location.state?.newTraitementId) {
        setHighlightedDiagnosticId(location.state.newTraitementId);
        setTimeout(() => setHighlightedDiagnosticId(null), 3000);
      }
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

  /* ── Documents administratifs ── */
  const handleUploadDocument = async ({ file, type, libelle }) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type_document', type);
      formData.append('libelle', libelle || file.name);
      formData.append('patient', id);
      await documentService.upload(id, formData);
      toast.success('Document ajouté avec succès');
      setShowUploadModal(false);
      const { data } = await documentService.list(id);
      setDocuments(data?.results || data || []);
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'ajout du document");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId) => {
    setDeletingDocId(docId);
    try {
      await documentService.delete(docId);
      toast.success('Document supprimé');
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setDeletingDocId(null);
    }
  };

  /* ── Envoi pour validation ── */
  const openSendModal = async () => {
    setShowSendModal(true);
    if (medecins.length === 0) {
      try {
        const { data } = await medecinService.list();
        setMedecins(data?.results || data || []);
      } catch {
        toast.error('Impossible de charger la liste des médecins');
      }
    }
  };

  const handleSendForValidation = async ({ medecinId, note }) => {
    setSending(true);
    try {
      await patientService.envoyerPourValidation(id, { medecin: medecinId, note });
      toast.success('Dossier envoyé au médecin pour validation');
      setShowSendModal(false);
      await loadAllData();
    } catch (err) {
      toast.error(err.response?.data?.error || "Erreur lors de l'envoi du dossier");
    } finally {
      setSending(false);
    }
  };

  // ── Mapping entre les sections du sidebar global et les onglets internes ──
  const activeSectionKey = activeMainTab === 'dossier' ? activeSubTab : activeMainTab;

  const handleSectionSelect = (key) => {
    if (['clinique', 'diagnostic', 'examens', 'traitements', 'suivi'].includes(key)) {
      if (['clinique', 'diagnostic', 'examens'].includes(key)) {
        setActiveMainTab('dossier');
        setActiveSubTab(key);
      } else {
        setActiveMainTab(key);
      }
    } else {
      setActiveMainTab(key);
    }
  };

  const visiblePatientSections = isSecretary ? PATIENT_SECTIONS.filter(s => s.key === 'identite' || s.key === 'rendezvous') : PATIENT_SECTIONS;
  const currentSectionLabel = visiblePatientSections.find(s => s.key === activeSectionKey)?.label || '';

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
  const vs = VALIDATION_STATUT_CFG[patient.validation_statut];

  const ID_TABS = [
    { key: 'identite',    label: 'Identite'        },
    { key: 'coordonnees', label: 'Coordonnees'      },
    { key: 'profil',      label: 'Profil'           },
    { key: 'antecedents', label: 'Antecedents'      },
    { key: 'habitudes',   label: 'Habitudes de vie' },
    { key: 'contacts',    label: 'Contacts'         },
    { key: 'documents',   label: 'Documents administratifs' },
    { key: 'qrcode',      label: 'QR Code'          },
  ].filter(tab => !isSecretary || ['identite', 'coordonnees', 'profil', 'documents'].includes(tab.key));

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
        sections: visiblePatientSections,
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
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
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
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
               <div>
                 {isSecretary && vs && (
                   <span style={{
                     display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 11.5, fontWeight: 600,
                     background: vs.bg, color: vs.color, border: `1px solid ${vs.border}`,
                   }}>{vs.label}</span>
                 )}
               </div>
               <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                 {isSecretary && (
                   <>
                     <button type="button" onClick={() => setShowUploadModal(true)} style={addBtnStyleOutline}>
                       <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                       </svg>
                       Document administratif
                     </button>
                     <button type="button" onClick={openSendModal} style={sendBtnStyle}>
                       <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                         <line x1="22" y1="2" x2="11" y2="13" />
                         <polygon points="22 2 15 22 11 13 2 9 22 2" />
                       </svg>
                       Envoyer au médecin pour validation
                     </button>
                   </>
                 )}
                 <button type="button" onClick={handleEditMode} style={{ padding:'10px 18px', background:'#2563eb', color:'#fff', border:'none', borderRadius:12, cursor:'pointer', fontSize:13, fontWeight:600 }}>
                   Modifier le patient
                 </button>
               </div>
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
                  {activeIdentiteTab === 'documents' && (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <SectionLabel style={{ margin: 0 }}>Documents administratifs</SectionLabel>
                        <button onClick={() => setShowUploadModal(true)} style={addBtnStyle}>
                          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                          </svg>
                          Ajouter un document
                        </button>
                      </div>

                      {documents.length === 0 ? (
                        <div style={{ padding: 40, textAlign: 'center' }}>
                          <div style={{ fontSize: 30, marginBottom: 10 }}>📄</div>
                          <div style={{ fontSize: 14, color: '#64748b' }}>Aucun document administratif enregistré.</div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {documents.map(doc => (
                            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', border: '1px solid rgba(37,99,235,0.1)', borderRadius: 12, background: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>📄</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{doc.libelle || doc.file_name || 'Document'}</div>
                                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                                    {DOCUMENT_TYPE_OPTIONS.find(t => t.v === doc.type_document)?.l || doc.type_document || '—'}
                                    {doc.date_ajout ? ` · ${new Date(doc.date_ajout).toLocaleDateString('fr-DZ')}` : ''}
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8 }}>
                                {doc.url && (
                                  <a href={doc.url} target="_blank" rel="noreferrer" style={{ padding: '6px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 8, color: '#334155', fontSize: 11.5, textDecoration: 'none' }}>Voir</a>
                                )}
                                <button
                                  onClick={() => handleDeleteDocument(doc.id)}
                                  disabled={deletingDocId === doc.id}
                                  style={{ padding: '6px 12px', background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, color: '#dc2626', fontSize: 11.5, cursor: deletingDocId === doc.id ? 'not-allowed' : 'pointer' }}
                                >
                                  {deletingDocId === doc.id ? '...' : 'Supprimer'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
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

          {/* == RENDEZ-VOUS == */}
          {activeMainTab === 'rendezvous' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionLabel style={{ margin: 0 }}>Rendez-vous du patient</SectionLabel>
                <Link to={`/secretaire/rendezvous/nouveau?patient=${id}`} state={{ patientContext: patient }} style={{ textDecoration: 'none' }}>
                  <button style={addBtnStyle}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    Ajouter un rendez-vous
                  </button>
                </Link>
              </div>

              {rendezVous.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}></div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>Aucun rendez-vous enregistré pour ce patient.</div>
                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Date', 'Heure', 'Type', 'Médecin', 'Statut', ''].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...rendezVous]
                        .sort((a, b) => `${b.date}${b.heure}`.localeCompare(`${a.date}${a.heure}`))
                        .map((rdv, i) => {
                          const st = RDV_STATUT_COLORS[rdv.statut] || RDV_STATUT_COLORS.en_attente;
                          const stLabel = RDV_STATUT_LABELS[rdv.statut] || rdv.statut || '—';
                          const isPast = rdv.date && rdv.date < new Date().toISOString().slice(0, 10);
                          return (
                            <tr key={rdv.id}
                              onClick={() => navigate(`/secretaire/rendezvous?patient=${id}`)}
                              style={{
                                cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)',
                                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                                opacity: isPast ? 0.75 : 1,
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                            >
                              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: '#0f172a' }}>
                                {rdv.date ? new Date(`${rdv.date}T00:00:00`).toLocaleDateString('fr-DZ') : '—'}
                              </td>
                              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12, color: '#334155' }}>{rdv.heure || '—'}</td>
                              <td style={{ ...tdStyle, fontSize: 12.5, color: '#334155' }}>{RDV_TYPE_LABELS[rdv.type] || rdv.type || 'Consultation'}</td>
                              <td style={{ ...tdStyle, fontSize: 12, color: '#64748b' }}>{rdv.medecin_nom || '—'}</td>
                              <td style={tdStyle}>
                                <span style={{ padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>
                                  {stLabel}
                                </span>
                              </td>
                              <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                <Link to={`/secretaire/rendezvous?patient=${id}`} style={{ textDecoration: 'none' }}>
                                  <button style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* == RCP == */}
          {activeMainTab === 'rcp' && (
            <div style={{ animation: 'fadeIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <SectionLabel style={{ margin: 0 }}>Passages en RCP</SectionLabel>
                <Link to={`/rcp/nouveau?patient=${id}`} state={{ patientContext: patient }} style={{ textDecoration: 'none' }}>
                  <button style={addBtnStyle}>
                    <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                    </svg>
                    Ajouter à une RCP
                  </button>
                </Link>
              </div>

              {rcp.length === 0 ? (
                <div style={{ padding: 48, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}></div>
                  <div style={{ fontSize: 14, color: '#64748b' }}>Aucun passage en RCP enregistré pour ce patient.</div>
                </div>
              ) : (
                <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f1f5f9' }}>
                        {['Réunion', 'Date', 'Type de présentation', 'Statut', ''].map(h => (
                          <th key={h} style={thStyle}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...rcp]
                        .sort((a, b) => {
                          const da = a.reunion_date || a.date_reunion || a.reunion_info?.date_reunion || '';
                          const db = b.reunion_date || b.date_reunion || b.reunion_info?.date_reunion || '';
                          return String(db).localeCompare(String(da));
                        })
                        .map((d, i) => {
                          const st = RCP_STATUT_COLORS[d.statut] || RCP_STATUT_COLORS.attente;
                          const stLabel = RCP_STATUT_LABELS[d.statut] || d.statut || '—';
                          // Accès défensif : le nom exact des champs dénormalisés dépend du serializer backend.
                          const reunionId    = d.reunion ?? d.reunion_id ?? d.reunion_info?.id;
                          const reunionTitre = d.reunion_titre ?? d.reunion_nom ?? d.reunion_info?.titre ?? '—';
                          const reunionDate  = d.reunion_date ?? d.date_reunion ?? d.reunion_info?.date_reunion;
                          return (
                            <tr key={d.id}
                              onClick={() => reunionId && navigate(`/rcp/${reunionId}`)}
                              style={{ cursor: reunionId ? 'pointer' : 'default', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                            >
                              <td style={{ ...tdStyle, fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{reunionTitre}</td>
                              <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                                {reunionDate ? new Date(reunionDate).toLocaleDateString('fr-DZ') : '—'}
                              </td>
                              <td style={{ ...tdStyle, fontSize: 12.5, color: '#334155' }}>
                                {RCP_TYPE_PRESENTATION_LABELS[d.type_presentation] || d.type_presentation || '—'}
                              </td>
                              <td style={tdStyle}>
                                <span style={{ padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>
                                  {stLabel}
                                </span>
                              </td>
                              <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                {reunionId && (
                                  <button onClick={() => navigate(`/rcp/${reunionId}`)} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
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
                     <button onClick={() => { setEditingExamen(null); setShowExamenModal(true); }} style={addBtnStyle}>
                       <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
                       </svg>
                       Prescrire un examen
                     </button>
                   </div>

                   {examens.length === 0 ? (
                     <div style={{ padding: 48, textAlign: 'center' }}>
                       <div style={{ fontSize: 14, color: '#64748b' }}>Aucun examen enregistré.</div>
                     </div>
                   ) : (
                     <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
                       <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                         <thead>
                           <tr style={{ background: '#f1f5f9' }}>
                             {['Catégorie', 'Examen', 'Valeur', 'Statut', 'Prescrit le', ''].map(h => (
                               <th key={h} style={thStyle}>{h}</th>
                             ))}
                           </tr>
                         </thead>
                         <tbody>
                           {examens.map((ex, i) => {
                             const st = EXAMEN_STATUT_COLORS[ex.statut] || EXAMEN_STATUT_COLORS.en_attente;
                             const stLabel = EXAMEN_STATUT_LABELS[ex.statut] || ex.statut || '—';
                             return (
                               <tr key={ex.id}
                                 onClick={() => { setEditingExamen(ex); setShowExamenModal(true); }}
                                 style={{ cursor: 'pointer', borderBottom: '1px solid rgba(37,99,235,0.12)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}
                                 onMouseEnter={e => e.currentTarget.style.background = '#eff6ff'}
                                 onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                               >
                                 <td style={{ ...tdStyle, color: '#0f172a', fontWeight: 500, fontSize: 12.5 }}>{ex.categorie || '—'}</td>
                                 <td style={{ ...tdStyle, color: '#334155', fontSize: 12.5 }}>{ex.nom_examen || '—'}</td>
                                 <td style={{ ...tdStyle, color: '#0f172a', fontWeight: 600, fontSize: 12.5 }}>{ex.valeur || '—'}</td>
                                 <td style={tdStyle}>
                                   <span style={{ padding: '4px 10px', borderRadius: 20, background: st.bg, color: st.color, fontSize: 11, fontWeight: 600 }}>{stLabel}</span>
                                 </td>
                                 <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontSize: 12 }}>{ex.date_prescription ? new Date(ex.date_prescription).toLocaleDateString('fr-DZ') : '—'}</td>
                                 <td style={tdStyle} onClick={e => e.stopPropagation()}>
                                   <button onClick={() => { setEditingExamen(ex); setShowExamenModal(true); }} style={{ padding: '5px 12px', background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}>Voir</button>
                                 </td>
                               </tr>
                             );
                           })}
                         </tbody>
                       </table>
                     </div>
                   )}
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
        <ExamenModal
          patientId={id}
          examen={editingExamen}
          onClose={() => { setShowExamenModal(false); setEditingExamen(null); }}
          onSuccess={() => { loadAllData(); setShowExamenModal(false); setEditingExamen(null); }}
        />
      )}

      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={handleUploadDocument}
          loading={uploading}
        />
      )}

      {showSendModal && (
        <SendValidationModal
          patient={patient}
          medecins={medecins}
          onClose={() => setShowSendModal(false)}
          onSubmit={handleSendForValidation}
          loading={sending}
        />
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
const addBtnStyleOutline = { padding: '9px 16px', background: '#fff', border: '1px solid rgba(37,99,235,0.25)', borderRadius: '12px', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' };
const sendBtnStyle = { padding: '9px 18px', background: 'linear-gradient(135deg, #a78bfa, #7c3aed)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-display)' };
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid rgba(37,99,235,0.12)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '11px 12px', verticalAlign: 'middle' };