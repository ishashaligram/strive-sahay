export async function getSessionToken(){
 const stored=sessionStorage.getItem('screening_access_token')||'';
 if(stored.startsWith('presentation_')||import.meta.env?.VITE_AUTH_MODE!=='firebase')return stored;
 const {auth}=await import('./firebase');
 const token=auth.currentUser?await auth.currentUser.getIdToken():stored;
 if(token)sessionStorage.setItem('screening_access_token',token);
 return token;
}
export async function signOutFirebaseIfEnabled(){
 if(import.meta.env?.VITE_AUTH_MODE!=='firebase')return;
 const [{auth},{signOut}]=await Promise.all([import('./firebase'),import('firebase/auth')]);
 await signOut(auth);
}
