import { useState, useEffect, useCallback } from 'react';
import { AppLayout } from '../../components/layout/Sidebar';
import { apiClient } from '../../services/apiClient';
import ComparaisonFusionModal from '../../components/patients/ComparaisonFusionModal';
import toast from 'react-hot-toast';

const CERTITUDE_STYLE = {
  haute:   { bg: 'rgba(255,77,106,0.12)',  color: '#ff4d6a', border: 'rgba(255,77,106,0.3)',  label: 'Certitude haute'   },
  moyenne: { bg: 'rgba(245,166,35,0.12)',  color: '#f5a623', border: 'rgba(245,166,35,0.3)',  label: 'Certitude moyenne' },
  faible:  { bg: 'rgba(155,138,251,0.12)', color: '#9b8afb', border: 'rgba(155,138,251,0.3)', label: 'Certitude faible'  },
};

function ScoreBar({ score }) {
  const pct   = Math.round(score * 100);
  const color = score >= 0.95 ? '#ff4d6a' : score >= 0.85 ? '#f5a623' : '#9b8afb';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 13, fontWeight: 700, color, minWidth: 38 }}>{pct}%</span>
    </div>
  );
}

function Avatar({ nom, prenom }) {
  const initials = ((nom || '')[0] || '') + ((prenom || '')[0] || '');
  return (
    <div style={{
      width: 40, height: 40, borderRadius: '50%',
      background: 'linear-gradient(135deg, rgba(0,168,255,0.2), rgba(0,168,255,0.05))',
      border: '2px solid rgba(0,168,255,0.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 14, fontWeight: 700, color: '#00a8ff',
    }}>
      {initials.toUpperCase() || '?'}
    </div>
  );
}

function DoublonCard({ paire, onVoir }) {
  const cs = CERTITUDE_STYLE[paire.certitude] || CERTITUDE_STYLE.faible;
  return (
    <div
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', transition: 'box-shadow 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <Avatar nom={paire.apercu_a.nom} prenom={paire.apercu_a.prenom} />
        <div style={{ width: 20, height: 2, background: 'var(--border)', borderRadius: 1 }} />
        <Avatar nom={paire.apercu_b.nom} prenom={paire.apercu_b.prenom} />
      </div>

      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {paire.apercu_a.nom} {paire.apercu_a.prenom}
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>vs</span>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {paire.apercu_b.nom} {paire.apercu_b.prenom}
          </span>
          <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cs.bg, color: cs.color, border: '1px solid ' + cs.border }}>
            {cs.label}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          {paire.raisons.join(' · ')}
        </div>
        <ScoreBar score={paire.score} />
      </div>

      <button
        onClick={() => onVoir(paire)}
        style={{ padding: '9px 18px', background: 'var(--bg-elevated)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13, fontWeight: 500, cursor: 'pointer', flexShrink: 0, fontFamily: 'var(--font-body)', transition: 'all 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-elevated)'; e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
      >
        Comparer
      </button>
    </div>
  );
}

export default function DoublonsPage() {
  const [paires, setPaires]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtre, setFiltre]         = useState('tous');
  const [pairSelectionnee, setPaire] = useState(null);
  const [seuil, setSeuil]           = useState(0.82);

  const chargerDoublons = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get('/patients/doublons/?seuil=' + seuil);
      setPaires(data.paires || []);
    } catch {
      toast.error('Erreur lors de la detection des doublons');
    } finally {
      setLoading(false);
    }
  }, [seuil]);

  useEffect(() => { chargerDoublons(); }, [chargerDoublons]);

  const handleFusionner = async (idPrincipal, idSecondaire, champsFusion) => {
    try {
      const { data } = await apiClient.post('/patients/' + idPrincipal + '/fusionner/', {
        id_secondaire: idSecondaire,
        champs_fusion: champsFusion,
      });
      toast.success(data.message || 'Fusion effectuee avec succes');
      setPaire(null);
      chargerDoublons();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Erreur lors de la fusion';
      toast.error(msg);
      throw err;
    }
  };

  const pairesFiltrees = filtre === 'tous' ? paires : paires.filter(p => p.certitude === filtre);
  const counts = {
    tous:    paires.length,
    haute:   paires.filter(p => p.certitude === 'haute').length,
    moyenne: paires.filter(p => p.certitude === 'moyenne').length,
    faible:  paires.filter(p => p.certitude === 'faible').length,
  };

  return (
    <AppLayout title="Gestion des doublons">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, color: 'var(--text-primary)', marginBottom: 6 }}>
            Doublons detectes
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Dossiers suspects identifies par similarite de nom, identite nationale et date de naissance.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: 'var(--text-muted)' }}>Seuil</label>
            <select value={seuil} onChange={e => setSeuil(parseFloat(e.target.value))}
              style={{ padding: '6px 10px', background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              <option value={0.95}>Tres strict (95%)</option>
              <option value={0.90}>Strict (90%)</option>
              <option value={0.82}>Standard (82%)</option>
              <option value={0.75}>Large (75%)</option>
            </select>
          </div>
          <button onClick={chargerDoublons} disabled={loading} style={{ padding: '8px 16px', background: 'var(--accent)', border: 'none', borderRadius: 'var(--radius-md)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Analyse...' : 'Relancer'}
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { key: 'tous',    label: 'Tous',             color: 'var(--text-muted)' },
          { key: 'haute',   label: 'Certitude haute',  color: '#ff4d6a' },
          { key: 'moyenne', label: 'Certitude moyenne',color: '#f5a623' },
          { key: 'faible',  label: 'Certitude faible', color: '#9b8afb' },
        ].map(f => (
          <button key={f.key} onClick={() => setFiltre(f.key)} style={{
            padding: '7px 14px',
            background: filtre === f.key ? 'var(--bg-card)' : 'var(--bg-elevated)',
            border: '1px solid ' + (filtre === f.key ? f.color : 'var(--border)'),
            borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500,
            color: filtre === f.key ? f.color : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
          }}>
            {f.label}
            <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 20, background: filtre === f.key ? f.color + '20' : 'var(--border)', fontSize: 11, fontWeight: 700, color: filtre === f.key ? f.color : 'var(--text-muted)' }}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
          Analyse des dossiers en cours...
        </div>
      ) : pairesFiltrees.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)' }}>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>Aucun doublon detecte</p>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {filtre !== 'tous' ? 'Aucun doublon pour ce niveau de certitude.' : 'Tous les dossiers semblent uniques avec le seuil actuel.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pairesFiltrees.map(paire => (
            <DoublonCard key={paire.patient_a_id + '-' + paire.patient_b_id} paire={paire} onVoir={setPaire} />
          ))}
        </div>
      )}

      {/* Modal comparaison avec champs editables */}
      {pairSelectionnee && (
        <ComparaisonFusionModal
          paire={pairSelectionnee}
          onClose={() => setPaire(null)}
          onFusionner={handleFusionner}
        />
      )}
    </AppLayout>
  );
}