import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Building2,
  User,
  Phone,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { Beneficiary, SupportedLanguage, UserRole } from '../types';
import { STRIVE_COHORTS, INITIAL_ASSESSORS } from '../data/striveDataset';
import { useTranslation } from '../services/i18n';
import { storage } from '../services/storage';

interface WelcomeAuthModalProps {
  onLoginSuccess: (user: { role: UserRole; id: string; name: string }) => void;
  currentLang: SupportedLanguage;
  onSelectLang: (lang: SupportedLanguage) => void;
}

export const WelcomeAuthModal: React.FC<WelcomeAuthModalProps> = ({
  onLoginSuccess,
  currentLang,
  onSelectLang,
}) => {
  const t = useTranslation(currentLang);
  const [activeTab, setActiveTab] = useState<'beneficiary_reg' | 'beneficiary_login' | 'assessor' | 'admin'>('beneficiary_reg');

  // Registration Form State
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [district, setDistrict] = useState('Solapur');
  const [region, setRegion] = useState('South Solapur');
  const [preferredLang, setPreferredLang] = useState<SupportedLanguage>(currentLang);
  const [cohortId, setCohortId] = useState(STRIVE_COHORTS[1].id); // Solapur Women Micro-Enterprises
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);

  // OTP Verification State
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [otpError, setOtpError] = useState('');
  const [generatedRefId, setGeneratedRefId] = useState('');
  const [pendingBeneficiary, setPendingBeneficiary] = useState<Beneficiary | null>(null);

  // Assessor & Admin Login States
  const [selectedAssessorId, setSelectedAssessorId] = useState(INITIAL_ASSESSORS[0].id);
  const [staffPassword, setStaffPassword] = useState('admin123');

  // Sync preferredLang change with parent app
  useEffect(() => {
    setPreferredLang(currentLang);
  }, [currentLang]);

  // Timer countdown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpStep && otpTimer > 0) {
      interval = setInterval(() => setOtpTimer((prev) => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpStep, otpTimer]);

  const handleSendRegistrationOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || mobileNumber.length < 10) {
      setOtpError('Please provide a valid full name and 10-digit mobile number.');
      return;
    }
    if (!consent) {
      setOtpError('Consent is required to proceed with Tata STRIVE AI screening.');
      return;
    }

    setOtpError('');
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const refId = `STRIVE-2024-MH-${randomDigits}`;
    setGeneratedRefId(refId);

    const newBeneficiary: Beneficiary = {
      id: 'ben_' + Math.random().toString(36).substring(2, 9),
      referenceId: refId,
      fullName: fullName.trim(),
      mobileNumber: mobileNumber.trim(),
      state,
      district,
      region,
      preferredLanguage: preferredLang,
      cohortId,
      email: email.trim() || undefined,
      consentGiven: true,
      createdAt: new Date().toISOString(),
      currentStatus: 'registered',
      waitingForAssessor: false,
    };

    setPendingBeneficiary(newBeneficiary);
    setIsOtpStep(true);
    setOtpTimer(60);
    setOtpInput('');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    // Verify OTP: Accepts 123456 (dev standard)
    if (otpInput.trim() === '123456' || otpInput.trim() === '999999') {
      if (pendingBeneficiary) {
        storage.saveBeneficiary(pendingBeneficiary);
        onLoginSuccess({
          role: 'beneficiary',
          id: pendingBeneficiary.id,
          name: pendingBeneficiary.fullName,
        });
      }
    } else {
      setOtpError(t.invalidOtp);
    }
  };

  const handleAssessorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const assessor = storage.getAssessorById(selectedAssessorId);
    if (assessor) {
      onLoginSuccess({
        role: 'assessor',
        id: assessor.id,
        name: assessor.fullName,
      });
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    onLoginSuccess({
      role: 'admin',
      id: 'admin_directorate',
      name: 'STRIVE Program Directorate (HQ)',
    });
  };

  // Quick fill demo beneficiary: Section 22 scenario!
  const handlePreFillMarathiPickleEntrepreneur = () => {
    setFullName('सुनीता रमेश मोरे (Sunita Ramesh More)');
    setMobileNumber('9822334455');
    setState('Maharashtra');
    setDistrict('Solapur');
    setRegion('South Solapur');
    setPreferredLang('mr');
    onSelectLang('mr');
    setCohortId(STRIVE_COHORTS[1].id);
    setConsent(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-extrabold shadow-inner">
                <Sparkles className="w-5 h-5 text-teal-400" />
              </div>
              <span className="text-xl font-extrabold tracking-tight">STRIVE SAHAY</span>
            </div>
            <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
              Tata STRIVE Hackathon
            </span>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2">{t.welcomeModalTitle}</h2>
          <p className="text-slate-300 text-sm">{t.welcomeModalDesc}</p>
        </div>

        {/* Role Selection Tabs (Section 5: Clear Role Partitioning) */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs sm:text-sm font-semibold">
          <button
            onClick={() => {
              setActiveTab('beneficiary_reg');
              setIsOtpStep(false);
            }}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'beneficiary_reg' || activeTab === 'beneficiary_login'
                ? 'border-teal-600 text-teal-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>{t.beneficiaryTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('assessor')}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'assessor'
                ? 'border-amber-600 text-amber-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{t.assessorTab}</span>
          </button>
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex-1 py-3 px-4 text-center border-b-2 flex items-center justify-center space-x-1.5 transition-colors ${
              activeTab === 'admin'
                ? 'border-purple-600 text-purple-700 bg-white font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t.adminTab}</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {/* TAB 1: Beneficiary Registration & OTP Verification */}
          {(activeTab === 'beneficiary_reg' || activeTab === 'beneficiary_login') && (
            <div>
              {!isOtpStep ? (
                <form onSubmit={handleSendRegistrationOtp} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">New Beneficiary Registration</h3>
                    <button
                      type="button"
                      onClick={handlePreFillMarathiPickleEntrepreneur}
                      className="text-xs text-teal-700 hover:text-teal-900 bg-teal-50 border border-teal-200 px-2.5 py-1 rounded-md font-medium flex items-center space-x-1 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Pre-fill Marathi Pickle Beneficiary</span>
                    </button>
                  </div>

                  {otpError && (
                    <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.fullName} *
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Sunita Ramesh More"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        {t.mobileNumber} *
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-semibold">+91</span>
                        <input
                          type="tel"
                          required
                          maxLength={10}
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="9822334455"
                          className="w-full pl-11 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.state}</label>
                      <input
                        type="text"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.district} *</label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="e.g. Solapur / Pune"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.region}</label>
                      <input
                        type="text"
                        value={region}
                        onChange={(e) => setRegion(e.target.value)}
                        placeholder="e.g. South Solapur"
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.preferredLanguage}</label>
                      <select
                        value={preferredLang}
                        onChange={(e) => {
                          const l = e.target.value as SupportedLanguage;
                          setPreferredLang(l);
                          onSelectLang(l);
                        }}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="mr">मराठी (Marathi)</option>
                        <option value="en">English</option>
                        <option value="hi">हिंदी (Hindi)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">{t.cohort}</label>
                      <select
                        value={cohortId}
                        onChange={(e) => setCohortId(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {STRIVE_COHORTS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2">
                    <label className="flex items-start space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-xs text-slate-600 leading-snug">
                        {t.consentText}
                      </span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>{t.sendOtp}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                /* OTP Verification Step */
                <form onSubmit={handleVerifyOtp} className="space-y-5">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-3 text-teal-600 border border-teal-200">
                      <Phone className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">Verify Mobile Number</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {t.otpSentTo} <span className="font-semibold text-slate-800">{mobileNumber}</span>
                    </p>
                    <div className="mt-2 inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-mono">
                      <span>{t.referenceIdLabel}: {generatedRefId}</span>
                    </div>
                  </div>

                  {/* Dev OTP Notice per Section 5 */}
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs text-center font-medium">
                    {t.devOtpNotice}
                  </div>

                  {otpError && (
                    <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      <span>{otpError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5 text-center">
                      {t.enterOtp}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      autoFocus
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-48 mx-auto block text-center tracking-widest text-xl font-bold font-mono px-3 py-2 border-2 border-teal-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 px-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {t.resendOtpIn} {otpTimer}s
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={otpTimer > 0}
                      onClick={() => {
                        setOtpTimer(60);
                        setOtpError('');
                      }}
                      className={`font-semibold ${
                        otpTimer > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-teal-700 hover:underline'
                      }`}
                    >
                      Resend OTP
                    </button>
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsOtpStep(false)}
                      className="w-1/3 py-2.5 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="w-2/3 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.verifyOtp}</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: Assessor Login */}
          {activeTab === 'assessor' && (
            <form onSubmit={handleAssessorLogin} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                <strong>Assessor Access:</strong> Review assigned business ideas, evaluate evidence, submit rubric scores or overrides, and provide translated mentoring recommendations.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Registered Assessor Profile
                </label>
                <select
                  value={selectedAssessorId}
                  onChange={(e) => setSelectedAssessorId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  {INITIAL_ASSESSORS.map((assessor) => (
                    <option key={assessor.id} value={assessor.id}>
                      {assessor.fullName} — {assessor.tradeExpertise.join(', ')} ({assessor.regions.join(', ')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Staff Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Demo password preset: admin123</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Enter Assessor Review Portal</span>
              </button>
            </form>
          )}

          {/* TAB 3: Admin Directorate Login */}
          {activeTab === 'admin' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg text-purple-800 text-xs">
                <strong>Directorate Headquarters:</strong> Access comprehensive cohort analytics, domain rubric heatmaps, assessor capacity matrix, staffing shortage alerts, and exportable PDF reports.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Admin Account</label>
                <input
                  type="text"
                  disabled
                  value="directorate.hq@tatastrive.org (Tata STRIVE Program Directorate)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Demo password preset: admin123</span>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Building2 className="w-4 h-4" />
                <span>Enter Admin Analytics Dashboard</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
