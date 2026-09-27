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


/* =========================================================
   STEPS
========================================================= */

const STEPS = [
  { label: 'Identité' },
  { label: 'Coordonnées' },
  { label: 'Profil' },
  { label: 'Antécédents' },
];


/* =========================================================
   FIELDS À VALIDER PAR STEP
========================================================= */

const STEP_FIELDS = [
  [
    'nom',
    'prenom',
    'sexe',
    'date_naissance',
  ],
  [
    'telephone',
    'wilaya',
    'commune',
  ],
  [
    'niveau_instruction',
    'profession',
    'situation_familiale',
    'nombre_enfants',
    'etablissement_pec',
    'statut_dossier',
    'statut_vital',
    'notes',
  ],
  [
    'antecedents_personnels_liste',
    'antecedents_personnels_autre',
    'antecedents_familiaux_liste',
    'antecedents_familiaux_autre',
    'tabagisme',
    'alcool',
    'activite_physique',
    'alimentation',
  ],
];


/* =========================================================
   VALIDATION TÉLÉPHONE
========================================================= */

const PHONE_REGEX = /^(\+213|00213|0)(5|6|7)\d{8}$/;

const validatePhone = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }

  const cleaned = value.replace(/[\s\-\.]/g, '');

  if (!PHONE_REGEX.test(cleaned)) {
    return 'Numéro invalide (ex: 0551234567, +213551234567) — doit commencer par 05, 06 ou 07';
  }

  return true;
};

const validatePhoneRequired = (value) => {
  if (!value || value.trim() === '') {
    return 'Téléphone requis';
  }

  return validatePhone(value);
};


/* =========================================================
   VALIDATION ID NATIONAL
========================================================= */

const validateIdNational = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }

  if (!/^\d{10}$/.test(value.trim())) {
    return "L'ID nationale doit contenir exactement 10 chiffres";
  }

  return true;
};


/* =========================================================
   VALIDATION NUMÉRO SÉCURITÉ SOCIALE
========================================================= */

const validateSecuriteSociale = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }

  if (!/^\d{14}$/.test(value.trim())) {
    return 'Le N° sécurité sociale doit contenir exactement 14 chiffres';
  }

  return true;
};


/* =========================================================
   VALIDATION CODE POSTAL
========================================================= */

const validateCodePostal = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }

  if (!/^\d{5}$/.test(value.trim())) {
    return 'Le code postal doit contenir exactement 5 chiffres';
  }

  return true;
};


/* =========================================================
   VALIDATION EMAIL
========================================================= */

const validateEmail = (value) => {
  if (!value || value.trim() === '') {
    return true;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    return 'Adresse email invalide';
  }

  return true;
};


/* =========================================================
   VALIDATION DATE DE NAISSANCE
========================================================= */

const validateDateNaissance = (value) => {
  if (!value) {
    return 'Date de naissance requise';
  }

  const date = new Date(value + 'T00:00:00');

  if (Number.isNaN(date.getTime())) {
    return 'Date de naissance invalide';
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (date > today) {
    return 'La date de naissance ne peut pas être dans le futur';
  }

  return true;
};


/* =========================================================
   DATE DU JOUR POUR INPUT DATE
========================================================= */

const getTodayDateInputValue = () => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};


/* =========================================================
   CALCUL ÂGE ACTUEL
========================================================= */

const calculateAge = (dateNaissance) => {
  if (!dateNaissance) {
    return null;
  }

  const birthDate = new Date(dateNaissance + 'T00:00:00');

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDiff =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDiff < 0 ||
    (
      monthDiff === 0 &&
      today.getDate() < birthDate.getDate()
    )
  ) {
    age--;
  }

  return age >= 0 ? age : null;
};


/* =========================================================
   OPTIONS ANTÉCÉDENTS
========================================================= */

const ANTECEDENTS_PERSONNELS_OPTIONS = [
  'Diabète',
  'Hypertension artérielle',
  'Cardiopathie',
  'Maladie rénale',
  'Maladie hépatique',
  'Antécédent de cancer personnel',
  'Chirurgie antérieure',
  'Tuberculose',
  'Asthme / BPCO',
  'Aucun antécédent connu',
];

