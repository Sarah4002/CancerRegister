/**
 * pages/admin/AdminCustomFieldsPage.jsx
 *
 * Page admin — Gestionnaire des champs personnalisés.
 * Accessible via /admin/champs-personnalises
 */

import { useState, useEffect } from 'react';
import { AppLayout } from '../../components/layout/Sidebar';
import { apiClient } from '../../services/apiClient';
import toast from 'react-hot-toast';

const MODULE_LABELS = {
  patient:    { label: 'Dossier patient',      color: '#00a8ff', icon: '' },
  diagnostic: { label: 'Diagnostic',           color: '#9b8afb', icon: '' },
  traitement: { label: 'Traitement',           color: '#f5a623', icon: '' },
  suivi:      { label: 'Suivi / Consultation', color: '#00e5a0', icon: '' },
};

const TYPE_OPTIONS = [
  { value: 'texte',    label: 'Texte libre',          icon: '' },
  { value: 'nombre',   label: 'Nombre',               icon: '' },
  { value: 'date',     label: 'Date',                 icon: '' },
  { value: 'booleen',  label: 'Oui / Non',            icon: '' },
  { value: 'textarea', label: 'Texte long',           icon: '' },
  { value: 'select',   label: 'Liste déroulante',     icon: '' },
];

const CHAMP_VIDE = {
  nom: '', description: '', type_champ: 'texte', module: 'patient',
  topographie_code: '', topographie_libelle: '',
  obligatoire: false, actif: true, ordre: 0,
  valeur_min: '', valeur_max: '', unite: '',
  options: [],
};

// ── Formulaire création/édition ──────────────────────────────
function ChampForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm]           = useState({ ...CHAMP_VIDE, ...initial });
  const [newOption, setNewOption] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addOption = () => {
    if (!newOption.trim()) return;
    set('options', [...(form.options || []), newOption.trim()]);
    setNewOption('');
  };

  const removeOption = (i) => {
    set('options', form.options.filter((_, idx) => idx !== i));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nom.trim()) { toast.error('Le nom du champ est requis.'); return; }
    if (form.type_champ === 'select' && (!form.options || form.options.length === 0)) {
      toast.error('Ajoutez au moins une option pour la liste déroulante.'); return;
    }
    onSave(form);
  };

  const input = {
    width: '100%', padding: '9px 12px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-light)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--text-primary)', fontSize: 13.5,
    outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>

        {/* Nom */}
        <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
          <Label>Nom du champ *</Label>
          <input value={form.nom} onChange={e => set('nom', e.target.value)}
            placeholder="ex: HER2, Grade SBR, PSA..." style={input} />
        </div>

        {/* Module */}
        <div style={{ marginBottom: 14 }}>
          <Label>Module *</Label>
          <select value={form.module} onChange={e => set('module', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
            {Object.entries(MODULE_LABELS).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Type */}
        <div style={{ marginBottom: 14 }}>
          <Label>Type de champ *</Label>
          <select value={form.type_champ} onChange={e => set('type_champ', e.target.value)} style={{ ...input, cursor: 'pointer' }}>
            {TYPE_OPTIONS.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
          <Label>Description / aide (optionnel)</Label>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Aide affichée sous le champ..." style={input} />
        </div>

        {/* Cancer spécifique */}
        <div style={{ marginBottom: 14 }}>
          <Label>Code topographie ICD-O-3 (optionnel)</Label>
          <input value={form.topographie_code} onChange={e => set('topographie_code', e.target.value)}
            placeholder="ex: C50 (laisser vide = global)" style={input} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Libellé topographie</Label>
          <input value={form.topographie_libelle} onChange={e => set('topographie_libelle', e.target.value)}
            placeholder="ex: Cancer du sein" style={input} />
        </div>

        {/* Nombre : min/max/unité */}
        {form.type_champ === 'nombre' && <>
          <div style={{ marginBottom: 14 }}>
            <Label>Valeur minimum</Label>
            <input type="number" value={form.valeur_min} onChange={e => set('valeur_min', e.target.value)} style={input} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <Label>Valeur maximum</Label>
            <input type="number" value={form.valeur_max} onChange={e => set('valeur_max', e.target.value)} style={input} />
          </div>
          <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
            <Label>Unité (ex: mg/L, cm, %)</Label>
            <input value={form.unite} onChange={e => set('unite', e.target.value)} placeholder="mg/L" style={input} />
          </div>
        </>}

        {/* Select : options */}
        {form.type_champ === 'select' && (
          <div style={{ marginBottom: 14, gridColumn: '1 / -1' }}>
            <Label>Options de la liste *</Label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
              <input
                value={newOption}
                onChange={e => setNewOption(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(); } }}
                placeholder="Ajouter une option puis Entrée..."
                style={{ ...input, flex: 1 }}
              />
              <button type="button" onClick={addOption} style={{
                padding: '9px 16px', background: 'var(--accent-dim)',
                border: '1px solid var(--accent)', borderRadius: 'var(--radius-md)',
                color: 'var(--accent)', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              }}>+ Ajouter</button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(form.options || []).map((opt, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 20,
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-light)',
                  fontSize: 12.5, color: 'var(--text-primary)',
                }}>
                  {opt}
                  <button type="button" onClick={() => removeOption(i)} style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontSize: 14, lineHeight: 1, padding: 0,
                  }}>×</button>
                </span>
              ))}
              {(!form.options || form.options.length === 0) && (
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aucune option ajoutée</span>
              )}
            </div>
          </div>
        )}

        {/* Obligatoire + ordre */}
        <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13.5, color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={form.obligatoire} onChange={e => set('obligatoire', e.target.checked)}
              style={{ width: 15, height: 15, cursor: 'pointer' }} />
            Champ obligatoire
          </label>
        </div>
        <div style={{ marginBottom: 14 }}>
          <Label>Ordre d'affichage</Label>
          <input type="number" value={form.ordre} onChange={e => set('ordre', parseInt(e.target.value) || 0)}
            min="0" style={input} />
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
        <button type="button" onClick={onCancel} style={{
          flex: '0 0 100px', padding: '10px',
          background: 'var(--bg-elevated)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
          fontSize: 13, cursor: 'pointer',
        }}>Annuler</button>
        <button type="submit" disabled={saving} style={{
          flex: 1, padding: '10px',
          background: 'linear-gradient(135deg, #00a8ff, #0080cc)',
          border: 'none', borderRadius: 'var(--radius-md)',
          color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Enregistrement...' : initial?.id ? 'Modifier le champ' : 'Créer le champ'}
        </button>
      </div>
    </form>
  );
}

