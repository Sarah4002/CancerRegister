import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';
import { InputField } from './LoginPage';
import { AppLayout } from '../../components/layout/Sidebar';

const WILAYAS = [
  'Adrar','Chlef','Laghouat','Oum El Bouaghi','Batna','Bejaia','Biskra','Bechar',
  'Blida','Bouira','Tamanrasset','Tebessa','Tlemcen','Tiaret','Tizi Ouzou','Alger',
  'Djelfa','Jijel','Setif','Saida','Skikda','Sidi Bel Abbes','Annaba','Guelma',
  'Constantine','Medea','Mostaganem',"M'Sila",'Mascara','Ouargla','Oran','El Bayadh',
  'Illizi','Bordj Bou Arreridj','Boumerdes','El Tarf','Tindouf','Tissemsilt','El Oued',
  'Khenchela','Souk Ahras','Tipaza','Mila','Ain Defla','Naama','Ain Temouchent',
  'Ghardaia','Relizane','Timimoun','Bordj Badji Mokhtar','Ouled Djellal','Beni Abbes',
  'In Salah','In Guezzam','Touggourt','Djanet',"El M'Ghair",'El Meniaa',
];

const ROLES = [
  { value: 'doctor', label: 'Medecin Oncologue', icon: '??' },
  { value: 'anapath', label: 'Medecin Anatomopathologiste', icon: '??' },
  { value: 'epidemiologist', label: 'Epidemiologiste', icon: '??' },
];

const SPECIALITIES = [
  { value: 'oncology', label: 'Oncologie' },
  { value: 'hematology', label: 'Hematologie' },
  { value: 'radiotherapy', label: 'Radiotherapie' },
  { value: 'surgery', label: 'Chirurgie Oncologique' },
  { value: 'pathology', label: 'Anatomopathologie' },
  { value: 'epidemiology', label: 'Epidemiologie' },
  { value: 'general_medicine', label: 'Medecine Generale' },
  { value: 'other', label: 'Autre' },
];

const STEP_LABELS = ['Identite', 'Securite', 'Profil professionnel'];

const step1Schema = z.object({
  first_name: z.string().min(2, 'Prenom requis (min 2 caracteres)'),
  last_name: z.string().min(2, 'Nom requis (min 2 caracteres)'),
  email: z.string().email('Adresse email invalide'),
  phone: z.string().optional(),
});

const step2Schema = z.object({
  username: z.string().min(3, 'Au moins 3 caracteres').regex(/^[a-z0-9_]+$/, 'Minuscules, chiffres et _ uniquement'),
  password: z.string().min(8, '8 caracteres minimum'),
  password_confirm: z.string().min(1, 'Confirmation requise'),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['password_confirm'],
});

