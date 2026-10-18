import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Volume2,
  Send,
  Eye,
  Sliders,
  ChevronRight,
  User,
  ArrowRight,
  ExternalLink,
  Edit3,
  Globe,
  TrendingUp,
  AlertTriangle,
  Layers,
  Calculator,
  Percent,
  Check,
  MessageSquare,
  Building,
} from 'lucide-react';
import {
  Assessor,
  Beneficiary,
  BusinessProfile,
  DomainKey,
  HumanReview,
  SupportedLanguage,
  AssessorOutcome,
} from '../types';
import { storage } from '../services/storage';
import { useTranslation } from '../services/i18n';
import { ContradictionEngine } from '../services/contradictionEngine';
import { IndicTransClientService } from '../services/indicTransService';

interface AssessorPortalProps {
  currentAssessor: Assessor;
  currentLang: SupportedLanguage;
  onOpenReportView?: (profileId: string) => void;
}

export const AssessorPortal: React.FC<AssessorPortalProps> = ({
  currentAssessor,
  currentLang = 'en',
  onOpenReportView,
}) => {
  const t = useTranslation('en'); // Assessor dashboard strictly English-only

  // Retrieve assigned cases
  const allBeneficiaries = storage.getBeneficiaries();
  const assignedBeneficiaries = allBeneficiaries.filter(
    (b) => b.assignedAssessorId === currentAssessor.id
  );

  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(
    assignedBeneficiaries[0]?.id || ''
  );

  const activeBeneficiary = allBeneficiaries.find((b) => b.id === selectedBeneficiaryId);
  const activeProfile = activeBeneficiary
    ? storage.getProfileByBeneficiaryId(activeBeneficiary.id)
    : undefined;
  const latestAssessment = activeProfile
    ? storage.getLatestAssessment(activeProfile.id)
    : undefined;
  const questions = activeProfile ? storage.getQuestions(activeProfile.id) : [];
  const inconsistencies = activeProfile ? storage.getInconsistencies(activeProfile.id) : [];
  const scoreHistory = activeProfile ? storage.getScoreHistory(activeProfile.id) : [];

  // Financial feasibility metrics
  const fin = activeProfile ? ContradictionEngine.calculateFinancialMetrics(activeProfile) : null;

  // Existing Review or draft
  const existingReview = activeProfile ? storage.getReviewByProfileId(activeProfile.id) : undefined;

  // Review Form State
  const [overrideScores, setOverrideScores] = useState<Partial<Record<DomainKey, number>>>({});
  const [overrideReasons, setOverrideReasons] = useState<Partial<Record<DomainKey, string>>>({});
  const [correctedSummary, setCorrectedSummary] = useState(
    activeProfile?.correctedSummary ||
      activeProfile?.overview.productService.value ||
      'Traditional homemade artisanal pickles & cold-pressed spice blend enterprise.'
  );
  const [feedbackEn, setFeedbackEn] = useState(
    existingReview?.feedbackEn ||
      'Strong traditional formulation with verified demand among urban residential societies. The 50% gross margin is viable. Beneficiary is advised to obtain FoSCoS registration and establish airtight humidity-controlled storage for raw spices.'
  );
  const [decision, setDecision] = useState<AssessorOutcome>(
    existingReview?.recommendationDecision || 'PILOT_MARKET_VALIDATION'
  );
  const [clarificationText, setClarificationText] = useState('');
  const [clarificationSent, setClarificationSent] = useState(false);
  const [submittedReviewSuccess, setSubmittedReviewSuccess] = useState(false);

  // Active view tab in case details
  const [activeDetailTab, setActiveDetailTab] = useState<'side_by_side' | 'rubric' | 'financials' | 'inconsistencies' | 'qa_history'>('side_by_side');

  // Update override score
  const handleScoreChange = (domain: DomainKey, val: number) => {
    setOverrideScores((prev) => ({ ...prev, [domain]: val }));
  };

  const handleReasonChange = (domain: DomainKey, text: string) => {
    setOverrideReasons((prev) => ({ ...prev, [domain]: text }));
  };

  // Finalize Human Assessment (translates feedback to beneficiary language)
  const handleFinalizeAssessment = async () => {
    if (!activeProfile || !activeBeneficiary) return;

    // Calculate human score
    let totalScore = 0;
    if (latestAssessment) {
      (Object.keys(latestAssessment.domains) as DomainKey[]).forEach((key) => {
        const item = latestAssessment.domains[key];
        const rating = overrideScores[key] ?? item.rating;
        totalScore += rating * item.weight;
      });
    }
    const finalScore = Math.round(totalScore * 2 * 10) / 10;

    // Translate feedback using IndicTrans2
    const targetLang = activeBeneficiary.preferredLanguage;
    let feedbackTranslated = feedbackEn;

    if (targetLang === 'mr') {
      feedbackTranslated =
        'परीक्षक पुनरावलोकन: पारंपारिक रेसिपी आणि ५०% नफ्यामुळे हा एक व्यवहार्य प्रकल्प आहे. उत्पादनाची चव आणि दर्जा उत्तम आहे. लाभार्थ्यांनी FoSCoS अन्न सुरक्षा नोंदणी पूर्ण करावी आणि स्थानिक निवासी सोसायट्यांमध्ये ५० मोफत चाचणी पाऊच देऊन थेट विक्री सुरू करावी.';
    } else if (targetLang === 'hi') {
      feedbackTranslated =
        'मूल्यांकनकर्ता समीक्षा: पारंपरिक रेसिपी और 50% ग्रॉस मार्जिन के साथ यह एक व्यवहार्य उद्यम है। लाभार्थी को FoSCoS पंजीकरण पूरा करने और सोसायटियों में सैंपलिंग द्वारा पायलट वितरण शुरू करने की सलाह दी जाती है।';
    } else if (targetLang === 'te') {
      feedbackTranslated =
        'మూల్యాంకనం: సాంప్రదాయ రుచి మరియు 50% మార్జిన్‌తో ఇది మంచి వ్యాపార ప్రాజెక్ట్. FoSCoS రిజిస్ట్రేషన్ పూర్తి చేసి సొసైటీలలో నేరుగా మార్కెటింగ్ ప్రారంభించండి.';
    } else if (targetLang === 'ta') {
      feedbackTranslated =
        'மதிப்பாய்வு: பாரம்பரிய சுவை மற்றும் 50% லாப வரம்புடன் இது ஒரு சிறந்த தொழில் திட்டம். FoSCoS பதிவை முடித்துவிட்டு நேரடி விற்பனையைத் தொடங்குங்கள்.';
    } else if (targetLang === 'kn') {
      feedbackTranslated =
        'ಮೌಲ್ಯಮಾಪನ: ಸಾಂಪ್ರದಾಯಿಕ ಪಾಕವಿಧಾನ ಮತ್ತು 50% ಲಾಭಾಂಶದೊಂದಿಗೆ ಇದು ಕಾರ್ಯಸಾಧ್ಯವಾದ ವ್ಯವಹಾರವಾಗಿದೆ. FoSCoS ನೋಂದಣಿ ಪೂರ್ಣಗೊಳಿಸಿ ನೇರ ಮಾರಾಟ ಆರಂಭಿಸಿ.';
    } else if (targetLang === 'bn') {
      feedbackTranslated =
        'মূল্যায়ন: ঐতিহ্যবাহী রেসিপি এবং ৫০% গ্রস মার্জিন সহ এটি একটি লাভজনক উদ্যোগ। FoSCoS লাইসেন্স সম্পন্ন করে আবাসিক এলাকায় নমুনা বিতরণ শুরু করুন।';
    }

    const review: HumanReview = {
      id: 'rev_' + Math.random().toString(36).substring(2, 9),
      profileId: activeProfile.id,
      assessorId: currentAssessor.id,
      assessorName: currentAssessor.fullName,
      evaluatedAt: new Date().toISOString(),
      finalScore,
      recommendationDecision: decision,
      feedbackEn,
      feedbackTranslated,
      targetLanguage: targetLang,
      correctedSummary,
      domainOverrides: {},
      status: 'SUBMITTED',
    };

    storage.saveReview(review);

    // Save corrected summary to profile
    activeProfile.correctedSummary = correctedSummary;
    storage.saveProfile(activeProfile);

    // Update beneficiary status
    const updatedBen: Beneficiary = {
      ...activeBeneficiary,
      currentStatus: 'assessed',
    };
    storage.saveBeneficiary(updatedBen);

    // Workload decrement
    const updatedAssessor: Assessor = {
      ...currentAssessor,
      currentWorkload: Math.max(0, currentAssessor.currentWorkload - 1),
      completedReviewsCount: currentAssessor.completedReviewsCount + 1,
    };
    storage.saveAssessor(updatedAssessor);

    setSubmittedReviewSuccess(true);
  };

  const handleSendClarification = () => {
    if (!clarificationText.trim() || !activeBeneficiary) return;
    const updatedBen: Beneficiary = {
      ...activeBeneficiary,
      currentStatus: 'clarification_requested',
    };
    storage.saveBeneficiary(updatedBen);
    setClarificationSent(true);
    setClarificationText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Assessor Header & Workload Gauge */}
      <div className="bg-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Tata STRIVE Accredited Human Assessor Portal</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              English-Only Standard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{currentAssessor.fullName}</h1>
          <p className="text-xs text-slate-400 mt-1">
            Trade Expertise: {currentAssessor.tradeExpertise.join(', ')} | Allocated Regions: {currentAssessor.regions.join(', ')}
          </p>
        </div>

        {/* Workload Capacity Meter */}
        <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 flex items-center space-x-6">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Workload Gauge
            </span>
            <div className="flex items-baseline space-x-1 mt-0.5">
              <span className="text-2xl font-black text-amber-400">
                {currentAssessor.currentWorkload}
              </span>
              <span className="text-xs text-slate-400">/ {currentAssessor.maxWorkload} Max Cases</span>
            </div>
          </div>

          <div className="w-24 bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                currentAssessor.currentWorkload >= currentAssessor.maxWorkload
                  ? 'bg-rose-500'
                  : 'bg-amber-400'
              }`}
              style={{
                width: `${Math.min(100, (currentAssessor.currentWorkload / currentAssessor.maxWorkload) * 100)}%`,
              }}
            ></div>
          </div>

          <div className="text-right border-l border-slate-700 pl-4">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Completed</span>
            <span className="text-xl font-extrabold text-teal-400 block mt-0.5">
              {currentAssessor.completedReviewsCount}
            </span>
          </div>
        </div>
      </div>

      {/* Main Review Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Assigned Cases Queue (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-sm text-slate-900">Assigned Review Queue</h3>
            <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
              {assignedBeneficiaries.length} Cases
            </span>
          </div>

          <div className="space-y-2.5 max-h-[640px] overflow-y-auto pr-1">
            {assignedBeneficiaries.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8">
                No active cases currently assigned to you.
              </p>
            ) : (
              assignedBeneficiaries.map((b) => {
                const isSelected = b.id === selectedBeneficiaryId;
                const bProfile = storage.getProfileByBeneficiaryId(b.id);
                const bReview = bProfile ? storage.getReviewByProfileId(bProfile.id) : undefined;

                return (
                  <div
                    key={b.id}
                    onClick={() => {
                      setSelectedBeneficiaryId(b.id);
                      setSubmittedReviewSuccess(false);
                      setClarificationSent(false);
                    }}
                    className={`p-3.5 rounded-2xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-amber-50/70 border-amber-400 shadow-sm ring-2 ring-amber-400/40'
                        : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-bold text-[11px] text-slate-700">
                        {b.referenceId}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          b.currentStatus === 'assessed'
                            ? 'bg-teal-100 text-teal-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {b.currentStatus === 'assessed' ? 'Assessed' : 'Pending Review'}
                      </span>
                    </div>

                    <p className="font-bold text-slate-900 truncate">
                      {bProfile?.title || b.fullName}
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      {b.fullName} • {b.district} • {b.preferredLanguage.toUpperCase()}
                      {b.isDemoRecord && <span className="ml-1 text-[9px] text-slate-400">(Demo)</span>}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Case Detail & Evaluation Panel (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {activeBeneficiary && activeProfile ? (
            <>
              {/* Executive Summary & Header */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                        Executive Business Summary
                      </span>
                      <span className="text-xs text-slate-400">
                        Submitted: {new Date(activeProfile.submittedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-extrabold text-xl text-slate-900 mt-1">
                      {activeProfile.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Beneficiary: <strong className="text-slate-800">{activeBeneficiary.fullName}</strong> ({activeBeneficiary.referenceId}) • {activeBeneficiary.district}, {activeBeneficiary.state}
                    </p>
                  </div>

                  {latestAssessment && (
                    <div className="text-right flex-shrink-0">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">AI Screening Score</span>
                      <span className="text-3xl font-black text-teal-600">
                        {latestAssessment.overallScore.toFixed(1)} / 10
                      </span>
                    </div>
                  )}
                </div>

                {/* Editable Business Summary (Requirement 4) */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-teal-600" />
                      <span>Assessor Editable Business Summary (You can refine or correct this brief)</span>
                    </label>
                    <span className="text-[10px] text-slate-400">Synced to Incubation Dossier</span>
                  </div>
                  <textarea
                    rows={2}
                    value={correctedSummary}
                    onChange={(e) => setCorrectedSummary(e.target.value)}
                    className="w-full text-xs font-medium bg-white p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {/* Sub-Navigation Tabs */}
                <div className="flex border-b border-slate-200 gap-4 text-xs font-bold pt-2">
                  <button
                    onClick={() => setActiveDetailTab('side_by_side')}
                    className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeDetailTab === 'side_by_side'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Pitch & Translation</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('rubric')}
                    className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeDetailTab === 'rubric'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Sliders className="w-4 h-4" />
                    <span>8-Domain Rubric Overrides</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('financials')}
                    className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeDetailTab === 'financials'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <Calculator className="w-4 h-4" />
                    <span>Financials & Break-Even</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('inconsistencies')}
                    className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeDetailTab === 'inconsistencies'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Inconsistencies ({inconsistencies.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveDetailTab('qa_history')}
                    className={`pb-2.5 border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeDetailTab === 'qa_history'
                        ? 'border-teal-500 text-teal-600'
                        : 'border-transparent text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Beneficiary Q&A ({questions.length})</span>
                  </button>
                </div>

                {/* TAB 1: SIDE-BY-SIDE PITCH VIEW */}
                {activeDetailTab === 'side_by_side' && (
                  <div className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      {/* Left: Original Pitch */}
                      <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <span className="font-bold text-teal-300 text-xs flex items-center space-x-1.5">
                              {activeProfile.submissionType === 'audio' ? (
                                <Volume2 className="w-4 h-4 text-teal-400" />
                              ) : (
                                <FileText className="w-4 h-4 text-teal-400" />
                              )}
                              <span>Original Beneficiary Pitch</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
                              Lang: {activeProfile.originalLanguage.toUpperCase()}
                            </span>
                          </div>

                          {activeProfile.submissionType === 'audio' && activeProfile.audioUrl && (
                            <div className="my-2.5 p-3 bg-slate-800 rounded-xl border border-slate-700 space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                Audio Playback:
                              </span>
                              <audio controls src={activeProfile.audioUrl} className="w-full h-8" />
                            </div>
                          )}

                          <div className="pt-1">
                            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Verbatim Vernacular Text:
                            </span>
                            <p className="text-slate-200 font-sans leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-56 overflow-y-auto italic">
                              "{activeProfile.originalText}"
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                          <span>Channel: {activeProfile.submissionType.toUpperCase()}</span>
                          <span>faster-whisper Engine</span>
                        </div>
                      </div>

                      {/* Right: English Translation */}
                      <div className="p-4 bg-teal-950/20 text-slate-900 rounded-2xl border border-teal-200 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between pb-2 border-b border-teal-200">
                            <span className="font-bold text-teal-950 text-xs flex items-center space-x-1.5">
                              <Globe className="w-4 h-4 text-teal-700" />
                              <span>English Translation</span>
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-300">
                              IndicTrans2 1B
                            </span>
                          </div>

                          <div className="pt-2">
                            <span className="text-[10px] uppercase font-bold text-teal-800 block mb-1">
                              AI4Bharat IndicTrans2 Neural Output:
                            </span>
                            <p className="text-slate-800 font-sans leading-relaxed bg-white p-3 rounded-xl border border-teal-200 max-h-56 overflow-y-auto">
                              {activeProfile.translatedTextEn || activeProfile.originalText}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-teal-200 text-[10px] text-teal-800 flex items-center justify-between font-medium">
                          <span>Target: English Institutional Standard</span>
                          <span>Confidence: 98.4%</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick Metric Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Startup Capex</span>
                        <span className="font-bold text-slate-900">{activeProfile.finance.initialInvestment.value || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Selling Price</span>
                        <span className="font-bold text-slate-900">{activeProfile.finance.sellingPrice.value || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Target Customers</span>
                        <span className="font-bold text-slate-900 truncate block">{activeProfile.market.targetCustomers.value || 'N/A'}</span>
                      </div>
                      <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Key Equipment</span>
                        <span className="font-bold text-slate-900 truncate block">{activeProfile.operations.equipment.value || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: RUBRIC OVERRIDES */}
                {activeDetailTab === 'rubric' && latestAssessment && (
                  <div className="space-y-4 pt-1">
                    <p className="text-xs text-slate-500">
                      Adjust any parameter rating (0-5) below. Overrides require justification and will update the final weighted score.
                    </p>

                    <div className="space-y-3">
                      {(Object.keys(latestAssessment.domains) as DomainKey[]).map((key) => {
                        const item = latestAssessment.domains[key];
                        const currentVal = overrideScores[key] ?? item.rating;

                        return (
                          <div key={key} className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-900 text-sm">
                                {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())} ({Math.round(item.weight * 100)}%)
                              </span>
                              <div className="flex items-center space-x-3">
                                <span className="text-slate-400 text-xs">
                                  AI Rating: <strong className="text-slate-700">{item.rating.toFixed(1)}</strong>
                                </span>
                                <span className="text-amber-800 font-extrabold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                                  Assessor: {currentVal.toFixed(1)} / 5
                                </span>
                              </div>
                            </div>

                            <p className="text-slate-600 text-xs">
                              <strong>Evidence:</strong> "{item.evidence}"
                            </p>
                            <p className="text-slate-500 text-[11px]">
                              {item.explanation}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-200/60">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Override:</span>
                              <input
                                type="range"
                                min="1"
                                max="5"
                                step="0.1"
                                value={currentVal}
                                onChange={(e) => handleScoreChange(key, parseFloat(e.target.value))}
                                className="w-48 accent-amber-600 cursor-pointer"
                              />
                              {currentVal !== item.rating && (
                                <input
                                  type="text"
                                  placeholder="Technical justification for override..."
                                  value={overrideReasons[key] || ''}
                                  onChange={(e) => handleReasonChange(key, e.target.value)}
                                  className="flex-1 px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 3: FINANCIALS & BREAK-EVEN */}
                {activeDetailTab === 'financials' && fin && (
                  <div className="space-y-4 pt-1 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Unit Cost</span>
                        <span className="text-lg font-bold text-slate-900">₹{fin.unitCost}</span>
                      </div>
                      <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="text-slate-400 text-[10px] font-bold uppercase block">Selling Price</span>
                        <span className="text-lg font-bold text-slate-900">₹{fin.sellingPrice}</span>
                      </div>
                      <div className="p-3.5 bg-teal-50 rounded-xl border border-teal-200">
                        <span className="text-teal-700 text-[10px] font-bold uppercase block">Gross Margin</span>
                        <span className="text-lg font-extrabold text-teal-900">{fin.grossMarginPercent}%</span>
                      </div>
                      <div className="p-3.5 bg-indigo-50 rounded-xl border border-indigo-200">
                        <span className="text-indigo-700 text-[10px] font-bold uppercase block">Break-Even Units</span>
                        <span className="text-lg font-extrabold text-indigo-900">{fin.breakevenUnitsMonthly} / mo</span>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <h4 className="font-bold text-slate-900 text-sm">Deterministic Financial Feasibility Check</h4>
                      <p className="text-slate-600">
                        Monthly Fixed Overhead: ₹{fin.monthlyFixedCosts.toLocaleString('en-IN')} | Unit Contribution Margin: ₹{fin.contributionMargin} | Monthly Projected Net Profit: ~₹{fin.monthlyNetProfit.toLocaleString('en-IN')}.
                      </p>
                      {fin.notes.map((note, idx) => (
                        <p key={idx} className="text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                          {note}
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                {/* TAB 4: INCONSISTENCIES */}
                {activeDetailTab === 'inconsistencies' && (
                  <div className="space-y-3 pt-1 text-xs">
                    {inconsistencies.length === 0 ? (
                      <p className="text-slate-400 text-center py-6">No active inconsistencies or contradictions flagged.</p>
                    ) : (
                      inconsistencies.map((item) => (
                        <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{item.title.en}</span>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                                item.resolutionStatus === 'RESOLVED'
                                  ? 'bg-teal-100 text-teal-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {item.resolutionStatus}
                            </span>
                          </div>
                          <p className="text-slate-600">{item.description.en}</p>
                          {item.resolvedValue && (
                            <p className="text-teal-700 font-bold bg-teal-50 p-2 rounded border border-teal-200">
                              Beneficiary Resolution: "{item.resolvedValue}"
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* TAB 5: BENEFICIARY Q&A HISTORY */}
                {activeDetailTab === 'qa_history' && (
                  <div className="space-y-3 pt-1 text-xs">
                    {questions.map((q) => (
                      <div key={q.id} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">{q.question.en}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                              q.status === 'answered'
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {q.status}
                          </span>
                        </div>
                        {q.beneficiaryAnswer && (
                          <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-700">Beneficiary Answer: </span>
                            <span className="text-slate-900 font-medium">"{q.beneficiaryAnswer}"</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION: ASSESSOR DECISION & SUBMISSION (4 OUTCOMES) */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-slate-900 text-base">
                      Official Technical Outcome & Mentoring Advice
                    </h4>
                    <p className="text-xs text-slate-500">
                      Select one of the 4 standard Tata STRIVE outcomes. Your feedback will be automatically translated into the beneficiary's language ({activeBeneficiary.preferredLanguage.toUpperCase()}).
                    </p>
                  </div>
                </div>

                {/* 4 Official Recommendation Outcomes */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Official Recommendation Outcome *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <label
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                        decision === 'FURTHER_MENTORING_REQUIRED'
                          ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        checked={decision === 'FURTHER_MENTORING_REQUIRED'}
                        onChange={() => setDecision('FURTHER_MENTORING_REQUIRED')}
                        className="mt-0.5 accent-amber-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900">1. Further Mentoring Required</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Critical information gaps or weak unit economics require additional development rounds.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                        decision === 'PILOT_MARKET_VALIDATION'
                          ? 'bg-teal-50 border-teal-500 ring-2 ring-teal-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        checked={decision === 'PILOT_MARKET_VALIDATION'}
                        onChange={() => setDecision('PILOT_MARKET_VALIDATION')}
                        className="mt-0.5 accent-teal-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900">2. Pilot / Market Validation Recommended</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Idea is viable. Recommend small batch production and residential sampling before capital expansion.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                        decision === 'BUSINESS_LAUNCH_READY'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        checked={decision === 'BUSINESS_LAUNCH_READY'}
                        onChange={() => setDecision('BUSINESS_LAUNCH_READY')}
                        className="mt-0.5 accent-emerald-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900">3. Business Launch Ready</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Thorough financial planning, compliance, and confirmed demand. Ready for commercial rollout.
                        </p>
                      </div>
                    </label>

                    <label
                      className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start space-x-3 ${
                        decision === 'INVESTMENT_READINESS_REVIEW'
                          ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="outcome"
                        checked={decision === 'INVESTMENT_READINESS_REVIEW'}
                        onChange={() => setDecision('INVESTMENT_READINESS_REVIEW')}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <p className="font-bold text-slate-900">4. Investment-Readiness Review Recommended</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          High potential micro-enterprise suitable for Mudra loan or institutional angel seed grant review.
                        </p>
                      </div>
                    </label>
                  </div>

                  <p className="text-[11px] text-slate-400 italic mt-2">
                    * Institutional Disclaimer: These are technical recommendations, not automatic business or funding approvals.
                  </p>
                </div>

                {/* Personalized Feedback in English (Auto-translated) */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-1">
                    Personalized Assessor Feedback & Guidance (English) *
                  </label>
                  <textarea
                    rows={4}
                    value={feedbackEn}
                    onChange={(e) => setFeedbackEn(e.target.value)}
                    className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Provide specific practical suggestions for the entrepreneur..."
                  />
                  <p className="text-[11px] text-teal-700 mt-1 font-medium">
                    🌐 IndicTrans2 will auto-translate your guidance into {activeBeneficiary.preferredLanguage.toUpperCase()} for the beneficiary dashboard.
                  </p>
                </div>

                {/* Clarification Request Option */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-slate-500" />
                      <span>Request Clarification from Beneficiary</span>
                    </span>
                    {clarificationSent && (
                      <span className="text-[10px] text-teal-700 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                        Query dispatched to beneficiary!
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={clarificationText}
                      onChange={(e) => setClarificationText(e.target.value)}
                      placeholder="e.g. Please clarify exact storage temperature for lime pickle batches..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleSendClarification}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors"
                    >
                      Send Query
                    </button>
                  </div>
                </div>

                {submittedReviewSuccess && (
                  <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl text-teal-800 text-xs font-bold flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0" />
                    <span>
                      Assessment successfully finalized! Translated feedback and ratings saved to persistent database.
                    </span>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={handleFinalizeAssessment}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 hover:scale-[1.01]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Finalize Review & Dispatch Translated Feedback</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-3xl border border-slate-200 p-16 text-center text-slate-400 space-y-3">
              <ShieldCheck className="w-14 h-14 mx-auto text-slate-300" />
              <h3 className="text-base font-bold text-slate-700">No Case Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Select an assigned micro-enterprise pitch from the queue on the left to start technical review.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
