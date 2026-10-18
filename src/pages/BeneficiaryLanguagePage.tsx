import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import {
  AVAILABLE_LANGUAGES,
  getSavedLanguage,
  saveLanguage,
  useTranslation,
} from '../services/i18n';

interface BeneficiaryLanguagePageProps {
  onLanguageSelected: (lang: SupportedLanguage) => void;
}

export const BeneficiaryLanguagePage: React.FC<BeneficiaryLanguagePageProps> = ({
  onLanguageSelected,
}) => {
  const navigate = useNavigate();
  const [selectedLang, setSelectedLang] = useState<SupportedLanguage>(getSavedLanguage());
  const t = useTranslation(selectedLang);

  const handleSelectLanguage = (code: SupportedLanguage) => {
    setSelectedLang(code);
    saveLanguage(code);
    onLanguageSelected(code);
  };

  const handleContinue = () => {
    saveLanguage(selectedLang);
    onLanguageSelected(selectedLang);
    navigate('/beneficiary/auth');
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
                  Beneficiary Portal
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Change Role</span>
          </button>
        </div>
      </header>

      {/* Language Selection Card Body */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col justify-center w-full">
        <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur">
          {/* Header */}
          <div className="text-center max-w-xl mx-auto mb-8 space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              {t.selectLanguageTitle}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              {t.selectLanguageSubtitle}
            </p>
          </div>

          {/* 7 Extensible Language Options (English, Hindi, Marathi, Telugu, Tamil, Kannada, Bengali) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-8">
            {AVAILABLE_LANGUAGES.map((lang) => {
              const isSelected = selectedLang === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelectLanguage(lang.code)}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 relative ${
                    isSelected
                      ? 'bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/40 shadow-lg shadow-teal-500/10'
                      : 'bg-slate-900/60 border-slate-700/80 hover:border-slate-500 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-lg font-bold text-white block">
                        {lang.nativeName}
                      </span>
                      <span className="text-xs font-medium text-slate-400 block mt-0.5">
                        {lang.name}
                      </span>
                    </div>

                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'border-teal-400 bg-teal-500 text-slate-950'
                          : 'border-slate-600 bg-slate-800'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-4 h-4" />}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 mt-2 font-mono">
                    {lang.subtext}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Guidance Note */}
          <div className="flex items-start space-x-2 text-xs text-slate-400 bg-slate-900/80 p-3.5 rounded-xl border border-slate-700/60 mb-6">
            <Info className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
            <span>{t.changeLanguageAnytime}</span>
          </div>

          {/* Continue Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-700/60">
            <button
              onClick={() => navigate('/')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 text-xs font-semibold transition-colors"
            >
              Back to Role Selection
            </button>

            <button
              onClick={handleContinue}
              className="w-full sm:w-auto px-7 py-3 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2"
            >
              <span>{t.continueWithLanguage}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
