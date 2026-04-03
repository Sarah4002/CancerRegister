import { useState, useEffect, forwardRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import useAuthStore from '../../hooks/useAuth';

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
});

// Animated particle background
function Particles() {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {/* Grid lines */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0,168,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,168,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
      }} />
      {/* Gradient orbs */}
      <div style={{
        position: 'absolute', top: '-20%', right: '-10%',
        width: 500, height: 500, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,168,255,0.08) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,229,192,0.06) 0%, transparent 70%)',
        animation: 'float 10s ease-in-out infinite reverse',
      }} />
      {/* DNA-like dots */}
      {[...Array(12)].map((_, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: i % 3 === 0 ? 3 : 2,
          height: i % 3 === 0 ? 3 : 2,
          borderRadius: '50%',
          background: i % 2 === 0 ? 'rgba(0,168,255,0.4)' : 'rgba(0,229,192,0.3)',
          top: `${10 + (i * 7)}%`,
          left: `${5 + (i * 8) % 90}%`,
          animation: `float ${4 + i * 0.5}s ease-in-out infinite`,
          animationDelay: `${i * 0.3}s`,
        }} />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, isAuthenticated } = useAuthStore();
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isAuthenticated) navigate('/dashboard');
  }, [isAuthenticated, navigate]);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data) => {
    const result = await login(data);
    if (result.success) {
      toast.success('Connexion réussie');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-deep)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <Particles />

      {/* Left panel - branding */}
      <div style={{
        flex: '0 0 45%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        position: 'relative',
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'none' : 'translateX(-20px)',
        transition: 'all 0.7s ease',
      }}>
        {/* Logo mark */}
        <div style={{ marginBottom: 56 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            padding: '8px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-light)',
            borderRadius: 'var(--radius-lg)',
          }}>
            <div style={{
              width: 36, height: 36,
              background: 'linear-gradient(135deg, #00a8ff, #00e5c0)',
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white"/>
                <path d="M2 17l10 5 10-5M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', letterSpacing: 0.5 }}>
                RegistreCancer.dz
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 1 }}>MINISTÈRE DE LA SANTÉ</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ marginBottom: 40 }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 42,
            fontWeight: 800,
            lineHeight: 1.15,
            color: 'var(--text-primary)',
            marginBottom: 16,
          }}>
            Registre National<br/>
            <span style={{
              background: 'linear-gradient(90deg, #00a8ff, #00e5c0)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>du Cancer</span>
          </h1>
          <p style={{ fontSize: 15, color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: 360 }}>
            Plateforme nationale de surveillance épidémiologique du cancer. 
            Données conformes au standard <strong style={{ color: 'var(--accent)' }}>CanReg5 – CIRC/OMS</strong>.
          </p>
        </div>

        {/* Stats strip */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          background: 'var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          border: '1px solid var(--border)',
        }}>
          {[
            { val: '3 842', label: 'Patients actifs' },
            { val: '58', label: 'Wilayas couvertes' },
            { val: '68%', label: 'Taux de survie' },
          ].map(({ val, label }) => (
            <div key={label} style={{
              padding: '16px 14px',
              background: 'var(--bg-card)',
              textAlign: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 22,
                fontWeight: 700,
                color: 'var(--accent)',
                marginBottom: 4,
              }}>{val}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: 0.3 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Data standard badges */}
        <div style={{ display: 'flex', gap: 8, marginTop: 32, flexWrap: 'wrap' }}>
          {['ICD-O-3', 'TNM 8e éd.', 'CIM-10', 'IACR', 'CanReg5'].map(tag => (
            <span key={tag} style={{
              padding: '4px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-light)',
              borderRadius: 20,
              fontSize: 11,
              color: 'var(--text-secondary)',
              fontFamily: 'var(--font-mono)',
            }}>{tag}</span>
          ))}
        </div>
      </div>

      {/* Right panel - login form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 48px',
        position: 'relative',
      }}>
        {/* Vertical divider */}
        <div style={{
          position: 'absolute',
          left: 0, top: '10%', bottom: '10%',
          width: 1,
          background: 'linear-gradient(to bottom, transparent, var(--border-light) 30%, var(--border-light) 70%, transparent)',
        }} />

        <div style={{
          width: '100%',
          maxWidth: 420,
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'none' : 'translateY(20px)',
          transition: 'all 0.7s ease 0.2s',
        }}>
          {/* Form header */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              background: 'var(--accent-dim)',
              border: '1px solid rgba(0,168,255,0.2)',
              borderRadius: 20,
              marginBottom: 16,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', animation: 'pulse-glow 2s infinite' }} />
              <span style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--font-mono)', letterSpacing: 0.5 }}>ACCÈS SÉCURISÉ</span>
            </div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}>Connexion</h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
              Accès réservé au personnel médical autorisé
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <InputField
              label="Adresse email professionnelle"
              type="email"
              placeholder="dr.nom@chu-oran.dz"
              error={errors.email?.message}
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              }
              {...register('email')}
            />

            <InputField
              label="Mot de passe"
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••••"
              error={errors.password?.message}
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              }
              suffix={
                <button type="button" onClick={() => setShowPass(!showPass)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '0 4px',
                }}>
                  {showPass
                    ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              }
              {...register('password')}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, marginTop: -8 }}>
              <Link to="/forgot-password" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
                Mot de passe oublié ?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '14px 24px',
                background: isLoading
                  ? 'var(--bg-elevated)'
                  : 'linear-gradient(135deg, #00a8ff 0%, #0080cc 100%)',
                border: '1px solid rgba(0,168,255,0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: 'var(--font-display)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all 0.2s ease',
                letterSpacing: 0.3,
              }}
              onMouseEnter={e => !isLoading && (e.target.style.transform = 'translateY(-1px)', e.target.style.boxShadow = '0 8px 30px rgba(0,168,255,0.3)')}
              onMouseLeave={e => (e.target.style.transform = 'none', e.target.style.boxShadow = 'none')}
            >
              {isLoading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Connexion en cours...
                </>
              ) : (
                <>
                  Se connecter
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: 20, marginBottom: 10, fontSize: 12, color: 'var(--text-muted)' }}>
            Enregistrement direct désactivé. Seul un administrateur peut créer de nouveaux comptes depuis le panneau d'administration.
          </div>

          {/* Security notice */}
          <div style={{
            marginTop: 32,
            padding: '12px 16px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="var(--text-muted)" style={{ flexShrink: 0, marginTop: 1 }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Accès soumis à traçabilité conforme RGPD/CNAS. 
              Toute connexion est journalisée conformément à la loi sanitaire algérienne.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Reusable input field component — forwardRef is REQUIRED for react-hook-form
export const InputField = forwardRef(function InputField(
  { label, error, icon, suffix, onFocus, onBlur, ...props },
  ref
) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{
        display: 'block',
        fontSize: 12,
        fontWeight: 500,
        color: 'var(--text-secondary)',
        marginBottom: 8,
        letterSpacing: 0.3,
      }}>
        {label}
      </label>
      <div style={{
        position: 'relative',
        display: 'flex', alignItems: 'center',
        background: 'var(--bg-card)',
        border: `1px solid ${error ? 'var(--danger)' : focused ? 'var(--border-focus)' : 'var(--border-light)'}`,
        borderRadius: 'var(--radius-md)',
        transition: 'all 0.2s ease',
        boxShadow: focused ? '0 0 0 3px var(--accent-dim)' : 'none',
      }}>
        {icon && (
          <div style={{ padding: '0 12px', color: focused ? 'var(--accent)' : 'var(--text-muted)', transition: 'color 0.2s' }}>
            {icon}
          </div>
        )}
        <input
          ref={ref}
          {...props}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            padding: icon ? '12px 0' : '12px 14px',
            paddingRight: suffix ? 0 : 14,
            fontSize: 14,
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
          }}
        />
        {suffix && <div style={{ paddingRight: 12 }}>{suffix}</div>}
      </div>
      {error && (
        <p style={{ marginTop: 6, fontSize: 12, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="12" height="12" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
});
