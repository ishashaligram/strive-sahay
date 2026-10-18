import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  User,
  ShieldCheck,
  Building2,
  ArrowRight,
  Globe,
  Compass,
  CheckCircle2,
  Shield,
  Layers,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
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
                Multilingual AI Business Screening & Mentoring Platform
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-400 hidden md:inline-flex items-center space-x-1.5 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <Shield className="w-3.5 h-3.5 text-teal-400" />
              <span>Role-Based Secure Access</span>
            </span>
          </div>
        </div>
      </header>

      {/* Hero Introduction */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16 space-y-4">
          <div className="inline-flex items-center space-x-2 bg-teal-500/10 border border-teal-500/30 px-3.5 py-1.5 rounded-full text-xs font-semibold text-teal-300 shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>Tata STRIVE Entrepreneur Incubation Portal</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Welcome to <span className="text-teal-400">STRIVE SAHAY</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Empowering grassroots entrepreneurs across India. Submit business ideas in your mother tongue, receive adaptive AI mentoring, improve your pitch, and qualify for incubation review before reaching human assessors.
          </p>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest pt-2">
            Select your role to access the platform
          </p>
        </div>

        {/* 3 Selectable Role Cards (Section: LANDING PAGE) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto w-full">
          {/* Card 1: Beneficiary */}
          <div
            onClick={() => navigate('/beneficiary/language')}
            className="group relative bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-7 border border-slate-700/80 hover:border-teal-500 shadow-xl hover:shadow-2xl hover:shadow-teal-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <User className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800 inline-block mb-1.5">
                  Multilingual Portal
                </span>
                <h3 className="text-xl font-bold text-white group-hover:text-teal-300 transition-colors">
                  Aspiring Entrepreneur
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Submit your business idea in your preferred language (English, हिन्दी, मराठी, తెలుగు, தமிழ், ಕನ್ನಡ, বাংলা, ଓଡ଼ିଆ), receive adaptive AI mentoring, improve your pitch, and qualify for incubation.
                </p>
              </div>

              <div className="pt-2">
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span>8 languages with configured translation</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span>Adaptive AI mentor & live business profile</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                    <span>Phone login and on-screen OTP</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-teal-400 group-hover:text-teal-300">
              <span>Continue as Beneficiary</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 2: Assessor */}
          <div
            onClick={() => navigate('/assessor/login')}
            className="group relative bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-7 border border-slate-700/80 hover:border-amber-500 shadow-xl hover:shadow-2xl hover:shadow-amber-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950 px-2 py-0.5 rounded border border-amber-800 inline-block mb-1.5">
                  Evaluators Only
                </span>
                <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                  Technical Assessor
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Evaluate allocated micro-enterprise pitches, review evidence and translations, provide 8-domain rubric ratings, and deliver expert guidance to entrepreneurs.
                </p>
              </div>

              <div className="pt-2">
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>English-only professional interface</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Side-by-side translation & evidence trail</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span>Role-based phone registration</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-amber-400 group-hover:text-amber-300">
              <span>Access Assessor Portal</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Card 3: Admin */}
          <div
            onClick={() => navigate('/admin/login')}
            className="group relative bg-slate-800/80 hover:bg-slate-800 rounded-2xl p-7 border border-slate-700/80 hover:border-purple-500 shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-6 h-6" />
              </div>

              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2 py-0.5 rounded border border-purple-800 inline-block mb-1.5">
                  Directorate HQ
                </span>
                <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                  Program Directorate
                </h3>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  Monitor nationwide cohorts, manage assessor workload and capacity, resolve staffing alerts, calibrate scoring thresholds, and export institutional reports.
                </p>
              </div>

              <div className="pt-2">
                <ul className="text-[11px] text-slate-400 space-y-1.5">
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Cohort analytics and workload overview</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Backend-configured assessor assignments</span>
                  </li>
                  <li className="flex items-center space-x-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    <span>Hybrid assessor allocation</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-700/60 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-purple-300">
              <span>Access Directorate Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2024 Tata STRIVE. STRIVE SAHAY — Multilingual Idea Screening & Mentoring.</p>
          <div className="flex items-center space-x-4 text-slate-400">
            <span>Role Selection Navigation Only</span>
            <span>•</span>
            <span>Zero Unauthenticated Bypass</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
