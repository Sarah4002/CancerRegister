import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../../components/layout/Sidebar';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const STATUT_RCP_COLORS = {
  planifiee:  { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb', border: 'rgba(37,99,235,0.2)'   },
  en_cours:   { bg: 'rgba(124,58,237,0.08)',  color: '#7c3aed', border: 'rgba(124,58,237,0.2)'  },
  terminee:   { bg: 'rgba(22,163,74,0.08)',   color: '#16a34a', border: 'rgba(22,163,74,0.2)'   },
  annulee:    { bg: 'rgba(220,38,38,0.08)',   color: '#dc2626', border: 'rgba(220,38,38,0.2)'   },
  reportee:   { bg: 'rgba(217,119,6,0.08)',   color: '#d97706', border: 'rgba(217,119,6,0.2)'   },
};

const STATUT_LABELS = {
  planifiee: 'Planifiée',
  en_cours:  'En cours',
  terminee:  'Terminée',
  annulee:   'Annulée',
  reportee:  'Reportée',
};

const SPECIALITES = [
  'Oncologie médicale', 'Chirurgie oncologique', 'Radiothérapie',
  'Radiologie', 'Anatomopathologie', 'Biologie médicale',
  'Pneumologie', 'Gastro-entérologie', 'Gynécologie', 'Urologie',
  'Hématologie', 'Neurochirurgie', 'Médecine interne', 'Palliative',
];

const CANCER_TYPES = [
  'Sein', 'Poumon', 'Côlon', 'Prostate', 'Col de l\'utérus', 'Estomac',
  'Foie', 'Leucémie', 'Lymphome', 'Thyroïde', 'Rein', 'Vessie', 'Mélanome', 'Autre',
];

/* ─────────────────────────────────────────────────────────────────────────────
   MOCK DATA (à remplacer par appels API réels)
───────────────────────────────────────────────────────────────────────────── */
const MOCK_MEDECINS = [
  { id: 1, nom: 'Dr. Benali Ahmed',      specialite: 'Oncologie médicale',     email: 'a.benali@chu-oran.dz',      telephone: '0551234567', avatar: 'BA' },
  { id: 2, nom: 'Dr. Hadj Fatima',       specialite: 'Chirurgie oncologique',   email: 'f.hadj@chu-oran.dz',        telephone: '0662345678', avatar: 'HF' },
  { id: 3, nom: 'Dr. Meziane Karim',     specialite: 'Radiothérapie',          email: 'k.meziane@chu-oran.dz',     telephone: '0773456789', avatar: 'MK' },
  { id: 4, nom: 'Dr. Ouali Samira',      specialite: 'Radiologie',             email: 's.ouali@chu-oran.dz',       telephone: '0554567890', avatar: 'OS' },
  { id: 5, nom: 'Dr. Tlemçani Youcef',   specialite: 'Anatomopathologie',      email: 'y.tlemcani@chu-oran.dz',    telephone: '0665678901', avatar: 'TY' },
  { id: 6, nom: 'Dr. Bensalem Nadia',    specialite: 'Hématologie',            email: 'n.bensalem@chu-oran.dz',    telephone: '0776789012', avatar: 'BN' },
];

