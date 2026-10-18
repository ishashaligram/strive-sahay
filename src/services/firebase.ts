import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  Firestore,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import {
  Beneficiary,
  BusinessProfile,
  AssessmentVersion,
  HumanReview,
  BusinessRoadmap,
  Cohort,
  Assessor,
  StaffingAlert,
  MentorQuestion,
} from '../types';

// Firebase configuration from environment or fallback template
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDemoPlaceholderForStriveSahay',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'strive-sahay-demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'strive-sahay-demo',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'strive-sahay-demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '123456789012',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:123456789012:web:abcdef123456',
};

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;
let isConfiguredAndConnected = false;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  db = getFirestore(app);
  auth = getAuth(app);
  // Real check: has user provided real credentials?
  if (
    import.meta.env.VITE_FIREBASE_API_KEY &&
    !import.meta.env.VITE_FIREBASE_API_KEY.includes('Placeholder')
  ) {
    isConfiguredAndConnected = true;
  }
} catch (e) {
  console.warn('Firebase initialization note (using hybrid resilient storage):', e);
  app = null;
  db = null;
  auth = null;
  isConfiguredAndConnected = false;
}

export { app, db, auth };

export const isFirebaseConfigured = (): boolean => isConfiguredAndConnected;

export async function checkFirebaseHealth(): Promise<boolean> {
  if (!db || !isConfiguredAndConnected) return false;
  try {
    const testDoc = await getDoc(doc(db, 'system_meta', 'ping'));
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// FIRESTORE CRUD HELPERS WITH HYBRID CACHE
// ==========================================

export async function saveBeneficiaryToFirestore(beneficiary: Beneficiary): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'beneficiaries', beneficiary.id), beneficiary, { merge: true });
  } catch (err) {
    console.warn('Firestore saveBeneficiary error:', err);
  }
}

export async function getBeneficiariesFromFirestore(): Promise<Beneficiary[]> {
  if (!db || !isConfiguredAndConnected) return [];
  try {
    const snapshot = await getDocs(collection(db, 'beneficiaries'));
    return snapshot.docs.map((d) => d.data() as Beneficiary);
  } catch (err) {
    console.warn('Firestore getBeneficiaries error:', err);
    return [];
  }
}

export async function saveProfileToFirestore(profile: BusinessProfile): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'profiles', profile.id), profile, { merge: true });
  } catch (err) {
    console.warn('Firestore saveProfile error:', err);
  }
}

export async function getProfilesFromFirestore(): Promise<BusinessProfile[]> {
  if (!db || !isConfiguredAndConnected) return [];
  try {
    const snapshot = await getDocs(collection(db, 'profiles'));
    return snapshot.docs.map((d) => d.data() as BusinessProfile);
  } catch (err) {
    console.warn('Firestore getProfiles error:', err);
    return [];
  }
}

export async function saveAssessmentToFirestore(profileId: string, assessment: AssessmentVersion): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'profiles', profileId, 'assessments', `v_${assessment.versionNumber}`), assessment);
  } catch (err) {
    console.warn('Firestore saveAssessment error:', err);
  }
}

export async function getAssessmentsFromFirestore(profileId: string): Promise<AssessmentVersion[]> {
  if (!db || !isConfiguredAndConnected) return [];
  try {
    const snapshot = await getDocs(collection(db, 'profiles', profileId, 'assessments'));
    return snapshot.docs.map((d) => d.data() as AssessmentVersion);
  } catch (err) {
    console.warn('Firestore getAssessments error:', err);
    return [];
  }
}

export async function saveReviewToFirestore(review: HumanReview): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'reviews', review.id), review, { merge: true });
  } catch (err) {
    console.warn('Firestore saveReview error:', err);
  }
}

export async function getReviewsFromFirestore(): Promise<HumanReview[]> {
  if (!db || !isConfiguredAndConnected) return [];
  try {
    const snapshot = await getDocs(collection(db, 'reviews'));
    return snapshot.docs.map((d) => d.data() as HumanReview);
  } catch (err) {
    console.warn('Firestore getReviews error:', err);
    return [];
  }
}

export async function saveRoadmapToFirestore(roadmap: BusinessRoadmap): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'roadmaps', roadmap.id), roadmap, { merge: true });
  } catch (err) {
    console.warn('Firestore saveRoadmap error:', err);
  }
}

export async function getRoadmapFromFirestore(profileId: string): Promise<BusinessRoadmap | undefined> {
  if (!db || !isConfiguredAndConnected) return undefined;
  try {
    const snapshot = await getDocs(collection(db, 'roadmaps'));
    const all = snapshot.docs.map((d) => d.data() as BusinessRoadmap);
    return all.find((r) => r.profileId === profileId);
  } catch (err) {
    console.warn('Firestore getRoadmap error:', err);
    return undefined;
  }
}

export async function saveCohortToFirestore(cohort: Cohort): Promise<void> {
  if (!db || !isConfiguredAndConnected) return;
  try {
    await setDoc(doc(db, 'cohorts', cohort.id), cohort, { merge: true });
  } catch (err) {
    console.warn('Firestore saveCohort error:', err);
  }
}

export async function getCohortsFromFirestore(): Promise<Cohort[]> {
  if (!db || !isConfiguredAndConnected) return [];
  try {
    const snapshot = await getDocs(collection(db, 'cohorts'));
    return snapshot.docs.map((d) => d.data() as Cohort);
  } catch (err) {
    console.warn('Firestore getCohorts error:', err);
    return [];
  }
}
