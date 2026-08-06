import { useState, useEffect, useCallback, useRef } from 'react';
import { AppLayout } from '../../components/layout/Sidebar';
import { adminService } from '../../services/adminService';
import toast from 'react-hot-toast';

/* ─────────────────────────────────────────────────────────────────────────────
   PRIMITIVES PARTAGÉES
───────────────────────────────────────────────────────────────────────────── */
const cardSt = {
  background:'#fff', border:'1px solid rgba(37,99,235,0.08)',
  borderRadius:14, padding:'22px 24px',
  boxShadow:'0 2px 8px rgba(15,23,42,0.06)',
};

function SectionTitle({ children, sub }) {
  return (
    <div style={{ marginBottom:18 }}>
      <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', fontFamily:'var(--font-display)' }}>{children}</div>
      {sub && <div style={{ fontSize:12, color:'#94a3b8', marginTop:3 }}>{sub}</div>}
    </div>
  );
}

function FieldRow({ label, hint, children }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:24, padding:'14px 0', borderBottom:'1px solid rgba(37,99,235,0.06)' }}>
      <div style={{ maxWidth:340 }}>
        <div style={{ fontSize:13, fontWeight:600, color:'#0f172a', marginBottom:3 }}>{label}</div>
        {hint && <div style={{ fontSize:11.5, color:'#94a3b8', lineHeight:1.5 }}>{hint}</div>}
      </div>
      <div style={{ flexShrink:0 }}>{children}</div>
    </div>
  );
}

const inputSt = {
  padding:'8px 12px', background:'#f8fafc', border:'1px solid rgba(37,99,235,0.15)',
  borderRadius:9, color:'#0f172a', fontSize:12.5, outline:'none', minWidth:220,
};

