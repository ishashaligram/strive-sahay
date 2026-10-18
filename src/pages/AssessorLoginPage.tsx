import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { storage } from '../services/storage';

interface AssessorLoginPageProps {
  onLoginSuccess: (user: { role: 'assessor'; id: string; name: string }) => void;
}

export const AssessorLoginPage: React.FC<AssessorLoginPageProps> = ({
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const assessors = storage.getAssessors();

  const [selectedAssessorId, setSelectedAssessorId] = useState(assessors[0]?.id || '');
  const [password, setPassword] = useState('assessor2024');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const assessor = storage.getAssessorById(selectedAssessorId);
    if (!assessor) {
      setError('Selected assessor account not found. Please contact administration.');
      return;
    }

    if (!password.trim()) {
      setError('Please enter your assessor credential password.');
      return;
    }

    onLoginSuccess({
      role: 'assessor',
      id: assessor.id,
      name: assessor.fullName,
    });

    navigate('/assessor/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-extrabold shadow-inner">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">STRIVE SAHAY</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                  Assessor Portal
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Role Selection</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-lg mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center w-full">
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-3xl p-6 sm:p-9 shadow-2xl backdrop-blur">
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Technical Assessor Login
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              Restricted to accredited Tata STRIVE technical assessors. Login with your approved staff credentials.
            </p>
          </div>

          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-start space-x-2.5 mb-6">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="leading-relaxed">
              <strong>Admin Provisioned Accounts:</strong> Assessor credentials are created and managed by the Directorate. All evaluations and reviews are conducted in English.
            </div>
          </div>

          {error && (
            <div className="p-3 mb-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Select Approved Assessor Account
              </label>
              <select
                value={selectedAssessorId}
                onChange={(e) => setSelectedAssessorId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                {assessors.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.fullName} — {a.tradeExpertise.join(', ')} ({a.regions.join(', ')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
            >
              <span>Access Assessor Review Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