const ANTECEDENTS_FAMILIAUX_OPTIONS = [
  'Cancer du sein',
  'Cancer du côlon',
  'Cancer du poumon',
  'Cancer de la prostate',
  "Cancer de l'ovaire",
  "Cancer de l'estomac",
  'Leucémie / Lymphome',
  'Autre cancer',
  'Aucun antécédent familial connu',
];


/* =========================================================
   COMPONENT
========================================================= */

export default function NewPatientPage() {

  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [suspect, setSuspect] = useState(null);
  const [donneesForm, setDonneesForm] = useState(null);

  const [showModal, setShowModal] = useState(false);

  const lastDuplicateKey = useRef('');


  /* =======================================================
     REACT HOOK FORM
  ======================================================= */

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    mode: 'onSubmit',
  });


  /* =======================================================
     WATCH
  ======================================================= */

  const watchedWilaya = watch('wilaya');

  const [
    nom,
    prenom,
    sexe,
    idNational,
  ] = watch([
    'nom',
    'prenom',
    'sexe',
    'id_national',
  ]);

  const dateNaissance = watch('date_naissance');

  const ageActuel = calculateAge(dateNaissance);


  /* =======================================================
     CUSTOM FIELDS
  ======================================================= */

  const customFieldsHook = useCustomFields();

  const {
    fields: customFields = [],
    loading: customFieldsLoading = false,
  } = customFieldsHook || {};


  /* =======================================================
     DUPLICATE CHECK
  ======================================================= */

  useEffect(() => {

    const checkDuplicate = async () => {

      if (
        !nom ||
        !prenom ||
        !sexe ||
        !idNational ||
        idNational.length !== 10
      ) {
        return;
      }

      const duplicateKey = `${nom}-${prenom}-${sexe}-${idNational}`;

      if (lastDuplicateKey.current === duplicateKey) {
        return;
      }

      lastDuplicateKey.current = duplicateKey;

      try {

        const { data } = await apiClient.post(
          '/patients/verifier_doublon/',
          {
            nom,
            prenom,
            sexe,
            id_national: idNational,
          }
        );

        if (
          data?.has_doublon &&
          data?.suspects?.length > 0
        ) {
          setSuspect(data.suspects[0]);
        }

      } catch (error) {

        console.warn(
          'Vérification doublon échouée',
          error
        );
      }
    };

    checkDuplicate();

  }, [
    nom,
    prenom,
    sexe,
    idNational,
  ]);


  /* =======================================================
     INPUT STYLE
  ======================================================= */

  const inputStyle = (error) => ({
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: `1px solid ${
      error ? '#dc2626' : '#d1d5db'
    }`,
    outline: 'none',
    background: '#ffffff',
    boxSizing: 'border-box',
  });


  /* =======================================================
     BUILD PAYLOAD
  ======================================================= */

  const buildPayload = (data) => {

    const payload = {
      ...data,
    };

    const contacts = [];

    if (
      payload.contact_nom &&
      payload.contact_telephone
    ) {
      contacts.push({
        nom: payload.contact_nom,
        prenom: payload.contact_prenom || '',
        lien: payload.contact_lien || '',
        telephone: payload.contact_telephone,
      });
    }

    [
      'contact_nom',
      'contact_prenom',
      'contact_lien',
      'contact_telephone',
    ].forEach((key) => {
      delete payload[key];
    });

    if (contacts.length) {
      payload.contacts_urgence = contacts;
    }

    Object.keys(payload).forEach((key) => {

      if (
        payload[key] === '' ||
        payload[key] === undefined
      ) {
        delete payload[key];
      }

    });

    return payload;
  };


  /* =======================================================
     CREER PATIENT
  ======================================================= */

  const creerPatient = async (payload) => {

    try {

      const response =
        await patientService.create(payload);

      toast.success(
        'Patient créé avec succès'
      );

      navigate('/patients');

      return response;

    } catch (error) {

      console.error(
        'Erreur création patient',
        error
      );

      toast.error(
        error?.response?.data?.detail ||
        'Erreur lors de la création du patient'
      );

      throw error;
    }
  };


  /* =======================================================
     SUBMIT FINAL
  ======================================================= */

  const onFinalSubmit = async (data) => {

    setSubmitting(true);

    try {

      const payload = buildPayload(data);

      const { data: res } =
        await apiClient.post(
          '/patients/verifier_doublon/',
          {
            nom: payload.nom,
            prenom: payload.prenom,
            date_naissance:
              payload.date_naissance,
            id_national:
              payload.id_national,
          }
        );

      if (
        res.has_doublon &&
        res.suspects?.length > 0
      ) {

        setDonneesForm(payload);

        setSuspect(
          res.suspects[0]
        );

        setShowModal(true);

        setSubmitting(false);

        return;
      }

      await creerPatient(payload);

    } catch (error) {

      console.warn(
        'Vérification doublon échouée, création directe',
        error
      );

      await creerPatient(
        buildPayload(data)
      );

    } finally {

      setSubmitting(false);
    }
  };


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const handleNext = async () => {

    const valid =
      await trigger(
        STEP_FIELDS[step]
      );

    if (!valid) {
      return;
    }

    setStep(
      (current) => current + 1
    );
  };


  const handlePrev = () => {

    setStep(
      (current) => current - 1
    );
  };


  /* =======================================================
     FUSION
  ======================================================= */

  const handleFusionner = async () => {

    if (!donneesForm || !suspect) {
      return;
    }

    try {

      await patientService.fusionner(
        suspect.id,
        donneesForm
      );

      toast.success(
        'Patients fusionnés avec succès'
      );

      setShowModal(false);

      navigate('/patients');

    } catch (error) {

      console.error(
        error
      );

      toast.error(
        'Erreur lors de la fusion'
      );
    }
  };


  /* =======================================================
     FORCER CRÉATION
  ======================================================= */

  const handleForcerCreation = async () => {

    if (!donneesForm) {
      return;
    }

    setShowModal(false);

    await creerPatient(
      donneesForm
    );
  };


  /* =======================================================
     COMMUNES
  ======================================================= */

  const communesDispo =
    watchedWilaya
      ? (
        COMMUNES_PAR_WILAYA[
          watchedWilaya
        ] || []
      )
      : [];


  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <AppLayout>

      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '24px',
        }}
      >

        {/* =================================================
            HEADER
        ================================================= */}

        <div
          style={{
            marginBottom: '24px',
          }}
        >

          <h1
            style={{
              margin: 0,
              fontSize: '28px',
              fontWeight: 700,
            }}
          >
            Nouveau patient
          </h1>

          <p
            style={{
              marginTop: '8px',
              color: '#64748b',
            }}
          >
            Création du dossier patient
          </p>

        </div>


        {/* =================================================
            STEPS
        ================================================= */}

        <div
          style={{
            display: 'flex',
            gap: '12px',
            marginBottom: '30px',
          }}
        >

          {STEPS.map(
            (item, index) => (

              <div
                key={index}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '10px',
                  background:
                    index === step
                      ? '#e0e7ff'
                      : '#f1f5f9',
                  color:
                    index === step
                      ? '#3730a3'
                      : '#64748b',
                  fontWeight:
                    index === step
                      ? 600
                      : 400,
                  textAlign: 'center',
                }}
              >
                {index + 1}. {item.label}
              </div>

            )
          )}

        </div>


        {/* =================================================
            FORM
        ================================================= */}

        <form
          onSubmit={handleSubmit(
            onFinalSubmit
          )}
        >

          {/* =================================================
              STEP 0 — IDENTITÉ
          ================================================= */}

          {step === 0 && (

            <section>

              <h2>
                Identité du patient
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}
              >

                {/* NOM */}

                <Field
                  label="Nom *"
                  error={
                    errors.nom?.message
                  }
                >

                  <input
                    type="text"
                    {...register('nom', {
                      required:
                        'Nom requis',
                    })}
                    style={inputStyle(
                      errors.nom
                    )}
                  />

                </Field>


                {/* PRÉNOM */}

                <Field
                  label="Prénom *"
                  error={
                    errors.prenom?.message
                  }
                >

                  <input
                    type="text"
                    {...register('prenom', {
                      required:
                        'Prénom requis',
                    })}
                    style={inputStyle(
                      errors.prenom
                    )}
                  />

                </Field>


                {/* ID NATIONAL */}

                <Field
                  label="N° identité nationale"
                  error={
                    errors.id_national?.message
                  }
                >

                  <input
                    type="text"
                    {...register(
                      'id_national',
                      {
                        validate:
                          validateIdNational,
                      }
                    )}
                    style={inputStyle(
                      errors.id_national
                    )}
                  />

                </Field>


                {/* SÉCURITÉ SOCIALE */}

                <Field
                  label="N° sécurité sociale"
                  error={
                    errors.num_securite_sociale
                      ?.message
                  }
                >

                  <input
                    type="text"
                    {...register(
                      'num_securite_sociale',
                      {
                        validate:
                          validateSecuriteSociale,
                      }
                    )}
                    style={inputStyle(
                      errors.num_securite_sociale
                    )}
                  />

                </Field>


                {/* SEXE */}

                <Field
                  label="Sexe *"
                  error={
                    errors.sexe?.message
                  }
                >

                  <select
                    {...register('sexe', {
                      required:
                        'Sexe requis',
                    })}
                    style={inputStyle(
                      errors.sexe
                    )}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="M">
                      Masculin
                    </option>

                    <option value="F">
                      Féminin
                    </option>

                  </select>

                </Field>


                {/* DATE DE NAISSANCE */}

                <Field
                  label="Date de naissance *"
                  error={
                    errors.date_naissance
                      ?.message
                  }
                >

                  <input
                    type="date"
                    {...register(
                      'date_naissance',
                      {
                        required:
                          'Date de naissance requise',

                        validate:
                          validateDateNaissance,
                      }
                    )}
                    max={
                      getTodayDateInputValue()
                    }
                    style={inputStyle(
                      errors.date_naissance
                    )}
                  />

                </Field>


                {/* ÂGE ACTUEL */}

                <Field
                  label="Âge actuel (automatique)"
                >

                  <div
                    style={{
                      ...inputStyle(),
                      display: 'flex',
                      alignItems: 'center',
                      minHeight: '40px',
                      background:
                        '#f8fafc',
                      color:
                        ageActuel !== null
                          ? '#0f172a'
                          : '#94a3b8',
                    }}
                  >

                    {ageActuel !== null
                      ? `${ageActuel} ans`
                      : 'Calculé automatiquement'}

                  </div>

                </Field>


                {/* LIEU NAISSANCE */}

                <Field
                  label="Lieu de naissance"
                >

                  <input
                    type="text"
                    {...register(
                      'lieu_naissance'
                    )}
                    style={inputStyle()}
                  />

                </Field>


                {/* NATIONALITÉ */}

                <Field
                  label="Nationalité"
                >

                  <input
                    type="text"
                    {...register(
                      'nationalite'
                    )}
                    defaultValue="Algérienne"
                    style={inputStyle()}
                  />

                </Field>

              </div>

            </section>
          )}


          {/* =================================================
              STEP 1 — COORDONNÉES
          ================================================= */}

          {step === 1 && (

            <section>

              <h2>
                Coordonnées
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}
              >

                {/* ADRESSE */}

                <Field
                  label="Adresse"
                >

                  <input
                    type="text"
                    {...register('adresse')}
                    style={inputStyle()}
                  />

                </Field>


                {/* WILAYA */}

                <Field
                  label="Wilaya *"
                  error={
                    errors.wilaya?.message
                  }
                >

                  <select
                    {...register('wilaya', {
                      required:
                        'Wilaya requise',
                    })}
                    onChange={(e) => {

                      setValue(
                        'wilaya',
                        e.target.value,
                        {
                          shouldValidate:
                            true,
                          shouldDirty:
                            true,
                        }
                      );

                      setValue(
                        'commune',
                        '',
                        {
                          shouldValidate:
                            true,
                          shouldDirty:
                            true,
                        }
                      );

                    }}
                    style={inputStyle(
                      errors.wilaya
                    )}
                  >

                    <option value="">
                      Sélectionner une wilaya
                    </option>

                    {WILAYAS.map(
                      (wilaya) => (

                        <option
                          key={wilaya}
                          value={wilaya}
                        >
                          {wilaya}
                        </option>

                      )
                    )}

                  </select>

                </Field>


                {/* COMMUNE */}

                <Field
                  label="Commune *"
                  error={
                    errors.commune?.message
                  }
                >

                  {communesDispo.length > 0 ? (

                    <select
                      {...register(
                        'commune',
                        {
                          required:
                            'Commune requise',
                        }
                      )}
                      style={inputStyle(
                        errors.commune
                      )}
                    >

                      <option value="">
                        Sélectionner une commune
                      </option>

                      {communesDispo.map(
                        (commune) => (

                          <option
                            key={commune}
                            value={commune}
                          >
                            {commune}
                          </option>

                        )
                      )}

                    </select>

                  ) : (

                    <div
                      style={{
                        ...inputStyle(
                          errors.commune
                        ),
                        color:
                          '#94a3b8',
                      }}
                    >
                      Choisir d'abord une wilaya
                    </div>

                  )}

                </Field>


                {/* CODE POSTAL */}

                <Field
                  label="Code postal"
                  error={
                    errors.code_postal
                      ?.message
                  }
                >

                  <input
                    type="text"
                    {...register(
                      'code_postal',
                      {
                        validate:
                          validateCodePostal,
                      }
                    )}
                    style={inputStyle(
                      errors.code_postal
                    )}
                  />

                </Field>


                {/* TÉLÉPHONE PRINCIPAL */}

                <Field
                  label="Téléphone principal *"
                  error={
                    errors.telephone?.message
                  }
                >

                  <input
                    type="tel"
                    {...register(
                      'telephone',
                      {
                        validate:
                          validatePhoneRequired,
                      }
                    )}
                    placeholder="0551234567"
                    style={inputStyle(
                      errors.telephone
                    )}
                  />

                </Field>


                {/* TÉLÉPHONE SECONDAIRE */}

                <Field
                  label="Téléphone secondaire"
                  error={
                    errors.telephone2?.message
                  }
                >

                  <input
                    type="tel"
                    {...register(
                      'telephone2',
                      {
                        validate:
                          validatePhone,
                      }
                    )}
                    placeholder="0551234567"
                    style={inputStyle(
                      errors.telephone2
                    )}
                  />

                </Field>


                {/* EMAIL */}

                <Field
                  label="Email"
                  error={
                    errors.email?.message
                  }
                >

                  <input
                    type="email"
                    {...register(
                      'email',
                      {
                        validate:
                          validateEmail,
                      }
                    )}
                    placeholder="exemple@email.com"
                    style={inputStyle(
                      errors.email
                    )}
                  />

                </Field>


                {/* CONTACT URGENCE NOM */}

                <Field
                  label="Nom contact urgence"
                >

                  <input
                    type="text"
                    {...register(
                      'contact_nom'
                    )}
                    style={inputStyle()}
                  />

                </Field>


                {/* CONTACT URGENCE PRÉNOM */}

                <Field
                  label="Prénom contact urgence"
                >

                  <input
                    type="text"
                    {...register(
                      'contact_prenom'
                    )}
                    style={inputStyle()}
                  />

                </Field>


                {/* CONTACT URGENCE LIEN */}

                <Field
                  label="Lien avec le patient"
                >

                  <input
                    type="text"
                    {...register(
                      'contact_lien'
                    )}
                    placeholder="Parent, conjoint..."
                    style={inputStyle()}
                  />

                </Field>


                {/* CONTACT URGENCE TÉLÉPHONE */}

                <Field
                  label="Téléphone contact urgence"
                  error={
                    errors.contact_telephone
                      ?.message
                  }
                >

                  <input
                    type="tel"
                    {...register(
                      'contact_telephone',
                      {
                        validate:
                          validatePhone,
                      }
                    )}
                    placeholder="0551234567"
                    style={inputStyle(
                      errors.contact_telephone
                    )}
                  />

                </Field>

              </div>

            </section>
          )}


          {/* =================================================
              STEP 2 — PROFIL
          ================================================= */}

          {step === 2 && (

            <section>

              <h2>
                Profil socio-démographique
              </h2>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(2, minmax(0, 1fr))',
                  gap: '20px',
                  marginTop: '20px',
                }}
              >

                {/* NIVEAU INSTRUCTION */}

                <Field
                  label="Niveau d'instruction"
                  error={
                    errors.niveau_instruction
                      ?.message
                  }
                >

                  <select
                    {...register(
                      'niveau_instruction'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Sans instruction">
                      Sans instruction
                    </option>

                    <option value="Primaire">
                      Primaire
                    </option>

                    <option value="Moyen">
                      Moyen
                    </option>

                    <option value="Secondaire">
                      Secondaire
                    </option>

                    <option value="Universitaire">
                      Universitaire
                    </option>

                    <option value="Autre">
                      Autre
                    </option>

                  </select>

                </Field>


                {/* PROFESSION */}

                <Field
                  label="Profession"
                >

                  <input
                    type="text"
                    {...register(
                      'profession'
                    )}
                    style={inputStyle()}
                  />

                </Field>


                {/* SITUATION FAMILIALE */}

                <Field
                  label="Situation familiale"
                >

                  <select
                    {...register(
                      'situation_familiale'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Célibataire">
                      Célibataire
                    </option>

                    <option value="Marié(e)">
                      Marié(e)
                    </option>

                    <option value="Divorcé(e)">
                      Divorcé(e)
                    </option>

                    <option value="Veuf / Veuve">
                      Veuf / Veuve
                    </option>

                  </select>

                </Field>


                {/* NOMBRE ENFANTS */}

                <Field
                  label="Nombre d'enfants"
                  error={
                    errors.nombre_enfants
                      ?.message
                  }
                >

                  <input
                    type="number"
                    min="0"
                    {...register(
                      'nombre_enfants',
                      {
                        valueAsNumber:
                          true,
                        min: {
                          value: 0,
                          message:
                            'Le nombre doit être positif',
                        },
                      }
                    )}
                    style={inputStyle(
                      errors.nombre_enfants
                    )}
                  />

                </Field>


                {/* ÉTABLISSEMENT */}

                <Field
                  label="Établissement de prise en charge"
                >

                  <input
                    type="text"
                    {...register(
                      'etablissement_pec'
                    )}
                    placeholder="CHU, CAC, EPH..."
                    style={inputStyle()}
                  />

                </Field>


                {/* STATUT DOSSIER */}

                <Field
                  label="Statut du dossier"
                >

                  <select
                    {...register(
                      'statut_dossier'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="En cours">
                      En cours
                    </option>

                    <option value="Complet">
                      Complet
                    </option>

                    <option value="À compléter">
                      À compléter
                    </option>

                    <option value="Clôturé">
                      Clôturé
                    </option>

                  </select>

                </Field>


                {/* STATUT VITAL */}

                <Field
                  label="Statut vital"
                >

                  <select
                    {...register(
                      'statut_vital'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Vivant">
                      Vivant
                    </option>

                    <option value="Décédé">
                      Décédé
                    </option>

                    <option value="Inconnu">
                      Inconnu
                    </option>

                  </select>

                </Field>


                {/* NOTES */}

                <Field
                  label="Notes"
                >

                  <textarea
                    {...register('notes')}
                    rows={4}
                    placeholder="Informations complémentaires..."
                    style={{
                      ...inputStyle(),
                      resize: 'vertical',
                    }}
                  />

                </Field>

              </div>


              {/* CUSTOM FIELDS */}

              {customFields?.length > 0 && (

                <div
                  style={{
                    marginTop: '30px',
                  }}
                >

                  <CustomFieldsSection
                    fields={customFields}
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                  />

                </div>

              )}

            </section>
          )}


          {/* =================================================
              STEP 3 — ANTÉCÉDENTS
          ================================================= */}

          {step === 3 && (

            <section>

              <h2>
                Antécédents et habitudes de vie
              </h2>

              <div
                style={{
                  marginTop: '20px',
                }}
              >

                {/* ANTÉCÉDENTS PERSONNELS */}

                <Field
                  label="Antécédents personnels"
                >

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                    }}
                  >

                    {ANTECEDENTS_PERSONNELS_OPTIONS.map(
                      (item) => (

                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems:
                              'center',
                          }}
                        >

                          <input
                            type="checkbox"
                            value={item}
                            {...register(
                              'antecedents_personnels_liste'
                            )}
                          />

                          {item}

                        </label>

                      )
                    )}

                  </div>

                </Field>


                {/* AUTRE ANTÉCÉDENT PERSONNEL */}

                <Field
                  label="Autre antécédent personnel"
                >

                  <textarea
                    {...register(
                      'antecedents_personnels_autre'
                    )}
                    rows={3}
                    style={{
                      ...inputStyle(),
                      resize: 'vertical',
                    }}
                  />

                </Field>


                {/* ANTÉCÉDENTS FAMILIAUX */}

                <Field
                  label="Antécédents familiaux"
                >

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns:
                        'repeat(2, minmax(0, 1fr))',
                      gap: '10px',
                    }}
                  >

                    {ANTECEDENTS_FAMILIAUX_OPTIONS.map(
                      (item) => (

                        <label
                          key={item}
                          style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems:
                              'center',
                          }}
                        >

                          <input
                            type="checkbox"
                            value={item}
                            {...register(
                              'antecedents_familiaux_liste'
                            )}
                          />

                          {item}

                        </label>

                      )
                    )}

                  </div>

                </Field>


                {/* AUTRE ANTÉCÉDENT FAMILIAL */}

                <Field
                  label="Autre antécédent familial"
                >

                  <textarea
                    {...register(
                      'antecedents_familiaux_autre'
                    )}
                    rows={3}
                    style={{
                      ...inputStyle(),
                      resize: 'vertical',
                    }}
                  />

                </Field>


                {/* TABAGISME */}

                <Field
                  label="Tabagisme"
                >

                  <select
                    {...register(
                      'tabagisme'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Jamais">
                      Jamais
                    </option>

                    <option value="Ancien fumeur">
                      Ancien fumeur
                    </option>

                    <option value="Fumeur actuel">
                      Fumeur actuel
                    </option>

                  </select>

                </Field>


                {/* ALCOOL */}

                <Field
                  label="Consommation d'alcool"
                >

                  <select
                    {...register('alcool')}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Jamais">
                      Jamais
                    </option>

                    <option value="Occasionnelle">
                      Occasionnelle
                    </option>

                    <option value="Régulière">
                      Régulière
                    </option>

                  </select>

                </Field>


                {/* ACTIVITÉ PHYSIQUE */}

                <Field
                  label="Activité physique"
                >

                  <select
                    {...register(
                      'activite_physique'
                    )}
                    style={inputStyle()}
                  >

                    <option value="">
                      Sélectionner
                    </option>

                    <option value="Aucune">
                      Aucune
                    </option>

                    <option value="Faible">
                      Faible
                    </option>

                    <option value="Modérée">
                      Modérée
                    </option>

                    <option value="Régulière">
                      Régulière
                    </option>

                  </select>

                </Field>


                {/* ALIMENTATION */}

                <Field
                  label="Alimentation"
                >

                  <textarea
                    {...register(
                      'alimentation'
                    )}
                    rows={3}
                    placeholder="Informations sur les habitudes alimentaires..."
                    style={{
                      ...inputStyle(),
                      resize: 'vertical',
                    }}
                  />

                </Field>

              </div>

            </section>
          )}


          {/* =================================================
              RÉCAPITULATIF
          ================================================= */}

          <div
            style={{
              marginTop: '30px',
              padding: '20px',
              background: '#f8fafc',
              borderRadius: '12px',
              border:
                '1px solid #e2e8f0',
            }}
          >

            <h3>
              Récapitulatif
            </h3>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(3, minmax(0, 1fr))',
                gap: '12px',
                marginTop: '15px',
              }}
            >

              <div>
                <strong>Nom :</strong>{' '}
                {watch('nom') || '—'}
              </div>

              <div>
                <strong>Prénom :</strong>{' '}
                {watch('prenom') || '—'}
              </div>

              <div>
                <strong>Sexe :</strong>{' '}
                {watch('sexe') || '—'}
              </div>

              <div>
                <strong>
                  Date de naissance :
                </strong>{' '}
                {watch(
                  'date_naissance'
                ) || '—'}
              </div>

              <div>
                <strong>
                  Âge actuel :
                </strong>{' '}
                {ageActuel !== null
                  ? `${ageActuel} ans`
                  : '—'}
              </div>

              <div>
                <strong>
                  Téléphone :
                </strong>{' '}
                {watch('telephone') || '—'}
              </div>

              <div>
                <strong>
                  Wilaya :
                </strong>{' '}
                {watch('wilaya') || '—'}
              </div>

              <div>
                <strong>
                  Commune :
                </strong>{' '}
                {watch('commune') || '—'}
              </div>

            </div>

          </div>


          {/* =================================================
              BUTTONS
          ================================================= */}

          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              marginTop: '30px',
              gap: '12px',
            }}
          >

            {/* ANNULER */}

            <button
              type="button"
              onClick={() =>
                navigate('/patients')
              }
              style={{
                padding:
                  '10px 18px',
                borderRadius: '8px',
                border:
                  '1px solid #cbd5e1',
                background:
                  '#ffffff',
                cursor: 'pointer',
              }}
            >
              Annuler
            </button>


            {/* PREVIOUS */}

            <div
              style={{
                display: 'flex',
                gap: '10px',
                marginLeft: 'auto',
              }}
            >

              {step > 0 && (

                <button
                  type="button"
                  onClick={handlePrev}
                  style={{
                    padding:
                      '10px 18px',
                    borderRadius: '8px',
                    border:
                      '1px solid #cbd5e1',
                    background:
                      '#ffffff',
                    cursor:
                      'pointer',
                  }}
                >
                  Précédent
                </button>

              )}


              {/* NEXT */}

              {step < STEPS.length - 1 ? (

                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    padding:
                      '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      '#4f46e5',
                    color: '#ffffff',
                    cursor:
                      'pointer',
                    fontWeight: 600,
                  }}
                >
                  Suivant
                </button>

              ) : (

                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding:
                      '10px 18px',
                    borderRadius: '8px',
                    border: 'none',
                    background:
                      submitting
                        ? '#94a3b8'
                        : '#16a34a',
                    color: '#ffffff',
                    cursor:
                      submitting
                        ? 'not-allowed'
                        : 'pointer',
                    fontWeight: 600,
                  }}
                >

                  {submitting
                    ? 'Création...'
                    : 'Créer le patient'}

                </button>

              )}

            </div>

          </div>

        </form>

      </div>


      {/* =====================================================
          MODAL DOUBLON
      ===================================================== */}

      {showModal && suspect && (

        <ComparaisonFusionModal
          suspect={suspect}
          donneesForm={donneesForm}
          onClose={() =>
            setShowModal(false)
          }
          onFusionner={
            handleFusionner
          }
          onForcerCreation={
            handleForcerCreation
          }
        />

      )}

    </AppLayout>
  );
}


/* =========================================================
   FIELD COMPONENT
========================================================= */

function Field({
  label,
  error,
  children,
}) {

  return (

    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '7px',
      }}
    >

      <label
        style={{
          fontWeight: 600,
          color: '#334155',
        }}
      >
        {label}
      </label>

      {children}

      {error && (

        <span
          style={{
            color: '#dc2626',
            fontSize: '13px',
          }}
        >
          {error}
        </span>

      )}

    </div>
  );
}