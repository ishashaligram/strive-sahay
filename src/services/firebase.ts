import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || '';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'missing-firebase-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (projectId ? `${projectId}.firebaseapp.com` : 'missing-firebase-auth-domain'),
  projectId: projectId || 'missing-firebase-project-id',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'missing-firebase-app-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || undefined,
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId && config.appId);

// Keep browser configuration in .env.local; secrets and Admin credentials stay on the backend.
const app = getApps().length ? getApp() : initializeApp(config);
export const auth = getAuth(app);