const step3Schema = z.object({
  role: z.string().min(1, 'Veuillez choisir un role'),
  speciality: z.string().optional(),
  registration_number: z.string().optional(),
  institution: z.string().min(2, 'Etablissement requis'),
  wilaya: z.string().min(1, 'Veuillez selectionner une wilaya'),
  department: z.string().optional(),
});

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
      <Row>
        <InputField label="Prenom *" type="text" placeholder="Mohamed" error={errors.first_name?.message} {...register('first_name')} />
        <InputField label="Nom *" type="text" placeholder="Benali" error={errors.last_name?.message} {...register('last_name')} />
      </Row>
      <InputField label="Email professionnel *" type="email" placeholder="m.benali@chu-oran.dz" error={errors.email?.message} {...register('email')} />
      <InputField label="Telephone" type="tel" placeholder="+213 5xx xxx xxx" error={errors.phone?.message} {...register('phone')} />
      <PrimaryBtn label="Continuer" />
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
  const [showPass, setShowPass] = useState(false);
  const [showPass2, setShowPass2] = useState(false);
  const pwd = watch('password') || '';

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <SectionTitle>Securite du compte</SectionTitle>
      <InputField label="Nom d'utilisateur *" type="text" placeholder="m.benali" error={errors.username?.message} {...register('username')} />
      <InputField
        label="Mot de passe *"
        type={showPass ? 'text' : 'password'}
        placeholder="8 caracteres minimum"
        error={errors.password?.message}
        suffix={<EyeBtn show={showPass} toggle={() => setShowPass((v) => !v)} />}
        {...register('password')}
      />
      <InputField
        label="Confirmer le mot de passe *"
        type={showPass2 ? 'text' : 'password'}
        placeholder="••••••••"
        error={errors.password_confirm?.message}
        suffix={<EyeBtn show={showPass2} toggle={() => setShowPass2((v) => !v)} />}
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

  const roleColors = {
    doctor: { active: 'rgba(37,99,235,0.10)', border: 'rgba(37,99,235,0.26)', text: '#2563eb' },
    anapath: { active: 'rgba(59,130,246,0.10)', border: 'rgba(59,130,246,0.24)', text: '#2563eb' },
    epidemiologist: { active: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.30)', text: '#1d4ed8' },
  };

  return (
    <form onSubmit={handleSubmit(onNext)}>
      <SectionTitle>Profil professionnel</SectionTitle>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Role *</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ROLES.map((role) => {
            const isSelected = selectedRole === role.value;
            const colors = roleColors[role.value];
            return (
              <label key={role.value} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 6, padding: '12px 8px',
                background: isSelected ? colors.active : '#f1f5f9',
                border: `1px solid ${isSelected ? colors.border : 'rgba(37,99,235,0.12)'}`,
                borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s', textAlign: 'center',
              }}>
                <input type="radio" value={role.value} {...register('role')} onChange={() => setValue('role', role.value, { shouldValidate: false })} style={{ display: 'none' }} />
                <span style={{ fontSize: 22 }}>{role.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: isSelected ? colors.text : '#334155' }}>{role.label}</span>
              </label>
            );
          })}
        </div>
        {errors.role && <ErrMsg msg={errors.role.message} />}
      </div>

      <SelectField label="Specialite" name="speciality" register={register} error={errors.speciality?.message}>
        <option value="">Selectionner une specialite</option>
        {SPECIALITIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
      </SelectField>

      <InputField label="N CNOM / identifiant professionnel" type="text" placeholder="ex: 1234/ALG" error={errors.registration_number?.message} {...register('registration_number')} />
      <InputField label="Etablissement / Hopital *" type="text" placeholder="CHU Oran" error={errors.institution?.message} {...register('institution')} />

      <SelectField label="Wilaya *" name="wilaya" register={register} error={errors.wilaya?.message}>
        <option value="">Selectionner une wilaya</option>
        {WILAYAS.map((w) => <option key={w} value={w}>{w}</option>)}
      </SelectField>

      <InputField label="Service / Departement" type="text" placeholder="Service d'Oncologie" error={errors.department?.message} {...register('department')} />
      <NavBtns onBack={onBack} isLast isLoading={isLoading} />
    </form>
  );
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated, register: registerUser, isLoading } = useAuthStore();
  const [step, setStep] = useState(0);
  const [saved, setSaved] = useState([{}, {}, {}]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.permissions?.can_manage_users) {
      toast.error("Acces refuse. Seuls les administrateurs peuvent creer des comptes.");
      navigate('/login');
    }
  }, [isAuthenticated, user, navigate]);

  const handleNext = (stepIndex) => async (data) => {
    const updated = saved.map((s, i) => i === stepIndex ? data : s);
    setSaved(updated);

    if (stepIndex < 2) {
      setStep(stepIndex + 1);
      return;
    }

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
    <AppLayout title="Creer un utilisateur">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            Creer un compte utilisateur
          </h2>
          <p style={{ fontSize: 13, color: '#64748b' }}>
            Meme design simple que le formulaire Nouveau patient.
          </p>
        </div>

        <Stepper step={step} />

        <div style={formCardStyle}>
          {step === 0 && <Step1 onNext={handleNext(0)} saved={saved[0]} />}
          {step === 1 && <Step2 onNext={handleNext(1)} onBack={() => setStep(0)} saved={saved[1]} />}
          {step === 2 && <Step3 onNext={handleNext(2)} onBack={() => setStep(1)} saved={saved[2]} isLoading={isLoading} />}
        </div>
      </div>
    </AppLayout>
  );
}

