import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';
import { InputField } from './LoginPage';

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Béjaïa','Biskra','Béchar',
  'Blida','Bouira','Tamanrasset','Tébessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Sétif','Saïda','Skikda','Sidi Bel Abbès','Annaba','Guelma',
  'Constantine','Médéa','Mostaganem',"M'Sila",'Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arréridj','Boumerdès','El Tarf','Tindouf','Tissemsilt','El Oued',
  'Khenchela','Souk Ahras','Tipaza','Mila','Aïn Defla','Naâma','Aïn Témouchent',
  'Ghardaïa','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Béni Abbès',
  'In Salah','In Guezzam','Touggourt','Djanet',"El M'Ghair",'El Meniaa',
];

// ── RÔLES MIS À JOUR ─────────────────────────────────────────
const ROLES = [
  { value: 'doctor',         label: 'Médecin Oncologue',           icon: '🩺' },
  { value: 'anapath',        label: 'Médecin Anatomopathologiste', icon: '🔬' },
  { value: 'epidemiologist', label: 'Épidémiologiste',             icon: '📊' },
];

const SPECIALITIES = [
  { value: 'oncology',         label: 'Oncologie' },
  { value: 'hematology',       label: 'Hématologie' },
  { value: 'radiotherapy',     label: 'Radiothérapie' },
  { value: 'surgery',          label: 'Chirurgie Oncologique' },
  { value: 'pathology',        label: 'Anatomopathologie' },
  { value: 'epidemiology',     label: 'Épidémiologie' },
  { value: 'general_medicine', label: 'Médecine Générale' },
  { value: 'other',            label: 'Autre' },
];

const step1Schema = z.object({
  first_name: z.string().min(2, 'Prénom requis (min 2 caractères)'),
  last_name:  z.string().min(2, 'Nom requis (min 2 caractères)'),
  email:      z.string().email('Adresse email invalide'),
  phone:      z.string().optional(),
});

const step2Schema = z.object({
  username:         z.string().min(3, 'Au moins 3 caractères').regex(/^[a-z0-9_]+$/, 'Minuscules, chiffres et _ uniquement'),
  password:         z.string().min(8, '8 caractères minimum'),
  password_confirm: z.string().min(1, 'Confirmation requise'),
}).refine(d => d.password === d.password_confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirm'],
});

const step3Schema = z.object({
  role:                z.string().min(1, 'Veuillez choisir un rôle'),
  speciality:          z.string().optional(),
  registration_number: z.string().optional(),
  institution:         z.string().min(2, 'Établissement requis'),
  wilaya:              z.string().min(1, 'Veuillez sélectionner une wilaya'),
  department:          z.string().optional(),
});

const STEP_LABELS = ['Identité', 'Sécurité', 'Profil professionnel'];

function Step1({ onNext, saved }) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  return (
    <form onSubmit={handleSubmit(onNext)}>
      <SectionTitle>Informations personnelles</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <InputField label="Prénom *" type="text" placeholder="Mohamed"
          error={errors.first_name?.message} {...register('first_name')} />
        <InputField label="Nom *" type="text" placeholder="Benali"
          error={errors.last_name?.message} {...register('last_name')} />
      </div>
      <InputField label="Email professionnel *" type="email" placeholder="m.benali@chu-oran.dz"
        error={errors.email?.message} {...register('email')} />
      <InputField label="Téléphone" type="tel" placeholder="+213 5xx xxx xxx"
        error={errors.phone?.message} {...register('phone')} />
      <PrimaryBtn label="Continuer →" />
    </form>
  );
}

function Step2({ onNext, onBack, saved }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(step2Schema),
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const [showPass,  setShowPass]  = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const pwd = watch('password') || '';

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <SectionTitle>Sécurité du compte</SectionTitle>
      <InputField label="Nom d'utilisateur *" type="text" placeholder="m.benali"
        error={errors.username?.message} {...register('username')} />
      <InputField
        label="Mot de passe *"
        type={showPass ? 'text' : 'password'}
        placeholder="8 caractères minimum"
        error={errors.password?.message}
        suffix={<EyeBtn show={showPass} toggle={() => setShowPass(v => !v)} />}
        {...register('password')}
      />
      <InputField
        label="Confirmer le mot de passe *"
        type={showPass2 ? 'text' : 'password'}
        placeholder="••••••••"
        error={errors.password_confirm?.message}
        suffix={<EyeBtn show={showPass2} toggle={() => setShowPass2(v => !v)} />}
        {...register('password_confirm')}
      />
      <PasswordStrength password={pwd} />
      <NavBtns onBack={onBack} />
    </form>
  );
}