// ── Page principale ──────────────────────────────────────────
export default function AdminCustomFieldsPage() {
  const [champs,        setChamps]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showForm,      setShowForm]      = useState(false);
  const [editChamp,     setEditChamp]     = useState(null);
  const [saving,        setSaving]        = useState(false);
  const [filtreModule,  setFiltreModule]  = useState('');
  const [search,        setSearch]        = useState('');

  const fetchChamps = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/custom-fields/champs/');
      setChamps(data.results || data);
    } catch {
      toast.error('Erreur lors du chargement.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChamps(); }, []);

  const handleSave = async (form) => {
    setSaving(true);
    // Convertir les champs numériques vides en null pour éviter l'erreur Django
    const payload = {
      ...form,
      valeur_min: form.valeur_min === '' || form.valeur_min === undefined ? null : Number(form.valeur_min),
      valeur_max: form.valeur_max === '' || form.valeur_max === undefined ? null : Number(form.valeur_max),
      ordre:      form.ordre === '' || form.ordre === undefined ? 0 : Number(form.ordre),
    };
    try {
      if (form.id) {
        await apiClient.patch(`/custom-fields/champs/${form.id}/`, payload);
        toast.success('Champ modifié avec succès.');
      } else {
        await apiClient.post('/custom-fields/champs/', payload);
        toast.success('Champ créé avec succès.');
      }
      setShowForm(false);
      setEditChamp(null);
      fetchChamps();
    } catch (err) {
      const msg = err.response?.data
        ? Object.values(err.response.data).flat().join(' ')
        : 'Erreur lors de la sauvegarde.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActif = async (champ) => {
    try {
      await apiClient.patch(`/custom-fields/champs/${champ.id}/`, { actif: !champ.actif });
      toast.success(champ.actif ? 'Champ désactivé.' : 'Champ activé.');
      fetchChamps();
    } catch {
      toast.error('Erreur lors de la modification.');
    }
  };

  const handleDelete = async (champ) => {
    if (!window.confirm(`Supprimer le champ "${champ.nom}" ? Cette action est irréversible.`)) return;
    try {
      await apiClient.delete(`/custom-fields/champs/${champ.id}/`);
      toast.success('Champ supprimé.');
      fetchChamps();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const champsFiltres = champs.filter(c => {
    if (filtreModule && c.module !== filtreModule) return false;
    if (search && !c.nom.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // KPIs
  const total  = champs.length;
  const actifs = champs.filter(c => c.actif).length;
  const parModule = Object.keys(MODULE_LABELS).reduce((acc, m) => {
    acc[m] = champs.filter(c => c.module === m).length;
    return acc;
  }, {});

  return (
    <AppLayout title="Champs personnalisés">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }`}</style>

      <div style={{ maxWidth: 1000, margin: '0 auto', animation: 'fadeUp 0.3s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontFamily: 'var(--font-display)' }}>
              Gestionnaire de champs
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Créez des champs supplémentaires qui apparaissent dans les formulaires
            </p>
          </div>
          {!showForm && (
            <button onClick={() => { setEditChamp(null); setShowForm(true); }} style={{
              padding: '10px 18px', background: 'linear-gradient(135deg, #00a8ff, #0080cc)',
              border: 'none', borderRadius: 'var(--radius-md)',
              color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              + Nouveau champ
            </button>
          )}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 10, marginBottom: 24 }}>
          {[
            { label: 'Total champs', value: total, color: '#00a8ff' },
            { label: 'Actifs',       value: actifs, color: '#00e5a0' },
            ...Object.entries(MODULE_LABELS).map(([m, info]) => ({
              label: info.label, value: parModule[m] || 0, color: info.color,
            })),
          ].map((kpi, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              background: 'var(--bg-card)',
              border: `1px solid ${kpi.color}25`,
              borderRadius: 'var(--radius-md)',
              borderLeft: `3px solid ${kpi.color}`,
            }}>
              <div style={{ fontSize: 22, fontWeight: 700, color: kpi.color }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Formulaire création/édition */}
        {showForm && (
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)', padding: '24px 28px', marginBottom: 24,
            animation: 'fadeUp 0.2s ease',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>
              {editChamp ? `Modifier — ${editChamp.nom}` : 'Nouveau champ personnalisé'}
            </h3>
            <ChampForm
              initial={editChamp || {}}
              onSave={handleSave}
              onCancel={() => { setShowForm(false); setEditChamp(null); }}
              saving={saving}
            />
          </div>
        )}

        {/* Filtres */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un champ..."
            style={{
              flex: 1, padding: '9px 12px',
              background: 'var(--bg-card)', border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)', color: 'var(--text-primary)',
              fontSize: 13.5, outline: 'none', fontFamily: 'var(--font-body)',
            }}
          />
          <select
            value={filtreModule}
            onChange={e => setFiltreModule(e.target.value)}
            style={{
              padding: '9px 12px', background: 'var(--bg-card)',
              border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)', fontSize: 13, cursor: 'pointer',
              outline: 'none', fontFamily: 'var(--font-body)',
            }}
          >
            <option value="">Tous les modules</option>
            {Object.entries(MODULE_LABELS).map(([v, m]) => (
              <option key={v} value={v}>{m.label}</option>
            ))}
          </select>
        </div>

        {/* Liste des champs */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <div style={{ width: 24, height: 24, border: '2px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Chargement...</div>
            </div>
          ) : champsFiltres.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13.5 }}>
              {search || filtreModule ? 'Aucun champ ne correspond à votre recherche.' : 'Aucun champ personnalisé — cliquez sur "+ Nouveau champ" pour commencer.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Nom', 'Module', 'Type', 'Cancer lié', 'Obligatoire', 'Statut', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {champsFiltres.map((champ, i) => {
                  const mod = MODULE_LABELS[champ.module] || {};
                  return (
                    <tr key={champ.id} style={{ borderBottom: i < champsFiltres.length - 1 ? '1px solid var(--border)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text-primary)' }}>{champ.nom}</div>
                        {champ.description && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{champ.description}</div>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, background: `${mod.color}15`, color: mod.color, border: `1px solid ${mod.color}30` }}>
                          {mod.label}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>
                        {TYPE_OPTIONS.find(t => t.value === champ.type_champ)?.label}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: champ.topographie_code ? 'var(--accent)' : 'var(--text-muted)' }}>
                        {champ.topographie_code ? `${champ.topographie_code} — ${champ.topographie_libelle || ''}` : '— Global —'}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <span style={{ fontSize: 14 }}>{champ.obligatoire ? 'Oui' : 'Non'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <button onClick={() => handleToggleActif(champ)} style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', border: 'none',
                          background: champ.actif ? 'rgba(0,229,160,0.1)' : 'rgba(255,77,106,0.1)',
                          color: champ.actif ? '#00e5a0' : '#ff4d6a',
                        }}>
                          {champ.actif ? '● Actif' : '○ Inactif'}
                        </button>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => { setEditChamp(champ); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{
                            padding: '5px 10px', background: 'var(--bg-elevated)',
                            border: '1px solid var(--border)', borderRadius: 6,
                            color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer',
                          }}>Modifier</button>
                          <button onClick={() => handleDelete(champ)} style={{
                            padding: '5px 10px', background: 'rgba(255,77,106,0.08)',
                            border: '1px solid rgba(255,77,106,0.2)', borderRadius: 6,
                            color: '#ff4d6a', fontSize: 12, cursor: 'pointer',
                          }}>Supprimer</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Label({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3 }}>
      {children}
    </label>
  );
}