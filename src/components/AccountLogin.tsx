import {ui} from '../services/uiI18n';
import React, {useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {api} from '../services/screeningApi';
import {SupportedLanguage} from '../types';

export function AccountLogin({role,onLoginSuccess,currentLang,onLanguageChange}:{role:'beneficiary'|'assessor'|'admin';onLoginSuccess:(user:{role:'beneficiary'|'assessor'|'admin';id:string;name:string})=>void;currentLang?:SupportedLanguage;onLanguageChange?:(lang:SupportedLanguage)=>void}) {
  const language=role==='beneficiary'?(currentLang||'en'):'en';
  const t=ui(language);
  const navigate=useNavigate();
  const [token,setToken]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  return <div lang={language} className="min-h-screen bg-slate-900 text-white">
    <header className="border-b border-slate-800 p-5 flex justify-between"><a href="/" className="font-extrabold text-xl">STRIVE SAHAY</a><button onClick={()=>navigate('/')} className="text-sm text-slate-300">{t("Role selection")}</button></header>
    <main className="max-w-lg mx-auto p-6 pt-16"><form className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700 space-y-5" onSubmit={async e=>{
      e.preventDefault();setBusy(true);setError('');sessionStorage.setItem('screening_access_token',token);
      try {const user=await api<{id:string;role:string}>('/session');if(user.role!==role) throw new Error('This token belongs to a different portal role.');if(role==='beneficiary'){
        const profile=await api<{preferred_language:string;updatedAt?:string}>('/profile').catch(()=>null);
        if(profile?.updatedAt&&onLanguageChange&&profile.preferred_language)onLanguageChange(profile.preferred_language as SupportedLanguage);
        else if(currentLang)await api('/profile',{preferred_language:currentLang}).catch(()=>{});
      }
      onLoginSuccess({id:user.id,role,name:user.id});sessionStorage.setItem('screening_access_token',token);navigate('/'+role+'/dashboard');}
      catch(e) {sessionStorage.removeItem('screening_access_token');setError(t((e as Error).message,{defaultValue:(e as Error).message}));} finally {setBusy(false);}
    }}>
      <p className="text-teal-400 uppercase text-xs tracking-wider font-bold">{t("Secure screening account")}</p>
      <h1 className="text-2xl font-extrabold capitalize">{role==='beneficiary'?t('Beneficiary Login'):role==='admin'?'Admin Login':'Assessor Login'}</h1>
      <p className="text-sm text-slate-300">{t('accountHelp')}</p>
      {onLanguageChange&&<label className="block">{t('language')}<select className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={currentLang} onChange={e=>onLanguageChange(e.target.value as SupportedLanguage)}><option value="en">English</option><option value="hi">हिन्दी</option><option value="mr">मराठी</option><option value="te">తెలుగు</option><option value="ta">தமிழ்</option><option value="kn">ಕನ್ನಡ</option><option value="bn">বাংলা</option></select></label>}
      <label className="block">{t("Account access token")}<input type="password" autoComplete="off" required className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={token} onChange={e=>setToken(e.target.value)}/></label>
      {error&&<p role="alert" className="bg-red-950 text-red-200 p-3 rounded-xl">{error}</p>}
      <button disabled={busy} className="bg-teal-500 text-slate-950 font-bold p-3 rounded-xl w-full disabled:opacity-50">{busy?t('Connecting account…'):t('Sign in')}</button>
    </form></main>
  </div>;
}
