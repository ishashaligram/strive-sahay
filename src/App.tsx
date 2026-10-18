import {signOutFirebaseIfEnabled} from './services/sessionAuth';
import React, {useState} from 'react';
import {Routes,Route,Navigate,useNavigate,useLocation} from 'react-router-dom';
import {SupportedLanguage,UserRole} from './types';
import {storage} from './services/storage';
import {api} from './services/screeningApi';
import {getSavedLanguage,saveLanguage} from './services/i18n';
import {Navbar} from './components/Navbar';
import {ProtectedRoute} from './components/ProtectedRoute';
import {ScreeningWorkspace} from './components/ScreeningWorkspace';
import {AssessorPortal} from './components/AssessorPortal';
import {ProgramAdmin} from './components/ProgramAdmin';
import {LandingPage} from './pages/LandingPage';
import {BeneficiaryLanguagePage} from './pages/BeneficiaryLanguagePage';
import {PageErrorBoundary} from './components/PageErrorBoundary';
import {navigationPath} from './services/navigation';
import {ui} from './services/uiI18n';
import {AccountLogin} from './components/AccountLogin';



export default function App() {
  const navigate=useNavigate(), location=useLocation();
  const [user,setUser]=useState(storage.getActiveUser());
  const [language,setLanguage]=useState<SupportedLanguage>(getSavedLanguage());
  const login=(next:{role:UserRole;id:string;name:string})=>{sessionStorage.removeItem('screening_access_token');storage.setActiveUser(next);setUser(next);};
  const changeLanguage=(lang:SupportedLanguage)=>{setLanguage(lang);saveLanguage(lang);if(sessionStorage.getItem('screening_access_token')){void api('/profile',{preferred_language:lang}).catch(()=>{});}};
  const logout=()=>{void signOutFirebaseIfEnabled().catch(()=>{});void api('/auth/logout',{}).catch(()=>{});sessionStorage.removeItem('screening_access_token');storage.setActiveUser(null);setUser(null);navigate('/');};
  const dashboard=/\/(dashboard|mentor|improvement)$/.test(location.pathname);
  const view=location.pathname.includes('assessor')?'assessor':location.pathname.includes('admin')?'admin':location.pathname.includes('mentor')?'mentor':location.pathname.includes('improvement')?'improvement':'dashboard';
  return <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
    {dashboard&&user&&<Navbar currentRole={user.role} currentLang={user.role==='beneficiary'?language:'en'} activeUserName={user.name} onSelectRole={()=>{}} onSelectLang={user.role==='beneficiary'?changeLanguage:()=>{}} onLogout={logout} currentView={view} onNavigate={v=>navigate(navigationPath(user.role,v))} onResetData={()=>{storage.resetAll();logout();}}/>}
    <main className="flex-1">{dashboard&&sessionStorage.getItem('screening_access_token')?.startsWith('presentation_')&&<p className="bg-amber-50 text-amber-900 border-b border-amber-200 p-3 text-center text-sm">{language==='en'?'Presentation mode · On-screen OTP · Demo records only':ui(language)('demoPhoneNotice')}</p>}<PageErrorBoundary key={location.pathname}><Routes>
      <Route path="/" element={<LandingPage/>}/>
      <Route path="/beneficiary/language" element={<BeneficiaryLanguagePage onLanguageSelected={changeLanguage}/>}/>
      <Route path="/beneficiary/auth" element={<AccountLogin role="beneficiary" onLoginSuccess={login} currentLang={language} onLanguageChange={changeLanguage}/>}/>
      {['dashboard','mentor','improvement'].map(path=><Route key={path} path={'/beneficiary/'+path} element={<ProtectedRoute currentUser={user} allowedRole="beneficiary"><ScreeningWorkspace role="beneficiary" language={language} onLanguageChange={changeLanguage}/></ProtectedRoute>}/>)}
      <Route path="/assessor/login" element={<AccountLogin role="assessor" onLoginSuccess={login}/>}/>
      <Route path="/assessor/dashboard" element={<ProtectedRoute currentUser={user} allowedRole="assessor"><AssessorPortal/></ProtectedRoute>}/>
      <Route path="/admin/login" element={<AccountLogin role="admin" onLoginSuccess={login}/>}/>
      <Route path="/admin/dashboard" element={<ProtectedRoute currentUser={user} allowedRole="admin"><ProgramAdmin/></ProtectedRoute>}/>
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes></PageErrorBoundary></main>
    {dashboard&&<footer className="bg-white border-t p-4 text-center text-xs text-slate-500">STRIVE SAHAY · Qwen3-8B · IndicTrans2 · Evidence-based business screening</footer>}
  </div>;
}
