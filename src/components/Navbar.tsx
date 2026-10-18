import React from 'react';
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
    </header>
  );
};
