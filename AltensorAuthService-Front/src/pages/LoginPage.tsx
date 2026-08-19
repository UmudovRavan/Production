import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { authApi } from '../api/authApi';
import authLogo from '../assets/auth-logo.svg';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated, loading } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [tenantSlug, setTenantSlug] = useState('platform');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // Forgot / Reset Password Modal State
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'forgot' | 'reset'>('forgot');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotTenantSlug, setForgotTenantSlug] = useState('');
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [loadingForgot, setLoadingForgot] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password || !tenantSlug) {
      setError('Zəhmət olmasa bütün sahələri doldurun.');
      return;
    }

    try {
      await login({
        email: email.trim(),
        password,
        tenantSlug: tenantSlug.trim()
      });
      showToast('success', 'Sistemə uğurla daxil oldunuz!', 'Uğurlu Giriş');
      const from = (location.state as any)?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Giriş uğursuz oldu. Email və ya şifrə yanlışdır.');
      showToast('error', err.message || 'Etimadnamə yalnışdır', 'Giriş Xətası');
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotTenantSlug) return;
    setLoadingForgot(true);
    try {
      const res = await authApi.forgotPassword({
        email: forgotEmail.trim(),
        tenantSlug: forgotTenantSlug.trim()
      });
      showToast('success', res.message || 'OTP təsdiq kodu email ünvanına göndərildi!', 'Uğurlu');
      setForgotStep('reset');
    } catch (err: any) {
      showToast('error', err.message || 'OTP göndərilərkən xəta baş verdi', 'Xəta');
    } finally {
      setLoadingForgot(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !forgotTenantSlug || !resetOtp || !resetNewPassword) return;
    setLoadingReset(true);
    try {
      const res = await authApi.resetPassword({
        email: forgotEmail.trim(),
        tenantSlug: forgotTenantSlug.trim(),
        otp: resetOtp.trim(),
        newPassword: resetNewPassword
      });
      showToast('success', res.message || 'Şifrəniz uğurla yeniləndi!', 'Şifrə Yeniləndi');
      setIsForgotModalOpen(false);
      setPassword(resetNewPassword);
      setEmail(forgotEmail);
      setTenantSlug(forgotTenantSlug);
    } catch (err: any) {
      showToast('error', err.message || 'Şifrə sıfırlanarkən xəta', 'Xəta');
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <div className="min-h-screen w-screen overflow-x-hidden flex bg-[#08090C] text-white font-sans selection:bg-fuchsia-500/30 selection:text-white">
      {/* Left Side: Ambient Branding & Enterprise Visual */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center p-12 overflow-hidden border-r border-white/10 bg-[#0C0E14]">
        {/* Ambient Halo Glow */}
        <div className="blob-atmosphere -top-20 -left-20 w-96 h-96 opacity-50"></div>
        <div className="blob-atmosphere -bottom-20 -right-20 w-96 h-96 opacity-40"></div>

        <div className="z-10 w-full max-w-xl flex flex-col gap-8 pt-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#D946EF]/10 border border-[#D946EF]/25 w-fit mb-4">
              <span className="w-2 h-2 rounded-full bg-[#D946EF] animate-pulse"></span>
              <span className="text-xs uppercase tracking-widest text-[#D946EF] font-bold">
                Altensor Enterprise Suite
              </span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight mb-3 text-white">
              Şəxsiyyət və Giriş İdarəetməsi
            </h1>
            <p className="text-sm leading-relaxed max-w-md text-slate-400">
              Bütün CRM, Anbar, ERP və Maliyyə mikroservisləriniz üçün mərkəzləşdirilmiş, çox-müştərili (Multi-Tenant) RS256 təhlükəsizlik şlüzü.
            </p>
          </div>

          {/* Frost Card Mockup */}
          <div className="relative w-full rounded-3xl p-5 shadow-2xl backdrop-blur-xl border border-white/10 bg-[#18181B]/80">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#27272A] pb-3">
                <div className="flex items-center gap-2.5">
                  <img
                    src={authLogo}
                    alt="Altensor"
                    className="w-7 h-7 rounded-lg object-contain shadow-md shadow-fuchsia-500/20 shrink-0"
                  />
                  <span className="font-bold text-white text-sm">Altensor Auth Gateway</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  RS256 ONLINE
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                <div className="p-2.5 rounded-xl bg-[#121214] border border-[#27272A]">
                  <span className="text-[#71717A] text-[10px] uppercase font-bold block">İzolyasiya Modeli</span>
                  <span className="text-white font-medium">Multi-Tenant Schema</span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#121214] border border-[#27272A]">
                  <span className="text-[#71717A] text-[10px] uppercase font-bold block">İmzalanma Açarı</span>
                  <span className="text-[#D946EF] font-mono font-bold">2048-bit RSA</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-[420px] flex flex-col gap-6">
          {/* Branding Header */}
          <div className="flex flex-col items-start gap-2">
            <img
              src={authLogo}
              alt="Altensor Auth Gateway"
              className="w-12 h-12 rounded-xl object-contain shadow-lg shadow-fuchsia-500/25 mb-1"
            />
            <h2 className="text-3xl font-bold tracking-tight text-white">Xoş Gəlmisiniz</h2>
            <p className="text-sm text-slate-400">
              Hesabınıza daxil olmaq üçün etimadnamənizi qeyd edin.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full">
            {error && (
              <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-xl border border-red-500/20 font-medium">
                {error}
              </div>
            )}

            {/* Tenant Slug Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-300" htmlFor="tenantSlug">
                Tenant Slug (Şirkət Kodu)
              </label>
              <div className="relative flex items-center h-12 rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-white/50 focus-within:bg-white/[0.07] transition-all">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-lg">
                  domain
                </span>
                <input
                  className="w-full h-full pl-11 pr-4 bg-transparent border-none outline-none font-mono text-sm text-white placeholder:text-slate-500"
                  id="tenantSlug"
                  placeholder="platform və ya company-slug"
                  type="text"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs uppercase tracking-wider font-semibold text-slate-300" htmlFor="email">
                Email Ünvanı
              </label>
              <div className="relative flex items-center h-12 rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-white/50 focus-within:bg-white/[0.07] transition-all">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-lg">
                  mail
                </span>
                <input
                  className="w-full h-full pl-11 pr-4 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500"
                  id="email"
                  placeholder="user@altensor.io"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center w-full">
                <label className="text-xs uppercase tracking-wider font-semibold text-slate-300" htmlFor="password">
                  Şifrə
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(email);
                    setForgotTenantSlug(tenantSlug);
                    setForgotStep('forgot');
                    setIsForgotModalOpen(true);
                  }}
                  className="text-xs text-slate-400 hover:text-white hover:underline font-semibold cursor-pointer transition-colors"
                >
                  Şifrəni unutmusunuz?
                </button>
              </div>
              <div className="relative flex items-center h-12 rounded-xl border border-white/15 bg-white/[0.04] focus-within:border-white/50 focus-within:bg-white/[0.07] transition-all">
                <span className="material-symbols-outlined absolute left-3.5 text-slate-400 text-lg">
                  lock
                </span>
                <input
                  className="w-full h-full pl-11 pr-11 bg-transparent border-none outline-none text-sm text-white placeholder:text-slate-500"
                  id="password"
                  placeholder="••••••••••••"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  className="absolute right-3.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {showPassword ? 'visibility_off' : 'visibility'}
                  </span>
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              disabled={loading}
              className="h-12 w-full btn-primary disabled:opacity-50 rounded-xl text-xs uppercase tracking-wider font-bold shadow-lg transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mt-2"
              type="submit"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin"></span>
                  <span>Daxil olunur...</span>
                </>
              ) : (
                'Daxil Ol'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Forgot / Reset Password Modal */}
      {isForgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1C1C1E] border border-[#2C2C2E] rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-[#27272A] mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#D946EF]/20 text-[#D946EF] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">
                    {forgotStep === 'forgot' ? 'mail' : 'key'}
                  </span>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {forgotStep === 'forgot' ? 'Şifrə Bərpası (OTP)' : 'Yeni Şifrə Təyini'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {forgotStep === 'forgot'
                      ? '6-rəqəmli OTP kod email ünvanınıza göndəriləcək'
                      : 'Kodu və yeni şifrənizi daxil edin'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {forgotStep === 'forgot' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tenant Slug *</label>
                  <input
                    type="text"
                    required
                    value={forgotTenantSlug}
                    onChange={(e) => setForgotTenantSlug(e.target.value)}
                    placeholder="platform və ya company-slug"
                    className="w-full crm-input font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Email Ünvanı *</label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="user@altensor.io"
                    className="w-full crm-input text-sm"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsForgotModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold rounded-xl btn-secondary cursor-pointer"
                  >
                    Ləğv Et
                  </button>
                  <button
                    type="submit"
                    disabled={loadingForgot}
                    className="px-4 py-2 text-xs font-semibold rounded-xl btn-primary cursor-pointer"
                  >
                    {loadingForgot ? 'Göndərilir...' : 'OTP Kodu Göndər'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">6-Rəqəmli OTP Kod *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={resetOtp}
                    onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full crm-input font-mono text-center tracking-widest text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Yeni Şifrə *</label>
                  <input
                    type="password"
                    required
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full crm-input text-sm"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep('forgot')}
                    className="text-xs text-[#D946EF] hover:underline font-semibold cursor-pointer"
                  >
                    ← Geri
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsForgotModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl btn-secondary cursor-pointer"
                    >
                      Ləğv Et
                    </button>
                    <button
                      type="submit"
                      disabled={loadingReset}
                      className="px-4 py-2 text-xs font-semibold rounded-xl btn-primary cursor-pointer"
                    >
                      {loadingReset ? 'Yenilənir...' : 'Şifrəni Təsdiqlə'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
