import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';
import CanRegImportExport from '../../components/patients/CanRegImportExport';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const STATUT_COLORS = {
  nouveau:    { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb', border: 'rgba(37,99,235,0.2)'  },
  traitement: { bg: 'rgba(124,58,237,0.08)',  color: '#7c3aed', border: 'rgba(124,58,237,0.2)' },
  remission:  { bg: 'rgba(22,163,74,0.08)',   color: '#16a34a', border: 'rgba(22,163,74,0.2)'  },
  perdu:      { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: 'rgba(217,119,6,0.2)'  },
  decede:     { bg: 'rgba(220,38,38,0.08)',   color: '#dc2626', border: 'rgba(220,38,38,0.2)'  },
  archive:    { bg: 'rgba(100,116,139,0.08)', color: '#64748b', border: 'rgba(100,116,139,0.2)'},
};
const SEXE_COLORS = {
  M: { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb' },
  F: { bg: 'rgba(232,121,249,0.08)', color: '#d946ef' },
  U: { bg: 'rgba(100,116,139,0.08)', color: '#64748b' },
};

const CANCER_TYPES = [
  'Sein','Poumon','Côlon','Prostate','Col de l\'utérus','Estomac',
  'Foie','Leucémie','Lymphome','Thyroïde','Rein','Vessie','Mélanome','Autre',
];

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem','M\'Sila','Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt',
  'El Oued','Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma',
  'Aïn Témouchent','Ghardaïa','Relizane',
];

const AGE_GROUPS = [
  { label:'0 – 17 ans',  min:0,  max:17  },
  { label:'18 – 29 ans', min:18, max:29  },
  { label:'30 – 39 ans', min:30, max:39  },
  { label:'40 – 49 ans', min:40, max:49  },
  { label:'50 – 59 ans', min:50, max:59  },
  { label:'60 – 69 ans', min:60, max:69  },
  { label:'70 – 79 ans', min:70, max:79  },
  { label:'80 ans +',    min:80, max:999 },
];

const STADE_OPTIONS = ['0','I','II','III','IV','Inconnu'];

const EXPORT_COLUMNS = [
  { key:'registration_number', label:'N° Dossier',      default:true  },
  { key:'full_name',           label:'Nom complet',      default:true  },
  { key:'sexe_label',          label:'Sexe',             default:true  },
  { key:'date_naissance',      label:'Date de naissance',default:false },
  { key:'age',                 label:'Âge',              default:true  },
  { key:'wilaya',              label:'Wilaya',           default:true  },
  { key:'commune',             label:'Commune',          default:false },
  { key:'statut_label',        label:'Statut',           default:true  },
  { key:'cancer_type',         label:'Type de cancer',   default:true  },
  { key:'stade',               label:'Stade',            default:true  },
  { key:'date_diagnostic',     label:'Date diagnostic',  default:true  },
  { key:'traitement_type',     label:'Traitement',       default:false },
  { key:'medecin_nom',         label:'Médecin',          default:false },
  { key:'date_enregistrement', label:'Date enregistrement', default:false },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function escapeCSV(val) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function downloadCSV(rows, filename) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const csv  = [keys.join(','), ...rows.map(r => keys.map(k => escapeCSV(r[k])).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename);
}

function downloadXLSX(rows, filename) {
  if (!rows.length) return;
  const keys     = Object.keys(rows[0]);
  const toXmlStr = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

  const headerRow = `<row r="1">${keys.map((k,i) => {
    const col = colName(i+1);
    return `<c r="${col}1" t="inlineStr"><is><t>${toXmlStr(k)}</t></is></c>`;
  }).join('')}</row>`;

  const dataRows = rows.map((row, ri) => {
    const cells = keys.map((k, ci) => {
      const col = colName(ci+1);
      const r   = ri+2;
      const v   = row[k] ?? '';
      const isNum = typeof v === 'number';
      if (isNum) return `<c r="${col}${r}"><v>${v}</v></c>`;
      return `<c r="${col}${r}" t="inlineStr"><is><t>${toXmlStr(v)}</t></is></c>`;
    });
    return `<row r="${ri+2}">${cells.join('')}</row>`;
  }).join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<sheetData>${headerRow}${dataRows}</sheetData></worksheet>`;

  const wbXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheets><sheet name="Patients" sheetId="1" r:id="rId1"/></sheets></workbook>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml"  ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  if (typeof window.JSZip === 'undefined') {
    downloadCSV(rows, filename.replace('.xlsx', '.csv'));
    toast('JSZip non disponible — export CSV utilisé', { icon: 'ℹ️' });
    return;
  }
  const zip = new window.JSZip();
  zip.folder('_rels').file('.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('xl').file('workbook.xml', wbXml);
  zip.folder('xl/_rels').file('workbook.xml.rels', relsXml);
  zip.folder('xl/worksheets').file('sheet1.xml', sheetXml);
  zip.generateAsync({ type:'blob', mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
     .then(blob => triggerDownload(blob, filename));
}

function colName(n) {
  let s = '';
  while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26); }
  return s;
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* Essaie plusieurs noms de méthode courants pour récupérer le détail complet
   d'un patient (les lignes de la liste n'ont pas forcément tous les champs
   cliniques comme le diagnostic ou le traitement). Si aucune méthode ne
   fonctionne, on retombe sur les données déjà disponibles dans la ligne. */
async function fetchPatientDetail(id, fallback) {
  const candidateMethods = ['get', 'getById', 'retrieve', 'detail', 'show'];
  for (const method of candidateMethods) {
    if (typeof patientService[method] === 'function') {
      try {
        const { data } = await patientService[method](id);
        if (data) return data;
      } catch {
        // méthode absente ou en erreur : on essaie la suivante
      }
    }
  }
  return fallback;
}

/* Génère un document imprimable (à enregistrer en PDF via la boîte de dialogue
   d'impression du navigateur) pour le dossier d'un seul patient. */
function printPatientDossier(p) {
  const win = window.open('', '_blank', 'width=850,height=1000');
  if (!win) {
    toast.error('Veuillez autoriser les fenêtres popup pour générer le PDF.');
    return;
  }

  const row = (label, value) => `<tr><td class="lbl">${label}</td><td class="val">${value ?? '—'}</td></tr>`;
  const fmtDate = v => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('fr-DZ');
  };

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>Dossier patient - ${p.registration_number || ''}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; padding: 36px; }
  h1 { font-size: 20px; margin: 0 0 2px; }
  .sub { color: #64748b; font-size: 12px; margin-bottom: 18px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; background: #eff6ff; color: #2563eb; border: 1px solid rgba(37,99,235,0.25); margin-bottom: 22px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .6px; color: #2563eb; border-bottom: 1px solid rgba(37,99,235,0.15); padding-bottom: 6px; margin: 26px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #f1f5f9; }
  td.lbl { width: 220px; padding: 7px 10px 7px 0; color: #64748b; font-size: 12px; vertical-align: top; }
  td.val { padding: 7px 0; font-size: 13px; font-weight: 600; color: #0f172a; }
  footer { margin-top: 40px; font-size: 10.5px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 10px; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>Dossier Patient — RegistreCancer.dz</h1>
  <div class="sub">Document généré le ${new Date().toLocaleDateString('fr-DZ')} à ${new Date().toLocaleTimeString('fr-DZ')}</div>
  <div class="badge">${p.registration_number || 'N° non renseigné'}</div>

  <h2>Identification</h2>
  <table>
    ${row('Nom complet', p.full_name)}
    ${row('Sexe', p.sexe_label || p.sexe)}
    ${row('Date de naissance', fmtDate(p.date_naissance))}
    ${row('Âge', p.age != null ? `${p.age} ans` : null)}
    ${row('Wilaya', p.wilaya)}
    ${row('Commune', p.commune)}
  </table>

  <h2>Diagnostic</h2>
  <table>
    ${row('Type de cancer', p.cancer_type)}
    ${row('Stade', p.stade)}
    ${row('Date de diagnostic', fmtDate(p.date_diagnostic))}
  </table>

  <h2>Suivi</h2>
  <table>
    ${row('Statut du dossier', p.statut_label || p.statut_dossier)}
    ${row('Traitement', p.traitement_type)}
    ${row('Médecin référent', p.medecin_nom)}
    ${row('Date d’enregistrement', fmtDate(p.date_enregistrement))}
  </table>

  <footer>Document confidentiel — usage médical uniquement. RegistreCancer.dz</footer>

  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>`;

  win.document.write(html);
  win.document.close();
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE CONFIRM MODAL
───────────────────────────────────────────────────────────────────────────── */
function DeleteConfirmModal({ patient, onClose, onConfirm, loading }) {
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position:'fixed', inset:0,
        background:'rgba(15,23,42,0.6)',
        backdropFilter:'blur(4px)',
        zIndex:2000,
        display:'flex', alignItems:'center', justifyContent:'center',
        padding:16,
        animation:'fadeIn .15s ease',
      }}
    >
      <div style={{
        background:'#fff',
        borderRadius:18,
        width:'100%',
        maxWidth:420,
        boxShadow:'0 24px 64px rgba(220,38,38,0.18)',
        overflow:'hidden',
        animation:'slideUp .2s ease',
      }}>
        <div style={{ height:4, background:'linear-gradient(90deg,#ef4444,#dc2626)' }} />

        <div style={{ padding:'28px 28px 24px' }}>
          <div style={{
            width:52, height:52,
            background:'rgba(220,38,38,0.08)',
            borderRadius:14,
            display:'flex', alignItems:'center', justifyContent:'center',
            marginBottom:16,
            border:'1px solid rgba(220,38,38,0.15)',
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/>
              <path d="M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>

          <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:8 }}>
            Supprimer ce patient ?
          </div>
          <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:6 }}>
            Vous êtes sur le point de supprimer définitivement le dossier de :
          </div>
          <div style={{
            padding:'10px 14px',
            background:'rgba(220,38,38,0.05)',
            border:'1px solid rgba(220,38,38,0.15)',
            borderRadius:10,
            marginBottom:16,
          }}>
            <div style={{ fontWeight:700, color:'#0f172a', fontSize:14 }}>{patient?.full_name}</div>
            <div style={{ fontSize:11.5, color:'#64748b', marginTop:2, fontFamily:'monospace' }}>
              {patient?.registration_number}
            </div>
          </div>
          <div style={{
            display:'flex', alignItems:'center', gap:7,
            padding:'9px 12px',
            background:'rgba(255,149,0,0.06)',
            border:'1px solid rgba(255,149,0,0.2)',
            borderRadius:8,
            marginBottom:20,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span style={{ fontSize:11.5, color:'#92400e', fontWeight:500 }}>
              Cette action est irréversible. Toutes les données seront perdues.
            </span>
          </div>

          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={onClose}
              disabled={loading}
              style={{
                flex:1, padding:'11px', borderRadius:10,
                border:'1px solid rgba(37,99,235,0.2)',
                background:'transparent', color:'#64748b',
                fontSize:13, fontWeight:600, cursor:'pointer',
                opacity: loading ? .5 : 1,
              }}
            >
              Annuler
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              style={{
                flex:1, padding:'11px', borderRadius:10,
                border:'none',
                background: loading ? '#fca5a5' : 'linear-gradient(135deg,#ef4444,#dc2626)',
                color:'#fff',
                fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                boxShadow:'0 4px 12px rgba(220,38,38,0.3)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ width:13, height:13, border:'2px solid #ffffff44', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} />
                  Suppression…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                  </svg>
                  Supprimer définitivement
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT MODAL (liste complète, avec filtres et regroupement)
───────────────────────────────────────────────────────────────────────────── */
function ExportModal({ onClose, currentFilters }) {
  const [groupBy,      setGroupBy]      = useState('none');
  const [format,       setFormat]       = useState('csv');
  const [selCols,      setSelCols]      = useState(() => EXPORT_COLUMNS.filter(c => c.default).map(c => c.key));
  const [filterWilaya, setFilterWilaya] = useState(currentFilters?.wilaya || '');
  const [filterCancer, setFilterCancer] = useState(currentFilters?.cancer || '');
  const [filterAge,    setFilterAge]    = useState('');
  const [filterStade,  setFilterStade]  = useState(currentFilters?.stade  || '');
  const [filterSexe,   setFilterSexe]   = useState(currentFilters?.sexe   || '');
  const [filterStatut, setFilterStatut] = useState(currentFilters?.statut_dossier || '');
  const [loading,      setLoading]      = useState(false);
  const [preview,      setPreview]      = useState(null);
  const overlayRef = useRef(null);

  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  useEffect(() => {
    let cancelled = false;
    async function fetchPreview() {
      try {
        const params = buildParams();
        params.page      = 1;
        params.page_size = 5;
        const { data } = await patientService.list(params);
        if (!cancelled) setPreview({ count: data.count ?? (data.results||data).length, sample: data.results || data });
      } catch { if (!cancelled) setPreview(null); }
    }
    fetchPreview();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterWilaya, filterCancer, filterAge, filterStade, filterSexe, filterStatut]);

  function buildParams() {
    const p = { page_size: 10000 };
    if (filterWilaya) p.wilaya         = filterWilaya;
    if (filterCancer) p.cancer_type    = filterCancer;
    if (filterStade)  p.stade          = filterStade;
    if (filterSexe)   p.sexe           = filterSexe;
    if (filterStatut) p.statut_dossier = filterStatut;
    if (filterAge) {
      const ag = AGE_GROUPS.find(a => a.label === filterAge);
      if (ag) { p.age_min = ag.min; p.age_max = ag.max; }
    }
    return p;
  }

  async function handleExport() {
    setLoading(true);
    try {
      const params    = buildParams();
      const { data }  = await patientService.list(params);
      let   rawRows   = data.results || data;

      if (groupBy !== 'none') {
        rawRows = groupPatients(rawRows, groupBy);
      } else {
        rawRows = rawRows.map(p => {
          const row = {};
          selCols.forEach(k => { row[k] = p[k] ?? ''; });
          return row;
        });
      }

      const ts       = new Date().toISOString().slice(0,10);
      const suffix   = groupBy !== 'none' ? `_par_${groupBy}` : '';
      const filename = `patients${suffix}_${ts}.${format}`;

      if (format === 'csv')  downloadCSV(rawRows,  filename);
      else                   downloadXLSX(rawRows, filename);

      toast.success(`Export ${format.toUpperCase()} généré — ${rawRows.length} lignes`);
      onClose();
    } catch (e) {
      toast.error('Erreur lors de l\'export : ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function groupPatients(rows, by) {
    const grouped = {};
    rows.forEach(p => {
      let key;
      if (by === 'wilaya')  key = p.wilaya      || 'Non renseigné';
      if (by === 'cancer')  key = p.cancer_type || 'Non renseigné';
      if (by === 'stade')   key = p.stade        || 'Non renseigné';
      if (by === 'sexe')    key = p.sexe_label   || p.sexe || 'Non renseigné';
      if (by === 'statut')  key = p.statut_label || p.statut_dossier || 'Non renseigné';
      if (by === 'age') {
        const ag = AGE_GROUPS.find(a => (p.age??0) >= a.min && (p.age??0) <= a.max);
        key = ag ? ag.label : 'Non renseigné';
      }
      if (!grouped[key]) grouped[key] = 0;
      grouped[key]++;
    });
    return Object.entries(grouped)
      .sort((a,b) => b[1] - a[1])
      .map(([groupe, total]) => {
        const labelMap = {
          wilaya: 'Wilaya', cancer: 'Type de cancer',
          stade: 'Stade', sexe: 'Sexe', statut: 'Statut', age: 'Tranche d\'âge',
        };
        return { [labelMap[by] || 'Groupe']: groupe, 'Nombre de patients': total };
      });
  }

  const toggleCol = k => setSelCols(prev =>
    prev.includes(k) ? prev.filter(c => c !== k) : [...prev, k]
  );

  const S = {
    overlay: {
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
      zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    },
    modal: {
      background:'#fff', borderRadius:18, width:'100%', maxWidth:680,
      maxHeight:'90vh', overflowY:'auto', boxShadow:'0 24px 64px rgba(15,23,42,0.22)',
      display:'flex', flexDirection:'column',
    },
    header: {
      padding:'20px 24px 16px', borderBottom:'1px solid rgba(37,99,235,0.1)',
      display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0,
    },
    body:   { padding:'20px 24px', display:'flex', flexDirection:'column', gap:20 },
    footer: {
      padding:'16px 24px', borderTop:'1px solid rgba(37,99,235,0.1)',
      display:'flex', alignItems:'center', gap:10, flexShrink:0,
    },
    label:  { fontSize:11, fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:.8, marginBottom:8, display:'block' },
    select: {
      width:'100%', padding:'8px 11px', borderRadius:9,
      border:'1px solid rgba(37,99,235,0.18)', background:'#f8fafc',
      color:'#334155', fontSize:12.5, outline:'none', cursor:'pointer',
    },
    chip: (active, color='#2563eb') => ({
      padding:'4px 11px', borderRadius:20, fontSize:11.5, fontWeight:500, cursor:'pointer',
      border:`1px solid ${active ? color+'50' : 'rgba(37,99,235,0.12)'}`,
      background: active ? color+'12' : 'transparent',
      color: active ? color : '#64748b', transition:'all .12s',
    }),
    btn: (primary) => ({
      padding:'10px 22px', borderRadius:10, fontSize:13, fontWeight:600, cursor:'pointer',
      border: primary ? 'none' : '1px solid rgba(37,99,235,0.2)',
      background: primary ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent',
      color: primary ? '#fff' : '#64748b',
      display:'flex', alignItems:'center', gap:7,
      boxShadow: primary ? '0 2px 8px rgba(37,99,235,0.25)' : 'none',
      opacity: loading ? .65 : 1,
    }),
  };

  return (
    <div ref={overlayRef} style={S.overlay} onClick={handleOverlay}>
      <div style={S.modal}>
        <div style={S.header}>
          <div>
            <div style={{ fontSize:17, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
              Exporter les patients
            </div>
            <div style={{ fontSize:11.5, color:'#94a3b8' }}>
              {preview ? `${preview.count.toLocaleString('fr-FR')} patient(s) correspondant aux critères` : 'Chargement…'}
            </div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', fontSize:22, color:'#94a3b8', lineHeight:1, padding:'2px 6px', borderRadius:6 }}>×</button>
        </div>

        <div style={S.body}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'#eff6ff', color:'#2563eb', borderRadius:6, padding:'2px 8px', fontSize:11 }}>1</span>
              Filtrer les patients à exporter
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
              <div>
                <span style={S.label}>Wilaya</span>
                <select style={S.select} value={filterWilaya} onChange={e => setFilterWilaya(e.target.value)}>
                  <option value="">Toutes les wilayas</option>
                  {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <span style={S.label}>Type de cancer</span>
                <select style={S.select} value={filterCancer} onChange={e => setFilterCancer(e.target.value)}>
                  <option value="">Tous les cancers</option>
                  {CANCER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <span style={S.label}>Tranche d'âge</span>
                <select style={S.select} value={filterAge} onChange={e => setFilterAge(e.target.value)}>
                  <option value="">Tous les âges</option>
                  {AGE_GROUPS.map(a => <option key={a.label} value={a.label}>{a.label}</option>)}
                </select>
              </div>
              <div>
                <span style={S.label}>Stade</span>
                <select style={S.select} value={filterStade} onChange={e => setFilterStade(e.target.value)}>
                  <option value="">Tous les stades</option>
                  {STADE_OPTIONS.map(s => <option key={s} value={s}>{s === 'U' ? 'Inconnu' : `Stade ${s}`}</option>)}
                </select>
              </div>
              <div>
                <span style={S.label}>Sexe</span>
                <select style={S.select} value={filterSexe} onChange={e => setFilterSexe(e.target.value)}>
                  <option value="">Tous</option>
                  <option value="F">Femme</option>
                  <option value="M">Homme</option>
                </select>
              </div>
              <div>
                <span style={S.label}>Statut dossier</span>
                <select style={S.select} value={filterStatut} onChange={e => setFilterStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="nouveau">Nouveau</option>
                  <option value="traitement">Traitement</option>
                  <option value="remission">Rémission</option>
                  <option value="perdu">Perdu de vue</option>
                  <option value="decede">Décédé</option>
                </select>
              </div>
            </div>
            {(filterWilaya||filterCancer||filterAge||filterStade||filterSexe||filterStatut) && (
              <button
                onClick={() => { setFilterWilaya(''); setFilterCancer(''); setFilterAge(''); setFilterStade(''); setFilterSexe(''); setFilterStatut(''); }}
                style={{ marginTop:8, fontSize:11, color:'#94a3b8', background:'none', border:'none', cursor:'pointer', padding:'2px 0' }}
              >
                ✕ Effacer tous les filtres
              </button>
            )}
          </div>

          {groupBy === 'none' && (
            <div>
              <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:12, display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ background:'#eff6ff', color:'#2563eb', borderRadius:6, padding:'2px 8px', fontSize:11 }}>2</span>
                Colonnes à inclure
                <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>({selCols.length}/{EXPORT_COLUMNS.length})</span>
                <button onClick={() => setSelCols(EXPORT_COLUMNS.map(c=>c.key))} style={{ marginLeft:'auto', fontSize:10.5, color:'#2563eb', background:'none', border:'none', cursor:'pointer' }}>Tout sélectionner</button>
                <button onClick={() => setSelCols([])} style={{ fontSize:10.5, color:'#94a3b8', background:'none', border:'none', cursor:'pointer' }}>Tout désélectionner</button>
              </div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {EXPORT_COLUMNS.map(col => (
                  <button key={col.key} onClick={() => toggleCol(col.key)} style={S.chip(selCols.includes(col.key))}>
                    {selCols.includes(col.key) && <span style={{ fontSize:9, marginRight:2 }}>✓</span>}
                    {col.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#0f172a', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
              <span style={{ background:'#eff6ff', color:'#2563eb', borderRadius:6, padding:'2px 8px', fontSize:11 }}>
                {groupBy === 'none' ? '4' : '3'}
              </span>
              Format de fichier
            </div>
            <div style={{ display:'flex', gap:8 }}>
              {[
                { id:'csv',  label:'CSV',  sub:'Compatible Excel, LibreOffice', icon:'' },
                { id:'xlsx', label:'XLSX', sub:'Microsoft Excel natif',          icon:'' },
              ].map(f => (
                <button key={f.id} onClick={() => setFormat(f.id)} style={{
                  flex:1, padding:'12px 14px', borderRadius:10, border:'1.5px solid',
                  borderColor: format===f.id ? '#3b82f6' : 'rgba(37,99,235,0.15)',
                  background:  format===f.id ? '#eff6ff' : '#fafbff',
                  cursor:'pointer', textAlign:'left', transition:'all .12s',
                  display:'flex', alignItems:'center', gap:10,
                }}>
                  <span style={{ fontSize:22 }}>{f.icon}</span>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color: format===f.id ? '#1d4ed8' : '#334155' }}>{f.label}</div>
                    <div style={{ fontSize:10.5, color:'#94a3b8', marginTop:1 }}>{f.sub}</div>
                  </div>
                  {format===f.id && <span style={{ marginLeft:'auto', fontSize:14, color:'#2563eb' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={S.footer}>
          <button onClick={onClose} style={S.btn(false)} disabled={loading}>Annuler</button>
          <button
            onClick={handleExport}
            disabled={loading || (groupBy==='none' && selCols.length===0)}
            style={{ ...S.btn(true), marginLeft:'auto' }}
          >
            {loading
              ? <><span style={{ width:14, height:14, border:'2px solid #ffffff44', borderTopColor:'#fff', borderRadius:'50%', animation:'spin .7s linear infinite', display:'inline-block' }} /> Export en cours…</>
              : <><span>↓</span> Exporter {preview ? `${preview.count.toLocaleString('fr-FR')} patients` : ''} en {format.toUpperCase()}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BADGE COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function StatusBadge({ statut, label }) {
  const c = STATUT_COLORS[statut] || STATUT_COLORS.archive;
  return (
    <span style={{
      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:500,
      background:c.bg, color:c.color, border:`1px solid ${c.border}`, whiteSpace:'nowrap',
    }}>{label}</span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DELETE ICON BUTTON
───────────────────────────────────────────────────────────────────────────── */
function DeleteIconButton({ onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title="Supprimer ce patient"
      style={{
        width:30, height:30,
        display:'flex', alignItems:'center', justifyContent:'center',
        borderRadius:8,
        border: hovered ? '1px solid rgba(220,38,38,0.3)' : '1px solid transparent',
        background: hovered ? 'rgba(220,38,38,0.07)' : 'transparent',
        cursor:'pointer',
        transition:'all .15s',
        flexShrink:0,
      }}
    >
      <svg
        width="14" height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke={hovered ? '#dc2626' : '#94a3b8'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ transition:'stroke .15s' }}
      >
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
        <path d="M10 11v6"/><path d="M14 11v6"/>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
      </svg>
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXPORT ICON BUTTON (menu déroulant : PDF / CSV / XLSX pour UN patient)
───────────────────────────────────────────────────────────────────────────── */
function ExportSingleButton({ onExport }) {
  const [open, setOpen]       = useState(false);
  const [hovered, setHovered] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const options = [
    ['pdf',  'Imprimer / PDF'],
    ['csv',  'Export CSV'],
    ['xlsx', 'Export Excel'],
  ];

  return (
    <div ref={wrapRef} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Exporter ce dossier"
        style={{
          width:30, height:30,
          display:'flex', alignItems:'center', justifyContent:'center',
          borderRadius:8,
          border: hovered || open ? '1px solid rgba(22,163,74,0.3)' : '1px solid transparent',
          background: hovered || open ? 'rgba(22,163,74,0.07)' : 'transparent',
          cursor:'pointer',
          transition:'all .15s',
          flexShrink:0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={hovered || open ? '#16a34a' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition:'stroke .15s' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position:'absolute', right:0, top:'110%', zIndex:50,
          background:'#fff', border:'1px solid rgba(37,99,235,0.14)',
          borderRadius:10, boxShadow:'0 10px 28px rgba(15,23,42,0.14)',
          minWidth:168, overflow:'hidden',
        }}>
          {options.map(([id, label]) => (
            <button
              key={id}
              onClick={() => { setOpen(false); onExport(id); }}
              style={{
                width:'100%', textAlign:'left', padding:'9px 13px',
                fontSize:12.5, fontWeight:600, color:'#334155',
                border:'none', background:'transparent', cursor:'pointer',
                display:'flex', alignItems:'center', gap:8,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function PatientsPage() {
  const navigate = useNavigate();
  const [patients,       setPatients]       = useState([]);
  const [stats,          setStats]          = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [search,         setSearch]         = useState('');
  const [dateNaissance,  setDateNaissance]  = useState('');
  const [filters,        setFilters]        = useState({ sexe:'', statut_dossier:'', wilaya:'', commune:'' });
  const [pagination,     setPagination]     = useState({ count:0, next:null, previous:null });
  const [page,           setPage]           = useState(1);
  const [showExport,     setShowExport]     = useState(false);
  const [deleteTarget,   setDeleteTarget]   = useState(null);
  const [deleteLoading,  setDeleteLoading]  = useState(false);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const listParams = {
        page,
        search: search || undefined,
        sexe: filters.sexe || undefined,
        statut_dossier: filters.statut_dossier || undefined,
        wilaya: filters.wilaya || undefined,
      };
      const advancedParams = {
        page,
        q: search || undefined,
        date_naissance: dateNaissance || undefined,
        sexe: filters.sexe || undefined,
        statut_dossier: filters.statut_dossier || undefined,
        wilaya: filters.wilaya || undefined,
        commune: filters.commune || undefined,
      };
      const hasExplicitFilters = !!(
        dateNaissance || filters.sexe || filters.statut_dossier || filters.wilaya || filters.commune
      );

      const { data } = hasExplicitFilters
        ? await patientService.searchAdvanced(advancedParams)
        : await patientService.list(listParams);

      setPatients(data.results || data);
      setPagination(prev => ({
        ...prev,
        count: data.count ?? (Array.isArray(data.results) ? data.results.length : Array.isArray(data) ? data.length : 0),
        next: data.next ?? null,
        previous: data.previous ?? null,
      }));
    } catch (err) {
      toast.error('Erreur lors du chargement des patients');
    } finally {
      setLoading(false);
    }
  }, [search, dateNaissance, filters, page]);

  useEffect(() => {
    patientService.stats().then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 400);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  useEffect(() => {
    if (page !== 1) setPage(1);
  }, [search, dateNaissance, filters]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await patientService.delete(deleteTarget.id);
      toast.success(`Patient ${deleteTarget.registration_number} supprimé avec succès`);
      setDeleteTarget(null);
      fetchPatients();
      patientService.stats().then(({ data }) => setStats(data)).catch(() => {});
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  /* Export du dossier d'UN SEUL patient : PDF (impression), CSV ou Excel.
     On tente de récupérer le détail complet (diagnostic, traitement...) via
     l'API avant d'exporter, avec repli sur les données déjà affichées. */
  const handleSingleExport = async (patient, format) => {
    const detail = await fetchPatientDetail(patient.id, patient);

    if (format === 'pdf') {
      printPatientDossier(detail);
      return;
    }

    const row = {};
    EXPORT_COLUMNS.forEach(({ key }) => { row[key] = detail[key] ?? ''; });

    const ts       = new Date().toISOString().slice(0, 10);
    const filename = `dossier_${detail.registration_number || detail.id}_${ts}.${format}`;

    if (format === 'csv') downloadCSV([row], filename);
    else                  downloadXLSX([row], filename);

    toast.success(`Dossier de ${detail.full_name || 'ce patient'} exporté en ${format.toUpperCase()}`);
  };

  return (
    <AppLayout title="Gestion des Patients">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      {stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
          {[
            { label:'Total patients', val:stats.total,      color:'#2563eb' },
            { label:'En traitement',  val:stats.traitement, color:'#7c3aed' },
            { label:'En rémission',   val:stats.remission,  color:'#16a34a' },
            { label:'Perdus de vue',  val:stats.perdu_vue,  color:'#d97706' },
            { label:'Décédés',        val:stats.decede,     color:'#dc2626' },
          ].map(({ label, val, color }) => (
            <div key={label} style={{
              background:'#fff', border:'1px solid rgba(37,99,235,0.1)',
              borderRadius:14, padding:'18px 20px', position:'relative', overflow:'hidden',
              boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
            }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${color},${color}88)`, borderRadius:'14px 14px 0 0' }} />
              <div style={{ minHeight:22, marginBottom:6 }} />
              <div style={{ fontSize:30, fontWeight:800, color, fontFamily:'var(--font-display)', lineHeight:1, marginBottom:4 }}>{val??'—'}</div>
              <div style={{ fontSize:12, fontWeight:600, color:'#334155' }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', padding:'14px 18px',
        display:'flex', alignItems:'center', gap:12, marginBottom:16, flexWrap:'wrap',
      }}>
        {/* Search */}
        <div style={{
          flex:1, minWidth:220,
          display:'flex', alignItems:'center', gap:8,
          background:'#f8fafc', border:'1px solid var(--border)',
          borderRadius:'var(--radius-md)', padding:'8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom, N° dossier, tél, date de naiss. (JJ/MM/AAAA), période (2022-2025)..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a', fontFamily:'var(--font-body)' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#64748b' }}>✕</button>
          )}
        </div>

        {/* Filters */}
        {[
          { key:'sexe',           label:'Sexe',   opts:[['','Tous'],['M','Masculin'],['F','Féminin']] },
          { key:'statut_dossier', label:'Statut', opts:[['','Tous'],['nouveau','Nouveau'],['traitement','Traitement'],['remission','Rémission'],['perdu','Perdu de vue'],['decede','Décédé']] },
        ].map(({ key, label, opts }) => (
          <select key={key}
            value={filters[key]}
            onChange={e => setFilters(f => ({ ...f, [key]:e.target.value }))}
            style={{
              padding:'8px 12px', background:'var(--bg-elevated)',
              border:'1px solid var(--border)', borderRadius:'var(--radius-md)',
              color:'#334155', fontSize:12.5, cursor:'pointer', outline:'none',
            }}
          >
            {opts.map(([v,l]) => <option key={v} value={v}>{l==='Tous'?`${label}: Tous`:l}</option>)}
          </select>
        ))}

        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={() => setShowExport(true)}
            style={{
              padding:'9px 16px',
              background:'#fff',
              border:'1px solid rgba(22,163,74,0.35)',
              borderRadius:'var(--radius-md)',
              color:'#16a34a',
              fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:7,
              boxShadow:'0 2px 6px rgba(22,163,74,0.1)',
              transition:'all .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background='rgba(22,163,74,0.06)'; e.currentTarget.style.borderColor='rgba(22,163,74,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='rgba(22,163,74,0.35)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Exporter
            {pagination.count > 0 && (
              <span style={{ fontSize:10, background:'rgba(22,163,74,0.12)', color:'#16a34a', borderRadius:99, padding:'1px 6px', fontWeight:700 }}>
                {pagination.count.toLocaleString('fr-FR')}
              </span>
            )}
          </button>

          <CanRegImportExport onImportDone={() => fetchPatients()} />

          <Link to="/patients/nouveau" style={{ textDecoration:'none' }}>
            <button style={{
              padding:'9px 18px',
              background:'linear-gradient(135deg,#3b82f6,#2563eb)',
              border:'none', borderRadius:'var(--radius-md)',
              color:'#fff', fontSize:13, fontWeight:600, cursor:'pointer',
              display:'flex', alignItems:'center', gap:6,
              fontFamily:'var(--font-display)',
            }}>
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Nouveau patient
            </button>
          </Link>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border-light)',
        borderRadius:'var(--radius-md)', overflow:'hidden',
      }}>
        {loading ? (
          <div style={{ padding:48, textAlign:'center', color:'#64748b' }}>
            <div style={{ width:32, height:32, border:'3px solid #dbeafe', borderTopColor:'#2563eb', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
            Chargement...
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding:64, textAlign:'center' }}>
            <div style={{ fontSize:14, color:'#64748b' }}>Aucun patient trouvé</div>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-elevated)' }}>
                {['N° Dossier','Patient','Sexe','Âge','Wilaya','Statut','Médecin','Enregistré le','','',''].map((h,idx) => (
                  <th key={idx} style={{
                    padding:'10px 14px', textAlign:'left',
                    fontSize:11, fontWeight:600, letterSpacing:.5,
                    color:'#94a3b8', textTransform:'uppercase',
                    borderBottom:'1px solid rgba(37,99,235,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {patients.map((p, i) => (
                <tr key={p.id}
                  onClick={() => navigate(`/patients/${p.id}`)}
                  style={{
                    cursor:'pointer', borderBottom:'1px solid rgba(37,99,235,0.06)', transition:'background .1s',
                    background: i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background='var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background= i%2===0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ fontFamily:'var(--font-mono)', fontSize:12, color:'#2563eb' }}>{p.registration_number}</span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#0f172a' }}>{p.full_name}</div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{ padding:'2px 8px', borderRadius:12, fontSize:11, fontWeight:600, ...(SEXE_COLORS[p.sexe]||SEXE_COLORS.U) }}>
                      {p.sexe_label}
                    </span>
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:13, color:'#334155' }}>{p.age??'—'} ans</td>
                  <td style={{ padding:'12px 14px', fontSize:12.5, color:'#334155' }}>{p.wilaya||'—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <StatusBadge statut={p.statut_dossier} label={p.statut_label} />
                  </td>
                  <td style={{ padding:'12px 14px', fontSize:12, color:'#64748b' }}>{p.medecin_nom||'—'}</td>
                  <td style={{ padding:'12px 14px', fontSize:11, color:'#64748b', fontFamily:'var(--font-mono)' }}>
                    {new Date(p.date_enregistrement).toLocaleDateString('fr-DZ')}
                  </td>
                  <td style={{ padding:'12px 8px 12px 14px' }} onClick={e => e.stopPropagation()}>
                    <Link to={`/patients/${p.id}`} style={{ textDecoration:'none' }}>
                      <button style={{ padding:'5px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:11.5, cursor:'pointer' }}>
                        Voir
                      </button>
                    </Link>
                  </td>
                  <td style={{ padding:'12px 4px' }} onClick={e => e.stopPropagation()}>
                    <ExportSingleButton onExport={(format) => handleSingleExport(p, format)} />
                  </td>
                  <td style={{ padding:'12px 14px 12px 4px' }} onClick={e => e.stopPropagation()}>
                    <DeleteIconButton
                      onClick={() => setDeleteTarget(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.count > 20 && (
          <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <span style={{ fontSize:12, color:'#64748b' }}>{pagination.count} patients au total</span>
            <div style={{ display:'flex', gap:8 }}>
              <button
                disabled={!pagination.previous}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                style={{ padding:'6px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:12, cursor:pagination.previous?'pointer':'not-allowed', opacity:pagination.previous?1:.4 }}
              >← Précédent</button>
              <button
                disabled={!pagination.next}
                onClick={() => setPage(p => p + 1)}
                style={{ padding:'6px 14px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:6, color:'#334155', fontSize:12, cursor:pagination.next?'pointer':'not-allowed', opacity:pagination.next?1:.4 }}
              >Suivant →</button>
            </div>
          </div>
        )}
      </div>

      {/* Export Modal (liste complète) */}
      {showExport && (
        <ExportModal
          onClose={() => setShowExport(false)}
          currentFilters={filters}
        />
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <DeleteConfirmModal
          patient={deleteTarget}
          loading={deleteLoading}
          onClose={() => !deleteLoading && setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AppLayout>
  );
}