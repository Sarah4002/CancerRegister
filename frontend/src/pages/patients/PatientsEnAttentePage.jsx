// PatientsEnAttentePage.jsx
import { useState, useEffect } from 'react';
import { patientService } from '../../services/patientService';
import { AppLayout } from '../../components/layout/Sidebar';
import usePermissions from '../../hooks/usePermissions';
import toast from 'react-hot-toast';

export default function PatientsEnAttentePage() {
  const { can } = usePermissions();
  const canValidate = can.validateDiagnosis || can.confirmDiagnostic;
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [motifModal, setMotifModal] = useState(null); // {patient}

  const fetchEnAttente = async () => {
    setLoading(true);
    try {
      const { data } = await patientService.getEnAttente(); // à créer dans patientService
      setPatients(data.results || data);
    } catch {
      toast.error('Erreur lors du chargement des dossiers en attente');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchEnAttente(); }, []);

  const handleConfirm = async (id) => {
    try {
      await patientService.confirmPatient(id, { decision: 'confirme' });
      toast.success('Diagnostic confirmé — patient ajouté au registre');
      fetchEnAttente();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    }
  };

  const handleRefuse = async (id, motif) => {
    try {
      await patientService.confirmPatient(id, { decision: 'refuse', motif_refus: motif });
      toast.success('Dossier refusé');
      setMotifModal(null);
      fetchEnAttente();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Erreur');
    }
  };

  if (!canValidate) {
    return (
      <AppLayout title="Accès refusé">
        <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
          Cette page est réservée aux médecins et au médecin chef.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dossiers en attente de confirmation">
      {loading ? (
        <div style={{ padding: 48, textAlign: 'center' }}>Chargement…</div>
      ) : patients.length === 0 ? (
        <div style={{ padding: 64, textAlign: 'center', color: '#64748b' }}>
          Aucun dossier en attente.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {patients.map(p => (
            <div key={p.id} style={{
              background: '#fff', border: '1px solid rgba(37,99,235,0.1)',
              borderRadius: 14, padding: '16px 20px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{p.full_name}</div>
                <div style={{ fontSize: 12, color: '#64748b' }}>
                  {p.registration_number} · Ajouté par {p.secretaire_nom || '—'} le {new Date(p.date_enregistrement).toLocaleDateString('fr-DZ')}
                </div>
                <div style={{ fontSize: 12, color: '#334155', marginTop: 4 }}>
                  Labo: {p.resume_labo || '—'} · Radiologie: {p.resume_radio || '—'} · Anapath: {p.resume_anapath || '—'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleConfirm(p.id)} style={{
                  padding: '8px 16px', background: '#16a34a', color: '#fff',
                  border: 'none', borderRadius: 9, fontWeight: 600, cursor: 'pointer',
                }}>
                  Confirmer (cancer)
                </button>
                <button onClick={() => setMotifModal({ patient: p })} style={{
                  padding: '8px 16px', background: '#fff', color: '#dc2626',
                  border: '1px solid rgba(220,38,38,0.3)', borderRadius: 9, fontWeight: 600, cursor: 'pointer',
                }}>
                  Refuser
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {motifModal && (
        <RefusModal
          patient={motifModal.patient}
          onClose={() => setMotifModal(null)}
          onConfirm={(motif) => handleRefuse(motifModal.patient.id, motif)}
        />
      )}
    </AppLayout>
  );
}

function RefusModal({ patient, onClose, onConfirm }) {
  const [motif, setMotif] = useState('');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, width: 420 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Refuser le dossier de {patient.full_name}</div>
        <textarea
          value={motif} onChange={e => setMotif(e.target.value)}
          placeholder="Motif du refus (ex: résultats anapath négatifs)"
          style={{ width: '100%', minHeight: 90, padding: 10, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 16 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose}>Annuler</button>
          <button onClick={() => onConfirm(motif)} disabled={!motif.trim()}>Confirmer le refus</button>
        </div>
      </div>
    </div>
  );
}