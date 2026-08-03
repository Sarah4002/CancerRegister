import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';
import { getHomeRouteForRole } from '../../hooks/usePermissions';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

function BgDecoration() {
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', pointerEvents:'none' }}>
      {/* Subtle grid */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`linear-gradient(rgba(37,99,235,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(37,99,235,0.04) 1px, transparent 1px)`,
        backgroundSize:'48px 48px',
      }} />
      {/* Blue orbs */}
      <div style={{ position:'absolute', top:'-10%', right:'-5%', width:480, height:480, borderRadius:'50%', background:'radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)', animation:'float 10s ease-in-out infinite' }} />
      <div style={{ position:'absolute', bottom:'-10%', left:'-5%', width:360, height:360, borderRadius:'50%', background:'radial-gradient(circle, rgba(96,165,250,0.06) 0%, transparent 70%)', animation:'float 14s ease-in-out infinite reverse' }} />
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated, user } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) {
      navigate(getHomeRouteForRole(user?.role));
    }
  }, [isAuthenticated, user?.role, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Connexion réussie');
      const role = useAuthStore.getState().user?.role;
      navigate(getHomeRouteForRole(role));
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#f0f4f9', display:'flex', position:'relative', overflow:'hidden' }}>
      <BgDecoration />

      {/* Left panel */}
      <div style={{
        flex:'0 0 44%', display:'flex', flexDirection:'column', justifyContent:'center',
        padding:'60px 56px', position:'relative',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateX(-16px)',
        transition:'all 0.6s ease',
      }}>
        {/* Logo */}
        <div style={{ marginBottom:52 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:12, padding:'10px 18px', background:'#fff', border:'1px solid rgba(37,99,235,0.15)', borderRadius:14, boxShadow:'0 2px 12px rgba(37,99,235,0.08)' }}>
            <div style={{ width:38, height:38, background:'linear-gradient(135deg, #2563eb, #60a5fa)', borderRadius:11, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 14px rgba(37,99,235,0.3)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:13.5, color:'#0f172a' }}>RegistreCancer.dz</div>
              <div style={{ fontSize:10, color:'#94a3b8', letterSpacing:0.8 }}>MINISTÈRE DE LA SANTÉ</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom:44 }}>
          <h1 style={{ fontFamily:'var(--font-display)', fontSize:44, fontWeight:800, lineHeight:1.12, color:'#0f172a', marginBottom:16 }}>
            Registre National<br/>
            <span style={{ color:'#2563eb' }}>du Cancer</span>
          </h1>
          <p style={{ fontSize:15, color:'#475569', lineHeight:1.75, maxWidth:360 }}>
            Plateforme nationale de surveillance épidémiologique du cancer.
            Données conformes au standard <strong style={{ color:'#2563eb' }}>CanReg5 – CIRC/OMS</strong>.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:'rgba(37,99,235,0.1)', borderRadius:14, overflow:'hidden', border:'1px solid rgba(37,99,235,0.12)', marginBottom:28 }}>
          {[
            { val:'3 842', label:'Patients actifs' },
            { val:'58', label:'Wilayas couvertes' },
            { val:'68%', label:'Taux de survie' },
          ].map(({ val, label }) => (
            <div key={label} style={{ padding:'16px 14px', background:'#fff', textAlign:'center' }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:24, fontWeight:800, color:'#2563eb', marginBottom:4 }}>{val}</div>
              <div style={{ fontSize:11, color:'#64748b' }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Standard badges */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {['ICD-O-3','TNM 8e éd.','CIM-10','IACR','CanReg5'].map(tag => (
            <span key={tag} style={{ padding:'4px 10px', background:'#fff', border:'1px solid rgba(37,99,235,0.15)', borderRadius:20, fontSize:11, color:'#2563eb', fontFamily:'var(--font-mono)', fontWeight:500 }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{ position:'absolute', left:'44%', top:'8%', bottom:'8%', width:1, background:'linear-gradient(to bottom, transparent, rgba(37,99,235,0.12) 30%, rgba(37,99,235,0.12) 70%, transparent)' }} />

      {/* Right panel - form */}
      <div style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'40px 48px', position:'relative',
        opacity: mounted ? 1 : 0, transform: mounted ? 'none' : 'translateY(16px)',
        transition:'all 0.6s ease 0.15s',
      }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          {/* Form header */}
          <div style={{ marginBottom:32 }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:7, padding:'4px 12px', background:'#eff6ff', border:'1px solid rgba(37,99,235,0.2)', borderRadius:20, marginBottom:18 }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#2563eb', animation:'pulse-glow 2s infinite' }} />
              <span style={{ fontSize:11, color:'#2563eb', fontFamily:'var(--font-mono)', letterSpacing:0.5, fontWeight:600 }}>ACCÈS SÉCURISÉ</span>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontSize:30, fontWeight:800, color:'#0f172a', marginBottom:8 }}>Connexion</h2>
            <p style={{ fontSize:14, color:'#64748b' }}>Accès réservé au personnel médical autorisé</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <InputField
              label="Adresse email professionnelle"
              type="email"
              placeholder="dr.nom@chu-oran.dz"
              error={errors.email?.message}
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
              {...register('email')}
            />

            <InputField
              label="Mot de passe"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              error={errors.password?.message}
              icon={<svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>}
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ background:'none', border:'none', cursor:'pointer', color:'#94a3b8', padding:'0 4px' }}>
                  {showPass
                    ? <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                    : <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  }
                </button>
              }
              {...register('password')}
            />

            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24, marginTop:-8 }}>
              <Link to="/forgot-password" style={{ fontSize:13, color:'#2563eb', textDecoration:'none', fontWeight:500 }}>Mot de passe oublié ?</Link>
            </div>

            <button type="submit" disabled={isLoading}
              style={{
                width:'100%', padding:'14px 24px',
                background: isLoading ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                border:'none', borderRadius:12,
                color: isLoading ? '#94a3b8' : '#fff',
                fontSize:14, fontWeight:700, fontFamily:'var(--font-display)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                transition:'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 4px 18px rgba(37,99,235,0.28)',
                letterSpacing:0.3,
              }}
              onMouseEnter={e => !isLoading && (e.currentTarget.style.transform='translateY(-1px)', e.currentTarget.style.boxShadow='0 8px 28px rgba(37,99,235,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.transform='none', e.currentTarget.style.boxShadow=isLoading?'none':'0 4px 18px rgba(37,99,235,0.28)')}
            >
              {isLoading ? (
                <><div style={{ width:16, height:16, border:'2px solid #cbd5e1', borderTopColor:'#64748b', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />Connexion...</>
              ) : (
                <>Se connecter <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg></>
              )}
            </button>
          </form>

          <div style={{ marginTop:20, fontSize:12, color:'#94a3b8', lineHeight:1.5 }}>
            Enregistrement direct désactivé. Seul un administrateur peut créer de nouveaux comptes.
          </div>

          {/* Security notice */}
          <div style={{ marginTop:28, padding:'12px 16px', background:'#fff', border:'1px solid rgba(37,99,235,0.1)', borderRadius:12, display:'flex', alignItems:'flex-start', gap:10, boxShadow:'0 2px 8px rgba(15,23,42,0.05)' }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#2563eb" style={{ flexShrink:0, marginTop:1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
            </svg>
            <p style={{ fontSize:11, color:'#64748b', lineHeight:1.65 }}>
              Accès soumis à traçabilité conforme RGPD/CNAS. Toute connexion est journalisée conformément à la loi sanitaire algérienne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export const InputField = forwardRef(function InputField({ label, error, icon, suffix, onFocus, onBlur, ...props }, ref) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom:20 }}>
      <label style={{ display:'block', fontSize:12.5, fontWeight:600, color:'#334155', marginBottom:8 }}>{label}</label>
      <div style={{
        position:'relative', display:'flex', alignItems:'center',
        background:'#fff',
        border:`1.5px solid ${error ? '#dc2626' : focused ? '#2563eb' : 'rgba(37,99,235,0.2)'}`,
        borderRadius:12,
        transition:'all 0.18s ease',
        boxShadow: focused ? '0 0 0 3px rgba(37,99,235,0.1)' : '0 1px 4px rgba(15,23,42,0.06)',
      }}>
        {icon && (
          <div style={{ padding:'0 12px', color: focused ? '#2563eb' : '#94a3b8', transition:'color 0.18s' }}>{icon}</div>
        )}
        <input
          ref={ref} {...props}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{
            flex:1, background:'none', border:'none', outline:'none',
            padding: icon ? '13px 0' : '13px 14px',
            paddingRight: suffix ? 0 : 14,
            fontSize:14, color:'#0f172a', fontFamily:'var(--font-body)',
          }}
        />
        {suffix && <div style={{ paddingRight:12 }}>{suffix}</div>}
      </div>
      {error && (
        <p style={{ marginTop:6, fontSize:12, color:'#dc2626', display:'flex', alignItems:'center', gap:4 }}>
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/></svg>
          {error}
        </p>
      )}
    </div>
  );
});
