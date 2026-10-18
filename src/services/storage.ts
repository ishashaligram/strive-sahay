import {
  Beneficiary,
  BusinessProfile,
  MentorQuestion,
  AssessmentVersion,
  Assessor,
  HumanReview,
  StaffingAlert,
  SupportedLanguage,
} from '../types';
import {
  HISTORICAL_BENEFICIARIES,
  INITIAL_ASSESSORS,
  STRIVE_COHORTS,
  STRIVE_TRADES,
} from '../data/striveDataset';

const STORAGE_KEYS = {
  BENEFICIARIES: 'strive_sahay_beneficiaries_v1',
  PROFILES: 'strive_sahay_profiles_v1',
  QUESTIONS: 'strive_sahay_questions_v1',
  ASSESSMENTS: 'strive_sahay_assessments_v1',
  ASSESSORS: 'strive_sahay_assessors_v1',
  REVIEWS: 'strive_sahay_reviews_v1',
  ALERTS: 'strive_sahay_alerts_v1',
  ACTIVE_USER: 'strive_sahay_active_user_v1',
  SETTINGS: 'strive_sahay_settings_v1',
};

export interface AppSettings {
  eligibilityThreshold: number; // default 7.0
  devOtpMode: boolean; // default true for test
  autoAllocationEnabled: boolean;
  minCompletenessRequired: number; // 80%
}

const DEFAULT_SETTINGS: AppSettings = {
  eligibilityThreshold: 7.0,
  devOtpMode: true,
  autoAllocationEnabled: true,
  minCompletenessRequired: 80,
};

