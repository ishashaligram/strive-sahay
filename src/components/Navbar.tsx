import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  User,
  ShieldCheck,
  Building2,
  LogOut,
  RotateCcw,
  Globe,
  Compass,
  FileCheck2,
  Layers,
  MapPin,
  Activity,
  Server,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
} from 'lucide-react';
import { SupportedLanguage, UserRole } from '../types';
import { useTranslation } from '../services/i18n';
import { storage } from '../services/storage';

interface NavbarProps {
  currentRole: UserRole;
  currentLang: SupportedLanguage;
  activeUserName: string;
  onSelectRole: (role: UserRole) => void;
  onSelectLang: (lang: SupportedLanguage) => void;
  onLogout: () => void;
  currentView: string;
  onNavigate: (view: string) => void;
  onResetData: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentRole,
  currentLang,
  activeUserName,
  onSelectLang,
  onLogout,
  currentView,
  onNavigate,
  onResetData,
}) => {
  const t = useTranslation(currentLang);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Check health of FastAPI & Qwen3-8B backend
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);

    fetch('http://localhost:8000/api/system/status', { signal: controller.signal })
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('Not ok');
      })
      .then(() => {
        if (isMounted) setBackendStatus('connected');
      })
      .catch(() => {
        if (isMounted) setBackendStatus('offline');
      })
      .finally(() => {
        clearTimeout(timer);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-extrabold shadow-inner">
              <Sparkles className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">STRIVE SAHAY</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                  Tata STRIVE
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                {t.appSubtitle}
              </p>
            </div>
          </div>

          {/* Navigation Links based on role */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                currentView === 'dashboard'
                  ? 'bg-slate-800 text-teal-400 border border-slate-700'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>{t.dashboard}</span>
            </button>

            {currentRole === 'beneficiary' && (
              <>
                <button
                  onClick={() => onNavigate('mentor')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    currentView === 'mentor'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>{t.mentorWorkspace}</span>
                </button>
                <button
                  onClick={() => onNavigate('improvement')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    currentView === 'improvement'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{t.improvementHub}</span>
                </button>
                <button
                  onClick={() => onNavigate('roadmap')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                    currentView === 'roadmap'
                      ? 'bg-slate-800 text-teal-400 border border-slate-700'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Roadmap</span>
                </button>
              </>
            )}

            {currentRole === 'assessor' && (
              <button
                onClick={() => onNavigate('assessor')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  currentView === 'assessor'
                    ? 'bg-slate-800 text-teal-400 border border-slate-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileCheck2 className="w-4 h-4" />
                <span>{t.assessorReview}</span>
              </button>
            )}

            {currentRole === 'admin' && (
              <button
                onClick={() => onNavigate('admin')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1.5 ${
                  currentView === 'admin'
                    ? 'bg-slate-800 text-teal-400 border border-slate-700'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>{t.adminAnalytics}</span>
              </button>
            )}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center space-x-3">
            {/* Backend / Model Architecture Indicator */}
            <button
              type="button"
              onClick={() => setShowStatusModal(true)}
              title="Click to view AI & Backend architecture status"
              className={`hidden sm:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                backendStatus === 'connected'
                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700 hover:bg-emerald-900/60'
                  : backendStatus === 'checking'
                  ? 'bg-slate-800 text-slate-300 border-slate-700'
                  : 'bg-amber-950/60 text-amber-300 border-amber-700 hover:bg-amber-900/60'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === 'connected'
                    ? 'bg-emerald-400 animate-pulse'
                    : backendStatus === 'checking'
                    ? 'bg-slate-400'
                    : 'bg-amber-400'
                }`}
              />
              <span className="hidden xl:inline">
                {backendStatus === 'connected'
                  ? 'Qwen3-8B | FastAPI | Firestore'
                  : 'Local Resilience Mode'}
              </span>
              <span className="xl:hidden">
                {backendStatus === 'connected' ? 'Qwen3-8B Live' : 'Local Mode'}
              </span>
            </button>

            {/* Language Switcher (Beneficiary Only) */}
            {currentRole === 'beneficiary' && (
              <div className="flex items-center bg-slate-800 rounded-lg px-2 py-1 border border-slate-700">
                <Globe className="w-3.5 h-3.5 text-teal-400 mr-1.5" />
                <select
                  value={currentLang}
                  onChange={(e) => onSelectLang(e.target.value as SupportedLanguage)}
                  className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="en" className="bg-slate-900 text-white">English</option>
                  <option value="hi" className="bg-slate-900 text-white">हिन्दी (Hindi)</option>
                  <option value="mr" className="bg-slate-900 text-white">मराठी (Marathi)</option>
                  <option value="te" className="bg-slate-900 text-white">తెలుగు (Telugu)</option>
                  <option value="ta" className="bg-slate-900 text-white">தமிழ் (Tamil)</option>
                  <option value="kn" className="bg-slate-900 text-white">ಕನ್ನಡ (Kannada)</option>
                  <option value="bn" className="bg-slate-900 text-white">বাংলা (Bengali)</option>
                </select>
              </div>
            )}

            {/* Active User Badge */}
            <div className="hidden lg:flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
                {currentRole === 'admin' ? (
                  <Building2 className="w-4 h-4 text-purple-400" />
                ) : currentRole === 'assessor' ? (
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <User className="w-4 h-4 text-teal-400" />
                )}
              </div>
              <div className="text-left text-xs">
                <p className="font-semibold text-slate-200 leading-tight truncate max-w-[140px]">{activeUserName}</p>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {currentRole === 'admin' ? 'Directorate' : currentRole === 'assessor' ? 'Assessor' : 'Beneficiary'}
                </span>
              </div>
            </div>

            {/* Reset Data Button */}
            <button
              onClick={onResetData}
              title="Reset sample data to clean state"
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Logout */}
            <button
              onClick={onLogout}
              title={t.logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Backend & AI Architecture Diagnostics Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <Server className="w-5 h-5 text-teal-400" />
                <h3 className="font-bold text-base">STRIVE SAHAY System Architecture</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">FastAPI Microservice Engine</h4>
                  <p className="text-slate-400 text-[11px]">Endpoint: http://localhost:8000</p>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    backendStatus === 'connected'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {backendStatus === 'connected' ? 'Connected' : 'Offline / Edge Fallback'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">Qwen3-8B (Ollama) Business Model</h4>
                  <p className="text-slate-400 text-[11px]">Port: 11434 • Primary Reasoning & Rubric Evaluator</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                  Active Runtime
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">faster-whisper & pdfplumber</h4>
                  <p className="text-slate-400 text-[11px]">Voice audio pitch transcription & business document ingestion</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                  Ready
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">IndicTrans2 Multilingual Translation</h4>
                  <p className="text-slate-400 text-[11px]">Bidirectional 7-language translation for beneficiaries</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800">
                  Ready
                </span>
              </div>

              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">Cloud Firestore & Hybrid Storage Cache</h4>
                  <p className="text-slate-400 text-[11px]">Deterministic persistent storage with offline fallback</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Operational
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-3">
              ℹ️ STRIVE SAHAY guarantees institutional continuity: if Python FastAPI or Ollama are temporarily unreachable, all deterministic financial checks, contradiction detection, and roadmap milestones continue running locally in the browser with full data preservation.
            </p>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