function Step3({ onNext, onBack, saved, isLoading }) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(step3Schema),
    defaultValues: saved,
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });
  const selectedRole = watch('role') || '';

  // Couleurs par rôle
  const ROLE_COLORS = {
    doctor:         { active: 'rgba(0,168,255,0.12)',   border: 'rgba(0,168,255,0.35)',   text: '#00a8ff' },
    anapath:        { active: 'rgba(155,138,251,0.12)', border: 'rgba(155,138,251,0.35)', text: '#9b8afb' },
    epidemiologist: { active: 'rgba(0,229,160,0.12)',   border: 'rgba(0,229,160,0.35)',   text: '#00e5a0' },
  };

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <SectionTitle>Profil professionnel</SectionTitle>

      {/* Role selector — 3 cartes sur une ligne */}
      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Rôle *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ROLES.map(r => {
            const isSelected = selectedRole === r.value;
            const colors     = ROLE_COLORS[r.value];
            return (
              <label key={r.value} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '12px 8px',
                background: isSelected ? colors.active : 'var(--bg-elevated)',
                border: `1px solid ${isSelected ? colors.border : 'var(--border)'}`,
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                transition: 'all 0.15s',
                textAlign: 'center',
              }}>
                <input type="radio" value={r.value} {...register('role')}
                  onChange={() => setValue('role', r.value, { shouldValidate: false })}
                  style={{ display: 'none' }} />
                <span style={{ fontSize: 22 }}>{r.icon}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, lineHeight: 1.3,
                  color: isSelected ? colors.text : 'var(--text-secondary)',
                }}>
                  {r.label}
                </span>
              </label>
            );
          })}
        </div>
        {errors.role && <ErrMsg msg={errors.role.message} />}
      </div>

      <SelectField label="Spécialité" name="speciality" register={register} error={errors.speciality?.message}>
        <option value="">Sélectionner une spécialité</option>
        {SPECIALITIES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </SelectField>

      <InputField label="N° CNOM / identifiant professionnel" type="text" placeholder="ex: 1234/ALG"
        error={errors.registration_number?.message} {...register('registration_number')} />
      <InputField label="Établissement / Hôpital *" type="text" placeholder="CHU Oran"
        error={errors.institution?.message} {...register('institution')} />

      <SelectField label="Wilaya *" name="wilaya" register={register} error={errors.wilaya?.message}>
        <option value="">Sélectionner une wilaya</option>
        {WILAYAS.map(w => <option key={w} value={w}>{w}</option>)}
      </SelectField>

      <InputField label="Service / Département" type="text" placeholder="Service d'Oncologie"
        error={errors.department?.message} {...register('department')} />

      <NavBtns onBack={onBack} isLast isLoading={isLoading} />
    </form>
  );
}

