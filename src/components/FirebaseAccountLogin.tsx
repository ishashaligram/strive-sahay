import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, firebaseConfigured } from '../services/firebase';
import { ui } from '../services/uiI18n';
import { api } from '../services/screeningApi';
import { SupportedLanguage } from '../types';

type PortalRole = 'beneficiary' | 'assessor' | 'admin';

export function FirebaseAccountLogin({ role, onLoginSuccess, currentLang, onLanguageChange }: {
  role: PortalRole;
  onLoginSuccess: (user: { role: PortalRole; id: string; name: string }) => void;
  currentLang?: SupportedLanguage;
  onLanguageChange?: (lang: SupportedLanguage) => void;
}) {
  const language = role === 'beneficiary' ? (currentLang || 'en') : 'en';
  const t = ui(language);
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const friendlyError = (value: unknown) => {
    const message = value instanceof Error ? value.message : 'Authentication failed. Please try again.';
    if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password') || message.includes('auth/user-not-found')) return 'Email or password is incorrect.';
    if (message.includes('auth/email-already-in-use')) return 'This email is already registered. Switch to Sign in.';
    if (message.includes('auth/weak-password')) return 'Choose a password with at least 6 characters.';
    if (message.includes('auth/invalid-email')) return 'Enter a valid email address.';
    if (message.includes('auth/too-many-requests')) return 'Too many attempts. Wait a little and try again.';
    return message;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    sessionStorage.removeItem('screening_access_token');

    try {
      if (!firebaseConfigured) {
        throw new Error('Firebase configuration is missing. Add VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID and VITE_FIREBASE_APP_ID to the project root .env.local file.');
      }
      if (mode === 'register') {
        if (role !== 'beneficiary') throw new Error('Only beneficiaries can self-register. Contact the administrator for staff access.');
        if (fullName.trim().length < 2) throw new Error('Enter your full name.');

        // If Auth creation succeeded earlier but the backend was temporarily offline,
        // allow the same user to sign in and retry server-side Firestore provisioning.
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
        } catch (creationError) {
          const code = (creationError as { code?: string }).code;
          if (code !== 'auth/email-already-in-use') throw creationError;
          await signInWithEmailAndPassword(auth, email.trim(), password);
        }
        const idToken = await auth.currentUser!.getIdToken(true);
        sessionStorage.setItem('screening_access_token', idToken);
        await api('/auth/register', { display_name: fullName.trim(), preferred_language: language });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }

      const idToken = await auth.currentUser!.getIdToken(true);
      sessionStorage.setItem('screening_access_token', idToken);
      const user = await api<{ id: string; role: PortalRole; name?: string }>('/session');
      if (user.role !== role) {
        throw new Error(`This Firebase account is assigned to the ${user.role} portal, not ${role}.`);
      }

      if (role === 'beneficiary' && currentLang) {
        await api('/profile', { preferred_language: currentLang }).catch(() => undefined);
      }
      onLoginSuccess({ id: user.id, role: user.role, name: user.name || email.trim() });
      sessionStorage.setItem('screening_access_token', await auth.currentUser!.getIdToken());
      navigate(role === 'beneficiary' ? '/beneficiary/dashboard' : `/${role}/dashboard`);
    } catch (submitError) {
      sessionStorage.removeItem('screening_access_token');
      await signOut(auth).catch(() => undefined);
      setError(friendlyError(submitError));
    } finally {
      setBusy(false);
    }
  };

  return <div lang={language} className="min-h-screen bg-slate-900 text-white">
    <header className="border-b border-slate-800 p-5 flex justify-between"><a href="/" className="font-extrabold text-xl">STRIVE SAHAY</a><button onClick={() => navigate('/')} className="text-sm text-slate-300">{t('Role selection')}</button></header>
    <main className="max-w-lg mx-auto p-6 pt-16"><form className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 space-y-5" onSubmit={submit}>
      <p className="text-teal-400 uppercase text-xs tracking-wider font-bold">Firebase secure account</p>
      <h1 className="text-2xl font-extrabold capitalize">{mode === 'register' ? 'Beneficiary registration' : role === 'beneficiary' ? t('Beneficiary Login') : role === 'admin' ? 'Admin Login' : 'Assessor Login'}</h1>
      <p className="text-sm text-slate-300">Sign in with your Firebase email and password. Portal access is determined by the role assigned in Firestore.</p>
      {onLanguageChange && <label className="block text-sm">{t('language')}<select className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={currentLang} onChange={event => onLanguageChange(event.target.value as SupportedLanguage)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option><option value="te">తెలుగు</option><option value="ta">தமிழ்</option><option value="kn">ಕನ್ನಡ</option><option value="bn">বাংলা</option><option value="or">ଓଡ଼ିଆ</option></select></label>}
      {mode === 'register' && <label className="block text-sm">Full name<input type="text" autoComplete="name" required minLength={2} className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={fullName} onChange={event => setFullName(event.target.value)} /></label>}
      <label className="block text-sm">Email<input type="email" autoComplete="email" required className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={email} onChange={event => setEmail(event.target.value)} /></label>
      <label className="block text-sm">Password<input type="password" autoComplete={mode === 'register' ? 'new-password' : 'current-password'} required minLength={6} className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={password} onChange={event => setPassword(event.target.value)} /></label>
      {error && <p role="alert" className="bg-red-950 text-red-200 p-3 rounded-xl text-sm">{error}</p>}
      <button disabled={busy} className="bg-teal-500 text-slate-950 font-bold p-3 rounded-xl w-full disabled:opacity-50">{busy ? 'Connecting securely…' : mode === 'register' ? 'Create beneficiary account' : t('Sign in')}</button>
      {role === 'beneficiary' && <button type="button" disabled={busy} className="w-full text-sm text-teal-300 hover:text-teal-200 disabled:opacity-50" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>{mode === 'login' ? 'New beneficiary? Create an account' : 'Already registered? Sign in'}</button>}
    </form></main>
  </div>;
}
