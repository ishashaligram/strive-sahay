import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  Beneficiary,
  BusinessProfile,
  MentorQuestion,
  AssessmentVersion,
  SupportedLanguage,
  UserRole,
} from './types';
import { storage } from './services/storage';
import { getSavedLanguage, saveLanguage } from './services/i18n';
import { AiMentorEngine } from './services/aiMentorEngine';
import { ScoringEngine } from './services/scoringEngine';
import { AllocationEngine } from './services/allocationEngine';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { BeneficiaryDashboard } from './components/BeneficiaryDashboard';
import { IdeaSubmissionModal } from './components/IdeaSubmissionModal';
import { SplitScreenMentor } from './components/SplitScreenMentor';
import { ImprovementWorkspace } from './components/ImprovementWorkspace';
import { AssessorPortal } from './components/AssessorPortal';
import { AdminPortal } from './components/AdminPortal';
import { ReportViewModal } from './components/ReportViewModal';
import { BeneficiaryRoadmapModal } from './components/BeneficiaryRoadmapModal';

import { LandingPage } from './pages/LandingPage';
import { BeneficiaryLanguagePage } from './pages/BeneficiaryLanguagePage';
import { BeneficiaryAuthPage } from './pages/BeneficiaryAuthPage';
import { AssessorLoginPage } from './pages/AssessorLoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();

  // Active Session & Authentication
  const [currentUser, setCurrentUser] = useState<{
    role: UserRole;
    id: string;
    name: string;
  } | null>(() => storage.getActiveUser());

  const [currentLang, setCurrentLang] = useState<SupportedLanguage>(() => getSavedLanguage());

  // Modals
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Active Beneficiary Profile & Workflow State
  const [activeBeneficiary, setActiveBeneficiary] = useState<Beneficiary | null>(null);
  const [activeProfile, setActiveProfile] = useState<BusinessProfile | null>(null);
  const [questions, setQuestions] = useState<MentorQuestion[]>([]);
  const [latestAssessment, setLatestAssessment] = useState<AssessmentVersion | undefined>(undefined);
  const [completeness, setCompleteness] = useState(0);

  // Load Beneficiary Data on Session Change
  useEffect(() => {
    if (currentUser?.role === 'beneficiary') {
      const ben = storage.getBeneficiaryById(currentUser.id);
      if (ben) {
        setActiveBeneficiary(ben);
        setCurrentLang(ben.preferredLanguage);
        saveLanguage(ben.preferredLanguage);

        const prof = storage.getProfileByBeneficiaryId(ben.id);
        if (prof) {
          setActiveProfile(prof);
          const qList = storage.getQuestions(prof.id);
          setQuestions(qList);
          const assess = storage.getLatestAssessment(prof.id);
          setLatestAssessment(assess);
          setCompleteness(AiMentorEngine.calculateCompleteness(prof));
        } else {
          setActiveProfile(null);
          setQuestions([]);
          setLatestAssessment(undefined);
          setCompleteness(0);
        }
      }
    } else {
      setActiveBeneficiary(null);
      setActiveProfile(null);
      setQuestions([]);
      setLatestAssessment(undefined);
      setCompleteness(0);
    }
  }, [currentUser]);

  // Auth Callbacks
  const handleLoginSuccess = (user: { role: UserRole; id: string; name: string }) => {
    storage.setActiveUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    storage.setActiveUser(null);
    setCurrentUser(null);
    setActiveBeneficiary(null);
    setActiveProfile(null);
    navigate('/');
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLang(lang);
    saveLanguage(lang);
    if (activeBeneficiary) {
      const updated = { ...activeBeneficiary, preferredLanguage: lang };
      storage.saveBeneficiary(updated);
      setActiveBeneficiary(updated);
    }
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo records back to initial STRIVE state?')) {
      storage.resetAll();
      window.location.href = '/';
    }
  };

  const handleUpdateProfile = (updated: BusinessProfile) => {
    storage.saveProfile(updated);
    setActiveProfile(updated);
    const comp = AiMentorEngine.calculateCompleteness(updated);
    setCompleteness(comp);
  };

  // Submission Flow (Section 7 & 8)
  const handleIdeaSubmission = (submission: {
    title: string;
    trade: string;
    submissionType: 'text' | 'audio' | 'document';
    originalLanguage: SupportedLanguage;
    originalText: string;
    translatedTextEn: string;
    audioUrl?: string;
    audioDurationSec?: number;
    documentName?: string;
    reviewedFields?: Record<string, string>;
  }) => {
    if (!activeBeneficiary) return;

    // 1. Create Profile Skeleton
    const initialProfile = AiMentorEngine.createInitialProfile(
      activeBeneficiary.id,
      submission.title,
      submission.trade,
      submission.submissionType,
      submission.originalLanguage,
      submission.originalText,
      submission.translatedTextEn,
      submission.audioUrl,
      submission.documentName
    );

    // 2. Extract facts via Qwen3-8B engine & generate questions with reviewed fields
    const { updatedProfile, initialQuestions } = AiMentorEngine.extractFromSubmission(
      initialProfile,
      submission.originalText,
      submission.trade,
      submission.reviewedFields
    );

    // 3. Persist
    storage.saveProfile(updatedProfile);
    storage.saveQuestions(updatedProfile.id, initialQuestions);

    const comp = AiMentorEngine.calculateCompleteness(updatedProfile);

    // Update Beneficiary
    const updatedBen: Beneficiary = {
      ...activeBeneficiary,
      currentStatus: 'idea_submitted',
      activeProfileId: updatedProfile.id,
    };
    storage.saveBeneficiary(updatedBen);

    // Generate initial preliminary assessment (Version 1)
    const initialAssess = ScoringEngine.evaluateProfile(updatedProfile, 1, false, 7.0);
    storage.saveAssessment(updatedProfile.id, initialAssess);

    setActiveBeneficiary(updatedBen);
    setActiveProfile(updatedProfile);
    setQuestions(initialQuestions);
    setCompleteness(comp);
    setLatestAssessment(initialAssess);

    // Navigate to simplified Strengths, Weaknesses, Questions & Re-assessment Hub
    navigate('/beneficiary/improvement');
  };

  // Answer Mentor Question Flow (Section 10)
  const handleAnswerQuestion = (
    question: MentorQuestion,
    answerText: string,
    isDontKnow = false
  ) => {
    if (!activeProfile) return;

    // Apply answer & update profile facts
    const updatedProfile = AiMentorEngine.applyAnswer(
      activeProfile,
      question,
      answerText,
      isDontKnow
    );

    // Update question status
    const updatedQuestions = questions.map((q) => {
      if (q.id === question.id) {
        return {
          ...q,
          status: isDontKnow ? ('dont_know' as const) : ('answered' as const),
          beneficiaryAnswer: answerText,
          answeredAt: new Date().toISOString(),
        };
      }
      return q;
    });

    const newCompleteness = AiMentorEngine.calculateCompleteness(updatedProfile);

    // Persist
    storage.saveProfile(updatedProfile);
    storage.saveQuestions(updatedProfile.id, updatedQuestions);

    setActiveProfile(updatedProfile);
    setQuestions(updatedQuestions);
    setCompleteness(newCompleteness);
  };

  // Preliminary Scoring Flow (Section 11 & 12)
  const handleRequestScoring = () => {
    if (!activeProfile) return;

    const settings = storage.getSettings();
    const assessV1 = ScoringEngine.evaluateProfile(
      activeProfile,
      1,
      false,
      settings.eligibilityThreshold
    );

    storage.saveAssessment(activeProfile.id, assessV1);
    setLatestAssessment(assessV1);

    if (activeBeneficiary) {
      const updatedBen: Beneficiary = {
        ...activeBeneficiary,
        currentStatus: assessV1.isEligible ? 'eligible' : 'ai_mentoring',
      };
      storage.saveBeneficiary(updatedBen);
      setActiveBeneficiary(updatedBen);
    }

    if (!assessV1.isEligible) {
      navigate('/beneficiary/improvement');
    } else {
      navigate('/beneficiary/dashboard');
    }
  };

  // Trigger Reassessment Flow (Section 12: Improvement Workspace)
  const handleTriggerReassessment = () => {
    if (!activeProfile) return;

    const settings = storage.getSettings();
    const assessV2 = ScoringEngine.evaluateProfile(
      activeProfile,
      2,
      true,
      settings.eligibilityThreshold
    );

    storage.saveAssessment(activeProfile.id, assessV2);
    setLatestAssessment(assessV2);

    if (activeBeneficiary) {
      const updatedBen: Beneficiary = {
        ...activeBeneficiary,
        currentStatus: 'eligible',
      };
      storage.saveBeneficiary(updatedBen);
      setActiveBeneficiary(updatedBen);
    }
  };

  // Assessor Allocation & Submission (Section 14 & 15)
  const handleSubmitToAssessor = () => {
    if (!activeBeneficiary || !activeProfile) return;

    const allocResult = AllocationEngine.allocateAssessor(activeBeneficiary, activeProfile);

    const refreshedBen = storage.getBeneficiaryById(activeBeneficiary.id);
    if (refreshedBen) {
      setActiveBeneficiary(refreshedBen);
    }

    if (allocResult.success) {
      alert(
        `Successfully allocated to qualified Assessor: ${allocResult.assessor?.fullName} (${allocResult.assessor?.tradeExpertise.join(', ')}). The case is now under human review.`
      );
    } else {
      alert(allocResult.reason || 'Case placed in waiting queue.');
    }

    navigate('/beneficiary/dashboard');
  };

  // Determine whether to display the authenticated top Navbar
  const isAuthDashboardRoute =
    location.pathname.startsWith('/beneficiary/dashboard') ||
    location.pathname.startsWith('/beneficiary/mentor') ||
    location.pathname.startsWith('/beneficiary/improvement') ||
    location.pathname.startsWith('/beneficiary/roadmap') ||
    location.pathname.startsWith('/assessor/dashboard') ||
    location.pathname.startsWith('/admin/dashboard');

  const currentView = location.pathname.includes('mentor')
    ? 'mentor'
    : location.pathname.includes('improvement')
    ? 'improvement'
    : location.pathname.includes('roadmap')
    ? 'roadmap'
    : location.pathname.includes('assessor')
    ? 'assessor'
    : location.pathname.includes('admin')
    ? 'admin'
    : 'dashboard';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Top Navbar on Authenticated Dashboards */}
      {isAuthDashboardRoute && currentUser && (
        <Navbar
          currentRole={currentUser.role}
          currentLang={currentUser.role === 'beneficiary' ? currentLang : 'en'}
          activeUserName={currentUser.name}
          onSelectRole={() => {}}
          onSelectLang={handleLanguageChange}
          onLogout={handleLogout}
          currentView={currentView}
          onNavigate={(view) => {
            if (view === 'dashboard') navigate('/beneficiary/dashboard');
            else if (view === 'mentor') navigate('/beneficiary/mentor');
            else if (view === 'improvement') navigate('/beneficiary/improvement');
            else if (view === 'roadmap') navigate('/beneficiary/roadmap');
            else if (view === 'assessor') navigate('/assessor/dashboard');
            else if (view === 'admin') navigate('/admin/dashboard');
          }}
          onResetData={handleResetData}
        />
      )}

      {/* Main Routed Content */}
      <main className="flex-1">
        <Routes>
          {/* Public Landing & Role Selection ("/") */}
          <Route path="/" element={<LandingPage />} />

          {/* Beneficiary Flows */}
          <Route
            path="/beneficiary/language"
            element={<BeneficiaryLanguagePage onLanguageSelected={handleLanguageChange} />}
          />
          <Route
            path="/beneficiary/auth"
            element={
              <BeneficiaryAuthPage
                onLoginSuccess={handleLoginSuccess}
                currentLang={currentLang}
                onLanguageChange={handleLanguageChange}
              />
            }
          />

          {/* Beneficiary Dashboard */}
          <Route
            path="/beneficiary/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="beneficiary">
                {activeBeneficiary ? (
                  <BeneficiaryDashboard
                    beneficiary={activeBeneficiary}
                    profile={activeProfile || undefined}
                    latestAssessment={latestAssessment}
                    questions={questions}
                    completeness={completeness}
                    currentLang={currentLang}
                    onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
                    onNavigateToMentor={() => navigate('/beneficiary/mentor')}
                    onNavigateToImprovement={() => navigate('/beneficiary/improvement')}
                    onSubmitToAssessor={handleSubmitToAssessor}
                    onTriggerReassessment={handleTriggerReassessment}
                  />
                ) : (
                  <Navigate to="/beneficiary/auth" replace />
                )}
              </ProtectedRoute>
            }
          />

          {/* Split-Screen AI Mentor & Live Profile */}
          <Route
            path="/beneficiary/mentor"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="beneficiary">
                {activeProfile ? (
                  <SplitScreenMentor
                    profile={activeProfile}
                    questions={questions}
                    completeness={completeness}
                    currentLang={currentLang}
                    onAnswerQuestion={handleAnswerQuestion}
                    onRequestScoring={handleRequestScoring}
                    onNavigateToImprovement={() => navigate('/beneficiary/improvement')}
                    onUpdateProfile={handleUpdateProfile}
                  />
                ) : (
                  <Navigate to="/beneficiary/dashboard" replace />
                )}
              </ProtectedRoute>
            }
          />

          {/* Improvement & Reassessment Workspace */}
          <Route
            path="/beneficiary/improvement"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="beneficiary">
                {activeProfile ? (
                  <ImprovementWorkspace
                    profile={activeProfile}
                    assessment={
                      latestAssessment ||
                      ScoringEngine.evaluateProfile(activeProfile, 1, false, 7.0)
                    }
                    currentLang={currentLang}
                    questions={questions}
                    beneficiaryName={activeBeneficiary?.fullName}
                    onAnswerQuestion={handleAnswerQuestion}
                    onTriggerReassessment={handleTriggerReassessment}
                    onSubmitToAssessor={handleSubmitToAssessor}
                    onNavigateToMentor={() => navigate('/beneficiary/mentor')}
                  />
                ) : (
                  <Navigate to="/beneficiary/dashboard" replace />
                )}
              </ProtectedRoute>
            }
          />

          {/* Business Roadmap & Launch Plan */}
          <Route
            path="/beneficiary/roadmap"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="beneficiary">
                {activeProfile ? (
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <BeneficiaryRoadmapModal
                      isOpen={true}
                      onClose={() => navigate('/beneficiary/dashboard')}
                      profile={activeProfile}
                      assessment={latestAssessment}
                      currentLang={currentLang}
                      onTriggerReassessment={handleTriggerReassessment}
                    />
                  </div>
                ) : (
                  <Navigate to="/beneficiary/dashboard" replace />
                )}
              </ProtectedRoute>
            }
          />

          {/* Assessor Portal */}
          <Route
            path="/assessor/login"
            element={<AssessorLoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/assessor/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="assessor">
                {currentUser && (
                  <AssessorPortal
                    currentAssessor={
                      storage.getAssessorById(currentUser.id) || storage.getAssessors()[0]
                    }
                    currentLang="en"
                    onOpenReportView={() => setIsReportModalOpen(true)}
                  />
                )}
              </ProtectedRoute>
            }
          />

          {/* Admin Directorate Portal */}
          <Route
            path="/admin/login"
            element={<AdminLoginPage onLoginSuccess={handleLoginSuccess} />}
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute currentUser={currentUser} allowedRole="admin">
                <AdminPortal onOpenReportView={() => setIsReportModalOpen(true)} />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Footer on Dashboard Views */}
      {isAuthDashboardRoute && (
        <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p>© 2024 Tata STRIVE. STRIVE SAHAY — Multilingual Business Screening & Mentoring.</p>
            <div className="flex items-center space-x-3 text-[11px] text-slate-400">
              <span>Model: Qwen3-8B</span>
              <span>•</span>
              <span>Audio: faster-whisper</span>
              <span>•</span>
              <span>Embeddings: multilingual-e5-base</span>
            </div>
          </div>
        </footer>
      )}

      {/* Idea Submission Modal */}
      {activeBeneficiary && (
        <IdeaSubmissionModal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          currentLang={currentLang}
          onSubmit={handleIdeaSubmission}
        />
      )}

      {/* Assessment Report Modal */}
      {activeBeneficiary && activeProfile && (
        <ReportViewModal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          beneficiary={activeBeneficiary}
          profile={activeProfile}
          assessment={latestAssessment}
          review={storage.getReviewByProfileId(activeProfile.id)}
        />
      )}
    </div>
  );
}
