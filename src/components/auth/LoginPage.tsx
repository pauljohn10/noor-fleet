import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { checkSetupStatus, bootstrapSuperAdmin } from '../../lib/adminUsersApi';
import { DESIGN_TOKENS } from '../../lib/designTokens';

const T = DESIGN_TOKENS;

export const LoginPage: React.FC = () => {
  const { signInWithEmail, isLoading, loginError, clearError } = useAuth();
  const { language, toggleLanguage, isRTL } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotPasswordSubmitted, setForgotPasswordSubmitted] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  const [isContactAdminOpen, setIsContactAdminOpen] = useState(false);

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
      setSetupError(
        isRTL
          ? 'يجب أن تتكون كلمة المرور من 8 أحرف على الأقل.'
          : 'Password must be at least 8 characters long.'
      );
      return;
    }

    setIsSettingUp(true);
    setSetupError(null);

    const res = await bootstrapSuperAdmin({
      fullName: setupFullName,
      email: setupEmail,
      password: setupPassword,
      department: setupDepartment,
    });

    if (res.success) {
      setIsSetupRequired(false);
      setIsSetupModalOpen(false);
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
      setLockoutTimer((prev) => Math.max(0, prev - 1));
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

  const fontStack = isRTL ? T.fonts.arabic : T.fonts.ui;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="nf-login-split"
      style={{ fontFamily: fontStack, color: T.colors.ink }}
    >
      {/* ================================================================= */}
      {/* FORM PANEL (Paper #F4F1EA)                                        */}
      {/* ================================================================= */}
      <main
        className="nf-login-form-panel"
        style={{ textAlign: isRTL ? 'right' : 'left' }}
      >
        {/* Top Bar: Plate-style Brand Mark + Language Toggle */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            gap: 16,
          }}
        >
          {/* Brand Mark */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div
              dir="ltr"
              style={{
                display: 'inline-flex',
                alignItems: 'stretch',
                background: T.colors.surface,
                border: `1.5px solid ${T.colors.ink}`,
                borderRadius: T.radius,
                overflow: 'hidden',
                height: 28,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  background: T.colors.accent,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: T.fonts.mono,
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: '0.06em',
                  color: T.colors.ink,
                  padding: '0 8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                }}
              >
                NF
              </span>
            </div>
            <span
              style={{
                fontFamily: T.fonts.brand,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                color: T.colors.ink,
                lineHeight: 1.1,
              }}
            >
              Noor Fleet
            </span>
          </div>

          {/* Arabic / English Toggle */}
          <button
            type="button"
            onClick={toggleLanguage}
            className="nf-focus-ring"
            style={{
              background: T.colors.surface,
              border: `1px solid ${T.colors.inputBorder}`,
              borderRadius: T.radius,
              padding: '6px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: T.colors.ink,
              cursor: 'pointer',
              fontFamily: language === 'en' ? T.fonts.arabic : T.fonts.ui,
              lineHeight: 1.3,
            }}
          >
            {language === 'en' ? 'العربية' : 'English'}
          </button>
        </header>

        {/* Vertically Centered Form Column (max-width 400px) */}
        <div
          style={{
            width: '100%',
            maxWidth: 400,
            margin: '40px auto',
          }}
        >
          {/* Headline & Welcome Subtitle */}
          <div style={{ marginBottom: 28 }}>
            <h1
              style={{
                fontFamily: isRTL ? T.fonts.arabic : T.fonts.brand,
                fontSize: 44,
                fontWeight: 700,
                letterSpacing: isRTL ? '0' : '-0.03em',
                lineHeight: 1.08,
                color: T.colors.ink,
                margin: 0,
              }}
            >
              {isRTL ? 'تسجيل الدخول' : 'Log in'}
            </h1>
            <p
              style={{
                marginTop: 10,
                marginBottom: 0,
                fontSize: 14,
                lineHeight: 1.5,
                color: T.colors.textSecondary,
              }}
            >
              {isRTL
                ? 'أهلاً بك مجدداً. أدخل بيانات حسابك المؤسسي للمتابعة.'
                : 'Welcome back. Enter your verified enterprise credentials to continue.'}
            </p>
          </div>

          {/* Initial Super Admin Setup Banner (Shown ONLY when 0 Super Admins exist) */}
          {isSetupRequired && (
            <div
              style={{
                marginBottom: 20,
                padding: '14px 16px',
                background: T.colors.surface,
                border: `1px solid ${T.colors.ink}`,
                borderRadius: T.radius,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <ShieldAlert
                  size={18}
                  style={{ color: T.colors.accent, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      color: T.colors.ink,
                    }}
                  >
                    {isRTL
                      ? 'تهيئة النظام لأول مرة مطلوبة'
                      : 'Initial Super Admin Setup Required'}
                  </div>
                  <p
                    style={{
                      fontSize: 12.5,
                      color: T.colors.textSecondary,
                      margin: '4px 0 10px',
                      lineHeight: 1.45,
                    }}
                  >
                    {isRTL
                      ? 'لم يتم تسجيل أي حساب مشرف أعلى. أنشئ الحساب الرئيسي لتفعيل النظام.'
                      : 'No Super Admin account exists in the database. Initialize your primary master account to activate the system.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsSetupModalOpen(true)}
                    className="nf-focus-ring"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: T.colors.ink,
                      color: T.colors.pageBg,
                      border: 'none',
                      borderRadius: T.radius,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {isRTL
                      ? 'إنشاء حساب المشرف الأعلى الآن'
                      : 'Initialize Super Admin Account'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Authentication Error Banner */}
          {loginError && (
            <div
              role="alert"
              style={{
                marginBottom: 18,
                padding: '11px 14px',
                background: '#FEF2F2',
                border: `1px solid ${T.colors.status.outOfServiceStripe}`,
                borderRadius: T.radius,
                color: T.colors.status.outOfServiceText,
                fontSize: 13,
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{loginError}</span>
              </div>
              <button
                type="button"
                onClick={clearError}
                aria-label={isRTL ? 'إغلاق التنبيه' : 'Dismiss error'}
                className="nf-focus-ring"
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.colors.status.outOfServiceText,
                  cursor: 'pointer',
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Email & Password Form */}
          <form onSubmit={handleSubmit} noValidate={false}>
            {/* Email Field */}
            <div style={{ marginBottom: 18 }}>
              <label
                htmlFor="login-email"
                style={{
                  display: 'block',
                  fontSize: 13,
                  fontWeight: 600,
                  color: T.colors.ink,
                  marginBottom: 6,
                }}
              >
                {isRTL ? 'البريد الإلكتروني' : 'Email'}
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="username"
                required
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@alnoortransport.com"
                className="nf-input"
                style={{
                  fontFamily: T.fonts.ui,
                  textAlign: 'left',
                }}
              />
            </div>

            {/* Password Field */}
            <div style={{ marginBottom: 20 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <label
                  htmlFor="login-password"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: T.colors.ink,
                  }}
                >
                  {isRTL ? 'كلمة المرور' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(true)}
                  className="nf-focus-ring"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: T.colors.textSecondary,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    cursor: 'pointer',
                    fontFamily: fontStack,
                  }}
                >
                  {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="nf-input"
                  style={{
                    paddingInlineEnd: 64,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  className="nf-focus-ring"
                  style={{
                    position: 'absolute',
                    insetInlineEnd: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px 6px',
                    fontSize: 12.5,
                    fontWeight: 500,
                    color: T.colors.textSecondary,
                    textDecoration: 'underline',
                    textUnderlineOffset: 3,
                    cursor: 'pointer',
                    fontFamily: fontStack,
                  }}
                >
                  {showPassword
                    ? isRTL
                      ? 'إخفاء'
                      : 'Hide'
                    : isRTL
                    ? 'إظهار'
                    : 'Show'}
                </button>
              </div>
            </div>

            {/* Rate-limiting Lockout Warning */}
            {lockoutTimer > 0 && (
              <div
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '10px 12px',
                  background: '#FEF2F2',
                  border: `1px solid ${T.colors.status.outOfServiceStripe}`,
                  borderRadius: T.radius,
                  color: T.colors.status.outOfServiceText,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>
                  {isRTL
                    ? `تم إيقاف محاولات الدخول مؤقتاً. يرجى الانتظار ${lockoutTimer} ثانية.`
                    : `Too many failed attempts. Login temporarily locked for ${lockoutTimer}s.`}
                </span>
              </div>
            )}

            {/* Submit Button (48px ink background, paper text) */}
            <button
              type="submit"
              disabled={isLoading || lockoutTimer > 0}
              className="nf-focus-ring"
              style={{
                width: '100%',
                height: 48,
                background: T.colors.ink,
                color: T.colors.pageBg,
                border: 'none',
                borderRadius: T.radius,
                fontSize: 14,
                fontWeight: 600,
                fontFamily: fontStack,
                cursor: isLoading || lockoutTimer > 0 ? 'not-allowed' : 'pointer',
                opacity: isLoading || lockoutTimer > 0 ? 0.65 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>{isRTL ? 'جاري التحقق...' : 'Signing in...'}</span>
                </>
              ) : lockoutTimer > 0 ? (
                <span>
                  {isRTL ? `مقفل (${lockoutTimer} ث)` : `Locked (${lockoutTimer}s)`}
                </span>
              ) : (
                <span>{isRTL ? 'تسجيل الدخول' : 'Log in'}</span>
              )}
            </button>
          </form>

          {/* Corporate RBAC Note */}
          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 12.5,
              lineHeight: 1.5,
              color: T.colors.textMuted,
            }}
          >
            {isRTL
              ? 'الوصول المؤسسي مشفّر ومراقَب وفق صلاحيات الأدوار المعتمدة.'
              : 'Corporate access is encrypted and controlled by verified role-based permissions.'}
          </p>

          {/* Divider */}
          <hr
            style={{
              margin: '24px 0',
              border: 'none',
              borderTop: `1px solid ${T.colors.border}`,
            }}
          />

          {/* Driver Report Bordered Row (No Login Required) */}
          <a
            href="/driver-report"
            className="nf-focus-ring"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              padding: '14px 16px',
              border: `1px solid ${T.colors.inputBorder}`,
              borderRadius: T.radius,
              background: T.colors.pageBg,
              textDecoration: 'none',
              color: T.colors.ink,
              transition: 'background-color 0.12s ease, border-color 0.12s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.colors.rowHover;
              e.currentTarget.style.borderColor = T.colors.ink;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = T.colors.pageBg;
              e.currentTarget.style.borderColor = T.colors.inputBorder;
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: T.colors.ink,
                  lineHeight: 1.35,
                }}
              >
                {isRTL
                  ? 'هل أنت سائق؟ أبلغ عن عطل في المركبة'
                  : 'Driver? Report a vehicle issue'}
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: T.colors.textMuted,
                  marginTop: 2,
                }}
              >
                {isRTL ? 'لا يتطلب تسجيل الدخول' : 'No login required'}
              </div>
            </div>
            <ArrowRight
              size={16}
              style={{
                color: T.colors.ink,
                flexShrink: 0,
                transform: isRTL ? 'scaleX(-1)' : 'none',
              }}
            />
          </a>
        </div>

        {/* Bottom Footer Row */}
        <footer
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            fontSize: 12.5,
            width: '100%',
          }}
        >
          <span style={{ color: T.colors.textMuted }}>
            {isRTL ? 'تحتاج إلى صلاحيات؟ ' : 'Need access? '}
            <button
              type="button"
              onClick={() => setIsContactAdminOpen(true)}
              className="nf-focus-ring"
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 12.5,
                fontWeight: 500,
                color: T.colors.textSecondary,
                textDecoration: 'underline',
                textUnderlineOffset: 3,
                cursor: 'pointer',
                fontFamily: fontStack,
              }}
            >
              {isRTL ? 'تواصل مع المسؤول' : 'Contact admin'}
            </button>
          </span>
          <span style={{ color: T.colors.ink, fontWeight: 500 }}>
            {isRTL ? 'مؤسسة النور المتحدة' : 'Al-Noor United Est.'}
          </span>
        </footer>
      </main>

      {/* ================================================================= */}
      {/* ROUTE-MAP PANEL (Deep Green #0B3B33)                              */}
      {/* ================================================================= */}
      <aside
        className="nf-login-route-panel"
        style={{ textAlign: isRTL ? 'right' : 'left' }}
      >
        {/* Decorative SVG Route Telemetry Grid (Always LTR, aria-hidden) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 800 900"
          preserveAspectRatio="xMidYMid slice"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            direction: 'ltr',
          }}
        >
          {/* Orthogonal grid lines */}
          <g stroke={T.colors.routePanel.grid} strokeWidth="1">
            <line x1="130" y1="0" x2="130" y2="900" />
            <line x1="270" y1="0" x2="270" y2="900" />
            <line x1="410" y1="0" x2="410" y2="900" />
            <line x1="550" y1="0" x2="550" y2="900" />
            <line x1="690" y1="0" x2="690" y2="900" />

            <line x1="0" y1="150" x2="800" y2="150" />
            <line x1="0" y1="300" x2="800" y2="300" />
            <line x1="0" y1="450" x2="800" y2="450" />
            <line x1="0" y1="600" x2="800" y2="600" />
            <line x1="0" y1="750" x2="800" y2="750" />
          </g>

          {/* Planned route 1 (upper dotted corridor) */}
          <path
            d="M -20 310 C 90 345, 190 310, 270 252 C 390 165, 595 160, 820 385"
            fill="none"
            stroke={T.colors.routePanel.plannedRoute}
            strokeWidth="2"
            strokeDasharray="4 6"
          />

          {/* Planned route 2 (lower dotted feeder) */}
          <path
            d="M 190 920 C 260 760, 315 645, 365 555 C 430 440, 560 400, 820 450"
            fill="none"
            stroke={T.colors.routePanel.plannedRoute}
            strokeWidth="2"
            strokeDasharray="4 6"
          />

          {/* Active route (solid bright curve from lower-left to upper-right) */}
          <path
            d="M -20 695 C 120 635, 225 605, 340 595 C 495 582, 565 445, 635 340 C 690 258, 745 185, 820 120"
            fill="none"
            stroke={T.colors.routePanel.activeRoute}
            strokeWidth="2.5"
          />

          {/* Junction Nodes & Plate Labels */}
          <g>
            {/* KSA-1103 */}
            <circle
              cx="270"
              cy="252"
              r="6"
              fill={T.colors.routePanel.bg}
              stroke={T.colors.routePanel.activeRoute}
              strokeWidth="2"
            />
            <text
              x="284"
              y="241"
              fill={T.colors.routePanel.label}
              fontFamily={T.fonts.mono}
              fontSize="13"
              fontWeight="500"
              letterSpacing="0.04em"
            >
              KSA-1103
            </text>

            {/* BND-8192 */}
            <circle
              cx="635"
              cy="340"
              r="6"
              fill={T.colors.routePanel.bg}
              stroke={T.colors.routePanel.activeRoute}
              strokeWidth="2"
            />
            <text
              x="649"
              y="328"
              fill={T.colors.routePanel.label}
              fontFamily={T.fonts.mono}
              fontSize="13"
              fontWeight="500"
              letterSpacing="0.04em"
            >
              BND-8192
            </text>

            {/* LBR-4921 */}
            <circle
              cx="340"
              cy="595"
              r="6"
              fill={T.colors.routePanel.bg}
              stroke={T.colors.routePanel.activeRoute}
              strokeWidth="2"
            />
            <text
              x="354"
              y="620"
              fill={T.colors.routePanel.label}
              fontFamily={T.fonts.mono}
              fontSize="13"
              fontWeight="500"
              letterSpacing="0.04em"
            >
              LBR-4921
            </text>

            {/* DMM-9044 */}
            <circle
              cx="392"
              cy="515"
              r="5.5"
              fill={T.colors.routePanel.bg}
              stroke={T.colors.routePanel.activeRoute}
              strokeWidth="2"
            />
            <text
              x="406"
              y="520"
              fill={T.colors.routePanel.label}
              fontFamily={T.fonts.mono}
              fontSize="13"
              fontWeight="500"
              letterSpacing="0.04em"
            >
              DMM-9044
            </text>
          </g>
        </svg>

        {/* Bottom Copy Block */}
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 480,
          }}
        >
          <h2
            style={{
              fontFamily: isRTL ? T.fonts.arabic : T.fonts.brand,
              fontSize: 'clamp(34px, 4vw, 48px)',
              fontWeight: 700,
              letterSpacing: isRTL ? '0' : '-0.03em',
              lineHeight: 1.08,
              color: T.colors.pageBg,
              margin: 0,
            }}
          >
            {isRTL
              ? 'كل شاحنة. كل رحلة. شاشة واحدة.'
              : 'Every truck. Every trip. One view.'}
          </h2>
          <p
            style={{
              marginTop: 14,
              marginBottom: 0,
              fontSize: 15,
              lineHeight: 1.55,
              color: T.colors.routePanel.body,
            }}
          >
            {isRTL
              ? 'تتبع مباشر، صيانة وقائية تنبؤية، وتنسيق متكامل للورشة لأسطول نقل الوقود.'
              : 'Live telemetry, predictive maintenance and seamless workshop logistics for your fuel fleet.'}
          </p>
        </div>
      </aside>

      {/* ================================================================= */}
      {/* MODAL: FORGOT PASSWORD                                            */}
      {/* ================================================================= */}
      {isForgotPasswordOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backgroundColor: 'rgba(22, 21, 19, 0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="forgot-pw-title"
            style={{
              width: '100%',
              maxWidth: 400,
              background: T.colors.surface,
              border: `1px solid ${T.colors.border}`,
              borderRadius: T.radius,
              padding: 24,
              color: T.colors.ink,
            }}
          >
            <h3
              id="forgot-pw-title"
              style={{
                fontFamily: isRTL ? T.fonts.arabic : T.fonts.brand,
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {isRTL ? 'استعادة كلمة المرور' : 'Reset password'}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: T.colors.textSecondary,
                marginTop: 6,
                marginBottom: 16,
                lineHeight: 1.5,
              }}
            >
              {isRTL
                ? 'أدخل بريدك الإلكتروني المؤسسي وسيقوم مدير النظام بإرسال رابط الاستعادة.'
                : 'Enter your enterprise email to request a reset link from your system administrator.'}
            </p>

            {forgotPasswordSubmitted ? (
              <div
                style={{
                  padding: '12px 14px',
                  background: '#F0FDF4',
                  border: `1px solid ${T.colors.status.availableStripe}`,
                  borderRadius: T.radius,
                  color: T.colors.status.availableText,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>
                  {isRTL
                    ? 'تم إرسال الطلب بنجاح إلى مشرف النظام.'
                    : 'Password reset request submitted successfully.'}
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label
                    htmlFor="forgot-email"
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      marginBottom: 5,
                    }}
                  >
                    {isRTL ? 'البريد الإلكتروني' : 'Email'}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    dir="ltr"
                    placeholder="name@alnoortransport.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="nf-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (forgotEmail.trim()) {
                      setForgotPasswordSubmitted(true);
                    }
                  }}
                  className="nf-focus-ring"
                  style={{
                    width: '100%',
                    height: 44,
                    background: T.colors.ink,
                    color: T.colors.pageBg,
                    border: 'none',
                    borderRadius: T.radius,
                    fontSize: 13.5,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isRTL ? 'إرسال الطلب' : 'Send reset link'}
                </button>
              </div>
            )}

            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: `1px solid ${T.colors.rowDivider}`,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotPasswordSubmitted(false);
                  setForgotEmail('');
                }}
                className="nf-focus-ring"
                style={{
                  background: 'none',
                  border: `1px solid ${T.colors.inputBorder}`,
                  borderRadius: T.radius,
                  padding: '6px 14px',
                  fontSize: 12.5,
                  fontWeight: 500,
                  color: T.colors.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {isRTL ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: CONTACT ADMIN                                              */}
      {/* ================================================================= */}
      {isContactAdminOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backgroundColor: 'rgba(22, 21, 19, 0.55)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-admin-title"
            style={{
              width: '100%',
              maxWidth: 400,
              background: T.colors.surface,
              border: `1px solid ${T.colors.border}`,
              borderRadius: T.radius,
              padding: 24,
              color: T.colors.ink,
            }}
          >
            <h3
              id="contact-admin-title"
              style={{
                fontFamily: isRTL ? T.fonts.arabic : T.fonts.brand,
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {isRTL ? 'طلب صلاحية وصول' : 'Request system access'}
            </h3>
            <p
              style={{
                fontSize: 13,
                color: T.colors.textSecondary,
                marginTop: 8,
                marginBottom: 16,
                lineHeight: 1.55,
              }}
            >
              {isRTL
                ? 'تُنشأ حسابات مؤسسة النور المتحدة من قِبل مدير النظام أو مدير الأسطول. يرجى التواصل مع مكتب تكنولوجيا المعلومات أو الإدارة للحصول على بيانات الدخول.'
                : 'Al-Noor United Est. ERP accounts are provisioned by your Super Admin or Fleet Manager. Contact your fleet administrator or IT desk to receive credentials.'}
            </p>
            <div
              dir="ltr"
              style={{
                padding: '10px 12px',
                background: T.colors.pageBg,
                border: `1px solid ${T.colors.border}`,
                borderRadius: T.radius,
                fontFamily: T.fonts.mono,
                fontSize: 12.5,
                color: T.colors.ink,
              }}
            >
              admin@alnoortransport.com
            </div>
            <div
              style={{
                marginTop: 18,
                paddingTop: 14,
                borderTop: `1px solid ${T.colors.rowDivider}`,
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={() => setIsContactAdminOpen(false)}
                className="nf-focus-ring"
                style={{
                  background: T.colors.ink,
                  color: T.colors.pageBg,
                  border: 'none',
                  borderRadius: T.radius,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {isRTL ? 'حسناً' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: FIRST-TIME SUPER ADMIN SETUP                               */}
      {/* ================================================================= */}
      {isSetupModalOpen && isSetupRequired && (
        <div
          dir="ltr"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            backgroundColor: 'rgba(22, 21, 19, 0.7)',
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-modal-title"
            style={{
              width: '100%',
              maxWidth: 440,
              background: T.colors.surface,
              border: `1px solid ${T.colors.border}`,
              borderRadius: T.radius,
              padding: 28,
              color: T.colors.ink,
              fontFamily: T.fonts.ui,
              textAlign: 'left',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 14,
                borderBottom: `1px solid ${T.colors.rowDivider}`,
              }}
            >
              <div>
                <h3
                  id="setup-modal-title"
                  style={{
                    fontFamily: T.fonts.brand,
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  Initialize Super Admin Account
                </h3>
                <p
                  style={{
                    fontSize: 12,
                    color: T.colors.textSecondary,
                    margin: '2px 0 0',
                  }}
                >
                  One-time system activation
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSetupModalOpen(false)}
                aria-label="Close setup dialog"
                className="nf-focus-ring"
                style={{
                  background: 'none',
                  border: 'none',
                  color: T.colors.textMuted,
                  cursor: 'pointer',
                  padding: 4,
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                marginTop: 14,
                padding: '10px 12px',
                background: T.colors.pageBg,
                border: `1px solid ${T.colors.border}`,
                borderRadius: T.radius,
                fontSize: 12,
                lineHeight: 1.5,
                color: T.colors.textSecondary,
              }}
            >
              <strong>Security protocol:</strong> This master account has full
              authority over the fleet system and database. Once provisioned, this
              wizard locks permanently.
            </div>

            {setupError && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  padding: '10px 12px',
                  background: '#FEF2F2',
                  border: `1px solid ${T.colors.status.outOfServiceStripe}`,
                  borderRadius: T.radius,
                  color: T.colors.status.outOfServiceText,
                  fontSize: 12.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{setupError}</span>
              </div>
            )}

            <form
              onSubmit={handleSetupSubmit}
              style={{
                marginTop: 16,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
              }}
            >
              <div>
                <label
                  htmlFor="setup-full-name"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 5,
                  }}
                >
                  Full Legal Name *
                </label>
                <input
                  id="setup-full-name"
                  type="text"
                  required
                  placeholder="e.g. Faisal Al-Noor"
                  value={setupFullName}
                  onChange={(e) => setSetupFullName(e.target.value)}
                  className="nf-input"
                />
              </div>

              <div>
                <label
                  htmlFor="setup-email"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 5,
                  }}
                >
                  Corporate Email Address *
                </label>
                <input
                  id="setup-email"
                  type="email"
                  required
                  placeholder="e.g. admin@alnoortransport.com"
                  value={setupEmail}
                  onChange={(e) => setSetupEmail(e.target.value)}
                  className="nf-input"
                  style={{ fontFamily: T.fonts.mono, fontSize: 13 }}
                />
              </div>

              <div>
                <label
                  htmlFor="setup-password"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 5,
                  }}
                >
                  Master Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="setup-password"
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={setupPassword}
                    onChange={(e) => setSetupPassword(e.target.value)}
                    className="nf-input"
                    style={{
                      fontFamily: T.fonts.mono,
                      fontSize: 13,
                      paddingRight: 64,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="nf-focus-ring"
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      padding: '4px 6px',
                      fontSize: 12,
                      fontWeight: 500,
                      color: T.colors.textSecondary,
                      textDecoration: 'underline',
                      cursor: 'pointer',
                    }}
                  >
                    {showSetupPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="setup-department"
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 5,
                  }}
                >
                  Department
                </label>
                <input
                  id="setup-department"
                  type="text"
                  value={setupDepartment}
                  onChange={(e) => setSetupDepartment(e.target.value)}
                  className="nf-input"
                />
              </div>

              <div
                style={{
                  marginTop: 6,
                  paddingTop: 14,
                  borderTop: `1px solid ${T.colors.rowDivider}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(false)}
                  className="nf-focus-ring"
                  style={{
                    padding: '9px 16px',
                    background: 'transparent',
                    border: `1px solid ${T.colors.inputBorder}`,
                    borderRadius: T.radius,
                    fontSize: 13,
                    fontWeight: 500,
                    color: T.colors.textSecondary,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSettingUp}
                  className="nf-focus-ring"
                  style={{
                    padding: '9px 18px',
                    background: T.colors.ink,
                    color: T.colors.pageBg,
                    border: 'none',
                    borderRadius: T.radius,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: isSettingUp ? 'not-allowed' : 'pointer',
                    opacity: isSettingUp ? 0.65 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {isSettingUp ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Activating...</span>
                    </>
                  ) : (
                    <span>Activate &amp; Sign In</span>
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