class StorageService {
  private get<T>(key: string, defaultValue: T): T {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  private set<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error', e);
    }
  }

  // Beneficiaries
  getBeneficiaries(): Beneficiary[] {
    return this.get<Beneficiary[]>(STORAGE_KEYS.BENEFICIARIES, HISTORICAL_BENEFICIARIES);
  }

  saveBeneficiary(beneficiary: Beneficiary): void {
    const list = this.getBeneficiaries();
    const index = list.findIndex((b) => b.id === beneficiary.id);
    if (index >= 0) {
      list[index] = beneficiary;
    } else {
      list.unshift(beneficiary);
    }
    this.set(STORAGE_KEYS.BENEFICIARIES, list);
  }

  getBeneficiaryById(id: string): Beneficiary | undefined {
    return this.getBeneficiaries().find((b) => b.id === id);
  }

  getBeneficiaryByMobile(mobile: string): Beneficiary | undefined {
    const clean = mobile.replace(/\D/g, '');
    return this.getBeneficiaries().find((b) => b.mobileNumber.replace(/\D/g, '') === clean);
  }

  // Active Session
  getActiveUser(): { role: 'beneficiary' | 'assessor' | 'admin'; id: string; name: string } | null {
    return this.get(STORAGE_KEYS.ACTIVE_USER, null);
  }

  setActiveUser(user: { role: 'beneficiary' | 'assessor' | 'admin'; id: string; name: string } | null): void {
    this.set(STORAGE_KEYS.ACTIVE_USER, user);
  }

  // Business Profiles
  getProfiles(): BusinessProfile[] {
    return this.get<BusinessProfile[]>(STORAGE_KEYS.PROFILES, []);
  }

  getProfileById(profileId: string): BusinessProfile | undefined {
    return this.getProfiles().find((p) => p.id === profileId);
  }

  getProfileByBeneficiaryId(beneficiaryId: string): BusinessProfile | undefined {
    return this.getProfiles().find((p) => p.beneficiaryId === beneficiaryId);
  }

  saveProfile(profile: BusinessProfile): void {
    const list = this.getProfiles();
    const index = list.findIndex((p) => p.id === profile.id);
    if (index >= 0) {
      list[index] = profile;
    } else {
      list.unshift(profile);
    }
    this.set(STORAGE_KEYS.PROFILES, list);
  }

  // Questions
  getQuestions(profileId: string): MentorQuestion[] {
    const all = this.get<Record<string, MentorQuestion[]>>(STORAGE_KEYS.QUESTIONS, {});
    return all[profileId] || [];
  }

  saveQuestions(profileId: string, questions: MentorQuestion[]): void {
    const all = this.get<Record<string, MentorQuestion[]>>(STORAGE_KEYS.QUESTIONS, {});
    all[profileId] = questions;
    this.set(STORAGE_KEYS.QUESTIONS, all);
  }

  // Assessments
  getAssessments(profileId: string): AssessmentVersion[] {
    const all = this.get<Record<string, AssessmentVersion[]>>(STORAGE_KEYS.ASSESSMENTS, {});
    return all[profileId] || [];
  }

  saveAssessment(profileId: string, assessment: AssessmentVersion): void {
    const all = this.get<Record<string, AssessmentVersion[]>>(STORAGE_KEYS.ASSESSMENTS, {});
    const existing = all[profileId] || [];
    const index = existing.findIndex((a) => a.versionNumber === assessment.versionNumber);
    if (index >= 0) {
      existing[index] = assessment;
    } else {
      existing.push(assessment);
    }
    all[profileId] = existing;
    this.set(STORAGE_KEYS.ASSESSMENTS, all);
  }

  getLatestAssessment(profileId: string): AssessmentVersion | undefined {
    const versions = this.getAssessments(profileId);
    if (!versions.length) return undefined;
    return versions.reduce((prev, curr) => (curr.versionNumber > prev.versionNumber ? curr : prev));
  }

  // Assessors
  getAssessors(): Assessor[] {
    return this.get<Assessor[]>(STORAGE_KEYS.ASSESSORS, INITIAL_ASSESSORS);
  }

  saveAssessor(assessor: Assessor): void {
    const list = this.getAssessors();
    const index = list.findIndex((a) => a.id === assessor.id);
    if (index >= 0) {
      list[index] = assessor;
    } else {
      list.push(assessor);
    }
    this.set(STORAGE_KEYS.ASSESSORS, list);
  }

  getAssessorById(id: string): Assessor | undefined {
    return this.getAssessors().find((a) => a.id === id);
  }

  // Human Reviews
  getReviews(): HumanReview[] {
    return this.get<HumanReview[]>(STORAGE_KEYS.REVIEWS, []);
  }

  getReviewByProfileId(profileId: string): HumanReview | undefined {
    return this.getReviews().find((r) => r.profileId === profileId);
  }

  saveReview(review: HumanReview): void {
    const list = this.getReviews();
    const index = list.findIndex((r) => r.id === review.id);
    if (index >= 0) {
      list[index] = review;
    } else {
      list.unshift(review);
    }
    this.set(STORAGE_KEYS.REVIEWS, list);
  }

  // Staffing Alerts
  getAlerts(): StaffingAlert[] {
    return this.get<StaffingAlert[]>(STORAGE_KEYS.ALERTS, []);
  }

  saveAlert(alert: StaffingAlert): void {
    const list = this.getAlerts();
    list.unshift(alert);
    this.set(STORAGE_KEYS.ALERTS, list);
  }

  dismissAlert(alertId: string): void {
    const list = this.getAlerts().filter((a) => a.id !== alertId);
    this.set(STORAGE_KEYS.ALERTS, list);
  }

  // Settings
  getSettings(): AppSettings {
    return this.get<AppSettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
  }

  saveSettings(settings: AppSettings): void {
    this.set(STORAGE_KEYS.SETTINGS, settings);
  }

  // Reset to factory clean state
  resetAll(): void {
    localStorage.removeItem(STORAGE_KEYS.BENEFICIARIES);
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.QUESTIONS);
    localStorage.removeItem(STORAGE_KEYS.ASSESSMENTS);
    localStorage.removeItem(STORAGE_KEYS.ASSESSORS);
    localStorage.removeItem(STORAGE_KEYS.REVIEWS);
    localStorage.removeItem(STORAGE_KEYS.ALERTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_USER);
  }
}

export const storage = new StorageService();
