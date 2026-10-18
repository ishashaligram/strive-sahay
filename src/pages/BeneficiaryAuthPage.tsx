import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Globe,
  FileCheck2,
  Lock,
} from 'lucide-react';
import { Beneficiary, SupportedLanguage } from '../types';
import { STRIVE_COHORTS } from '../data/striveDataset';
import {
  AVAILABLE_LANGUAGES,
  getSavedLanguage,
  saveLanguage,
  useTranslation,
} from '../services/i18n';
import { storage } from '../services/storage';

interface BeneficiaryAuthPageProps {
  onLoginSuccess: (user: { role: 'beneficiary'; id: string; name: string }) => void;
  currentLang: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const BeneficiaryAuthPage: React.FC<BeneficiaryAuthPageProps> = ({
  onLoginSuccess,
  currentLang,
  onLanguageChange,
}) => {
  const navigate = useNavigate();
  const t = useTranslation(currentLang);

  // Sub-tabs: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('');
  const [talukaBlock, setTalukaBlock] = useState('');
  const [cohortId, setCohortId] = useState(STRIVE_COHORTS[0].id);
  const [consent, setConsent] = useState(false);

  // Login Form State
  const [loginMobile, setLoginMobile] = useState('');

  // OTP Verification State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string>('');
  const [pendingRegistration, setPendingRegistration] = useState<Beneficiary | null>(null);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpStep && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpStep, otpTimer]);

  // Handle Send OTP for Registration
  const handleSendRegisterOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!fullName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (mobileNumber.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!district.trim()) {
      setErrorMessage('Please enter your district.');
      return;
    }
    if (!talukaBlock.trim()) {
      setErrorMessage('Please enter your taluka or block.');
      return;
    }
    if (!consent) {
      setErrorMessage('Consent is required to proceed with Tata STRIVE incubation screening.');
      return;
    }

    // Check if already registered
    const existing = storage.getBeneficiaryByMobile(mobileNumber);
    if (existing) {
      setErrorMessage('This mobile number is already registered. Please switch to Existing Beneficiary Login.');
      return;
    }

    // Generate real 6-digit verification code & Unique Beneficiary Reference ID
    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(generatedCode);

    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const stateCode = state.slice(0, 2).toUpperCase() || 'MH';
    const refId = `STRIVE-2024-${stateCode}-${randomDigits}`;

    const newBen: Beneficiary = {
      id: 'ben_' + Math.random().toString(36).substring(2, 9),
      referenceId: refId,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      state: state.trim(),
      district: district.trim(),
      region: talukaBlock.trim(),
      talukaBlock: talukaBlock.trim(),
      preferredLanguage: currentLang,
      cohortId,
      consentGiven: true,
      createdAt: new Date().toISOString(),
      currentStatus: 'registered',
      waitingForAssessor: false,
    };

    setPendingRegistration(newBen);
    setIsOtpStep(true);
    setOtpTimer(60);
    setOtpInput('');
  };

  // Handle Send OTP for Login
  const handleSendLoginOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (loginMobile.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit mobile number.');
      return;
    }

    const existing = storage.getBeneficiaryByMobile(loginMobile);
    if (!existing) {
      setErrorMessage('No beneficiary account found with this mobile number. Please register first.');
      return;
    }

    const generatedCode = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(generatedCode);
    setPendingRegistration(existing);
    setIsOtpStep(true);
    setOtpTimer(60);
    setOtpInput('');
  };

  // Verify OTP
  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Verifies against the issued dynamic OTP
    if (otpInput.trim() !== generatedOtp) {
      setErrorMessage(t.invalidOtp);
      return;
    }

    if (!pendingRegistration) return;

    if (authMode === 'register') {
      // Save new beneficiary with chosen language
      storage.saveBeneficiary(pendingRegistration);
    } else {
      // Update preferred language if changed
      const updated = {
        ...pendingRegistration,
        preferredLanguage: currentLang,
      };
      storage.saveBeneficiary(updated);
    }

    onLoginSuccess({
      role: 'beneficiary',
      id: pendingRegistration.id,
      name: pendingRegistration.fullName,
    });

    navigate('/beneficiary/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-extrabold shadow-inner">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">STRIVE SAHAY</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                  {t.beneficiaryPortalTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Language Switcher Pill */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
              <Globe className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              <select
                value={currentLang}
                onChange={(e) => {
                  const val = e.target.value as SupportedLanguage;
                  saveLanguage(val);
                  onLanguageChange(val);
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              >
                {AVAILABLE_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                    {l.nativeName} ({l.name})
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => navigate('/beneficiary/language')}
              className="text-xs text-slate-400 hover:text-white px-2.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
            >
              Languages
            </button>
          </div>
        </div>
      </header>

      {/* Main Auth Container */}
      <main className="flex-1 max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center w-full">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur">
          {/* Title and Introduction */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto mb-3">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              {t.beneficiaryPortalTitle}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto">
              {t.beneficiaryPortalDesc}
            </p>
          </div>

          {!isOtpStep ? (
            <>
              {/* Tab Selector: Login vs Register */}
              <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-700 mb-6">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    authMode === 'login'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.tabLogin}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setErrorMessage('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-colors ${
                    authMode === 'register'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.tabRegister}
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* TAB 1: Existing Beneficiary Login */}
              {authMode === 'login' && (
                <form onSubmit={handleSendLoginOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {t.mobileNumber} *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={loginMobile}
                        onChange={(e) => setLoginMobile(e.target.value.replace(/\D/g, ''))}
                        placeholder="9822000000"
                        className="w-full pl-12 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {t.loginPrompt}
                    </span>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                  >
                    <span>{t.sendOtp}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setErrorMessage('');
                      }}
                      className="text-xs text-teal-400 hover:underline font-medium"
                    >
                      {t.notRegisteredYet}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: New Beneficiary Registration */}
              {authMode === 'register' && (
                <form onSubmit={handleSendRegisterOtp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.fullName} *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Patil"
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      {t.mobileNumber} *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-xs text-slate-400 font-semibold">+91</span>
                      <input
                        type="tel"
                        required
                        maxLength={10}
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                        placeholder="9822000000"
                        className="w-full pl-12 pr-4 py-2.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{t.state} *</label>
                      <input
                        type="text"
                        required
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{t.district} *</label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Pune"
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">{t.talukaBlock} *</label>
                      <input
                        type="text"
                        required
                        value={talukaBlock}
                        onChange={(e) => setTalukaBlock(e.target.value)}
                        placeholder="e.g. Haveli"
                        className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">{t.cohort}</label>
                    <select
                      value={cohortId}
                      onChange={(e) => setCohortId(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      {STRIVE_COHORTS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="pt-1">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
                      />
                      <span className="text-xs text-slate-400 leading-snug">
                        {t.consentText}
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
                  >
                    <span>{t.sendOtp}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMessage('');
                      }}
                      className="text-xs text-teal-400 hover:underline font-medium"
                    >
                      {t.alreadyRegistered}
                    </button>
                  </div>
                </form>
              )}
            </>
          ) : (
            /* OTP VERIFICATION STEP */
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="text-center">
                <div className="w-12 h-12 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">
                  {authMode === 'register' ? 'Verify Mobile Number' : 'Authenticate Login'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {t.otpSentTo} <span className="font-semibold text-white">+91 {authMode === 'register' ? mobileNumber : loginMobile}</span>
                </p>

                {/* Secure OTP Dispatch Notice */}
                <div className="mt-3 p-3 bg-slate-900/90 rounded-xl border border-slate-700 text-left text-xs space-y-1">
                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>SMS Gateway Simulation:</span>
                    <span className="font-mono text-teal-400 font-bold">Code: {generatedOtp}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    A 6-digit OTP has been dispatched to your mobile. Enter below to complete authentication.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-2 text-center">
                  {t.enterOtp}
                </label>
                <input
                  type="text"
                  maxLength={6}
                  autoFocus
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="••••••"
                  className="w-52 mx-auto block text-center tracking-[0.3em] text-2xl font-bold font-mono py-2.5 px-4 bg-slate-900 border-2 border-teal-500 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                <div className="flex items-center space-x-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {t.resendOtpIn} {otpTimer}s
                  </span>
                </div>
                <button
                  type="button"
                  disabled={otpTimer > 0}
                  onClick={() => {
                    const newCode = Math.floor(100000 + Math.random() * 900000).toString();
                    setGeneratedOtp(newCode);
                    setOtpTimer(60);
                    setErrorMessage('');
                  }}
                  className={`font-semibold ${
                    otpTimer > 0 ? 'text-slate-600 cursor-not-allowed' : 'text-teal-400 hover:underline'
                  }`}
                >
                  {t.resendOtp}
                </button>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOtpStep(false)}
                  className="w-1/3 py-2.5 border border-slate-700 hover:bg-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-colors flex items-center justify-center space-x-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.verifyOtp}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
};