const MOCK_RCPS = [
  {
    id: 1, titre: 'RCP Oncologie – Cancers du sein', date: '2026-05-27', heure: '09:00',
    lieu: 'Salle de réunion A – CHU Oran', statut: 'planifiee',
    cancer_type: 'Sein', nb_patients: 6, nb_medecins: 5,
    medecins: [1, 2, 3, 4, 5], description: 'Réunion mensuelle pour les dossiers de cancer du sein.',
    patients: [
      { id: 101, nom: 'Boudiaf Fatima',   dossier: 'P-2024-0312', stade: 'III', statut: 'traitement' },
      { id: 102, nom: 'Hadj Meriem',      dossier: 'P-2024-0289', stade: 'II',  statut: 'nouveau'    },
      { id: 103, nom: 'Khelil Souad',     dossier: 'P-2025-0041', stade: 'IV',  statut: 'traitement' },
    ],
    notifications_envoyees: true,
  },
  {
    id: 2, titre: 'RCP Digestif – Cancers colorectaux', date: '2026-05-28', heure: '14:00',
    lieu: 'Amphithéâtre B – CHU Oran', statut: 'planifiee',
    cancer_type: 'Côlon', nb_patients: 4, nb_medecins: 4,
    medecins: [1, 2, 4, 6], description: 'Réunion bimensuelle pour les cancers digestifs.',
    patients: [
      { id: 201, nom: 'Mekki Rachid',  dossier: 'P-2024-0401', stade: 'II',  statut: 'nouveau'    },
      { id: 202, nom: 'Barka Zohra',   dossier: 'P-2025-0117', stade: 'III', statut: 'traitement' },
    ],
    notifications_envoyees: false,
  },
  {
    id: 3, titre: 'RCP Urologie – Cancers prostatiques', date: '2026-05-22', heure: '10:30',
    lieu: 'Salle de réunion C – Clinique El Hayat', statut: 'terminee',
    cancer_type: 'Prostate', nb_patients: 5, nb_medecins: 3,
    medecins: [1, 3, 5], description: 'RCP mensuelle urologie.',
    patients: [],
    notifications_envoyees: true,
  },
  {
    id: 4, titre: 'RCP Thoracique – Cancers pulmonaires', date: '2026-06-03', heure: '08:30',
    lieu: 'Salle visioconférence – CHU Oran', statut: 'planifiee',
    cancer_type: 'Poumon', nb_patients: 8, nb_medecins: 6,
    medecins: [1, 2, 3, 4, 5, 6], description: 'RCP pluridisciplinaire cancers thoraciques.',
    patients: [],
    notifications_envoyees: false,
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────────────────────── */
function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-DZ', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('fr-DZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function isUpcoming(dateStr) {
  return new Date(dateStr) >= new Date(new Date().toDateString());
}

/* ─────────────────────────────────────────────────────────────────────────────
   BADGE STATUT
───────────────────────────────────────────────────────────────────────────── */
function StatutBadge({ statut }) {
  const c = STATUT_RCP_COLORS[statut] || STATUT_RCP_COLORS.planifiee;
  return (
    <span style={{
      padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600,
      background: c.bg, color: c.color, border: `1px solid ${c.border}`, whiteSpace: 'nowrap',
    }}>
      {STATUT_LABELS[statut] || statut}
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   NOTIFICATION MODAL
───────────────────────────────────────────────────────────────────────────── */
function NotificationModal({ rcp, onClose, onSent }) {
  const overlayRef = useRef(null);
  const [selectedMedecins, setSelectedMedecins] = useState(
    (rcp.medecins || []).reduce((acc, id) => ({ ...acc, [id]: true }), {})
  );
  const [message, setMessage] = useState(
    `Bonjour,\n\nVous êtes convié(e) à la Réunion de Concertation Pluridisciplinaire :\n\n📋 ${rcp.titre}\n📅 ${formatDate(rcp.date)} à ${rcp.heure}\n📍 ${rcp.lieu}\n\nMerci de confirmer votre présence.\n\nCordialement,\nL'équipe RCP – CHU Oran`
  );
  const [canal, setCanal] = useState('email');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };
  const toggleMedecin = id => setSelectedMedecins(prev => ({ ...prev, [id]: !prev[id] }));
  const nbSelected = Object.values(selectedMedecins).filter(Boolean).length;

  const medecinsList = MOCK_MEDECINS.filter(m => rcp.medecins?.includes(m.id));

  const handleSend = async () => {
    if (nbSelected === 0) { toast.error('Sélectionnez au moins un médecin'); return; }
    setSending(true);
    // Simulate API call
    await new Promise(r => setTimeout(r, 1800));
    setSending(false);
    setSent(true);
    const destinataires = medecinsList.filter(m => selectedMedecins[m.id]);
    toast.success(`Notifications envoyées à ${nbSelected} médecin(s) via ${canal === 'email' ? 'email' : 'SMS'}`);
    setTimeout(() => { onSent && onSent(destinataires); onClose(); }, 1000);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlay}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        animation: 'fadeIn .15s ease',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 18,
        width: '100%',
        maxWidth: 580,
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(37,99,235,0.18)',
        animation: 'slideUp .2s ease',
      }}>
        {/* Blue top accent */}
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#2563eb)', borderRadius: '18px 18px 0 0' }} />

        <div style={{ padding: '24px 28px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 44, height: 44,
                background: 'rgba(37,99,235,0.08)',
                borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(37,99,235,0.15)',
                flexShrink: 0,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 14a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17z"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Envoyer des notifications</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{rcp.titre}</div>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8', lineHeight: 1, padding: '2px 6px', borderRadius: 6 }}>×</button>
          </div>

          {/* RCP Info Card */}
          <div style={{
            padding: '12px 16px',
            background: 'rgba(37,99,235,0.04)',
            border: '1px solid rgba(37,99,235,0.12)',
            borderRadius: 10,
            marginBottom: 20,
            display: 'flex', gap: 20,
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6 }}>Date</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginTop: 2 }}>{formatDate(rcp.date)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6 }}>Heure</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginTop: 2 }}>{rcp.heure}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6 }}>Lieu</div>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155', marginTop: 2 }}>{rcp.lieu}</div>
            </div>
          </div>

          {/* Canal de notification */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>Canal de notification</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { id: 'email', label: 'Email', icon: '✉️', sub: 'Envoi par messagerie' },
                { id: 'sms',   label: 'SMS',   icon: '📱', sub: 'Envoi par SMS' },
                { id: 'both',  label: 'Email + SMS', icon: '📣', sub: 'Les deux canaux' },
              ].map(c => (
                <button key={c.id} onClick={() => setCanal(c.id)} style={{
                  flex: 1, padding: '10px 8px', borderRadius: 10, border: '1.5px solid',
                  borderColor: canal === c.id ? '#3b82f6' : 'rgba(37,99,235,0.15)',
                  background: canal === c.id ? '#eff6ff' : '#fafbff',
                  cursor: 'pointer', textAlign: 'center', transition: 'all .12s',
                }}>
                  <div style={{ fontSize: 18, marginBottom: 3 }}>{c.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: canal === c.id ? '#1d4ed8' : '#334155' }}>{c.label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{c.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sélection des médecins */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8 }}>
                Destinataires <span style={{ color: '#2563eb', background: 'rgba(37,99,235,0.08)', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>{nbSelected}/{medecinsList.length}</span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setSelectedMedecins(medecinsList.reduce((a, m) => ({ ...a, [m.id]: true }), {}))} style={{ fontSize: 10.5, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer' }}>Tout sélectionner</button>
                <button onClick={() => setSelectedMedecins({})} style={{ fontSize: 10.5, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer' }}>Tout désélectionner</button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {medecinsList.map(m => (
                <label key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                  borderRadius: 10, border: '1px solid',
                  borderColor: selectedMedecins[m.id] ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.1)',
                  background: selectedMedecins[m.id] ? 'rgba(37,99,235,0.04)' : '#fafbff',
                  cursor: 'pointer', transition: 'all .1s',
                }}>
                  <input
                    type="checkbox"
                    checked={!!selectedMedecins[m.id]}
                    onChange={() => toggleMedecin(m.id)}
                    style={{ accentColor: '#2563eb', width: 14, height: 14, flexShrink: 0 }}
                  />
                  <div style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                    color: '#fff', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>{m.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{m.nom}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{m.specialite}</div>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', fontFamily: 'monospace' }}>
                    {canal === 'sms' ? m.telephone : m.email}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 8 }}>Message</div>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={7}
              style={{
                width: '100%', padding: '10px 12px',
                background: '#f8fafc', border: '1px solid rgba(37,99,235,0.15)',
                borderRadius: 10, color: '#334155', fontSize: 12.5, lineHeight: 1.6,
                outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={sending} style={{
              flex: '0 0 100px', padding: '11px', borderRadius: 10,
              border: '1px solid rgba(37,99,235,0.2)',
              background: 'transparent', color: '#64748b',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              opacity: sending ? .5 : 1,
            }}>
              Annuler
            </button>
            <button onClick={handleSend} disabled={sending || sent || nbSelected === 0} style={{
              flex: 1, padding: '11px', borderRadius: 10,
              border: 'none',
              background: sent
                ? 'linear-gradient(135deg,#16a34a,#15803d)'
                : sending
                  ? '#93c5fd'
                  : 'linear-gradient(135deg,#3b82f6,#2563eb)',
              color: '#fff',
              fontSize: 13, fontWeight: 700,
              cursor: (sending || sent || nbSelected === 0) ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
              transition: 'all .2s',
            }}>
              {sent ? (
                <><span>✓</span> Notifications envoyées !</>
              ) : sending ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Envoi en cours…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Envoyer à {nbSelected} médecin{nbSelected > 1 ? 's' : ''}
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
   CREATE / EDIT RCP MODAL
───────────────────────────────────────────────────────────────────────────── */
function RCPFormModal({ rcp, onClose, onSave }) {
  const overlayRef = useRef(null);
  const isEdit = !!rcp?.id;
  const [form, setForm] = useState({
    titre: rcp?.titre || '',
    date: rcp?.date || '',
    heure: rcp?.heure || '09:00',
    lieu: rcp?.lieu || '',
    cancer_type: rcp?.cancer_type || '',
    statut: rcp?.statut || 'planifiee',
    description: rcp?.description || '',
    medecins: rcp?.medecins || [],
  });
  const [saving, setSaving] = useState(false);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };

  const toggleMedecin = id => setForm(f => ({
    ...f,
    medecins: f.medecins.includes(id) ? f.medecins.filter(m => m !== id) : [...f.medecins, id],
  }));

  const handleSave = async () => {
    if (!form.titre || !form.date || !form.heure || !form.lieu) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    onSave({ ...rcp, ...form, id: rcp?.id || Date.now(), nb_medecins: form.medecins.length, notifications_envoyees: rcp?.notifications_envoyees || false });
    toast.success(isEdit ? 'RCP modifiée avec succès' : 'RCP créée avec succès');
    onClose();
  };

  const inp = {
    width: '100%', padding: '9px 12px',
    background: '#f8fafc', border: '1px solid rgba(37,99,235,0.15)',
    borderRadius: 9, color: '#334155', fontSize: 13, outline: 'none',
    boxSizing: 'border-box', fontFamily: 'inherit',
  };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'fadeIn .15s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620,
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(15,23,42,0.2)',
        animation: 'slideUp .2s ease',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#7c3aed)', borderRadius: '18px 18px 0 0' }} />
        <div style={{ padding: '24px 28px 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>
              {isEdit ? 'Modifier la RCP' : 'Nouvelle RCP'}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8' }}>×</button>
          </div>

          {/* Titre */}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Titre *</label>
            <input style={inp} value={form.titre} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} placeholder="Ex: RCP Oncologie – Cancers du sein" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px' }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Date *</label>
              <input type="date" style={inp} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Heure *</label>
              <input type="time" style={inp} value={form.heure} onChange={e => setForm(f => ({ ...f, heure: e.target.value }))} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Lieu *</label>
            <input style={inp} value={form.lieu} onChange={e => setForm(f => ({ ...f, lieu: e.target.value }))} placeholder="Ex: Salle de réunion A – CHU Oran" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', marginBottom: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Type de cancer</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.cancer_type} onChange={e => setForm(f => ({ ...f, cancer_type: e.target.value }))}>
                <option value="">Sélectionner</option>
                {CANCER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Statut</label>
              <select style={{ ...inp, cursor: 'pointer' }} value={form.statut} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, display: 'block', marginBottom: 6 }}>Description</label>
            <textarea style={{ ...inp, resize: 'vertical', lineHeight: 1.6 }} rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Objectif de la réunion..." />
          </div>

          {/* Médecins participants */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              Médecins participants
              <span style={{ color: '#2563eb', background: 'rgba(37,99,235,0.08)', borderRadius: 99, padding: '1px 6px', fontSize: 10 }}>{form.medecins.length}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {MOCK_MEDECINS.map(m => (
                <label key={m.id} onClick={() => toggleMedecin(m.id)} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 9, border: '1px solid',
                  borderColor: form.medecins.includes(m.id) ? 'rgba(37,99,235,0.25)' : 'rgba(37,99,235,0.1)',
                  background: form.medecins.includes(m.id) ? 'rgba(37,99,235,0.04)' : 'transparent',
                  cursor: 'pointer', transition: 'all .1s',
                }}>
                  <input type="checkbox" checked={form.medecins.includes(m.id)} onChange={() => {}} style={{ accentColor: '#2563eb', width: 13, height: 13 }} />
                  <div style={{
                    width: 28, height: 28, borderRadius: 7,
                    background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                    color: '#fff', fontSize: 9.5, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{m.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>{m.nom}</div>
                    <div style={{ fontSize: 10.5, color: '#64748b' }}>{m.specialite}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} disabled={saving} style={{
              flex: '0 0 100px', padding: '11px', borderRadius: 10,
              border: '1px solid rgba(37,99,235,0.2)', background: 'transparent',
              color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={handleSave} disabled={saving} style={{
              flex: 1, padding: '11px', borderRadius: 10, border: 'none',
              background: saving ? '#93c5fd' : 'linear-gradient(135deg,#3b82f6,#2563eb)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
            }}>
              {saving ? (
                <>
                  <span style={{ width: 14, height: 14, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block' }} />
                  Enregistrement…
                </>
              ) : (isEdit ? 'Enregistrer les modifications' : 'Créer la RCP')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RCP DETAIL MODAL
───────────────────────────────────────────────────────────────────────────── */
function RCPDetailModal({ rcp, onClose, onNotify, onEdit }) {
  const overlayRef = useRef(null);
  const handleOverlay = e => { if (e.target === overlayRef.current) onClose(); };
  const medecinsList = MOCK_MEDECINS.filter(m => rcp.medecins?.includes(m.id));

  const STADE_COLORS = {
    'I':   { bg: 'rgba(22,163,74,0.08)',   color: '#16a34a' },
    'II':  { bg: 'rgba(37,99,235,0.08)',   color: '#2563eb' },
    'III': { bg: 'rgba(217,119,6,0.08)',   color: '#d97706' },
    'IV':  { bg: 'rgba(220,38,38,0.08)',   color: '#dc2626' },
  };

  return (
    <div ref={overlayRef} onClick={handleOverlay} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)',
      zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      animation: 'fadeIn .15s ease',
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640,
        maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 24px 64px rgba(15,23,42,0.18)',
        animation: 'slideUp .2s ease',
      }}>
        <div style={{ height: 4, background: 'linear-gradient(90deg,#3b82f6,#7c3aed)' }} />
        <div style={{ padding: '24px 28px 28px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>{rcp.titre}</div>
              <StatutBadge statut={rcp.statut} />
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#94a3b8' }}>×</button>
          </div>

          {/* Infos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[
              { icon: '📅', label: 'Date', val: formatDate(rcp.date) },
              { icon: '🕐', label: 'Heure', val: rcp.heure },
              { icon: '📍', label: 'Lieu', val: rcp.lieu },
            ].map(item => (
              <div key={item.label} style={{
                padding: '12px 14px', background: 'rgba(37,99,235,0.03)',
                border: '1px solid rgba(37,99,235,0.1)', borderRadius: 10,
              }}>
                <div style={{ fontSize: 14, marginBottom: 4 }}>{item.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: .6 }}>{item.label}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#334155', marginTop: 2 }}>{item.val}</div>
              </div>
            ))}
          </div>

          {/* Description */}
          {rcp.description && (
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 9, marginBottom: 18, fontSize: 12.5, color: '#64748b', lineHeight: 1.6 }}>
              {rcp.description}
            </div>
          )}

          {/* Médecins */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
              Médecins participants ({medecinsList.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {medecinsList.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                  borderRadius: 9, border: '1px solid rgba(37,99,235,0.1)', background: '#fafbff',
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
                    color: '#fff', fontSize: 10.5, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>{m.avatar}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{m.nom}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{m.specialite}</div>
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{m.email}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Patients */}
          {rcp.patients?.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: .8, marginBottom: 10 }}>
                Patients à discuter ({rcp.patients.length})
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rcp.patients.map(p => (
                  <div key={p.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 9, border: '1px solid rgba(37,99,235,0.1)', background: '#fafbff',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#0f172a' }}>{p.nom}</div>
                      <div style={{ fontSize: 10.5, color: '#64748b', fontFamily: 'monospace', marginTop: 1 }}>{p.dossier}</div>
                    </div>
                    {p.stade && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontWeight: 600,
                        ...(STADE_COLORS[p.stade] || { bg: '#f1f5f9', color: '#64748b' }),
                        background: (STADE_COLORS[p.stade] || { bg: '#f1f5f9' }).bg,
                      }}>
                        Stade {p.stade}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, paddingTop: 4 }}>
            <button onClick={onEdit} style={{
              flex: 1, padding: '10px', borderRadius: 10,
              border: '1px solid rgba(37,99,235,0.2)', background: 'transparent',
              color: '#2563eb', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Modifier
            </button>
            <button
              onClick={onNotify}
              disabled={rcp.statut === 'annulee' || rcp.statut === 'terminee'}
              style={{
                flex: 2, padding: '10px', borderRadius: 10, border: 'none',
                background: (rcp.statut === 'annulee' || rcp.statut === 'terminee')
                  ? '#e2e8f0'
                  : rcp.notifications_envoyees
                    ? 'linear-gradient(135deg,#16a34a,#15803d)'
                    : 'linear-gradient(135deg,#3b82f6,#2563eb)',
                color: (rcp.statut === 'annulee' || rcp.statut === 'terminee') ? '#94a3b8' : '#fff',
                fontSize: 12.5, fontWeight: 700,
                cursor: (rcp.statut === 'annulee' || rcp.statut === 'terminee') ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                boxShadow: (rcp.statut !== 'annulee' && rcp.statut !== 'terminee') ? '0 4px 12px rgba(37,99,235,0.25)' : 'none',
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
              {rcp.notifications_envoyees ? 'Renvoyer les notifications' : 'Envoyer les notifications'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN RCP PAGE
───────────────────────────────────────────────────────────────────────────── */
export default function RCPPage() {
  const navigate = useNavigate();
  const [rcps, setRcps] = useState(MOCK_RCPS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [filterCancer, setFilterCancer] = useState('');

  const [showForm,         setShowForm]         = useState(false);
  const [editTarget,       setEditTarget]        = useState(null);
  const [detailTarget,     setDetailTarget]      = useState(null);
  const [notifTarget,      setNotifTarget]       = useState(null);

  // Stats
  const stats = {
    total:     rcps.length,
    planifiee: rcps.filter(r => r.statut === 'planifiee').length,
    terminee:  rcps.filter(r => r.statut === 'terminee').length,
    avec_notif: rcps.filter(r => r.notifications_envoyees).length,
    sans_notif: rcps.filter(r => !r.notifications_envoyees && r.statut === 'planifiee').length,
  };

  const filtered = rcps.filter(r => {
    const matchSearch = !search || r.titre.toLowerCase().includes(search.toLowerCase()) || r.lieu.toLowerCase().includes(search.toLowerCase());
    const matchStatut = !filterStatut || r.statut === filterStatut;
    const matchCancer = !filterCancer || r.cancer_type === filterCancer;
    return matchSearch && matchStatut && matchCancer;
  });

  const handleSaveRCP = (rcp) => {
    setRcps(prev => {
      const exists = prev.find(r => r.id === rcp.id);
      if (exists) return prev.map(r => r.id === rcp.id ? rcp : r);
      return [rcp, ...prev];
    });
  };

  const handleNotifSent = (destinataires) => {
    if (!notifTarget) return;
    setRcps(prev => prev.map(r => r.id === notifTarget.id ? { ...r, notifications_envoyees: true } : r));
    if (detailTarget?.id === notifTarget.id) setDetailTarget(prev => ({ ...prev, notifications_envoyees: true }));
  };

  return (
    <AppLayout title="Réunions de Concertation Pluridisciplinaire">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; } to { opacity:1; } }
        @keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* Stats strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total RCP',       val: stats.total,      color: '#2563eb' },
          { label: 'Planifiées',       val: stats.planifiee,  color: '#7c3aed' },
          { label: 'Terminées',        val: stats.terminee,   color: '#16a34a' },
          { label: 'Notif. envoyées',  val: stats.avec_notif, color: '#0891b2' },
          { label: 'Sans notification',val: stats.sans_notif, color: '#d97706' },
        ].map(({ label, val, color }) => (
          <div key={label} style={{
            background: '#fff', border: '1px solid rgba(37,99,235,0.1)',
            borderRadius: 14, padding: '18px 20px', position: 'relative', overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,${color},${color}88)`, borderRadius: '14px 14px 0 0' }} />
            <div style={{ minHeight: 22, marginBottom: 6 }} />
            <div style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{val ?? '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', padding: '14px 18px',
        display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          flex: 1, minWidth: 220,
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#f8fafc', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '8px 12px',
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par titre, lieu..."
            style={{ background: 'none', border: 'none', outline: 'none', flex: 1, fontSize: 13, color: '#0f172a', fontFamily: 'var(--font-body)' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>✕</button>}
        </div>

        {/* Filters */}
        <select
          value={filterStatut}
          onChange={e => setFilterStatut(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#334155', fontSize: 12.5, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Statut : Tous</option>
          {Object.entries(STATUT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <select
          value={filterCancer}
          onChange={e => setFilterCancer(e.target.value)}
          style={{ padding: '8px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: '#334155', fontSize: 12.5, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Cancer : Tous</option>
          {CANCER_TYPES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Alerte sans notif */}
          {stats.sans_notif > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 9,
              background: 'rgba(217,119,6,0.08)', border: '1px solid rgba(217,119,6,0.2)',
              fontSize: 11.5, color: '#d97706', fontWeight: 600,
            }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {stats.sans_notif} RCP sans notification
            </div>
          )}

          {/* Nouvelle RCP */}
          <button
            onClick={() => { setEditTarget(null); setShowForm(true); }}
            style={{
              padding: '9px 18px',
              background: 'linear-gradient(135deg,#3b82f6,#2563eb)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            Nouvelle RCP
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 'var(--radius-md)', overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <div style={{ width: 32, height: 32, border: '3px solid #dbeafe', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: '#64748b' }}>Aucune RCP trouvée</div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-elevated)' }}>
                {['Titre', 'Date & Heure', 'Lieu', 'Cancer', 'Médecins', 'Patients', 'Statut', 'Notifications', '', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '10px 14px', textAlign: 'left',
                    fontSize: 11, fontWeight: 600, letterSpacing: .5,
                    color: '#94a3b8', textTransform: 'uppercase',
                    borderBottom: '1px solid rgba(37,99,235,0.06)',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((rcp, i) => (
                <tr key={rcp.id}
                  onClick={() => setDetailTarget(rcp)}
                  style={{
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(37,99,235,0.06)',
                    transition: 'background .1s',
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)'}
                >
                  {/* Titre */}
                  <td style={{ padding: '12px 14px', maxWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: 12.5, color: '#0f172a' }}>{rcp.titre}</div>
                    {isUpcoming(rcp.date) && rcp.statut === 'planifiee' && (
                      <span style={{ fontSize: 10, color: '#2563eb', background: 'rgba(37,99,235,0.08)', borderRadius: 4, padding: '1px 5px', fontWeight: 600, marginTop: 3, display: 'inline-block' }}>
                        À venir
                      </span>
                    )}
                  </td>

                  {/* Date & Heure */}
                  <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>{formatDateShort(rcp.date)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{rcp.heure}</div>
                  </td>

                  {/* Lieu */}
                  <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', maxWidth: 160 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rcp.lieu}</div>
                  </td>

                  {/* Cancer */}
                  <td style={{ padding: '12px 14px' }}>
                    {rcp.cancer_type ? (
                      <span style={{ fontSize: 11.5, color: '#7c3aed', background: 'rgba(124,58,237,0.07)', borderRadius: 9, padding: '2px 8px', fontWeight: 500 }}>
                        {rcp.cancer_type}
                      </span>
                    ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
                  </td>

                  {/* Médecins */}
                  <td style={{ padding: '12px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: -4 }}>
                      {MOCK_MEDECINS.filter(m => rcp.medecins?.includes(m.id)).slice(0, 3).map((m, idx) => (
                        <div key={m.id} style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: `hsl(${m.id * 53}, 65%, 52%)`,
                          color: '#fff', fontSize: 8.5, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid #fff',
                          marginLeft: idx === 0 ? 0 : -6,
                          zIndex: 3 - idx,
                          position: 'relative',
                          title: m.nom,
                        }}>{m.avatar}</div>
                      ))}
                      {(rcp.medecins?.length || 0) > 3 && (
                        <div style={{
                          width: 24, height: 24, borderRadius: '50%',
                          background: '#e2e8f0', color: '#64748b', fontSize: 8, fontWeight: 700,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '2px solid #fff', marginLeft: -6, position: 'relative',
                        }}>+{rcp.medecins.length - 3}</div>
                      )}
                    </div>
                  </td>

                  {/* Patients */}
                  <td style={{ padding: '12px 14px' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{rcp.nb_patients || rcp.patients?.length || 0}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 3 }}>patient(s)</span>
                  </td>

                  {/* Statut */}
                  <td style={{ padding: '12px 14px' }}>
                    <StatutBadge statut={rcp.statut} />
                  </td>

                  {/* Notifications */}
                  <td style={{ padding: '12px 14px' }}>
                    {rcp.notifications_envoyees ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Envoyées
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: rcp.statut === 'planifiee' ? '#d97706' : '#94a3b8', fontWeight: 500 }}>
                        {rcp.statut === 'planifiee' ? '⚠ En attente' : '—'}
                      </span>
                    )}
                  </td>

                  {/* Action Notifier */}
                  <td style={{ padding: '12px 8px 12px 14px' }} onClick={e => e.stopPropagation()}>
                    {rcp.statut === 'planifiee' && (
                      <button
                        onClick={() => setNotifTarget(rcp)}
                        title="Envoyer les notifications"
                        style={{
                          padding: '5px 10px',
                          background: rcp.notifications_envoyees ? 'rgba(22,163,74,0.08)' : 'rgba(37,99,235,0.08)',
                          border: `1px solid ${rcp.notifications_envoyees ? 'rgba(22,163,74,0.25)' : 'rgba(37,99,235,0.2)'}`,
                          borderRadius: 7,
                          color: rcp.notifications_envoyees ? '#16a34a' : '#2563eb',
                          fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        {rcp.notifications_envoyees ? 'Renvoyer' : 'Notifier'}
                      </button>
                    )}
                  </td>

                  {/* Voir */}
                  <td style={{ padding: '12px 14px 12px 4px' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => setDetailTarget(rcp)}
                      style={{ padding: '5px 12px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, color: '#334155', fontSize: 11.5, cursor: 'pointer' }}
                    >
                      Voir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Footer count */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: '#64748b' }}>{filtered.length} RCP affichée{filtered.length > 1 ? 's' : ''}</span>
          {stats.sans_notif > 0 && (
            <span style={{ fontSize: 11.5, color: '#d97706', fontWeight: 600 }}>
              ⚠ {stats.sans_notif} RCP planifiée{stats.sans_notif > 1 ? 's' : ''} sans notification envoyée
            </span>
          )}
        </div>
      </div>

      {/* Modals */}
      {showForm && (
        <RCPFormModal
          rcp={editTarget}
          onClose={() => { setShowForm(false); setEditTarget(null); }}
          onSave={handleSaveRCP}
        />
      )}

      {detailTarget && !notifTarget && (
        <RCPDetailModal
          rcp={detailTarget}
          onClose={() => setDetailTarget(null)}
          onNotify={() => setNotifTarget(detailTarget)}
          onEdit={() => { setEditTarget(detailTarget); setDetailTarget(null); setShowForm(true); }}
        />
      )}

      {notifTarget && (
        <NotificationModal
          rcp={notifTarget}
          onClose={() => setNotifTarget(null)}
          onSent={handleNotifSent}
        />
      )}
    </AppLayout>
  );
}