import { useEffect, useRef, useState } from 'react';
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

// ── Règles de validation téléphone algérien ───────────────────
// Formats acceptés :
//   - 10 chiffres locaux   : 05XXXXXXXX | 06XXXXXXXX | 07XXXXXXXX
//   - Avec indicatif (+213): +213 5XXXXXXXX | +2136XXXXXXXX | +2137XXXXXXXX
//   - Avec 00213           : 00213 5XXXXXXXX …
const PHONE_REGEX = /^(\+213|00213|0)(5|6|7)\d{8}$/;

const validatePhone = (value) => {
  if (!value || value.trim() === '') return true; // champ optionnel
  const cleaned = value.replace(/[\s\-\.]/g, '');
  if (!PHONE_REGEX.test(cleaned)) {
    return 'Numéro invalide (ex: 0551234567, +213551234567) — doit commencer par 05, 06 ou 07';
  }
  return true;
};

const validatePhoneRequired = (value) => {
  if (!value || value.trim() === '') return 'Téléphone requis';
  return validatePhone(value);
};

// ── Validation ID national (10 chiffres) ─────────────────────
const validateIdNational = (value) => {
  if (!value || value.trim() === '') return true;
  if (!/^\d{10}$/.test(value.trim())) return 'L\'ID nationale doit contenir exactement 10 chiffres';
  return true;
};

// ── Validation numéro sécurité sociale (14 chiffres) ─────────
const validateSecuriteSociale = (value) => {
  if (!value || value.trim() === '') return true;
  if (!/^\d{14}$/.test(value.trim())) return 'Le N° sécurité sociale doit contenir exactement 14 chiffres';
  return true;
};

// ── Validation code postal (5 chiffres) ──────────────────────
const validateCodePostal = (value) => {
  if (!value || value.trim() === '') return true;
  if (!/^\d{5}$/.test(value.trim())) return 'Le code postal doit contenir exactement 5 chiffres';
  return true;
};

// ── Validation email ──────────────────────────────────────────
const validateEmail = (value) => {
  if (!value || value.trim() === '') return true;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return 'Adresse email invalide';
  return true;
};