function Stepper({ step }) {
  return (
    <div style={{ display: 'flex', marginBottom: 28, background: '#ffffff', border: '1px solid rgba(37,99,235,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
      {STEP_LABELS.map((label, i) => (
        <div key={i} style={{
          flex: 1,
          padding: '14px 12px',
          textAlign: 'center',
          background: i === step ? 'rgba(37,99,235,0.08)' : i < step ? 'rgba(59,130,246,0.08)' : 'transparent',
          borderRight: i < STEP_LABELS.length - 1 ? '1px solid rgba(37,99,235,0.12)' : 'none',
          transition: 'all 0.2s',
        }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: i === step ? '#2563eb' : i < step ? '#1d4ed8' : '#64748b' }}>
            {i < step ? '? ' : ''}{label}
          </div>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600, color: '#0f172a', marginBottom: 20 }}>{children}</h3>;
}

function Row({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>{children}</div>;
}

function SelectField({ label, name, register, error, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={labelStyle}>{label}</label>
      <select {...register(name)} style={{
        width: '100%', padding: '12px 14px',
        background: '#f1f5f9',
        border: `1px solid ${error ? '#dc2626' : 'rgba(37,99,235,0.08)'}`,
        borderRadius: '12px',
        color: '#0f172a', fontSize: 14, outline: 'none', cursor: 'pointer',
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
    <p style={{ marginTop: 5, fontSize: 12, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
      </svg>
      {msg}
    </p>
  );
}

function PrimaryBtn({ label, isLoading }) {
  return (
    <button type="submit" disabled={isLoading} style={{
      width: '100%', padding: '13px 24px', marginTop: 4,
      background: isLoading ? '#f1f5f9' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
      border: 'none', borderRadius: '12px',
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
        background: '#f1f5f9', border: '1px solid rgba(37,99,235,0.12)',
        borderRadius: '12px', color: '#334155',
        fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font-body)',
      }}>
        Retour
      </button>
      <PrimaryBtn label={isLast ? 'Creer l\'utilisateur' : 'Continuer'} isLoading={isLoading} />
    </div>
  );
}

function Spinner() {
  return <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />;
}

function EyeBtn({ show, toggle }) {
  return (
    <button type="button" onClick={toggle} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0 4px' }}>
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
    { label: '8+ caracteres', ok: password.length >= 8 },
    { label: 'Majuscule', ok: /[A-Z]/.test(password) },
    { label: 'Chiffre', ok: /\d/.test(password) },
    { label: 'Caractere special', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['#dc2626', '#93c5fd', '#60a5fa', '#3b82f6', '#1d4ed8'];

  return (
    <div style={{ marginTop: -10, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 7 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: i < score ? colors[score] : '#f1f5f9', transition: 'background 0.3s' }} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {checks.map((c) => (
          <span key={c.label} style={{ fontSize: 11, color: c.ok ? '#2563eb' : '#64748b', display: 'flex', alignItems: 'center', gap: 3 }}>
            {c.ok ? '?' : '?'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function SuccessScreen() {
  return (
    <AppLayout title="Creer un utilisateur">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ ...formCardStyle, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, margin: '0 auto 24px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.24)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#2563eb">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>Utilisateur cree</h2>
          <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.8, marginBottom: 24 }}>
            Le compte a ete cree avec succes avec le meme design que Nouveau patient.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Link to="/admin" style={{ textDecoration: 'none', width: '100%', maxWidth: 260 }}>
              <PrimaryBtn label="Retour a l'administration" />
            </Link>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

const formCardStyle = {
  background: '#ffffff',
  border: '1px solid rgba(37,99,235,0.08)',
  borderRadius: '16px',
  padding: '28px 32px',
};

const labelStyle = {
  display: 'block', fontSize: 12, fontWeight: 500,
  color: '#334155', marginBottom: 8, letterSpacing: 0.3,
};
