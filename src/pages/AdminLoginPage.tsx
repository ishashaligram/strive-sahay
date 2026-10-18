import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Sparkles,
  Shield,
  Info,
} from 'lucide-react';

interface AdminLoginPageProps {
  onLoginSuccess: (user: { role: 'admin'; id: string; name: string }) => void;
}

export const AdminLoginPage: React.FC<AdminLoginPageProps> = ({
  onLoginSuccess,
}) => {
  const navigate = useNavigate();
  const [adminEmail, setAdminEmail] = useState('directorate.hq@tatastrive.org');
  const [password, setPassword] = useState('striveAdmin2024');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!adminEmail.trim() || !password.trim()) {
      setError('Please provide administrative credentials.');
      return;
    }

    onLoginSuccess({
      role: 'admin',
      id: 'admin_directorate_hq',
      name: 'Tata STRIVE Program Directorate',
    });

    navigate('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-extrabold shadow-inner">
              <Building2 className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-tight text-white">STRIVE SAHAY</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                  Directorate HQ
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
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-extrabold text-white">
              Program Directorate Login
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
              Secure administrative access for Tata STRIVE leadership, operations, and cohort coordinators.
            </p>
          </div>

          <div className="p-3.5 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs flex items-start space-x-2.5 mb-6">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-purple-400" />
            <div className="leading-relaxed">
              <strong>Restricted Institutional Access:</strong> Admin accounts are provisioned directly by the Tata STRIVE Information Security team.
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
                Directorate Email Address
              </label>
              <input
                type="email"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="name@tatastrive.org"
                className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Security Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 pr-10"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.01] flex items-center justify-center space-x-2"
            >
              <span>Access Directorate Analytics Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
