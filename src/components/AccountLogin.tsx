import {ui} from '../services/uiI18n';
import React,{useEffect,useState} from 'react';
import {Link,useNavigate} from 'react-router-dom';
import {api} from '../services/screeningApi';
import {SupportedLanguage,UserRole} from '../types';

type Challenge={challenge_id:string;demo_otp:string;expires_in:number;resend_after:number};
export function AccountLogin({role,onLoginSuccess,currentLang,onLanguageChange}:{role:UserRole;onLoginSuccess:(user:{role:UserRole;id:string;name:string})=>void;currentLang?:SupportedLanguage;onLanguageChange?:(lang:SupportedLanguage)=>void}){
 const language=role==='beneficiary'?(currentLang||'en'):'en',t=ui(language),navigate=useNavigate();
 const [mode,setMode]=useState<'login'|'register'>('login');
 const [phone,setPhone]=useState(''),[name,setName]=useState(''),[otp,setOtp]=useState('');
 const [challenge,setChallenge]=useState<Challenge|null>(null),[wait,setWait]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{setChallenge(null);setOtp('');setError('');setMode('login');},[role]);
 useEffect(()=>{if(wait<=0)return;const timer=window.setTimeout(()=>setWait(v=>v-1),1000);return()=>window.clearTimeout(timer);},[wait]);
 const requestCode=async()=>{const result=await api<Challenge>('/auth/request-otp',{phone,role,mode,name,language});if(!result?.challenge_id||!/^\d{6}$/.test(result.demo_otp))throw new Error('The login service returned incomplete data. Please retry.');setChallenge(result);setWait(result.resend_after);setOtp('');};
 const submit=async(e:React.FormEvent)=>{
  e.preventDefault();setBusy(true);setError('');
  try{
   if(!challenge){await requestCode();return;}
   const result=await api<{session_token:string;user:{id:string;name:string;role:UserRole}}>('/auth/verify-otp',{challenge_id:challenge.challenge_id,otp});
   if(!result?.session_token||result.user?.role!==role||!result.user.id)throw new Error('Please sign in again for the selected role.');
   onLoginSuccess(result.user);sessionStorage.setItem('screening_access_token',result.session_token);
   if(role==='beneficiary')await api('/profile',{preferred_language:language}).catch(()=>{});
   navigate('/'+role+'/dashboard');
  }catch(e){setError(t((e as Error).message,{defaultValue:(e as Error).message}));}finally{setBusy(false);}
 };
 const roleLabel=role==='beneficiary'?t('Beneficiary'):role==='assessor'?t('Assessor'):t('Program manager');
 return <div lang={language} className="min-h-screen bg-slate-900 text-white">
  <header className="border-b border-slate-800 p-5 flex justify-between"><Link to="/" className="font-extrabold text-xl">STRIVE SAHAY</Link><Link to="/" className="text-sm text-slate-300">{t('Role selection')}</Link></header>
  <main className="max-w-lg mx-auto p-6 pt-10"><form onSubmit={submit} className="bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-700 space-y-5">
   <p className="text-teal-400 text-sm font-semibold">{roleLabel}</p><h1 className="text-2xl font-extrabold">{t(challenge?'Verify OTP':mode==='register'?'Register':'Sign in')}</h1>
   <p className="bg-amber-950/50 border border-amber-700 rounded-xl p-3 text-sm text-amber-100">{t('demoPhoneNotice')}</p>
   {!challenge&&<div className="grid grid-cols-2 rounded-xl border border-slate-600 overflow-hidden">{(['login','register'] as const).map(value=><button key={value} type="button" disabled={busy} aria-pressed={mode===value} className={'p-3 '+(mode===value?'bg-teal-500 text-slate-950 font-bold':'bg-slate-900')} onClick={()=>{setMode(value);setError('');}}>{t(value==='login'?'Sign in':'Register')}</button>)}</div>}
   {onLanguageChange&&!challenge&&<label className="block">{t('language')}<select className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={language} onChange={e=>onLanguageChange(e.target.value as SupportedLanguage)}>{Object.entries({en:'English',hi:'हिन्दी',mr:'मराठी',te:'తెలుగు',ta:'தமிழ்',kn:'ಕನ್ನಡ',bn:'বাংলা',or:'ଓଡ଼ିଆ'}).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>}
   {!challenge?<>{mode==='register'&&<label className="block">{t('Full name')}<input required autoComplete="name" maxLength={200} className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={name} onChange={e=>setName(e.target.value)}/></label>}<label className="block">{t('Phone number')}<input type="tel" inputMode="tel" autoComplete="tel" required minLength={10} maxLength={20} placeholder="9876543210" className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600" value={phone} onChange={e=>setPhone(e.target.value)}/></label></>:<>
    <p>{t('Phone number')}: {phone}</p><div role="status" className="bg-teal-950 border border-teal-700 p-4 rounded-xl text-center"><p className="text-sm">{t('On-screen demo OTP')}</p><strong className="block text-3xl tracking-[0.3em] mt-2">{challenge.demo_otp}</strong><p className="text-xs mt-2">{t('otpExpiry')}</p></div>
    <label className="block">{t('Enter OTP')}<input required autoFocus inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} className="block w-full rounded-xl p-3 mt-2 bg-slate-900 border border-slate-600 tracking-widest" value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,''))}/></label>
    <div className="flex justify-between gap-3 text-sm"><button type="button" disabled={busy} className="underline" onClick={()=>{setChallenge(null);setError('');setOtp('');}}>{t('Change phone number')}</button><button type="button" disabled={busy||wait>0} className="underline disabled:opacity-50" onClick={async()=>{setBusy(true);setError('');try{await requestCode();}catch(e){setError(t((e as Error).message,{defaultValue:(e as Error).message}));}finally{setBusy(false);}}}>{t('Resend OTP')}{wait>0?' ('+wait+'s)':''}</button></div>
   </>}
   {error&&<p role="alert" className="bg-red-950 text-red-200 p-3 rounded-xl">{error}</p>}
   <button disabled={busy} className="bg-teal-500 text-slate-950 font-bold p-3 rounded-xl w-full disabled:opacity-50">{t(busy?'Please wait…':challenge?'Verify and continue':'Get OTP')}</button>
  </form></main>
 </div>;
}