export default function NewPatientPage() {
  const navigate = useNavigate();
  const [step, setStep]             = useState(0);
  const [saved, setSaved]           = useState([{}, {}, {}, {}]);
  const [submitting, setSubmitting] = useState(false);

  const [suspect,     setSuspect]     = useState(null);
  const [donneesForm, setDonneesForm] = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const lastDuplicateKey = useRef('');

  const { register, handleSubmit, watch, setValue, formState: { errors }, reset } =
    useForm({ mode: 'onSubmit' });

  const watchedWilaya = watch('wilaya');
  const [nom, prenom, sexe, idNational] = watch(['nom', 'prenom', 'sexe', 'id_national']);

  // Vérification en temps réel : elle commence seulement une fois les quatre
  // éléments d'identification disponibles, afin d'éviter les faux positifs.
  useEffect(() => {
    const normalizedId = String(idNational || '').trim();
    const key = [nom, prenom, sexe, normalizedId].map(value => String(value || '').trim().toUpperCase()).join('|');
    if (!nom?.trim() || !prenom?.trim() || !sexe || !/^\d{10}$/.test(normalizedId)) {
      lastDuplicateKey.current = '';
      return undefined;
    }
    if (key === lastDuplicateKey.current) return undefined;

    let cancelled = false;
    const timeoutId = setTimeout(async () => {
      try {
        const { data } = await apiClient.post('/patients/verifier_doublon/', {
          nom, prenom, sexe, id_national: normalizedId,
        });
        if (cancelled) return;
        lastDuplicateKey.current = key;
        if (data.has_doublon && data.suspects?.length) {
          setDonneesForm(buildPayload([...saved.slice(0, step), { nom, prenom, sexe, id_national: normalizedId }]));
          setSuspect(data.suspects[0]);
          setShowModal(true);
        }
      } catch (err) {
        console.warn('Verification de doublon en temps reel indisponible', err);
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timeoutId); };
  }, [nom, prenom, sexe, idNational, saved, step]);

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
      // Pendant la création, le "secondaire" n'existe pas encore : on enrichit
      // donc le dossier existant avec les valeurs retenues dans la comparaison.
      if (!idSecondaire) {
        await patientService.patch(idPrincipal, champsFusion);
        toast.success('Dossier existant mis a jour apres verification du doublon');
        setShowModal(false);
        navigate('/patients/' + idPrincipal);
        return;
      }
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
        <div style={{ display: 'flex', marginBottom: 28, background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          {STEPS.map((s, i) => (
            <div key={i} onClick={() => i < step && setStep(i)} style={{
              flex: 1, padding: '14px 12px', textAlign: 'center',
              background: i === step ? 'rgba(37,99,235,0.08)' : i < step ? 'rgba(59,130,246,0.08)' : 'transparent',
              borderRight: i < STEPS.length - 1 ? '1px solid rgba(37,99,235,0.12)' : 'none',
              cursor: i < step ? 'pointer' : 'default', transition: 'all 0.2s',
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: i === step ? '#2563eb' : i < step ? '#1d4ed8' : '#64748b' }}>
                {i < step ? '✓ ' : ''}{s.label}
              </div>
            </div>
          ))}
        </div>

        <div style={{ background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '16px', padding: '28px 32px' }}>
          <form onSubmit={handleSubmit(onStepSubmit)}>

            {/* ══ STEP 0 : Identité ══════════════════════════════════ */}
            {step === 0 && (
              <div style={{ animation: 'fadeUp 0.3s ease' }}>
                <SectionTitle>Identite du patient</SectionTitle>

                <VoiceDictation
                  formType="patient"
                  onFieldsExtracted={(fields) => {
                    Object.entries(fields).forEach(([key, value]) => {
                      setValue(key, value, { shouldValidate: true });
                    });
                  }}
                />
                <div style={{ margin: '12px 0', height: 1, background: 'rgba(37,99,235,0.12)' }} />

                <Row>
                  <Field label="Nom *" error={errors.nom?.message}>
                    <input {...register('nom', { required: 'Nom requis' })} placeholder="BENALI" style={inputStyle(errors.nom)} />
                  </Field>
                  <Field label="Prenom *" error={errors.prenom?.message}>
                    <input {...register('prenom', { required: 'Prenom requis' })} placeholder="Mohamed" style={inputStyle(errors.prenom)} />
                  </Field>
                </Row>
                <Row>
                  <Field label="N° identité nationale" error={errors.id_national?.message}>
                    <input
                      {...register('id_national', { validate: validateIdNational })}
                      placeholder="Ex: 1234567890 (10 chiffres)"
                      maxLength={10}
                      style={inputStyle(errors.id_national)}
                    />
                  </Field>
                  <Field label="N° sécurité sociale" error={errors.num_securite_sociale?.message}>
                    <input
                      {...register('num_securite_sociale', { validate: validateSecuriteSociale })}
                      placeholder="Ex: 12345678901234 (14 chiffres)"
                      maxLength={14}
                      style={inputStyle(errors.num_securite_sociale)}
                    />
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

                <VoiceDictation
                  formType="patient"
                  onFieldsExtracted={(fields) => {
                    Object.entries(fields).forEach(([key, value]) => {
                      setValue(key, value, { shouldValidate: true });
                    });
                  }}
                />
                <div style={{ margin: '12px 0', height: 1, background: 'rgba(37,99,235,0.12)' }} />

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
                      <div style={{ ...inputStyle(), display: 'flex', alignItems: 'center', color: '#64748b', fontSize: 12.5 }}>
                        Choisir d'abord une wilaya
                      </div>
                    )}
                  </Field>
                </Row>
                <Row>
                  <Field label="Code postal" error={errors.code_postal?.message}>
                    <input
                      {...register('code_postal', { validate: validateCodePostal })}
                      placeholder="31000 (5 chiffres)"
                      maxLength={5}
                      style={inputStyle(errors.code_postal)}
                    />
                  </Field>
                  <Field label="Téléphone principal" error={errors.telephone?.message}>
                    <input
                      {...register('telephone', { validate: validatePhone })}
                      placeholder="0551234567 ou +213551234567"
                      maxLength={17}
                      style={inputStyle(errors.telephone)}
                    />
                  </Field>
                </Row>

                {/* Hint sous les champs téléphone */}
                {!errors.telephone && (
                  <p style={{ marginTop: -10, marginBottom: 12, fontSize: 11, color: '#94a3b8' }}>
                    Formats acceptés : 05XXXXXXXX · 06XXXXXXXX · 07XXXXXXXX · +213XXXXXXXXX
                  </p>
                )}

                <Row>
                  <Field label="Téléphone secondaire" error={errors.telephone2?.message}>
                    <input
                      {...register('telephone2', { validate: validatePhone })}
                      placeholder="0661234567"
                      maxLength={17}
                      style={inputStyle(errors.telephone2)}
                    />
                  </Field>
                  <Field label="Email" error={errors.email?.message}>
                    <input
                      type="email"
                      {...register('email', { validate: validateEmail })}
                      placeholder="patient@email.com"
                      style={inputStyle(errors.email)}
                    />
                  </Field>
                </Row>

                <SectionTitle style={{ marginTop: 24 }}>Contact d'urgence</SectionTitle>
                <Row>
                  <Field label="Nom du contact"><input {...register('contact_nom')} placeholder="Benali" style={inputStyle()} /></Field>
                  <Field label="Prenom"><input {...register('contact_prenom')} placeholder="Ali" style={inputStyle()} /></Field>
                </Row>
                <Row>
                  <Field label="Lien de parente"><input {...register('contact_lien')} placeholder="Ex: Epoux, Fils, Soeur" style={inputStyle()} /></Field>
                  <Field label="Téléphone contact" error={errors.contact_telephone?.message}>
                    <input
                      {...register('contact_telephone', { validate: validatePhone })}
                      placeholder="0771234567"
                      maxLength={17}
                      style={inputStyle(errors.contact_telephone)}
                    />
                  </Field>
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
                <div style={{ marginTop: 20, padding: '14px 16px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.16)', borderRadius: '12px' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#2563eb', marginBottom: 8 }}>Recapitulatif du dossier</div>
                  <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.8 }}>
                    <strong style={{ color: '#0f172a' }}>Patient :</strong> {saved[0]?.prenom} {saved[0]?.nom}<br />
                    <strong style={{ color: '#0f172a' }}>Sexe :</strong> {saved[0]?.sexe === 'M' ? 'Masculin' : saved[0]?.sexe === 'F' ? 'Feminin' : '—'} · <strong style={{ color: '#0f172a' }}>Age :</strong> {saved[0]?.age_diagnostic || '—'} ans<br />
                    <strong style={{ color: '#0f172a' }}>Wilaya :</strong> {saved[1]?.wilaya || '—'} · <strong style={{ color: '#0f172a' }}>Tel :</strong> {saved[1]?.telephone || '—'}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28, paddingTop: 20, borderTop: '1px solid rgba(37,99,235,0.12)' }}>
              {step > 0 && (
                <button type="button" onClick={() => setStep(s => s - 1)} style={{
                  flex: '0 0 110px', padding: '12px', background: '#f1f5f9',
                  border: '1px solid rgba(37,99,235,0.12)', borderRadius: '12px',
                  color: '#334155', fontSize: 13.5, cursor: 'pointer',
                }}>Retour</button>
              )}
              <button type="submit" disabled={submitting} style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                border: 'none', borderRadius: '12px',
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
  return <h3 style={{ fontSize: 14, fontWeight: 600, color: '#0f172a', marginBottom: 18, fontFamily: 'var(--font-display)', ...s }}>{children}</h3>;
}
function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>;
}
function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#334155', marginBottom: 6, letterSpacing: 0.3 }}>{label}</label>
      {children}
      {error && <p style={{ marginTop: 4, fontSize: 11.5, color: '#dc2626' }}>{error}</p>}
    </div>
  );
}
function Spinner() {
  return <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}
const inputStyle  = (err) => ({
  width: '100%', padding: '10px 12px', background: '#f1f5f9',
  border: '1px solid ' + (err ? '#dc2626' : 'rgba(37,99,235,0.08)'),
  borderRadius: '12px', color: '#0f172a', fontSize: 13.5,
  outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box',
});
const selectStyle = (err) => ({ ...inputStyle(err), cursor: 'pointer' });
