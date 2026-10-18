export async function getSessionToken(){
 return sessionStorage.getItem('screening_access_token')||'';
}
export async function signOutFirebaseIfEnabled(){
 if(import.meta.env?.VITE_AUTH_MODE!=='firebase')return;
 const [{auth},{signOut}]=await Promise.all([import('./firebase'),import('firebase/auth')]);
 await signOut(auth);
}
