export type UserRole = 'beneficiary' | 'assessor' | 'admin';

export type SupportedLanguage = 'en' | 'mr' | 'hi' | 'te' | 'ta' | 'kn' | 'bn';

export type FactStatus = 'PROVIDED' | 'MISSING' | 'UNCLEAR' | 'CONFLICTING' | 'UNKNOWN';

export interface FactItem {
  key: string;
  label: Record<string, string>;
  value: string;
  status: FactStatus;
  evidenceQuote?: string;
  source: string;
  lastUpdated: string;
}

export interface BusinessProfile {
  id: string;
  beneficiaryId: string;
  title: string;
  trade: string;
  submissionType: 'text' | 'audio' | 'document';
  originalLanguage: SupportedLanguage;
  originalText: string;
  translatedTextEn: string;
  audioUrl?: string;
  audioDurationSec?: number;
  documentName?: string;
  documentType?: string;
  submittedAt: string;
  updatedAt: string;
  isDemoRecord?: boolean;
  correctedSummary?: string;
  scoreHistory?: ScoreHistoryEntry[];
  inconsistencies?: InconsistencyItem[];

  // 5 Key Modules
  overview: {
    businessName: FactItem;
    trade: FactItem;
    productService: FactItem;
    proposedLocation: FactItem;
    businessStage: FactItem;
  };
  market: {
    targetCustomers: FactItem;
    customerProblem: FactItem;
    demandEvidence: FactItem;
    competition: FactItem;
    differentiation: FactItem;
    salesChannels: FactItem;
  };
  finance: {
    initialInvestment: FactItem;
    availableCapital: FactItem;
    unitCost: FactItem;
    sellingPrice: FactItem;
    expectedSales: FactItem;
    revenueAssumptions: FactItem;
    monthlyExpenses: FactItem;
  };
  operations: {
    equipment: FactItem;
    suppliers: FactItem;
    capacity: FactItem;
    skills: FactItem;
    staffing: FactItem;
    distribution: FactItem;
  };
  risk: {
    marketRisks: FactItem;
    financialRisks: FactItem;
    operationalRisks: FactItem;
    mitigation: FactItem;
    compliance: FactItem;
  };
}

export interface MentorQuestion {
  id: string;
  fieldKey: string;
  module: 'overview' | 'market' | 'finance' | 'operations' | 'risk';
  question: Record<string, string>;
  contextRationale: Record<string, string>;
  practicalGuidance: Record<string, string>;
  suggestedAnswers?: string[];
  status: 'pending' | 'answered' | 'skipped' | 'dont_know';
  beneficiaryAnswer?: string;
  answeredAt?: string;
}

export type DomainKey =
  | 'businessClarity'
  | 'customerDemand'
  | 'marketPotential'
  | 'financialViability'
  | 'operationalFeasibility'
  | 'competitiveAdvantage'
  | 'entrepreneurReadiness'
  | 'riskAwareness';

export interface DomainScore {
  domain: DomainKey;
  weight: number; // e.g. 0.15 for 15%
  rating: number; // 0 to 5
  evidence: string;
  explanation: string;
  uncertainty: 'Low' | 'Medium' | 'High';
  improvementRecommendation: string;
  humanOverrideRating?: number;
  humanOverrideJustification?: string;
}

export interface AssessmentVersion {
  versionNumber: number;
  evaluatedAt: string;
  overallScore: number; // out of 10.0
  isEligible: boolean; // >= threshold
  completenessPercentage: number;
  domains: Record<DomainKey, DomainScore>;
  swot: {
    strengths: string[];
    weaknesses: string[];
    opportunities: string[];
    threats: string[];
  };
  priorityActions: string[];
  modelName: string;
  rubricVersion: string;
}

export interface SimilarBusinessConcept {
  id: string;
  title: string;
  trade: string;
  district: string;
  keyStrategy: string;
  similarityScore: number; // e.g. 0.88
  privacySafeSummary: string;
}

export interface VerifiedLocalInsight {
  businessName: string;
  category: string;
  location: string;
  source: string;
  retrievalDate: string;
  distanceKm?: number;
}

export interface Beneficiary {
  id: string;
  referenceId: string; // e.g. STRIVE-2024-MH-8492
  fullName: string;
  mobileNumber: string;
  state: string;
  district: string;
  region: string;
  talukaBlock?: string;
  preferredLanguage: SupportedLanguage;
  cohortId: string;
  email?: string;
  consentGiven: boolean;
  createdAt: string;
  currentStatus:
    | 'registered'
    | 'idea_submitted'
    | 'ai_mentoring'
    | 'assessment_pending'
    | 'eligible'
    | 'submitted_to_assessor'
    | 'under_human_review'
    | 'clarification_requested'
    | 'assessed'
    | 'escalated_mentor';
  assignedAssessorId?: string;
  waitingForAssessor: boolean;
  activeProfileId?: string;
  isDemoRecord?: boolean;
}

export interface Assessor {
  id: string;
  fullName: string;
  email: string;
  mobile: string;
  tradeExpertise: string[];
  regions: string[];
  maxWorkload: number;
  currentWorkload: number;
  isAvailable: boolean;
  ratingAverage: number;
  completedReviewsCount: number;
  isDemoRecord?: boolean;
}

export interface Cohort {
  id: string;
  name: string;
  center: string;
  district: string;
  state: string;
  startDate: string;
  targetTrades: string[];
  totalBeneficiaries: number;
  activeCases?: number;
  completionRate?: number;
  isDemoRecord?: boolean;
}

