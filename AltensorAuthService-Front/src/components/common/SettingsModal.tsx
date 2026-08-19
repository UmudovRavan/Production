import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useToast } from '../../context/ToastContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, decodedToken, isSuperAdmin, expiresInSeconds, logoutAll } = useAuth();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();

  const [activeMenu, setActiveMenu] = useState<'profile' | 'preferences' | 'security'>('preferences');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('az');
  const [selectedTimezone, setSelectedTimezone] = useState<string>('Asia/Baku');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  if (!isOpen) return null;

  const displayName = user?.fullName || decodedToken?.payload?.name || decodedToken?.payload?.email || 'System Admin';
  const email = user?.email || decodedToken?.payload?.email || 'admin@altensor.io';
  const tenantSlug = user?.tenantSlug || decodedToken?.payload?.tenant_slug || 'platform';
  const roleName = Array.isArray(decodedToken?.payload?.role)
    ? decodedToken.payload.role.join(', ')
    : decodedToken?.payload?.role || (isSuperAdmin ? 'PlatformSuperAdmin' : 'TenantAdmin');
  const avatarInitial = displayName.charAt(0).toUpperCase();

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m} dəq ${s < 10 ? '0' : ''}${s} san`;
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      showToast('warning', 'Yeni şifrə ən azı 6 simvol olmalıdır', 'Xəbərdarlıq');
      return;
    }
    showToast('success', 'Şifrə uğurla dəyişdirildi!', 'Uğurlu');
    setIsChangingPassword(false);
    setOldPassword('');
    setNewPassword('');
  };

  const handleLogoutAll = async () => {
    if (!window.confirm('Bütün digər cihazlardakı aktiv sessiyaları ləğv etmək istəyirsiniz?')) return;
    setLoggingOutAll(true);
    try {
      await logoutAll();
      onClose();
    } finally {
      setLoggingOutAll(false);
    }
  };

  // Dynamic modal color tokens based on active theme
  const isLight = theme === 'light';
  const isMidnight = theme === 'midnight';

  const modalBg = isLight ? 'bg-white' : isMidnight ? 'bg-[#0F172A]' : 'bg-[#18181B]';
  const sidebarBg = isLight ? 'bg-[#F8FAFC]' : isMidnight ? 'bg-[#0B0F19]' : 'bg-[#141417]';
  const borderColor = isLight ? 'border-[#E2E8F0]' : isMidnight ? 'border-[#1E293B]' : 'border-[#27272A]';
  const textTitle = isLight ? 'text-[#0F172A]' : 'text-white';
  const textSub = isLight ? 'text-[#64748B]' : 'text-[#71717A]';
  const activeNavBg = isLight ? 'bg-[#E2E8F0] text-[#0F172A]' : 'bg-[#2A2F3D] text-white';
  const inputBg = isLight ? 'bg-white border-[#CBD5E1] text-[#0F172A]' : isMidnight ? 'bg-[#0B1120] border-[#1E293B] text-white' : 'bg-[#141417] border-[#27272A] text-white';
  const cardOuterBg = isLight ? 'bg-[#F1F5F9]' : isMidnight ? 'bg-[#0E1526]' : 'bg-[#161619]';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className={`${modalBg} ${borderColor} border rounded-2xl shadow-2xl w-full max-w-4xl h-[560px] max-h-[90vh] overflow-hidden flex animate-in zoom-in-95 duration-150 relative select-none transition-colors duration-200`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Right Close Button */}
        <button
          onClick={onClose}
          className={`absolute top-5 right-5 ${textSub} hover:${textTitle} p-1 rounded-lg hover:bg-white/[0.06] transition-colors z-20 cursor-pointer`}
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        {/* 1. LEFT SETTINGS SIDEBAR */}
        <aside className={`w-60 ${sidebarBg} ${borderColor} border-r p-4 flex flex-col justify-between overflow-y-auto shrink-0 transition-colors duration-200`}>
          <div className="space-y-6 text-[11px]">
            {/* Group 1: İSTİFADƏÇİ KONFİQURASİYASI */}
            <div>
              <span className={`text-[10px] font-bold ${textSub} uppercase tracking-wider px-2 block mb-1.5`}>
                İstifadəçi Konfiqurasiyası
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveMenu('profile')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeMenu === 'profile'
                      ? `${activeNavBg} font-semibold shadow-xs`
                      : `${textSub} hover:bg-white/[0.04] hover:${textTitle}`
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-white/10 text-current flex items-center justify-center text-[10px] font-bold shrink-0">
                    {avatarInitial}
                  </div>
                  <span>Profil</span>
                </button>

                <button
                  onClick={() => setActiveMenu('preferences')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeMenu === 'preferences'
                      ? `${activeNavBg} font-semibold shadow-xs`
                      : `${textSub} hover:bg-white/[0.04] hover:${textTitle}`
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">tune</span>
                  <span>Tərcihlər</span>
                </button>
              </div>
            </div>

            {/* Group 2: TƏHLÜKƏSİZLİK VƏ SESSİYA */}
            <div>
              <span className={`text-[10px] font-bold ${textSub} uppercase tracking-wider px-2 block mb-1.5`}>
                Təhlükəsizlik &amp; Giriş
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveMenu('security')}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                    activeMenu === 'security'
                      ? `${activeNavBg} font-semibold shadow-xs`
                      : `${textSub} hover:bg-white/[0.04] hover:${textTitle}`
                  }`}
                >
                  <span className="material-symbols-outlined text-[17px]">security</span>
                  <span>Sessiyalar &amp; Token</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* 2. RIGHT MAIN SETTINGS CONTENT */}
        <main className="flex-1 p-8 overflow-y-auto custom-scrollbar">
          {/* TAB 1: PROFİL */}
          {activeMenu === 'profile' && (
            <div className="max-w-xl space-y-7 animate-in fade-in duration-150">
              {/* Header */}
              <div>
                <h2 className={`text-xl font-bold ${textTitle} tracking-tight`}>Profil</h2>
                <p className={`text-xs ${textSub} mt-1`}>
                  Profil və giriş məlumatlarınızı idarə edin.
                </p>
              </div>

              {/* Avatar & User Info */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-slate-800 text-[#D946EF] font-bold text-xl flex items-center justify-center border border-[#3A3A42] shrink-0 shadow-md">
                  {avatarInitial}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-base font-bold ${textTitle}`}>{displayName}</span>
                    <button
                      onClick={() => showToast('info', 'Profil redaktəsi üçün adminlə əlaqə saxlayın', 'Məlumat')}
                      className={`${textSub} hover:${textTitle} transition-colors`}
                      title="Redaktə et"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                  </div>
                  <span className={`text-xs ${textSub} block font-mono`}>{email}</span>
                </div>
              </div>

              {/* Section: Hesab Məlumatları & Təhlükəsizlik */}
              <div className="space-y-4 pt-1">
                <h3 className={`text-xs font-bold ${textTitle} uppercase tracking-wider`}>
                  Hesab Məlumatları &amp; Təhlükəsizlik
                </h3>

                {/* Row 1: E-poçtlar & İmza */}
                <div className={`flex items-center justify-between py-3 border-b ${borderColor}`}>
                  <div>
                    <span className={`text-xs font-bold ${textTitle} block`}>E-poçtlar &amp; İmza</span>
                    <span className={`text-xs ${textSub} mt-0.5 block`}>
                      Yazışmalar üçün e-poçt imzanızı tənzimləyin.
                    </span>
                  </div>
                  <button
                    onClick={() => showToast('info', 'E-poçt imzanız avtomatik autentifikasiya olunur', 'E-poçt')}
                    className="px-4 py-1.5 btn-secondary text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Quraşdır
                  </button>
                </div>

                {/* Row 2: Şifrə */}
                <div className={`flex items-center justify-between py-3 border-b ${borderColor}`}>
                  <div>
                    <span className={`text-xs font-bold ${textTitle} block`}>Şifrə</span>
                    <span className={`text-xs ${textSub} mt-0.5 block`}>
                      Təhlükəsizlik üçün hesabınızın şifrəsini dəyişin.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="px-4 py-1.5 btn-secondary text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Şifrəni Dəyiş
                  </button>
                </div>

                {/* Change Password Form (if expanded) */}
                {isChangingPassword && (
                  <form onSubmit={handlePasswordSubmit} className={`p-4 ${cardOuterBg} ${borderColor} border rounded-xl space-y-3 animate-in fade-in`}>
                    <div>
                      <label className={`block text-xs font-semibold ${textTitle} mb-1`}>Cari Şifrə</label>
                      <input
                        type="password"
                        required
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full crm-input text-xs"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-semibold ${textTitle} mb-1`}>Yeni Şifrə</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full crm-input text-xs"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsChangingPassword(false)}
                        className="px-3 py-1.5 text-xs btn-secondary rounded-lg"
                      >
                        Ləğv et
                      </button>
                      <button type="submit" className="px-3 py-1.5 text-xs btn-primary rounded-lg">
                        Saxla
                      </button>
                    </div>
                  </form>
                )}

                {/* Row 3: Tenant & Role Info */}
                <div className="flex items-center justify-between py-3">
                  <div>
                    <span className={`text-xs font-bold ${textTitle} block`}>Təşkilat və Rol</span>
                    <span className={`text-xs ${textSub} mt-0.5 block`}>
                      @{tenantSlug} təşkilatında <span className="text-[#D946EF] font-semibold">{roleName}</span> rolu
                    </span>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold rounded-full">
                    Aktiv
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TƏRCİHLƏR */}
          {activeMenu === 'preferences' && (
            <div className="max-w-xl space-y-7 animate-in fade-in duration-150">
              {/* Header */}
              <div>
                <h2 className={`text-xl font-bold ${textTitle} tracking-tight`}>Tərcihlər</h2>
                <p className={`text-xs ${textSub} mt-1`}>
                  Tətbiqdən istifadə tərzinizi tənzimləyin.
                </p>
              </div>

              {/* Section 1: Görünüş & Tema */}
              <div className="space-y-3.5">
                <div>
                  <h3 className={`text-xs font-bold ${textTitle} block`}>Görünüş &amp; Tema</h3>
                  <span className={`text-xs ${textSub} mt-0.5 block`}>
                    Açıq, qaranlıq və gecə mavisi temaları arasında keçid edin
                  </span>
                </div>

                {/* 3 THEME CARDS (Altensor CRM 1:1 Isolated Theme Previews) */}
                <div className="grid grid-cols-3 gap-3 pt-1">
                  {/* Theme 1: Açıq (Light) */}
                  <div
                    onClick={() => setTheme('light')}
                    className={`rounded-2xl border transition-all cursor-pointer p-3 flex flex-col justify-between ${
                      theme === 'light'
                        ? 'border-[#D946EF] bg-[#F1F5F9] dark:bg-[#222228] ring-2 ring-[#D946EF]/40 shadow-xl'
                        : `${cardOuterBg} ${borderColor} hover:border-[#CBD5E1] dark:hover:border-[#40404C]`
                    }`}
                  >
                    {/* Fixed Isolated Mini Window Preview */}
                    <div
                      style={{ backgroundColor: '#FFFFFF', borderColor: '#E2E8F0' }}
                      className="w-full h-18 rounded-xl border p-2 flex flex-col justify-between mb-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-1">
                        <div style={{ backgroundColor: '#EF4444' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#F59E0B' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#10B981' }} className="w-1.5 h-1.5 rounded-full"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div style={{ backgroundColor: '#D946EF' }} className="w-3.5 h-3.5 rounded flex items-center justify-center shadow-xs">
                          <span style={{ color: '#FFFFFF' }} className="text-[7px] font-bold">▼</span>
                        </div>
                        <span style={{ color: '#0F172A' }} className="text-[10px] font-bold leading-none">AUTH</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-0.5">
                      <span className={`text-xs font-medium ${theme === 'light' ? 'font-bold text-[#D946EF]' : textTitle}`}>
                        Açıq (Light)
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          theme === 'light' ? 'border-[#D946EF] bg-[#D946EF]' : 'border-[#94A3B8] dark:border-[#4A4A56]'
                        }`}
                      >
                        {theme === 'light' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>

                  {/* Theme 2: Qaranlıq (Dark) */}
                  <div
                    onClick={() => setTheme('dark')}
                    className={`rounded-2xl border transition-all cursor-pointer p-3 flex flex-col justify-between ${
                      theme === 'dark'
                        ? 'border-[#D946EF] bg-[#F1F5F9] dark:bg-[#222228] ring-2 ring-[#D946EF]/40 shadow-xl'
                        : `${cardOuterBg} ${borderColor} hover:border-[#CBD5E1] dark:hover:border-[#40404C]`
                    }`}
                  >
                    {/* Fixed Isolated Mini Window Preview */}
                    <div
                      style={{ backgroundColor: '#18181B', borderColor: '#27272A' }}
                      className="w-full h-18 rounded-xl border p-2 flex flex-col justify-between mb-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-1">
                        <div style={{ backgroundColor: '#EF4444' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#F59E0B' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#10B981' }} className="w-1.5 h-1.5 rounded-full"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div style={{ backgroundColor: '#D946EF' }} className="w-3.5 h-3.5 rounded flex items-center justify-center shadow-xs">
                          <span style={{ color: '#FFFFFF' }} className="text-[7px] font-bold">▼</span>
                        </div>
                        <span style={{ color: '#FFFFFF' }} className="text-[10px] font-bold leading-none">AUTH</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-0.5">
                      <span className={`text-xs font-medium ${theme === 'dark' ? 'font-bold text-[#D946EF]' : textTitle}`}>
                        Qaranlıq (Dark)
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          theme === 'dark' ? 'border-[#D946EF] bg-[#D946EF]' : 'border-[#94A3B8] dark:border-[#4A4A56]'
                        }`}
                      >
                        {theme === 'dark' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>

                  {/* Theme 3: Gecə Mavisi (Midnight Blue) */}
                  <div
                    onClick={() => setTheme('midnight')}
                    className={`rounded-2xl border transition-all cursor-pointer p-3 flex flex-col justify-between ${
                      theme === 'midnight'
                        ? 'border-[#D946EF] bg-[#F1F5F9] dark:bg-[#1A2642] ring-2 ring-[#D946EF]/40 shadow-xl'
                        : `${cardOuterBg} ${borderColor} hover:border-[#CBD5E1] dark:hover:border-[#334155]`
                    }`}
                  >
                    {/* Fixed Isolated Mini Window Preview */}
                    <div
                      style={{ backgroundColor: '#0B0F19', borderColor: '#1E293B' }}
                      className="w-full h-18 rounded-xl border p-2 flex flex-col justify-between mb-2.5 shadow-sm"
                    >
                      <div className="flex items-center gap-1">
                        <div style={{ backgroundColor: '#EF4444' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#F59E0B' }} className="w-1.5 h-1.5 rounded-full"></div>
                        <div style={{ backgroundColor: '#10B981' }} className="w-1.5 h-1.5 rounded-full"></div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div style={{ backgroundColor: '#D946EF' }} className="w-3.5 h-3.5 rounded flex items-center justify-center shadow-xs">
                          <span style={{ color: '#FFFFFF' }} className="text-[7px] font-bold">▼</span>
                        </div>
                        <span style={{ color: '#FFFFFF' }} className="text-[10px] font-bold leading-none">AUTH</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-0.5">
                      <span className={`text-xs font-medium ${theme === 'midnight' ? 'font-bold text-[#D946EF]' : textTitle}`}>
                        Gecə Mavisi (Midnight Blue)
                      </span>
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          theme === 'midnight' ? 'border-[#D946EF] bg-[#D946EF]' : 'border-[#94A3B8] dark:border-[#4A4A56]'
                        }`}
                      >
                        {theme === 'midnight' && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Dil və Saat Qurşağı */}
              <div className={`space-y-4 pt-3 border-t ${borderColor}`}>
                <h3 className={`text-xs font-bold ${textTitle} uppercase tracking-wider`}>
                  Dil və Saat Qurşağı
                </h3>

                {/* Row 1: İnterfeys Dili */}
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <span className={`text-xs font-bold ${textTitle} block`}>İnterfeys Dili</span>
                    <span className={`text-xs ${textSub} mt-0.5 block`}>
                      Tətbiqin göstərilmə dilini seçin.
                    </span>
                  </div>
                  <div className="relative w-56">
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className={`w-full ${inputBg} border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer appearance-none pr-8 transition-colors`}
                    >
                      <option value="az">az Azərbaycan dili (Default)</option>
                      <option value="en">en English (US)</option>
                      <option value="ru">ru Русский</option>
                    </select>
                    <span className={`material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 ${textSub} text-sm pointer-events-none`}>
                      expand_more
                    </span>
                  </div>
                </div>

                {/* Row 2: Saat Qurşağı */}
                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <span className={`text-xs font-bold ${textTitle} block`}>Saat Qurşağı</span>
                    <span className={`text-xs ${textSub} mt-0.5 block`}>
                      Tətbiq üçün saat qurşağını dəyişin.
                    </span>
                  </div>
                  <div className="relative w-56">
                    <select
                      value={selectedTimezone}
                      onChange={(e) => setSelectedTimezone(e.target.value)}
                      className={`w-full ${inputBg} border rounded-xl px-3 py-2 text-xs outline-none cursor-pointer appearance-none pr-8 transition-colors`}
                    >
                      <option value="Asia/Baku">Asia/Baku (GMT+4)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="Europe/Istanbul">Europe/Istanbul (GMT+3)</option>
                      <option value="America/New_York">America/New_York (EST)</option>
                    </select>
                    <span className={`material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 ${textSub} text-sm pointer-events-none`}>
                      expand_more
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TƏHLÜKƏSİZLİK & SESSİYA */}
          {activeMenu === 'security' && (
            <div className="max-w-xl space-y-7 animate-in fade-in duration-150">
              <div>
                <h2 className={`text-xl font-bold ${textTitle} tracking-tight`}>Sessiyalar &amp; Token</h2>
                <p className={`text-xs ${textSub} mt-1`}>
                  JWT Token və aktiv təhlükəsizlik sessiyalarınızın idarə edilməsi.
                </p>
              </div>

              <div className={`p-4 ${cardOuterBg} ${borderColor} border rounded-xl space-y-3 text-xs`}>
                <div className="flex justify-between items-center py-1">
                  <span className={textSub}>Qalan Token Müddəti:</span>
                  <span className="font-mono font-bold text-[#D946EF]">
                    {expiresInSeconds > 0 ? formatSeconds(expiresInSeconds) : 'Bitib'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className={textSub}>İmza Alqoritmi:</span>
                  <span className="font-mono text-emerald-400 font-bold">RS256 (2048-bit RSA)</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className={textSub}>Token Rotation &amp; Revocation:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">check_circle</span> Aktiv
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleLogoutAll}
                  disabled={loggingOutAll}
                  className="w-full py-2.5 px-4 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-base">logout</span>
                  {loggingOutAll ? 'Ləğv olunur...' : 'Bütün Cihazlardakı Aktiv Sessiyaları Bağla'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default SettingsModal;
