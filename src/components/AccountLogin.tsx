import React,{Suspense} from 'react';
import {PresentationLogin} from './PresentationLogin';
const FirebaseLogin=React.lazy(()=>import('./FirebaseAccountLogin').then(module=>({default:module.FirebaseAccountLogin})));
export function AccountLogin(props:React.ComponentProps<typeof PresentationLogin>){
 return import.meta.env?.VITE_AUTH_MODE==='firebase'?<Suspense fallback={<p role="status" className="p-8">Loading sign in…</p>}><FirebaseLogin {...props}/></Suspense>:<PresentationLogin {...props}/>;
}