function PrimaryButton({ children, onClick, disabled, color = '#2563eb', variant = 'solid' }) {
  const solid = variant === 'solid';
  return (
    <button
      onClick={onClick} disabled={disabled}
      style={{
        padding:'9px 18px', borderRadius:10, fontSize:12.5, fontWeight:600, cursor: disabled ? 'not-allowed' : 'pointer',
        border: solid ? 'none' : `1px solid ${color}30`,
        background: solid ? (disabled ? '#93c5fd' : `linear-gradient(135deg,${color}dd,${color})`) : `${color}0c`,
        color: solid ? '#fff' : color,
        opacity: disabled ? 0.7 : 1,
        boxShadow: solid ? `0 3px 10px ${color}30` : 'none',
        display:'inline-flex', alignItems:'center', gap:6,
      }}
    >
      {children}
    </button>
  );
}

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width:42, height:24, borderRadius:20, border:'none', cursor:'pointer', position:'relative',
        background: checked ? '#2563eb' : '#cbd5e1', transition:'background .15s', flexShrink:0,
      }}
    >
      <div style={{
        width:18, height:18, borderRadius:'50%', background:'#fff',
        position:'absolute', top:3, left: checked ? 21 : 3, transition:'left .15s',
        boxShadow:'0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TABS NAVIGATION
───────────────────────────────────────────────────────────────────────────── */
const TABS = [
  { key:'general',       label:'Général',                icon:'⚙️' },
  { key:'backup',        label:'Sauvegarde & restauration', icon:'💾' },
  { key:'notifications', label:'Notifications',          icon:'✉️' },
  { key:'passwords',     label:'Mots de passe',          icon:'🔑' },
];

function TabsNav({ active, onChange }) {
  return (
    <div style={{ display:'flex', gap:6, marginBottom:20, background:'#fff', padding:6, borderRadius:12, border:'1px solid rgba(37,99,235,0.08)', boxShadow:'0 2px 8px rgba(15,23,42,0.06)', width:'fit-content' }}>
      {TABS.map(t => {
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            style={{
              padding:'9px 16px', borderRadius:9, border:'none', cursor:'pointer',
              fontSize:12.5, fontWeight:600, display:'flex', alignItems:'center', gap:7,
              background: isActive ? 'linear-gradient(135deg,#3b82f6,#2563eb)' : 'transparent',
              color: isActive ? '#fff' : '#64748b',
              boxShadow: isActive ? '0 3px 10px rgba(37,99,235,0.3)' : 'none',
              transition:'all .15s',
            }}
          >
            <span>{t.icon}</span>{t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — GÉNÉRAL
───────────────────────────────────────────────────────────────────────────── */
function GeneralTab() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.settings.get();
      setSettings(data);
    } catch {
      setSettings({
        nom_application: 'RegistreCancer.dz',
        email_contact: '',
        langue: 'fr-DZ',
        fuseau_horaire: 'Africa/Algiers',
        session_timeout: 60,
        mode_maintenance: false,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setSettings(s => ({ ...s, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminService.settings.update(settings);
      toast.success('Paramètres enregistrés.');
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'enregistrement.");
    } finally { setSaving(false); }
  };

  if (loading || !settings) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Chargement...</div>;

  return (
    <div style={cardSt}>
      <SectionTitle sub="Informations générales et comportement de la plateforme">Configuration de l'application</SectionTitle>

      <FieldRow label="Nom de l'application" hint="Affiché dans l'en-tête et les emails envoyés aux utilisateurs.">
        <input style={inputSt} value={settings.nom_application} onChange={e => set('nom_application', e.target.value)} />
      </FieldRow>

      <FieldRow label="Email de contact" hint="Adresse affichée pour le support technique.">
        <input style={inputSt} type="email" value={settings.email_contact} onChange={e => set('email_contact', e.target.value)} placeholder="support@registrecancer.dz" />
      </FieldRow>

      <FieldRow label="Langue par défaut" hint="Locale utilisée pour le formatage des dates et nombres.">
        <select style={inputSt} value={settings.langue} onChange={e => set('langue', e.target.value)}>
          <option value="fr-DZ">Français (Algérie)</option>
          <option value="ar-DZ">العربية (الجزائر)</option>
          <option value="fr-FR">Français (France)</option>
        </select>
      </FieldRow>

      <FieldRow label="Fuseau horaire" hint="Utilisé pour l'horodatage des dossiers et du journal d'audit.">
        <select style={inputSt} value={settings.fuseau_horaire} onChange={e => set('fuseau_horaire', e.target.value)}>
          <option value="Africa/Algiers">Africa/Algiers (UTC+1)</option>
          <option value="UTC">UTC</option>
        </select>
      </FieldRow>

      <FieldRow label="Expiration de session" hint="Durée d'inactivité avant déconnexion automatique (minutes).">
        <input style={{ ...inputSt, minWidth:100 }} type="number" min={5} max={480} value={settings.session_timeout} onChange={e => set('session_timeout', Number(e.target.value))} />
      </FieldRow>

      <FieldRow label="Mode maintenance" hint="Bloque l'accès à tous les utilisateurs sauf les administrateurs.">
        <Toggle checked={settings.mode_maintenance} onChange={v => set('mode_maintenance', v)} />
      </FieldRow>

      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:20 }}>
        <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</PrimaryButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — SAUVEGARDE & RESTAURATION
───────────────────────────────────────────────────────────────────────────── */
function ConfirmModal({ title, message, confirmLabel, color = '#dc2626', onConfirm, onCancel, loading }) {
  const overlayRef = useRef(null);
  return (
    <div ref={overlayRef} onClick={e => { if (e.target === overlayRef.current) onCancel(); }} style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
      zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
    }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:400, boxShadow:'0 24px 64px rgba(15,23,42,0.22)', padding:'26px 26px 22px' }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${color}12`, border:`1px solid ${color}28`, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:16, fontSize:22 }}>⚠️</div>
        <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:8 }}>{title}</div>
        <div style={{ fontSize:13, color:'#64748b', lineHeight:1.6, marginBottom:22 }}>{message}</div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onCancel} disabled={loading} style={{ flex:1, padding:'10px', borderRadius:10, border:'1px solid rgba(37,99,235,0.2)', background:'transparent', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' }}>Annuler</button>
          <button onClick={onConfirm} disabled={loading} style={{ flex:1, padding:'10px', borderRadius:10, border:'none', background: loading ? `${color}88` : color, color:'#fff', fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'En cours...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BackupTab() {
  const [backups, setBackups]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.backup.list();
      setBackups(data.results || data || []);
    } catch {
      toast.error('Impossible de charger l\'historique des sauvegardes.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await adminService.backup.create();
      toast.success('Sauvegarde créée avec succès.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de la création de la sauvegarde.');
    } finally { setCreating(false); }
  };

  const handleDownload = async (b) => {
    try {
      const res = await adminService.backup.download(b.id);
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = b.filename || `backup-${b.id}.sql`;
      document.body.appendChild(a); a.click(); a.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Échec du téléchargement.');
    }
  };

  const handleUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await adminService.backup.upload(fd);
      toast.success('Fichier de sauvegarde importé.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'import.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRestore = async () => {
    if (!confirmRestore) return;
    setRestoring(true);
    try {
      await adminService.backup.restore(confirmRestore.id);
      toast.success('Restauration effectuée. La page va se recharger.');
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de la restauration.');
    } finally {
      setRestoring(false);
      setConfirmRestore(null);
    }
  };

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={cardSt}>
          <SectionTitle sub="Génère une sauvegarde complète de la base de données (patients, diagnostics, utilisateurs, etc.)">Créer une sauvegarde</SectionTitle>
          <PrimaryButton onClick={handleCreate} disabled={creating} color="#16a34a">
            {creating ? 'Génération en cours...' : '💾 Créer une sauvegarde maintenant'}
          </PrimaryButton>
          <div style={{ fontSize:11, color:'#94a3b8', marginTop:12 }}>
            La dernière sauvegarde automatique remonte à {backups[0]?.created_at ? new Date(backups[0].created_at).toLocaleString('fr-DZ') : '—'}.
          </div>
        </div>

        <div style={cardSt}>
          <SectionTitle sub="Restaurer les données à partir d'un fichier de sauvegarde externe (.sql, .json)">Importer une sauvegarde</SectionTitle>
          <input ref={fileInputRef} type="file" accept=".sql,.json,.gz" onChange={handleUploadFile} style={{ display:'none' }} />
          <PrimaryButton onClick={() => fileInputRef.current?.click()} disabled={uploading} color="#7c3aed" variant="outline">
            {uploading ? 'Import en cours...' : '📤 Choisir un fichier'}
          </PrimaryButton>
          <div style={{ fontSize:11, color:'#d97706', marginTop:12, background:'rgba(217,119,6,0.06)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:8, padding:'8px 10px' }}>
            ⚠️ L'import remplace les données existantes. Créez une sauvegarde avant d'importer.
          </div>
        </div>
      </div>

      <div style={cardSt}>
        <SectionTitle sub="Toutes les sauvegardes disponibles, triées par date">Historique des sauvegardes</SectionTitle>

        {loading ? (
          <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Chargement...</div>
        ) : backups.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucune sauvegarde disponible</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Fichier','Taille','Créée le','',''].map((h,i) => (
                  <th key={i} style={{ padding:'8px 10px', textAlign:'left', fontSize:10.5, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:.5, borderBottom:'1px solid rgba(37,99,235,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.id} style={{ borderBottom:'1px solid rgba(37,99,235,0.06)' }}>
                  <td style={{ padding:'10px', fontSize:12.5, color:'#0f172a', fontWeight:600, fontFamily:'var(--font-mono)' }}>{b.filename || `backup-${b.id}.sql`}</td>
                  <td style={{ padding:'10px', fontSize:12, color:'#64748b' }}>{b.size_display || '—'}</td>
                  <td style={{ padding:'10px', fontSize:11.5, color:'#64748b', fontFamily:'var(--font-mono)' }}>{b.created_at ? new Date(b.created_at).toLocaleString('fr-DZ') : '—'}</td>
                  <td style={{ padding:'10px' }}>
                    <button onClick={() => handleDownload(b)} style={{ padding:'6px 12px', background:'rgba(37,99,235,0.08)', border:'1px solid rgba(37,99,235,0.2)', borderRadius:8, color:'#2563eb', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>Télécharger</button>
                  </td>
                  <td style={{ padding:'10px' }}>
                    <button onClick={() => setConfirmRestore(b)} style={{ padding:'6px 12px', background:'rgba(217,119,6,0.08)', border:'1px solid rgba(217,119,6,0.2)', borderRadius:8, color:'#d97706', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>Restaurer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {confirmRestore && (
        <ConfirmModal
          title="Restaurer cette sauvegarde ?"
          message={`Toutes les données actuelles seront remplacées par le contenu de "${confirmRestore.filename || `backup-${confirmRestore.id}.sql`}". Cette action est irréversible.`}
          confirmLabel="Restaurer"
          color="#d97706"
          loading={restoring}
          onConfirm={handleRestore}
          onCancel={() => !restoring && setConfirmRestore(null)}
        />
      )}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — NOTIFICATIONS (mot de passe oublié)
───────────────────────────────────────────────────────────────────────────── */
function NotificationsTab() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.notifications.getConfig();
      setConfig(data);
    } catch {
      setConfig({
        notif_mot_de_passe_oublie: true,
        expediteur_nom: 'RegistreCancer.dz',
        expediteur_email: 'noreply@registrecancer.dz',
        duree_validite_lien_heures: 24,
        notif_nouveau_compte: true,
        notif_changement_role: false,
      });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const set = (k, v) => setConfig(c => ({ ...c, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await adminService.notifications.updateConfig(config);
      toast.success('Configuration des notifications enregistrée.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de l\'enregistrement.');
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testEmail) { toast.error('Entrez une adresse email.'); return; }
    setSendingTest(true);
    try {
      await adminService.notifications.sendTest(testEmail);
      toast.success(`Email de test envoyé à ${testEmail}.`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Échec de l'envoi.");
    } finally { setSendingTest(false); }
  };

  if (loading || !config) return <div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Chargement...</div>;

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={cardSt}>
        <SectionTitle sub="Emails envoyés automatiquement lors d'une demande de réinitialisation de mot de passe">Mot de passe oublié</SectionTitle>

        <FieldRow label="Activer les notifications" hint="Envoie un lien de réinitialisation quand un utilisateur clique sur « Mot de passe oublié ».">
          <Toggle checked={config.notif_mot_de_passe_oublie} onChange={v => set('notif_mot_de_passe_oublie', v)} />
        </FieldRow>

        <FieldRow label="Nom de l'expéditeur" hint="Affiché comme expéditeur dans la boîte de réception du destinataire.">
          <input style={inputSt} value={config.expediteur_nom} onChange={e => set('expediteur_nom', e.target.value)} />
        </FieldRow>

        <FieldRow label="Email expéditeur" hint="Adresse depuis laquelle les emails de réinitialisation sont envoyés.">
          <input style={inputSt} type="email" value={config.expediteur_email} onChange={e => set('expediteur_email', e.target.value)} />
        </FieldRow>

        <FieldRow label="Durée de validité du lien" hint="Le lien de réinitialisation expire après ce délai (heures).">
          <input style={{ ...inputSt, minWidth:100 }} type="number" min={1} max={72} value={config.duree_validite_lien_heures} onChange={e => set('duree_validite_lien_heures', Number(e.target.value))} />
        </FieldRow>

        <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:16, paddingTop:16, borderTop:'1px solid rgba(37,99,235,0.06)' }}>
          <input
            style={{ ...inputSt, flex:1 }} type="email" placeholder="votre.email@exemple.dz"
            value={testEmail} onChange={e => setTestEmail(e.target.value)}
          />
          <PrimaryButton onClick={sendTest} disabled={sendingTest} color="#0891b2" variant="outline">
            {sendingTest ? 'Envoi...' : 'Envoyer un test'}
          </PrimaryButton>
        </div>
      </div>

      <div style={cardSt}>
        <SectionTitle sub="Autres notifications automatiques envoyées par email">Autres notifications</SectionTitle>

        <FieldRow label="Création de compte" hint="Envoie les identifiants de connexion lors de la création d'un nouvel utilisateur.">
          <Toggle checked={config.notif_nouveau_compte} onChange={v => set('notif_nouveau_compte', v)} />
        </FieldRow>

        <FieldRow label="Changement de rôle" hint="Avertit l'utilisateur lorsque son rôle est modifié par un administrateur.">
          <Toggle checked={config.notif_changement_role} onChange={v => set('notif_changement_role', v)} />
        </FieldRow>
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <PrimaryButton onClick={save} disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</PrimaryButton>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ONGLET — MOTS DE PASSE (générer / attribuer un nouveau mot de passe)
───────────────────────────────────────────────────────────────────────────── */
function generatePassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  let pwd = '';
  for (let i = 0; i < length; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

function PasswordsTab() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newPwd, setNewPwd] = useState('');
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState({ longueur_min: 8, expiration_jours: 90, exiger_maj_chiffre: true });
  const [savingPolicy, setSavingPolicy] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await adminService.users.list({ search });
      setUsers(data.results || data || []);
    } catch {
      toast.error('Impossible de charger les utilisateurs.');
    } finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [fetchUsers]);

  useEffect(() => {
    adminService.settings.get?.()
      .then(({ data }) => { if (data?.password_policy) setPolicy(data.password_policy); })
      .catch(() => {});
  }, []);

  const openFor = (u) => {
    setSelectedUser(u);
    setNewPwd(generatePassword());
  };

  const confirmNewPassword = async () => {
    if (!selectedUser) return;
    if (newPwd.length < (policy.longueur_min || 8)) {
      toast.error(`Le mot de passe doit contenir au moins ${policy.longueur_min || 8} caractères.`);
      return;
    }
    setSaving(true);
    try {
      await adminService.users.resetPassword(selectedUser.id, newPwd);
      toast.success(`Nouveau mot de passe attribué à ${selectedUser.full_name || selectedUser.username}.`);
      setSelectedUser(null);
      setNewPwd('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de la réinitialisation.');
    } finally { setSaving(false); }
  };

  const savePolicy = async () => {
    setSavingPolicy(true);
    try {
      await adminService.settings.update({ password_policy: policy });
      toast.success('Politique de mot de passe enregistrée.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Échec de l\'enregistrement.');
    } finally { setSavingPolicy(false); }
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      <div style={cardSt}>
        <SectionTitle sub="Règles appliquées à tous les mots de passe créés sur la plateforme">Politique de mot de passe</SectionTitle>

        <FieldRow label="Longueur minimale" hint="Nombre de caractères minimum exigé.">
          <input style={{ ...inputSt, minWidth:100 }} type="number" min={6} max={32} value={policy.longueur_min} onChange={e => setPolicy(p => ({ ...p, longueur_min: Number(e.target.value) }))} />
        </FieldRow>

        <FieldRow label="Expiration" hint="Nombre de jours avant qu'un mot de passe ne doive être changé (0 = jamais).">
          <input style={{ ...inputSt, minWidth:100 }} type="number" min={0} max={365} value={policy.expiration_jours} onChange={e => setPolicy(p => ({ ...p, expiration_jours: Number(e.target.value) }))} />
        </FieldRow>

        <FieldRow label="Exiger majuscule + chiffre" hint="Impose au moins une majuscule et un chiffre.">
          <Toggle checked={policy.exiger_maj_chiffre} onChange={v => setPolicy(p => ({ ...p, exiger_maj_chiffre: v }))} />
        </FieldRow>

        <div style={{ display:'flex', justifyContent:'flex-end', marginTop:16 }}>
          <PrimaryButton onClick={savePolicy} disabled={savingPolicy}>{savingPolicy ? 'Enregistrement...' : 'Enregistrer la politique'}</PrimaryButton>
        </div>
      </div>

      <div style={cardSt}>
        <SectionTitle sub="Rechercher un utilisateur et lui attribuer un nouveau mot de passe">Attribuer un nouveau mot de passe</SectionTitle>

        <div style={{
          display:'flex', alignItems:'center', gap:8, background:'#f8fafc',
          border:'1px solid rgba(37,99,235,0.15)', borderRadius:10, padding:'8px 12px', marginBottom:14, maxWidth:360,
        }}>
          <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#94a3b8">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Nom, email, username..."
            style={{ background:'none', border:'none', outline:'none', flex:1, fontSize:13, color:'#0f172a' }}
          />
        </div>

        {loading ? (
          <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Chargement...</div>
        ) : users.length === 0 ? (
          <div style={{ padding:24, textAlign:'center', color:'#94a3b8', fontSize:12 }}>Aucun utilisateur trouvé</div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:6, maxHeight:320, overflowY:'auto' }}>
            {users.map(u => (
              <div key={u.id} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'10px 12px', borderRadius:10, border:'1px solid rgba(37,99,235,0.08)',
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:30, height:30, borderRadius:'50%', background:'rgba(37,99,235,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, color:'#2563eb' }}>
                    {(u.role || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize:12.5, fontWeight:600, color:'#0f172a' }}>{u.full_name || u.username}</div>
                    <div style={{ fontSize:11, color:'#94a3b8' }}>{u.email}</div>
                  </div>
                </div>
                <button onClick={() => openFor(u)} style={{ padding:'6px 14px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:8, color:'#7c3aed', fontSize:11.5, fontWeight:600, cursor:'pointer' }}>
                  Nouveau mot de passe
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div onClick={e => { if (e.target === e.currentTarget) setSelectedUser(null); }} style={{
          position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(4px)',
          zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:16,
        }}>
          <div style={{ background:'#fff', borderRadius:18, width:'100%', maxWidth:420, boxShadow:'0 24px 64px rgba(124,58,237,0.18)', overflow:'hidden' }}>
            <div style={{ height:4, background:'linear-gradient(90deg,#a78bfa,#7c3aed)' }} />
            <div style={{ padding:'26px 26px 22px' }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:6 }}>Nouveau mot de passe</div>
              <div style={{ fontSize:12.5, color:'#64748b', marginBottom:16 }}>Pour {selectedUser.full_name || selectedUser.username} ({selectedUser.email})</div>

              <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                <input
                  value={newPwd} onChange={e => setNewPwd(e.target.value)}
                  style={{ flex:1, boxSizing:'border-box', padding:'10px 13px', borderRadius:10, border:'1px solid rgba(124,58,237,0.25)', background:'#faf8ff', color:'#0f172a', fontSize:13, outline:'none', fontFamily:'var(--font-mono)' }}
                />
                <button onClick={() => setNewPwd(generatePassword())} title="Générer aléatoirement" style={{ padding:'0 14px', borderRadius:10, border:'1px solid rgba(124,58,237,0.25)', background:'#fff', color:'#7c3aed', cursor:'pointer', fontSize:16 }}>🔄</button>
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', marginBottom:20 }}>
                Min. {policy.longueur_min || 8} caractères. Communiquez ce mot de passe à l'utilisateur de façon sécurisée.
              </div>

              <div style={{ display:'flex', gap:10 }}>
                <button onClick={() => setSelectedUser(null)} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:10, border:'1px solid rgba(37,99,235,0.2)', background:'transparent', color:'#64748b', fontSize:13, fontWeight:600, cursor:'pointer' }}>Annuler</button>
                <button onClick={confirmNewPassword} disabled={saving} style={{ flex:1, padding:'11px', borderRadius:10, border:'none', background: saving ? '#c4b5fd' : 'linear-gradient(135deg,#a78bfa,#7c3aed)', color:'#fff', fontSize:13, fontWeight:700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Enregistrement…' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN — AdminSettingsPage
   ══════════════════════════════════════════════ */
export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  return (
    <AppLayout title="Paramètres">
      <div style={{ marginBottom:6 }}>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, color:'#0f172a', marginBottom:3 }}>
          Paramètres de l'administrateur
        </h2>
        <div style={{ fontSize:12, color:'#94a3b8', marginBottom:18 }}>
          Configuration de l'application, sauvegardes, notifications et sécurité des comptes.
        </div>
      </div>

      <TabsNav active={activeTab} onChange={setActiveTab} />

      {activeTab === 'general'       && <GeneralTab />}
      {activeTab === 'backup'        && <BackupTab />}
      {activeTab === 'notifications' && <NotificationsTab />}
      {activeTab === 'passwords'     && <PasswordsTab />}
    </AppLayout>
  );
}