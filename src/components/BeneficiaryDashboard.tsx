import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  UserCheck,
  Send,
  Building,
  Compass,
  AlertCircle,
  ShieldAlert,
  Calendar,
  Check,
  RotateCcw,
  MessageSquare,
  FileCheck2,
} from 'lucide-react';
import {
  Beneficiary,
  BusinessProfile,
  AssessmentVersion,
  SupportedLanguage,
  MentorQuestion,
  InconsistencyItem,
} from '../types';
import { STRIVE_COHORTS, STRIVE_TRADES } from '../data/striveDataset';
import { useTranslation } from '../services/i18n';
import { storage } from '../services/storage';
import { ContradictionEngine } from '../services/contradictionEngine';
import { BeneficiaryRoadmapModal } from './BeneficiaryRoadmapModal';

interface BeneficiaryDashboardProps {
  beneficiary: Beneficiary;
  profile?: BusinessProfile;
  latestAssessment?: AssessmentVersion;
  questions: MentorQuestion[];
  completeness: number;
  currentLang: SupportedLanguage;
  onOpenSubmitModal: () => void;
  onNavigateToMentor: () => void;
  onNavigateToImprovement: () => void;
  onSubmitToAssessor: () => void;
  onTriggerReassessment?: () => void;
}

export const BeneficiaryDashboard: React.FC<BeneficiaryDashboardProps> = ({
  beneficiary,
  profile,
  latestAssessment,
  questions,
  completeness,
  currentLang,
  onOpenSubmitModal,
  onNavigateToMentor,
  onNavigateToImprovement,
  onSubmitToAssessor,
  onTriggerReassessment,
}) => {
  const t = useTranslation(currentLang);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  // Inconsistencies & Contradictions
  const [inconsistencies, setInconsistencies] = useState<InconsistencyItem[]>(() => {
    if (!profile) return [];
    const saved = storage.getInconsistencies(profile.id);
    if (saved.length > 0) return saved;
    const detected = ContradictionEngine.evaluateInconsistencies(profile);
    storage.saveInconsistencies(profile.id, detected);
    return detected;
  });

  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [customResolveText, setCustomResolveText] = useState('');

  const cohort = STRIVE_COHORTS.find((c) => c.id === beneficiary.cohortId);
  const trade = profile ? STRIVE_TRADES.find((tr) => tr.id === profile.trade) : undefined;
  const unansweredCount = questions.filter((q) => q.status === 'pending').length;

  // Retrieve Assessor Review if available
  const existingReview = profile ? storage.getReviewByProfileId(profile.id) : undefined;
  const scoreHistory = profile ? storage.getScoreHistory(profile.id) : [];

  // Check blocking conditions
  const blockingInconsistencies = inconsistencies.filter(
    (item) => item.blocksSubmission && item.resolutionStatus === 'UNRESOLVED'
  );
  const hasBlockingIssues = blockingInconsistencies.length > 0;
  const canSubmitToAssessor =
    Boolean(latestAssessment) &&
    latestAssessment!.overallScore >= 7.0 &&
    !hasBlockingIssues &&
    beneficiary.currentStatus !== 'submitted_to_assessor' &&
    beneficiary.currentStatus !== 'assessed';

  // Resolve an inconsistency item
  const handleResolveInconsistency = (item: InconsistencyItem, chosenValue: string, isDontKnow = false) => {
    if (!profile) return;
    const updated = storage.resolveInconsistency(profile.id, item.id, chosenValue, isDontKnow);
    setInconsistencies([...updated]);
    setResolvingId(null);
    setCustomResolveText('');
  };

  // Determine active journey stage index (0 to 6)
  const getStageIndex = (): number => {
    if (!profile) return 0;
    if (completeness < 75) return 2;
    if (!latestAssessment) return 3;
    if (latestAssessment.overallScore < 7.0 && beneficiary.currentStatus !== 'submitted_to_assessor') return 4;
    if (beneficiary.currentStatus === 'submitted_to_assessor' || beneficiary.currentStatus === 'under_human_review') return 5;
    if (beneficiary.currentStatus === 'assessed') return 6;
    return 3;
  };

  const currentStageIndex = getStageIndex();

  const journeySteps = [
    { title: t.stepRegistration, desc: 'Mobile & Cohort Verified' },
    { title: t.stepIdeaSubmission, desc: 'Text / Audio / PDF Pitch' },
    { title: t.stepProfileCompletion, desc: 'Facts Extracted' },
    { title: t.stepAiScreening, desc: '8-Domain Rubric' },
    { title: t.stepImprovement, desc: 'Mentoring & Guidance' },
    { title: t.stepAssessorSubmission, desc: 'Allocation' },
    { title: t.stepHumanReview, desc: 'Official Sign-off' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2 text-teal-400 text-xs font-semibold tracking-wider uppercase mb-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse"></span>
              <span>Tata STRIVE Entrepreneur Incubation Track</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {profile?.isDemoRecord ? 'Demo Case' : 'Live Persistent Record'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {profile ? `${t.myIdea}: ${profile.title}` : t.welcomeHeroTitle}
            </h1>
            <p className="text-slate-300 text-sm mt-1 max-w-2xl">
              {profile
                ? `Beneficiary ID: ${beneficiary.referenceId} | District: ${beneficiary.district} | Cohort: ${cohort?.name || 'Tata STRIVE Center'}`
                : t.welcomeHeroSubtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {profile && (
              <button
                onClick={() => setIsRoadmapOpen(true)}
                className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-lg transition-all hover:scale-[1.02]"
              >
                <Compass className="w-4 h-4 text-teal-300" />
                <span>
                  {currentLang === 'mr'
                    ? 'व्यवसाय विकास आराखडा'
                    : currentLang === 'hi'
                    ? 'व्यवसाय विकास रोडमैप'
                    : 'Business Roadmap'}
                </span>
              </button>
            )}

            {!profile && (
              <button
                onClick={onOpenSubmitModal}
                className="inline-flex items-center space-x-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold px-6 py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02] flex-shrink-0"
              >
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span>{t.submitIdeaButton}</span>
              </button>
            )}
          </div>
        </div>

        {/* Journey Progress Bar */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
            Incubation Journey Milestone
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {journeySteps.map((step, idx) => {
              const isPast = idx < currentStageIndex;
              const isCurrent = idx === currentStageIndex;
              return (
                <div
                  key={step.title}
                  className={`p-2.5 rounded-xl border text-xs transition-all ${
                    isCurrent
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300 ring-2 ring-teal-500/30'
                      : isPast
                      ? 'bg-slate-800/80 border-slate-700 text-slate-300'
                      : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[10px] uppercase">Step 0{idx + 1}</span>
                    {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />}
                    {isCurrent && <span className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></span>}
                  </div>
                  <p className="font-semibold text-xs truncate">{step.title}</p>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* BLOCKING WARNING: CONTRADICTIONS & INCONSISTENCIES (Requirement 2) */}
      {profile && blockingInconsistencies.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-6 shadow-sm space-y-4 animate-in fade-in">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center text-rose-600 flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-rose-900">
                  {currentLang === 'mr'
                    ? 'महत्त्वाची विसंगती / माहिती पडताळणी आवश्यक'
                    : currentLang === 'hi'
                    ? 'महत्वपूर्ण विरोधाभास / सूचना सत्यापन अनिवार्य'
                    : 'Information Clarification Required before Assessor Submission'}
                </h3>
                <p className="text-xs text-rose-700 mt-0.5">
                  {currentLang === 'mr'
                    ? 'तुमच्या व्यवसायाच्या माहितीत खालील तफावत आढळली आहे. परीक्षकांकडे पाठवण्यापूर्वी कृपया योग्य मूल्य निश्चित करा.'
                    : 'The AI identified conflicting or unrealistic figures. Conflicting values must be confirmed or corrected before assessor review.'}
                </p>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-rose-200 text-rose-900 border border-rose-300">
              {blockingInconsistencies.length} Action Needed
            </span>
          </div>

          <div className="space-y-3 pt-1">
            {blockingInconsistencies.map((item) => {
              const title = item.title[currentLang] || item.title.en;
              const desc = item.description[currentLang] || item.description.en;
              const isResolving = resolvingId === item.id;

              return (
                <div key={item.id} className="bg-white rounded-2xl p-4 border border-rose-200 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                      {item.issueType}
                    </span>
                    {item.deterministicCalculations && (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Calc: {item.deterministicCalculations.result} (Benchmark: {item.deterministicCalculations.benchmark})
                      </span>
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-900">{title}</h4>
                    <p className="text-xs text-slate-600 mt-1">{desc}</p>
                  </div>

                  {/* Show both conflicting values side by side */}
                  {item.valueA && item.valueB && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Value A (Source: {item.valueA.source})</p>
                        <p className="font-extrabold text-slate-900 text-sm mt-0.5">{item.valueA.value}</p>
                        <button
                          onClick={() => handleResolveInconsistency(item, item.valueA!.value)}
                          className="mt-2 text-xs font-bold text-teal-600 hover:text-teal-800 underline"
                        >
                          Confirm Value A
                        </button>
                      </div>

                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <p className="text-[10px] uppercase font-bold text-slate-400">Value B (Source: {item.valueB.source})</p>
                        <p className="font-extrabold text-slate-900 text-sm mt-0.5">{item.valueB.value}</p>
                        <button
                          onClick={() => handleResolveInconsistency(item, item.valueB!.value)}
                          className="mt-2 text-xs font-bold text-teal-600 hover:text-teal-800 underline"
                        >
                          Confirm Value B
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Option to type custom correction or I don't know */}
                  {isResolving ? (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={customResolveText}
                        onChange={(e) => setCustomResolveText(e.target.value)}
                        placeholder="Enter verified correct figure / detail..."
                        className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                      <button
                        onClick={() => handleResolveInconsistency(item, customResolveText.trim())}
                        className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-bold"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setResolvingId(null)}
                        className="px-2 py-1.5 text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 pt-1 text-xs">
                      <button
                        onClick={() => setResolvingId(item.id)}
                        className="font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        Enter Custom Correction
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleResolveInconsistency(item, 'Uncertainty noted: exploring with mentor assistance', true)}
                        className="font-bold text-slate-500 hover:text-slate-800"
                      >
                        I don't know yet
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Fresh Beneficiary Empty State */}
      {!profile ? (
        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-teal-600 border border-teal-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No Business Idea Submitted Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">
            You are enrolled as <strong className="text-slate-800">{beneficiary.fullName}</strong> ({beneficiary.referenceId}). Submit your business idea via text, voice recording (Marathi/Hindi/English), or upload a document to begin adaptive AI screening.
          </p>
          <button
            onClick={onOpenSubmitModal}
            className="inline-flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <Sparkles className="w-4 h-4" />
            <span>{t.submitIdeaButton}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Cards Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Card 1: Business Overview & Completeness */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {trade?.name || profile.trade}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(profile.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-lg leading-snug mb-2">
                  {profile.title}
                </h3>
                <p className="text-xs text-slate-600 line-clamp-3 mb-4">
                  {profile.translatedTextEn || profile.originalText}
                </p>

                {/* Completeness Bar */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-700">{t.profileCompleteness}</span>
                    <span className={completeness >= 80 ? 'text-teal-600 font-bold' : 'text-amber-600 font-bold'}>
                      {completeness}%
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        completeness >= 80 ? 'bg-teal-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${completeness}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {completeness < 75
                      ? 'Target 80%+ to unlock official AI preliminary scoring.'
                      : 'Profile details meet the minimum threshold for scoring.'}
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={onNavigateToMentor}
                  className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 transition-colors"
                >
                  <Layers className="w-4 h-4 text-teal-400" />
                  <span>Open Split-Screen AI Mentor & Profile</span>
                </button>
                <button
                  onClick={() => setIsRoadmapOpen(true)}
                  className="w-full py-2 px-4 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors border border-indigo-200"
                >
                  <Compass className="w-4 h-4" />
                  <span>View Development Roadmap</span>
                </button>
              </div>
            </div>

            {/* Card 2: AI Mentoring & Adaptive Questions */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                    AI Question Helper
                  </span>
                  <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {unansweredCount} Questions Pending
                  </span>
                </div>

                <h4 className="font-bold text-slate-800 text-base mb-1">
                  Adaptive Trade-Specific Questions
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Answer 3-5 quick questions per round to resolve missing details in pricing, investment, and operations.
                </p>

                {questions.length > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                      Top Priority Question:
                    </span>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-2">
                      {questions[0].question[currentLang] || questions[0].question.en}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                <button
                  onClick={onNavigateToImprovement}
                  className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-colors shadow-sm"
                >
                  <span>Answer Questions & Improve Score</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Card 3: AI Preliminary Score & Eligibility */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs uppercase font-bold tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                    Business Idea Score
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    Threshold: 7.0 / 10
                  </span>
                </div>

                {latestAssessment ? (
                  <div className="space-y-3">
                    <div className="flex items-baseline space-x-2">
                      <span
                        className={`text-4xl font-extrabold ${
                          latestAssessment.isEligible ? 'text-teal-600' : 'text-amber-600'
                        }`}
                      >
                        {latestAssessment.overallScore.toFixed(1)}
                      </span>
                      <span className="text-slate-400 text-sm font-semibold">{t.outOfTen}</span>
                      <span
                        className={`ml-auto text-xs font-bold px-2.5 py-1 rounded-full ${
                          latestAssessment.isEligible
                            ? 'bg-teal-100 text-teal-800 border border-teal-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {latestAssessment.isEligible ? 'Target Met (>= 7.0)' : 'Needs Improvement'}
                      </span>
                    </div>

                    {/* Score History Trend Delta */}
                    {scoreHistory.length > 1 && (
                      <div className="flex items-center space-x-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span className="font-bold">
                          +{ (latestAssessment.overallScore - scoreHistory[0].overallScore).toFixed(1) } Improvement since v1
                        </span>
                      </div>
                    )}

                    <p className="text-xs text-slate-600 leading-relaxed">
                      {latestAssessment.isEligible
                        ? '🎉 Great job! Your business idea has reached a qualifying score of 7.0+! If all critical information is resolved, you can submit for human review.'
                        : 'Your current score is below 7.0. Review what is working well, answer 2-3 quick questions, and re-assess your score to qualify!'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-center space-y-2">
                    <Sparkles className="w-6 h-6 text-amber-600 mx-auto" />
                    <p className="text-xs text-amber-900 font-bold">
                      Check Strengths, Weaknesses & Get Score
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Complete profile details to generate your 8-parameter AI score.
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-6 space-y-2">
                {(!latestAssessment || !latestAssessment.isEligible) && (
                  <button
                    onClick={onNavigateToImprovement}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md hover:scale-[1.01]"
                  >
                    <TrendingUp className="w-4 h-4 text-slate-950" />
                    <span>Fix Weaknesses & Re-Assess Score</span>
                  </button>
                )}

                {canSubmitToAssessor && (
                  <button
                    onClick={onSubmitToAssessor}
                    className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md hover:scale-[1.01]"
                  >
                    <Send className="w-4 h-4" />
                    <span>Submit to Tata STRIVE Assessor</span>
                  </button>
                )}

                {hasBlockingIssues && latestAssessment && latestAssessment.isEligible && (
                  <p className="text-[11px] text-rose-600 text-center font-bold">
                    ⚠️ Submission locked: Clarify the {blockingInconsistencies.length} contradiction(s) above to submit.
                  </p>
                )}

                {beneficiary.currentStatus === 'submitted_to_assessor' && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs flex items-center space-x-2">
                    <UserCheck className="w-4 h-4 flex-shrink-0" />
                    <span>
                      {beneficiary.waitingForAssessor
                        ? 'Queued in waiting list. All assessors at maximum workload.'
                        : 'Successfully allocated to a Tata STRIVE Technical Assessor!'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* OFFICIAL ASSESSOR FEEDBACK CARD (Requirement 4) */}
          {existingReview && (
            <div className="bg-gradient-to-r from-teal-50 via-indigo-50 to-teal-50 rounded-3xl border-2 border-teal-300 p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold">
                    <FileCheck2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {currentLang === 'mr'
                          ? 'टाटा स्ट्राइव्ह तज्ज्ञ परीक्षकांचे पुनरावलोकन'
                          : currentLang === 'hi'
                          ? 'टाटा स्ट्राइव तकनीकी मूल्यांकनकर्ता समीक्षा'
                          : 'Official Tata STRIVE Human Assessor Review'}
                      </h3>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-teal-200 text-teal-900">
                        Official Decision
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Evaluated by {existingReview.assessorName} • Final Score: {existingReview.finalScore}/10
                    </p>
                  </div>
                </div>

                {/* 4 Outcome Badges */}
                <span className="px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-teal-600 text-white shadow-sm">
                  {existingReview.recommendationDecision === 'BUSINESS_LAUNCH_READY'
                    ? 'Business Launch Ready'
                    : existingReview.recommendationDecision === 'PILOT_MARKET_VALIDATION'
                    ? 'Pilot / Market Validation Recommended'
                    : existingReview.recommendationDecision === 'INVESTMENT_READINESS_REVIEW'
                    ? 'Investment-Readiness Review Recommended'
                    : 'Further Mentoring Required'}
                </span>
              </div>

              {/* Translated Feedback */}
              <div className="bg-white rounded-2xl p-4 border border-teal-200 space-y-2">
                <p className="text-xs font-bold text-teal-900 uppercase tracking-wider">
                  Personalized Guidance (तुमच्या भाषेतील अभिप्राय):
                </p>
                <p className="text-xs text-slate-800 leading-relaxed font-medium">
                  {existingReview.feedbackTranslated || existingReview.feedbackEn}
                </p>
              </div>

              <p className="text-[11px] text-slate-500 italic">
                * Note: These are technical mentoring recommendations, not automatic business or funding approvals.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Business Development Roadmap Modal */}
      {profile && (
        <BeneficiaryRoadmapModal
          isOpen={isRoadmapOpen}
          onClose={() => setIsRoadmapOpen(false)}
          profile={profile}
          assessment={latestAssessment}
          currentLang={currentLang}
          onTriggerReassessment={onTriggerReassessment}
        />
      )}
    </div>
  );
};