export interface Trade {
  id: string;
  name: string;
  nameMr: string;
  nameHi: string;
  category: string;
  typicalCapexMin: number;
  typicalCapexMax: number;
  keyComplianceRequirements: string[];
}

export interface StaffingAlert {
  id: string;
  trade: string;
  region: string;
  unassignedCasesCount: number;
  createdAt: string;
  severity: 'warning' | 'critical';
  message: string;
}

// 4 Official Assessor Recommendation Outcomes
export type AssessorOutcome =
  | 'FURTHER_MENTORING_REQUIRED'
  | 'PILOT_MARKET_VALIDATION'
  | 'BUSINESS_LAUNCH_READY'
  | 'INVESTMENT_READINESS_REVIEW'
  | 'APPROVED_FOR_INCUBATION'
  | 'NEEDS_FURTHER_REFINEMENT'
  | 'REJECTED';

export interface HumanReview {
  id: string;
  profileId: string;
  assessorId: string;
  assessorName: string;
  evaluatedAt: string;
  finalScore: number; // out of 10.0
  recommendationDecision: AssessorOutcome;
  feedbackEn: string;
  feedbackTranslated: string;
  targetLanguage: SupportedLanguage;
  domainOverrides: Partial<Record<DomainKey, { rating: number; justification: string }>>;
  correctedSummary?: string;
  clarificationRequest?: string;
  clarificationResponse?: string;
  status: 'DRAFT' | 'SUBMITTED';
}

// Inconsistencies, Contradictions & Unrealistic Financials
export type InconsistencyType =
  | 'CONTRADICTION'
  | 'UNREALISTIC_FINANCIAL'
  | 'UNCERTAIN_ASSUMPTION'
  | 'CRITICAL_MISSING';

export interface InconsistencyItem {
  id: string;
  fieldKey: string;
  issueType: InconsistencyType;
  severity: 'critical' | 'warning';
  title: Record<string, string>;
  description: Record<string, string>;
  valueA?: { value: string; source: string; timestamp?: string };
  valueB?: { value: string; source: string; timestamp?: string };
  deterministicCalculations?: {
    formula: string;
    result: string;
    benchmark: string;
    status: 'PASS' | 'WARN' | 'FAIL';
  };
  resolutionStatus: 'UNRESOLVED' | 'RESOLVED' | 'DONT_KNOW';
  resolvedValue?: string;
  resolvedAt?: string;
  blocksSubmission: boolean;
}

// Score History Tracking
export interface ScoreHistoryEntry {
  versionNumber: number;
  evaluatedAt: string;
  overallScore: number;
  completenessPercentage: number;
  reason: string;
  changedFields?: string[];
  deltaFromPrevious?: number;
  domains: Record<DomainKey, { rating: number; explanation: string }>;
}

// Beneficiary Business Development Roadmap
export interface RoadmapTask {
  id: string;
  domain: DomainKey;
  title: Record<string, string>;
  missingElement: Record<string, string>;
  whyItMatters: Record<string, string>;
  howToImprove: Record<string, string>;
  whatActionToTake: Record<string, string>;
  dayOffset: number;
  status: 'todo' | 'in_progress' | 'completed';
  evidenceRequired: boolean;
  evidenceUploaded?: {
    fileName: string;
    fileType: string;
    uploadedAt: string;
    previewUrl?: string;
    notes?: string;
  };
}

export interface StartupCostCalculator {
  capexItems: { name: string; cost: number; category: string }[];
  totalCapex: number;
  unitCost: number;
  sellingPrice: number;
  monthlyExpectedVolume: number;
  monthlyFixedCosts: number;
  grossMarginPercent: number;
  monthlyGrossProfit: number;
  monthlyNetProfit: number;
}

export interface BreakevenAnalysis {
  fixedCostsMonthly: number;
  contributionMarginPerUnit: number;
  breakevenUnitsMonthly: number;
  breakevenRevenueMonthly: number;
  capacityUtilizationAtBreakeven: number;
  isViable: boolean;
  riskAssessment: string;
}

export interface MarketValidationChecklist {
  id: string;
  title: Record<string, string>;
  targetCount: number;
  completedCount: number;
  isCompleted: boolean;
  notes: string[];
}

export interface SkillMentoringActivity {
  id: string;
  title: Record<string, string>;
  category: 'Tata STRIVE Training' | 'Government Schemes (Mudra/Standup)' | 'FSSAI/Compliance' | 'Financial Literacy';
  description: Record<string, string>;
  actionUrl?: string;
  isCompleted: boolean;
}

export interface BusinessRoadmap {
  id: string;
  profileId: string;
  beneficiaryId: string;
  createdAt: string;
  updatedAt: string;
  timeframe: '7_days' | '30_days';
  tasks: RoadmapTask[];
  calculator: StartupCostCalculator;
  breakeven: BreakevenAnalysis;
  checklist: MarketValidationChecklist[];
  skills: SkillMentoringActivity[];
  overallProgressPercentage: number;
  reassessmentRequested: boolean;
  humanMentoringRequested: boolean;
  humanMentoringNotes?: string;
}

// System Status for Python/Ollama/Firebase services
export interface BackendSystemStatus {
  fastapi: boolean;
  fasterWhisper: boolean;
  pdfplumber: boolean;
  indicTrans2: boolean;
  ollamaQwen3: boolean;
  ollamaModel: string;
  firebase: boolean;
  lastChecked: string;
}
