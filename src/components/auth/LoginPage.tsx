import React, { useState, useEffect } from 'react';
import { 
  Flame, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, Globe, Shield,
  ShieldAlert, Sparkles, Loader2, X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { checkSetupStatus, bootstrapSuperAdmin } from '../../lib/adminUsersApi';

export const LoginPage: React.FC = () => {
  const { signInWithEmail, isLoading, loginError, clearError } = useAuth();
  const { language, toggleLanguage, isRTL } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  // Initial Super Admin Setup state (Active only when 0 Super Admins exist)
  const [isSetupRequired, setIsSetupRequired] = useState<boolean>(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);
  const [setupFullName, setSetupFullName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupDepartment, setSetupDepartment] = useState('Executive Management');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    checkSetupStatus().then((res) => {
      setIsSetupRequired(res.setupRequired);
    });
  }, []);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupFullName.trim() || !setupEmail.trim() || !setupPassword) return;
    if (setupPassword.length < 8) {
      setSetupError('Password must be at least 8 characters long.');
      return;
    }

    setIsSettingUp(true);
    setSetupError(null);

    const res = await bootstrapSuperAdmin({
      fullName: setupFullName,
      email: setupEmail,
      password: setupPassword,
      department: setupDepartment
    });

    if (res.success) {
      setIsSetupRequired(false);
      setIsSetupModalOpen(false);
      // Auto login
      await signInWithEmail(setupEmail, setupPassword);
    } else {
      setSetupError(res.error || 'Failed to initialize Super Admin.');
    }
    setIsSettingUp(false);
  };

  // Rate-limiting / brute-force protection
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  useEffect(() => {
    if (lockoutTimer <= 0) return;
    const interval = setInterval(() => {
      setLockoutTimer(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutTimer > 0) return;
    if (!email.trim() || !password) return;

    const res = await signInWithEmail(email, password);
    if (!res.success) {
      const updatedCount = failedAttempts + 1;
      setFailedAttempts(updatedCount);
      if (updatedCount >= 5) {
        setLockoutTimer(60);
        setFailedAttempts(0);
      }
    } else {
      setFailedAttempts(0);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-[#081a44] via-[#0d2870] to-[#061233] relative overflow-hidden select-none">
      {/* Subtle Ambient Background Lighting */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Login Container Card (Strict Left-Hero, Right-Form as in reference) */}
      <div className="relative w-full max-w-4xl lg:max-w-5xl bg-white rounded-2xl md:rounded-3xl shadow-2xl shadow-blue-950/60 overflow-hidden flex flex-col md:flex-row border border-white/10 z-10 [direction:ltr]">
        
        {/* ======================================================== */}
        {/* LEFT COLUMN: HERO, BRAND & VECTOR ILLUSTRATION (54%)    */}
        {/* ======================================================== */}
        <div className="w-full md:w-[54%] bg-gradient-to-br from-[#1b52cf] via-[#1444b3] to-[#0a287a] p-8 sm:p-10 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden [direction:ltr]">
          
          {/* Subtle Radial Highlight behind Illustration */}
          <div className="absolute top-1/3 right-10 w-72 h-72 bg-sky-400/20 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-36 bg-gradient-to-t from-[#061c57]/80 to-transparent pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 flex items-center justify-between [direction:ltr]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center shadow-md shadow-amber-400/20 font-black">
                <Flame className="w-5 h-5 fill-current" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">Noor</span>
                <span className="text-lg font-bold tracking-tight text-sky-200">Fleet</span>
                <span className="w-2 h-2 rounded-full bg-[#ff5266] inline-block shadow-xs shadow-rose-500/50" />
              </div>
            </div>
          </div>

          {/* Center Content: Headline & Slogan */}
          <div className="relative z-10 my-6 sm:my-8">
            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold tracking-tight leading-tight">
              Decide faster
              <span className="block text-sky-300 font-extrabold mt-0.5">
                so you can do more
              </span>
            </h1>
            <p className="mt-3 text-xs sm:text-sm text-blue-100/80 max-w-md font-medium leading-relaxed">
              {isRTL 
                ? 'منظومة متكاملة لإدارة أسطول نقل الوقود، الصيانة الوقائية، وتتبع الرحلات المباشر بدقة استثنائية.'
                : 'Intelligent fuel fleet operations, live telemetry, predictive maintenance, and seamless workshop logistics.'}
            </p>
          </div>

          {/* High-Fidelity Custom Vector Illustration (matching reference) */}
          <div className="relative z-10 w-full flex items-end justify-center pt-2 pb-4">
            <svg
              className="w-full max-w-[360px] h-auto drop-shadow-lg"
              viewBox="0 0 460 280"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Gradients */}
                <linearGradient id="arrowGrad" x1="280" y1="210" x2="430" y2="70" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#3b82f6" stopOpacity="0.8" />
                  <stop offset="0.6" stopColor="#60a5fa" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#93c5fd" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="manBlazer" x1="160" y1="120" x2="250" y2="240" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#4f46e5" />
                  <stop offset="1" stopColor="#3730a3" />
                </linearGradient>
                <linearGradient id="womanTop" x1="100" y1="120" x2="135" y2="180" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#ff647c" />
                  <stop offset="1" stopColor="#e11d48" />
                </linearGradient>
                <linearGradient id="womanPants" x1="100" y1="180" x2="135" y2="280" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#06b6d4" />
                  <stop offset="1" stopColor="#0891b2" />
                </linearGradient>
                <linearGradient id="checkGlow" x1="140" y1="130" x2="180" y2="170" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#34d399" />
                  <stop offset="1" stopColor="#10b981" />
                </linearGradient>
              </defs>

              {/* Background Ground Horizon Line */}
              <path d="M10 270 Q230 255 450 270" stroke="#1e3a8a" strokeWidth="2" strokeDasharray="4 4" opacity="0.6" />
              
              {/* Dynamic Upward Direction Arrow */}
              <g opacity="0.85">
                <path d="M280 180 L400 68" stroke="url(#arrowGrad)" strokeWidth="6" strokeLinecap="round" />
                {/* Arrow Head */}
                <path d="M375 64 L404 64 L404 93" fill="none" stroke="#93c5fd" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                {/* Velocity trails */}
                <path d="M300 205 L370 135" stroke="#60a5fa" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" strokeDasharray="6 4" />
                <path d="M320 220 L350 190" stroke="#93c5fd" strokeWidth="2" strokeLinecap="round" opacity="0.4" />
              </g>

              {/* Sparkle & Accent Dots */}
              <circle cx="415" cy="45" r="3" fill="#67e8f9" />
              <circle cx="430" cy="55" r="2" fill="#ffffff" />
              <circle cx="280" cy="70" r="3" fill="#fbbf24" />
              <path d="M390 100 L394 104 M394 100 L390 104" stroke="#ffffff" strokeWidth="2" opacity="0.7" />

              {/* ======================================================== */}
              {/* LEFT FIGURE: WOMAN IN CORAL & TEAL HOLDING CHECKMARK     */}
              {/* ======================================================== */}
              <g id="woman">
                {/* Head & Hair */}
                <ellipse cx="112" cy="115" rx="14" ry="16" fill="#fbcfe8" />
                {/* Dark Sleek Hair */}
                <path d="M100 115 C100 95 125 95 125 110 C125 115 123 125 120 130 C114 125 110 120 105 123 C101 125 99 120 100 115 Z" fill="#0f172a" />
                <ellipse cx="103" cy="120" rx="3" ry="5" fill="#0f172a" />

                {/* Torso: Coral Sleeveless Top */}
                <path d="M104 132 C110 130 118 130 122 132 L127 182 C120 185 106 185 101 182 Z" fill="url(#womanTop)" />

                {/* Legs: Teal Trousers */}
                <path d="M102 182 L106 270 C108 274 114 274 115 270 L118 200 L121 270 C123 274 128 274 130 270 L126 182 Z" fill="url(#womanPants)" />

                {/* Shoes */}
                <ellipse cx="110" cy="272" rx="6" ry="2.5" fill="#0f172a" />
                <ellipse cx="125" cy="272" rx="6" ry="2.5" fill="#0f172a" />

                {/* Left Arm holding glowing checkmark forward */}
                <path d="M118 140 Q135 150 152 145" stroke="#fbcfe8" strokeWidth="7" strokeLinecap="round" />
                
                {/* Luminous Green Checkmark Icon in her hand */}
                <g transform="translate(152, 130)">
                  <circle cx="16" cy="16" r="16" fill="#10b981" fillOpacity="0.25" />
                  <circle cx="16" cy="16" r="12" fill="url(#checkGlow)" />
                  <path d="M10 16 L14 20 L22 12" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </g>

              {/* ======================================================== */}
              {/* RIGHT FIGURE: MAN IN PURPLE BLAZER & YELLOW TROUSERS      */}
              {/* ======================================================== */}
              <g id="man">
                {/* Head */}
                <circle cx="205" cy="110" r="15" fill="#fde047" fillOpacity="0.3" />
                <circle cx="205" cy="110" r="13" fill="#fed7aa" />
                {/* Hair */}
                <path d="M195 106 C195 94 216 94 216 104 C216 108 214 112 212 114 C205 110 197 110 195 106 Z" fill="#1e1b4b" />

                {/* Torso: Purple-Blue Blazer */}
                <path d="M188 126 C198 123 216 123 228 126 L238 210 C225 214 195 214 182 210 Z" fill="url(#manBlazer)" />
                {/* Inner Shirt Collar */}
                <path d="M205 125 L210 140 L200 140 Z" fill="#ffffff" />

                {/* Left arm by side */}
                <path d="M188 135 Q178 165 174 195" stroke="url(#manBlazer)" strokeWidth="10" strokeLinecap="round" />
                <circle cx="173" cy="200" r="5" fill="#fed7aa" />

                {/* Right arm dynamically raised pointing upward */}
                <path d="M225 135 Q250 115 285 75" stroke="url(#manBlazer)" strokeWidth="11" strokeLinecap="round" />
                {/* White Cuff */}
                <path d="M280 82 L286 74" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                {/* Hand pointing */}
                <path d="M286 74 Q292 68 296 66" stroke="#fed7aa" strokeWidth="6" strokeLinecap="round" />

                {/* Yellow Trousers */}
                <path d="M185 210 L190 270 C192 274 199 274 201 270 L210 225 L219 270 C221 274 228 274 230 270 L235 210 Z" fill="#f59e0b" />
                {/* Belt / trim */}
                <rect x="186" y="208" width="48" height="4" fill="#d97706" rx="2" />

                {/* Shoes */}
                <ellipse cx="196" cy="272" rx="7" ry="3" fill="#0f172a" />
                <ellipse cx="225" cy="272" rx="7" ry="3" fill="#0f172a" />
              </g>
            </svg>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: LOGIN FORM (46%)                          */}
        {/* ======================================================== */}
        <div className={`w-full md:w-[46%] bg-white p-8 sm:p-10 lg:p-12 flex flex-col justify-between ${isRTL ? '[direction:rtl] text-right' : '[direction:ltr] text-left'}`}>
          <div>
            {/* Top Toolbar: Language Switcher */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                <span>SSL 256-bit Encrypted</span>
              </div>

              {/* Language Switcher Button */}
              <button
                type="button"
                onClick={toggleLanguage}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition shadow-2xs"
                title="Change Language"
              >
                <Globe className="w-3 h-3 text-sky-600" />
                <span>{language === 'en' ? 'العربية' : 'English'}</span>
              </button>
            </div>

            {/* Headline: "Log in" (Styled matching reference) */}
            <div className="mb-6">
              <h2 className="text-3xl sm:text-[34px] font-extrabold tracking-tight text-slate-900 leading-none">
                {isRTL ? (
                  <>تسجيل <span className="text-sky-500">الدخول</span></>
                ) : (
                  <>Log <span className="text-sky-500">in</span></>
                )}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-2">
                {isRTL
                  ? 'أهلاً بك مجدداً. أدخل بيانات حسابك للوصول إلى لوحة التحكم والعمليات.'
                  : 'Welcome back. Enter your verified enterprise credentials to continue.'}
              </p>
            </div>

            {/* First-Time System Setup Banner (Shown ONLY when 0 Super Admins exist) */}
            {isSetupRequired && (
              <div className="mb-5 p-3.5 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 border-2 border-amber-400/80 rounded-2xl shadow-xs animate-pulse">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                      {isRTL ? 'تهيئة النظام لأول مرة مطلوبة' : 'Initial Super Admin Setup Required'}
                    </h4>
                    <p className="text-[11px] text-amber-900 font-medium mt-0.5 leading-snug">
                      {isRTL
                        ? 'لم يتم تسجيل أي حساب مشرف أعلى (Super Admin). اضغط أدناه لإنشاء حساب المشرف وتفعيل النظام.'
                        : 'No Super Admin account exists in the database. Initialize your primary master account to activate the system.'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsSetupModalOpen(true)}
                      className="mt-2.5 w-full py-2 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>{isRTL ? 'إنشاء حساب المشرف الأعلى الآن' : 'Initialize Super Admin Account'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {loginError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start justify-between gap-2 animate-fade-in">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span className="font-medium">{loginError}</span>
                </div>
                <button
                  type="button"
                  onClick={clearError}
                  className="text-rose-500 hover:text-rose-800 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {isRTL ? 'البريد الإلكتروني' : 'E-mail'}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                  />
                  <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 rtl:right-auto rtl:left-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    {isRTL ? 'كلمة المرور' : 'Password'}
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-[11px] font-semibold text-slate-400 hover:text-sky-600 transition"
                  >
                    {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 rtl:right-auto rtl:left-3 top-2.5 text-slate-400 hover:text-slate-600 transition"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Rate-limiting warning if locked out */}
              {lockoutTimer > 0 && (
                <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>
                    {isRTL
                      ? `تم قفل محاولات الدخول مؤقتاً لأسباب أمنية. يرجى الانتظار ${lockoutTimer} ثانية.`
                      : `Too many failed attempts. Login temporarily locked for ${lockoutTimer}s.`}
                  </span>
                </div>
              )}

              {/* Submit Button (Coral Red Gradient matching reference) */}
              <button
                type="submit"
                disabled={isLoading || lockoutTimer > 0}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-white text-xs sm:text-sm bg-gradient-to-r from-[#ff5266] to-[#f43f5e] hover:from-[#f43f5e] hover:to-[#e11d48] transition-all duration-200 shadow-md shadow-rose-500/30 active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isRTL ? 'جاري التحقق...' : 'Signing in...'}</span>
                  </span>
                ) : lockoutTimer > 0 ? (
                  <span>{isRTL ? `مقفل (${lockoutTimer} ثانية)` : `Locked (${lockoutTimer}s)`}</span>
                ) : (
                  <span>{isRTL ? 'دخول' : 'Log In'}</span>
                )}
              </button>
            </form>
          </div>

          {/* Enterprise Security Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>
                {isRTL 
                  ? 'تسجيل دخول مشفّر ومحمي بصلاحيات الوصول المعتمدة (RBAC).' 
                  : 'Encrypted corporate access with verified Role-Based Access Control (RBAC).'}
              </span>
            </div>

            {/* Public Driver Issue Reporting Portal Link (No Login Required) */}
            <div className="pt-1">
              <a
                href="/driver-report"
                className="w-full py-2 px-3 rounded-xl border border-amber-300/90 bg-amber-50/80 hover:bg-amber-100/90 text-amber-950 text-xs font-extrabold flex items-center justify-between transition shadow-2xs"
              >
                <span>
                  {isRTL
                    ? 'هل أنت سائق؟ أبلغ عن عطل في المركبة (بدون تسجيل دخول)'
                    : 'Driver? Report a Vehicle Issue (No Login Required)'}
                </span>
                <ArrowRight className={`w-3.5 h-3.5 text-amber-700 shrink-0 ${isRTL ? 'rotate-180' : ''}`} />
              </a>
            </div>
          </div>

            {/* Bottom Footer Details */}
            <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span>{isRTL ? 'تحتاج إلى صلاحيات؟ تواصل مع الإدارة' : 'Need access? Contact Admin'}</span>
              <span className="font-semibold text-slate-600">Al-Noor United Est.</span>
            </div>
          </div>
        </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900">
              {isRTL ? 'استعادة كلمة المرور' : 'Reset Password'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {isRTL 
                ? 'أدخل بريدك الإلكتروني المؤسسي وسيقوم مدير النظام بإرسال رابط الاستعادة.'
                : 'Enter your enterprise email to request a reset link from your system administrator.'}
            </p>

            {forgotPasswordSubmitted ? (
              <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  {isRTL 
                    ? 'تم إرسال الطلب بنجاح إلى مشرف النظام.' 
                    : 'Password reset request submitted successfully.'}
                </span>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (forgotEmail.trim()) {
                      setForgotPasswordSubmitted(true);
                    }
                  }}
                  className="w-full py-2 bg-sky-600 text-white font-bold rounded-lg text-xs hover:bg-sky-500 transition"
                >
                  {isRTL ? 'إرسال الطلب' : 'Send Reset Link'}
                </button>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotPasswordSubmitted(false);
                  setForgotEmail('');
                }}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* First-Time Super Admin Setup Modal */}
      {isSetupModalOpen && isSetupRequired && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in [direction:ltr]">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-400/20">
                  <Shield className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Initialize Super Admin Account</h3>
                  <p className="text-[11px] text-amber-800 font-bold">One-Time System Activation</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-950 text-[11px] leading-relaxed">
              <strong>Security Protocol:</strong> This master account has full authority over the fleet system and database. Once this first Super Admin is provisioned, this registration wizard will be permanently locked for all future visitors.
            </div>

            {setupError && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{setupError}</span>
              </div>
            )}

            <form onSubmit={handleSetupSubmit} className="mt-4 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faisal Al-Noor"
                  value={setupFullName}
                  onChange={(e) => setSetupFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Corporate Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. admin@alnoortransport.com"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Master Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={setupDepartment}
                  onChange={(e) => setSetupDepartment(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettingUp}
                  className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating System...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Activate & Sign In</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
