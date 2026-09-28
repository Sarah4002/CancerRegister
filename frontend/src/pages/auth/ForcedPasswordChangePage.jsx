import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authService } from '../../services/api';
import useAuthStore from '../../hooks/useAuth';

export default function ForcedPasswordChangePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [form, setForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);
  const update = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.new_password !== form.confirm_password) return toast.error('Les mots de passe ne correspondent pas.');
    setSaving(true);
    try {
      await authService.changePassword(form);
      toast.success('Mot de passe modifié. Veuillez vous reconnecter.');
      await logout();
      navigate('/login', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.old_password?.[0] || error.response?.data?.new_password?.[0] || error.response?.data?.error || 'Échec du changement de mot de passe.');
    } finally { setSaving(false); }
  };
  return <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f1f5f9', padding: 24 }}>
    <form onSubmit={submit} style={{ width: '100%', maxWidth: 440, background: 'white', padding: 32, borderRadius: 16, boxShadow: '0 12px 36px #0f172a18' }}>
      <h1 style={{ marginTop: 0, color: '#0f172a' }}>Changement obligatoire du mot de passe</h1>
      <p style={{ color: '#475569', lineHeight: 1.6 }}>Un administrateur a réinitialisé votre mot de passe. Choisissez un nouveau mot de passe pour continuer.</p>
      {[['old_password', 'Mot de passe temporaire'], ['new_password', 'Nouveau mot de passe'], ['confirm_password', 'Confirmer le nouveau mot de passe']].map(([key, label]) => <label key={key} style={{ display: 'block', marginTop: 16, color: '#334155', fontSize: 13, fontWeight: 600 }}>{label}<input required type="password" autoComplete="new-password" value={form[key]} onChange={update(key)} style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 7, padding: 12, border: '1px solid #cbd5e1', borderRadius: 8 }} /></label>)}
      <button disabled={saving} style={{ width: '100%', marginTop: 24, padding: 13, border: 0, borderRadius: 8, background: '#2563eb', color: 'white', fontWeight: 700, cursor: 'pointer' }}>{saving ? 'Enregistrement…' : 'Modifier le mot de passe'}</button>
    </form>
  </main>;
}
