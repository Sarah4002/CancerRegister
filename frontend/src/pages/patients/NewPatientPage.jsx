import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { patientService } from '../../services/patientService';
import { apiClient } from '../../services/apiClient';
import { AppLayout } from '../../components/layout/Sidebar';
import ComparaisonFusionModal from '../../components/patients/ComparaisonFusionModal';
import { WILAYAS, COMMUNES_PAR_WILAYA } from './communesAlgerie';
import VoiceDictation from '../../components/voice/VoiceDictation';
import useCustomFields from '../../hooks/useCustomFields';
import CustomFieldsSection from '../../components/custom_fields/CustomFieldsSection';

const STEPS = [
  { label: 'Identite' },
  { label: 'Coordonnees' },
  { label: 'Profil' },
  { label: 'Antecedents' },
];

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);
  const [saved, setSaved]           = useState([{}, {}, {}, {}]);
  const [submitting, setSubmitting] = useState(false);

  const [suspect,     setSuspect]     = useState(null);
  const [donneesForm, setDonneesForm] = useState(null);
  const [showModal,   setShowModal]   = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } =
    useForm({ mode: 'onSubmit' });

  const watchedWilaya = watch('wilaya');

  // ── Champs personnalisés ──────────────────────────────────
  const {
    champs:    champsCustom,
    valeurs:   valeursCustom,
    setValeur,
    sauvegarder: sauvegarderCustom,
    loading:   loadingCustom,
  } = useCustomFields({ module: 'patient', objectId: null });

  // ── Helpers ───────────────────────────────────────────────
  const buildPayload = (steps) => {
    const payload = Object.assign({}, ...steps);
    const contacts = [];
    if (payload.contact_nom && payload.contact_telephone) {
      contacts.push({
        nom: payload.contact_nom, prenom: payload.contact_prenom || '',
        lien: payload.contact_lien || '', telephone: payload.contact_telephone,
      });
    }
    ['contact_nom','contact_prenom','contact_lien','contact_telephone'].forEach(k => delete payload[k]);
    if (contacts.length) payload.contacts_urgence = contacts;
    Object.keys(payload).forEach(k => { if (payload[k] === '' || payload[k] === undefined) delete payload[k]; });
    return payload;
  };

  const onStepSubmit = async (data) => {
    const updated = saved.map((s, i) => i === step ? data : s);
    setSaved(updated);

    if (step < 3) {
      setStep(step + 1);
      reset(saved[step + 1]);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildPayload(updated);
      const { data: res } = await apiClient.post('/patients/verifier_doublon/', {
        nom: payload.nom, prenom: payload.prenom,
        date_naissance: payload.date_naissance, id_national: payload.id_national,
      });
      if (res.has_doublon && res.suspects.length > 0) {
        setDonneesForm(payload); setSuspect(res.suspects[0]);
        setShowModal(true); setSubmitting(false); return;
      }
      await creerPatient(payload);
    } catch (err) {
      console.warn('Verification doublon echouee, creation directe', err);
      await creerPatient(buildPayload(updated));
    } finally {
      setSubmitting(false);
    }
  };

  const creerPatient = async (payload) => {
    try {
      const { data: patient } = await patientService.create(payload);
      // Sauvegarder les champs personnalisés après création
      if (Object.keys(valeursCustom).length > 0) {
        await sauvegarderCustom(patient.id);
      }
      toast.success('Patient ' + patient.registration_number + ' cree avec succes !');
      navigate('/patients/' + patient.id);
    } catch (err) {
      const errs = err.response?.data;
      toast.error(errs ? Object.values(errs).flat().join(' ') : 'Erreur lors de la creation.');
    }
  };

  const handleFusionner = async (idPrincipal, idSecondaire, champsFusion) => {
    try {
      const { data } = await apiClient.post('/patients/' + idPrincipal + '/fusionner/', {
        id_secondaire: idSecondaire, champs_fusion: champsFusion,
      });
      toast.success(data.message || 'Dossier fusionne avec succes');
      setShowModal(false);
      navigate('/patients/' + idPrincipal);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la fusion');
      throw err;
    }
  };

  const handleForcerCreation = async () => {
    setShowModal(false); setSubmitting(true);
    await creerPatient(donneesForm);
    setSubmitting(false);
  };

  const communesDispo = watchedWilaya ? (COMMUNES_PAR_WILAYA[watchedWilaya] || []).sort() : [];

  return (
    <AppLayout title="Nouveau Patient">
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>

        {/* Stepper */}
        <div style={{ display: 'flex', marginBottom: 28, background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{
              flex: 1, padding: '14px 12px', textAlign: 'center',
              background: i === step ? 'var(--accent-dim)' : i < step ? 'rgba(0,229,160,0.08)' : 'transparent',
              borderRight: i < STEPS.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: i < step ? 'pointer' : 'default', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: i === step ? 'var(--accent)' : i < step ? 'var(--success)' : 'var(--text-muted)' }}>
                {i < step ? '✓ ' : ''}{s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: '28px 32px' }}>
          <form onSubmit={handleSubmit(onStepSubmit)}>

            {/* ══ STEP 0 : Identité ══════════════════════════════════ */}
            {step === 0 && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <SectionTitle>Identite du patient</SectionTitle>

                {/* Saisie vocale */}
                <VoiceDictation
                  formType="patient"
                  onFieldsExtracted={(fields) => {
                    Object.entries(fields).forEach(([key, value]) => {
                      setValue(key, value, { shouldValidate: true });
                    });
                  }}
                />
                <div style={{ margin: '12px 0', height: 1, background: 'var(--border)' }} />

                <Row>
                  <Field label="Nom *" error={errors.nom?.message}>
                    <input {...register('nom', { required: 'Nom requis' })} placeholder="BENALI" style={inputStyle(errors.nom)} />
                  </Field>
                  <Field label="Prenom *" error={errors.prenom?.message}>
                    <input {...register('prenom', { required: 'Prenom requis' })} placeholder="Mohamed" style={inputStyle(errors.prenom)} />
                  </Field>
                </Row>
                <Row>
                  <Field label="N identite nationale">
                    <input {...register('id_national')} placeholder="Ex: 1234567890" style={inputStyle()} />
                  </Field>
                  <Field label="N securite sociale">
                    <input {...register('num_securite_sociale')} placeholder="Ex: 12345678901234" style={inputStyle()} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Sexe *" error={errors.sexe?.message}>
                    <select {...register('sexe', { required: 'Sexe requis' })} style={selectStyle(errors.sexe)}>
                      <option value="">Selectionner</option>
                      <option value="M">Masculin</option>
                      <option value="F">Feminin</option>
                      <option value="U">Inconnu</option>
                    </select>
                  </Field>
                  <Field label="Date de naissance">
                    <input type="date" {...register('date_naissance')} style={inputStyle()} />
                  </Field>
                </Row>
                <Row>
                  <Field label="Age au diagnostic">
                    <input type="number" {...register('age_diagnostic')} placeholder="Ex: 54" min="0" max="120" style={inputStyle()} />
                  </Field>
                  <Field label="Lieu de naissance">
                    <input {...register('lieu_naissance')} placeholder="Oran" style={inputStyle()} />
                  </Field>
                </Row>
                <Field label="Nationalite">
                  <input {...register('nationalite')} defaultValue="Algerienne" style={inputStyle()} />
                </Field>
              </div>
            )}

            {/* ══ STEP 1 : Coordonnées ═══════════════════════════════ */}
            {step === 1 && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <SectionTitle>Coordonnees et Adresse</SectionTitle>

                {/* Saisie vocale */}
                <VoiceDictation
                  formType="patient"
                  onFieldsExtracted={(fields) => {
                    Object.entries(fields).forEach(([key, value]) => {
                      setValue(key, value, { shouldValidate: true });
                    });
                  }}
                />
                <div style={{ margin: '12px 0', height: 1, background: 'var(--border)' }} />

                <Field label="Adresse complete">
                  <textarea {...register('adresse')} placeholder="Rue, N, quartier..." rows={2} style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }} />
                </Field>
                <Row>
                  <Field label="Wilaya">
                    <select {...register('wilaya')} style={selectStyle()} onChange={e => { setValue('wilaya', e.target.value); setValue('commune', ''); }}>
                      <option value="">Selectionner une wilaya</option>
                      {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </Field>
                  <Field label="Commune">
                    {communesDispo.length > 0 ? (
                      <select {...register('commune')} style={selectStyle()}>
                        <option value="">Selectionner une commune</option>
                        {communesDispo.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <div style={{ ...inputStyle(), display: 'flex', alignItems: 'center', color: 'var(--text-muted)', fontSize: 12.5 }}>
                        Choisir d'abord une wilaya
                      </div>
                    )}
                  </Field>
                </Row>
                <Row>
                  <Field label="Code postal"><input {...register('code_postal')} placeholder="31000" style={inputStyle()} /></Field>
                  <Field label="Telephone principal"><input {...register('telephone')} placeholder="+213 5xx xxx xxx" style={inputStyle()} /></Field>
                </Row>
                <Row>
                  <Field label="Telephone secondaire"><input {...register('telephone2')} placeholder="+213 5xx xxx xxx" style={inputStyle()} /></Field>
                  <Field label="Email"><input type="email" {...register('email')} placeholder="patient@email.com" style={inputStyle()} /></Field>
                </Row>
                <SectionTitle style={{ marginTop: 24 }}>Contact d'urgence</SectionTitle>
                <Row>
                  <Field label="Nom du contact"><input {...register('contact_nom')} placeholder="Benali" style={inputStyle()} /></Field>
                  <Field label="Prenom"><input {...register('contact_prenom')} placeholder="Ali" style={inputStyle()} /></Field>
                </Row>
                <Row>
                  <Field label="Lien de parente"><input {...register('contact_lien')} placeholder="Ex: Epoux, Fils, Soeur" style={inputStyle()} /></Field>
                  <Field label="Telephone"><input {...register('contact_telephone')} placeholder="+213 5xx xxx xxx" style={inputStyle()} /></Field>
                </Row>
              </div>
            )}

            {/* ══ STEP 2 : Profil ════════════════════════════════════ */}
            {step === 2 && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <SectionTitle>Profil socio-demographique</SectionTitle>
                <Row>
                  <Field label="Niveau d'instruction">
                    <select {...register('niveau_instruction')} style={selectStyle()}>
                      <option value="9">Inconnu</option><option value="0">Aucun</option>
                      <option value="1">Primaire</option><option value="2">Moyen</option>
                      <option value="3">Secondaire</option><option value="4">Superieur</option>
                    </select>
                  </Field>
                  <Field label="Profession">
                    <select {...register('profession')} style={selectStyle()}>
                      <option value="INC">Inconnu</option><option value="AGR">Agriculteur</option>
                      <option value="FON">Fonctionnaire</option><option value="COM">Commercant</option>
                      <option value="ART">Artisan</option><option value="ETU">Etudiant</option>
                      <option value="RET">Retraite</option><option value="SEM">Sans emploi</option>
                      <option value="FFO">Femme au foyer</option><option value="PSA">Professionnel de sante</option>
                      <option value="AUT">Autre</option>
                    </select>
                  </Field>
                </Row>
                <Row>
                  <Field label="Situation familiale">
                    <select {...register('situation_familiale')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="celibataire">Celibataire</option>
                      <option value="marie">Marie(e)</option><option value="divorce">Divorce(e)</option>
                      <option value="veuf">Veuf/Veuve</option>
                    </select>
                  </Field>
                  <Field label="Nombre d'enfants">
                    <input type="number" {...register('nombre_enfants')} placeholder="0" min="0" style={inputStyle()} />
                  </Field>
                </Row>
                <SectionTitle style={{ marginTop: 24 }}>Prise en charge</SectionTitle>
                <Field label="Etablissement de prise en charge">
                  <input {...register('etablissement_pec')} placeholder="CHU Oran" style={inputStyle()} />
                </Field>
                <Row>
                  <Field label="Statut du dossier">
                    <select {...register('statut_dossier')} style={selectStyle()}>
                      <option value="nouveau">Nouveau</option><option value="traitement">En traitement</option>
                      <option value="remission">Remission</option><option value="perdu">Perdu de vue</option>
                    </select>
                  </Field>
                  <Field label="Statut vital">
                    <select {...register('statut_vital')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="vivant">Vivant</option>
                      <option value="decede">Decede</option><option value="perdu">Perdu de vue</option>
                    </select>
                  </Field>
                </Row>
                <Field label="Notes">
                  <textarea {...register('notes')} placeholder="Notes complementaires..." rows={3} style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }} />
                </Field>
              </div>
            )}

            {/* ══ STEP 3 : Antécédents ═══════════════════════════════ */}
            {step === 3 && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <SectionTitle>Antecedents medicaux</SectionTitle>
                <Field label="Antecedents personnels">
                  <textarea {...register('antecedents_personnels')} rows={3} placeholder="Maladies, chirurgies, hospitalisations anterieures..." style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }} />
                </Field>
                <Field label="Antecedents familiaux (cancer)">
                  <textarea {...register('antecedents_familiaux')} rows={3} placeholder="Antecedents familiaux de cancer, lien de parente..." style={{ ...inputStyle(), resize: 'vertical', lineHeight: 1.5 }} />
                </Field>
                <SectionTitle style={{ marginTop: 20 }}>Habitudes de vie</SectionTitle>
                <Row>
                  <Field label="Tabagisme">
                    <select {...register('tabagisme')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="non">Non-fumeur</option>
                      <option value="ex">Ex-fumeur</option><option value="actif">Fumeur actif</option>
                    </select>
                  </Field>
                  <Field label="Consommation d'alcool">
                    <select {...register('alcool')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="non">Non</option><option value="oui">Oui</option>
                    </select>
                  </Field>
                </Row>
                <Row>
                  <Field label="Activite physique">
                    <select {...register('activite_physique')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="sedentaire">Sedentaire</option>
                      <option value="moderee">Moderee</option><option value="active">Active</option>
                    </select>
                  </Field>
                  <Field label="Alimentation">
                    <select {...register('alimentation')} style={selectStyle()}>
                      <option value="inconnu">Inconnu</option><option value="equilibree">Equilibree</option>
                      <option value="grasse">Riche en graisses</option><option value="sucree">Riche en sucres</option>
                      <option value="vegetarienne">Vegetarienne/Vegane</option>
                    </select>
                  </Field>
                </Row>

                {/* ✅ CHAMPS PERSONNALISÉS */}
                <CustomFieldsSection
                  module="patient"
                  champs={champsCustom}
                  valeurs={valeursCustom}
                  onChange={setValeur}
                  loading={loadingCustom}
                />

                {/* Récapitulatif */}
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'var(--accent-dim)', border: '1px solid rgba(0,168,255,0.2)', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 8 }}>Recapitulatif du dossier</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Patient :</strong> {saved[0]?.prenom} {saved[0]?.nom}<br />
                    <strong style={{ color: 'var(--text-primary)' }}>Sexe :</strong> {saved[0]?.sexe === 'M' ? 'Masculin' : saved[0]?.sexe === 'F' ? 'Feminin' : '—'} · <strong style={{ color: 'var(--text-primary)' }}>Age :</strong> {saved[0]?.age_diagnostic || '—'} ans<br />
                    <strong style={{ color: 'var(--text-primary)' }}>Wilaya :</strong> {saved[1]?.wilaya || '—'} · <strong style={{ color: 'var(--text-primary)' }}>Tel :</strong> {saved[1]?.telephone || '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} style={{
                  flex: '0 0 110px', padding: '12px', background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                  color: 'var(--text-secondary)', fontSize: 13.5, cursor: 'pointer',
                }}>Retour</button>
              )}
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: '12px',
                background: step === 3
                  ? 'linear-gradient(135deg, var(--success), #00b38a)'
                  : 'linear-gradient(135deg, #00a8ff, #0080cc)',
                border: 'none', borderRadius: 'var(--radius-md)',
                color: '#fff', fontSize: 13.5, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: submitting ? 0.7 : 1,
              }}>
                {submitting
                  ? <><Spinner /> Verification...</>
                  : step === 3 ? 'Enregistrer le patient' : 'Continuer'}
              </button>
            </div>

          </form>
        </div>
      </div>

      {showModal && suspect && donneesForm && (
        <ComparaisonFusionModal
          donneesNouveauPatient={donneesForm}
          suspect={suspect}
          titre="Doublon detecte — Dossier similaire existant"
          onClose={() => setShowModal(false)}
          onFusionner={handleFusionner}
          onForcerCreation={handleForcerCreation}
        />
      )}
    </AppLayout>
  );
}

// ── Helpers ───────────────────────────────────────────────────
function SectionTitle({ children, style: s }) {
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 18, fontFamily: 'var(--font-display)', ...s }}>{children}</h3>;
}
function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>;
}
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11.5, color: 'var(--danger)' }}>{error}</p>}
    </div>
  );
}
function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
const inputStyle  = (err) => ({
  width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)',
  border: '1px solid ' + (err ? 'var(--danger)' : 'var(--border-light)'),
  borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', fontSize: 13.5,
  outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
});
const selectStyle = (err) => ({ ...inputStyle(err), cursor: 'pointer' });