export default function RegisterPage() {
  const { register: registerUser, isLoading } = useAuthStore();
  const [step,    setStep]    = useState(0);
  const [saved,   setSaved]   = useState([{}, {}, {}]);
  const [success, setSuccess] = useState(false);

  const handleNext = (stepIndex) => async (data) => {
    const updated = saved.map((s, i) => i === stepIndex ? data : s);
    setSaved(updated);

    if (stepIndex < 2) { setStep(stepIndex + 1); return; }

    const allData = Object.assign({}, ...updated);
    const result = await registerUser(allData);
    if (result.success) {
      setSuccess(true);
    } else {
      const msg = typeof result.errors === 'object'
        ? Object.values(result.errors).flat().join(' ')
        : "Erreur lors de l'inscription.";
      toast.error(msg);
    }
  };

  if (success) return <SuccessScreen />;

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-deep)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(rgba(0,168,255,0.025) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(0,168,255,0.025) 1px, transparent 1px)`,
        backgroundSize: '60px 60px',
      }} />
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
        background: 'radial-gradient(circle, rgba(0,168,255,0.05) 0%, transparent 60%)',
      }} />

      <div style={{ width: '100%', maxWidth: 540, position: 'relative', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/login" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00a8ff, #00e5c0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              RegistreCancer.dz
            </span>
          </Link>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
            Créer un compte
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Accès soumis à validation administrative</p>
        </div>

        <Stepper step={step} />

        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-xl)', padding: '28px 32px', marginBottom: 20 }}>
          {step === 0 && <Step1 onNext={handleNext(0)} saved={saved[0]} />}
          {step === 1 && <Step2 onNext={handleNext(1)} onBack={() => setStep(0)} saved={saved[1]} />}
          {step === 2 && <Step3 onNext={handleNext(2)} onBack={() => setStep(1)} saved={saved[2]} isLoading={isLoading} />}
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
          Déjà inscrit ?{' '}
          <Link to="/login" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 500 }}>Se connecter</Link>
        </p>
      </div>
    </div>
  );
}

// ─── Mini components ──────────────────────────────────────────────

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 24 }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%', marginBottom: 6,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 13, fontWeight: 600, transition: 'all 0.3s ease',
              background: i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--bg-elevated)',
              border: `1px solid ${i < step ? 'var(--success)' : i === step ? 'var(--accent)' : 'var(--border)'}`,
              color: i <= step ? '#fff' : 'var(--text-muted)',
            }}>
              {i < step ? '✓' : i + 1}
            </div>
            <span style={{ fontSize: 10, color: i === step ? 'var(--text-primary)' : 'var(--text-muted)', textAlign: 'center' }}>
              {label}
            </span>
          </div>
          {i < STEP_LABELS.length - 1 && (
            <div style={{ flex: 1, height: 1, margin: '0 4px', marginBottom: 22, background: i < step ? 'var(--success)' : 'var(--border)', transition: 'background 0.3s' }} />
          )}
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20 }}>{children}</h3>;
}

function SelectField({ label, name, register, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <select {...register(name)} style={{
        width: '100%', padding: '12px 14px',
        background: 'var(--bg-elevated)',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-primary)', fontSize: 14, outline: 'none', cursor: 'pointer',
        fontFamily: 'var(--font-body)',
      }}>
        {children}
      </select>
      {error && <ErrMsg msg={error} />}
    </div>
  );
}

function ErrMsg({ msg }) {
  return (
    <p style={{ marginTop: 5, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      {msg}
    </p>
  );
}

function PrimaryBtn({ label, isGreen, isLoading }) {
  return (
    <button type="submit" disabled={isLoading} style={{
      width: '100%', padding: '13px 24px', marginTop: 4,
      background: isLoading ? 'var(--bg-elevated)' : isGreen ? 'linear-gradient(135deg, var(--success), #00b38a)' : 'linear-gradient(135deg, #00a8ff, #0080cc)',
      border: 'none', borderRadius: 'var(--radius-md)',
      color: '#fff', fontSize: 14, fontWeight: 600,
      fontFamily: 'var(--font-display)', cursor: isLoading ? 'not-allowed' : 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {isLoading ? <Spinner /> : label}
    </button>
  );
}

function NavBtns({ onBack, isLast, isLoading }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
      <button type="button" onClick={onBack} style={{
        flex: '0 0 100px', padding: '13px',
        background: 'var(--bg-elevated)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)',
        fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>
        ← Retour
      </button>
      <PrimaryBtn label={isLast ? 'Soumettre la demande' : 'Continuer →'} isGreen={isLast} isLoading={isLoading} />
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function EyeBtn({ show, toggle }) {
  return (
    <button type="button" onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0 4px' }}>
      {show
        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
      }
    </button>
  );
}

function PasswordStrength({ password }) {
  if (!password) return null;
  const checks = [
    { label: '8+ caractères',    ok: password.length >= 8 },
    { label: 'Majuscule',         ok: /[A-Z]/.test(password) },
    { label: 'Chiffre',           ok: /\d/.test(password) },
    { label: 'Caractère spécial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.ok).length;
  const colors = ['var(--danger)', 'var(--warning)', 'var(--warning)', 'var(--success)', 'var(--success)'];
  return (
    <div style={{ marginTop: -10, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score] : 'var(--bg-elevated)', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {checks.map(c => (
          <span key={c.label} style={{ fontSize: 11, color: c.ok ? 'var(--success)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
            {c.ok ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 420, textAlign: 'center', animation: 'fadeUp 0.5s ease' }}>
        <div style={{ width: 72, height: 72, margin: '0 auto 24px', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="var(--success)">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>Demande soumise !</h2>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 32 }}>
          Votre demande d'accès a été enregistrée. Un administrateur examinera votre dossier et vous notifiera par email une fois votre compte activé.
        </p>
        <Link to="/login" style={{ textDecoration: 'none' }}>
          <PrimaryBtn label="Retour à la connexion" />
        </Link>
      </div>
    </div>
  );
}

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: 'var(--text-secondary)', marginBottom: 8, letterSpacing: 0.3,
};