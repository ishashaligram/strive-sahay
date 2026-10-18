import React, { useState } from 'react';
import {
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Clock,
  Mic,
  Send,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  FileCheck,
  TrendingUp,
  RotateCcw,
  Volume2,
  AlertTriangle,
  Edit3,
  Check,
  X,
  Lock,
  Layers,
  Info,
} from 'lucide-react';
import {
  BusinessProfile,
  FactItem,
  FactStatus,
  MentorQuestion,
  SupportedLanguage,
  InconsistencyItem,
} from '../types';
import { useTranslation } from '../services/i18n';
import { AiMentorEngine } from '../services/aiMentorEngine';
import { ContradictionEngine } from '../services/contradictionEngine';
import { storage } from '../services/storage';

interface SplitScreenMentorProps {
  profile: BusinessProfile;
  questions: MentorQuestion[];
  completeness: number;
  currentLang: SupportedLanguage;
  onAnswerQuestion: (question: MentorQuestion, answerText: string, isDontKnow?: boolean) => void;
  onRequestScoring: () => void;
  onNavigateToImprovement: () => void;
  onUpdateProfile?: (updated: BusinessProfile) => void;
}

export const SplitScreenMentor: React.FC<SplitScreenMentorProps> = ({
  profile,
  questions,
  completeness,
  currentLang,
  onAnswerQuestion,
  onRequestScoring,
  onNavigateToImprovement,
  onUpdateProfile,
}) => {
  const t = useTranslation(currentLang);

  // Active question in left pane
  const pendingQuestions = questions.filter((q) => q.status === 'pending');
  const answeredQuestions = questions.filter((q) => q.status === 'answered');
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);

  // Active answer text state
  const [currentAnswerText, setCurrentAnswerText] = useState('');
  const [showGuidanceFor, setShowGuidanceFor] = useState<string | null>(null);
  const [activeModuleFilter, setActiveModuleFilter] = useState<'all' | 'overview' | 'market' | 'finance' | 'operations' | 'risk'>('all');

  // Inconsistencies & Contradictions State
  const [inconsistencies, setInconsistencies] = useState<InconsistencyItem[]>(() => {
    const saved = storage.getInconsistencies(profile.id);
    if (saved && saved.length > 0) return saved;
    const detected = ContradictionEngine.detectContradictions(profile);
    storage.saveInconsistencies(profile.id, detected);
    return detected;
  });

  const [activeContradictionTab, setActiveContradictionTab] = useState<'unresolved' | 'resolved'>('unresolved');
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [customCorrection, setCustomCorrection] = useState('');

  // In-line Fact Editing State
  const [editingFactKey, setEditingFactKey] = useState<string | null>(null);
  const [editingFactValue, setEditingFactValue] = useState<string>('');

  const activeQuestion = pendingQuestions[selectedQuestionIndex] || pendingQuestions[0];

  const handleSelectSuggested = (text: string) => {
    setCurrentAnswerText(text);
  };

  const handleSendAnswer = () => {
    if (!activeQuestion || !currentAnswerText.trim()) return;
    onAnswerQuestion(activeQuestion, currentAnswerText.trim(), false);
    setCurrentAnswerText('');
    setShowGuidanceFor(null);
    if (selectedQuestionIndex >= pendingQuestions.length - 1) {
      setSelectedQuestionIndex(0);
    }
  };

  const handleDontKnow = () => {
    if (!activeQuestion) return;
    setShowGuidanceFor(activeQuestion.id);
    onAnswerQuestion(activeQuestion, 'Guidance requested: Beneficiary exploring options with STRIVE mentor.', true);
  };

  const handleSkip = () => {
    if (selectedQuestionIndex < pendingQuestions.length - 1) {
      setSelectedQuestionIndex((prev) => prev + 1);
    } else {
      setSelectedQuestionIndex(0);
    }
  };

  // Contradiction Resolution
  const handleResolveContradiction = (
    item: InconsistencyItem,
    chosenValue: string,
    isCustom = false,
    isDontKnow = false
  ) => {
    const updated = inconsistencies.map((inc) => {
      if (inc.id === item.id) {
        return {
          ...inc,
          isResolved: true,
          resolvedValue: isDontKnow ? 'Pending human mentor assistance' : chosenValue,
          resolvedAt: new Date().toISOString(),
          resolutionNote: isDontKnow
            ? 'Beneficiary flagged uncertainty; human mentor clarification requested.'
            : isCustom
            ? 'Beneficiary entered custom reconciled figure.'
            : 'Beneficiary confirmed verified source figure.',
        };
      }
      return inc;
    });

    setInconsistencies(updated);
    storage.saveInconsistencies(profile.id, updated);
    setResolvingId(null);
    setCustomCorrection('');

    // Update profile if not "don't know" and onUpdateProfile exists
    if (!isDontKnow && item.fieldKey && onUpdateProfile) {
      const updatedProfile = AiMentorEngine.applyDirectFieldUpdate(
        profile,
        item.fieldKey,
        chosenValue,
        'Contradiction Reconciled: Beneficiary confirmed value over previous conflicting record'
      );
      onUpdateProfile(updatedProfile);
    }
  };

  // Direct Fact Edit
  const handleStartEditFact = (fact: FactItem) => {
    setEditingFactKey(fact.key);
    setEditingFactValue(fact.value || '');
  };

  const handleSaveEditFact = (factKey: string, fullFieldKey: string) => {
    if (!editingFactValue.trim()) return;
    if (onUpdateProfile) {
      const updatedProfile = AiMentorEngine.applyDirectFieldUpdate(
        profile,
        fullFieldKey,
        editingFactValue.trim(),
        'Beneficiary Manual Review & Correction'
      );
      onUpdateProfile(updatedProfile);
    }
    setEditingFactKey(null);
    setEditingFactValue('');
  };

  const handleCancelEditFact = () => {
    setEditingFactKey(null);
    setEditingFactValue('');
  };

  // Block status logic
  const unresolvedCritical = inconsistencies.filter((i) => !i.isResolved && i.severity === 'critical');
  const unresolvedWarnings = inconsistencies.filter((i) => !i.isResolved && i.severity === 'warning');
  const { ready: readyForScoring, missingEssentials } = AiMentorEngine.isReadyForScoring(profile);
  const isScoringBlocked = unresolvedCritical.length > 0 || !readyForScoring;

  // Status Badge Helper
  const renderStatusBadge = (status: FactStatus) => {
    switch (status) {
      case 'PROVIDED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
            {t.provided}
          </span>
        );
      case 'MISSING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            {t.missing}
          </span>
        );
      case 'UNCLEAR':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
            {t.unclear}
          </span>
        );
      case 'CONFLICTING':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
            {t.conflicting}
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
            {t.unknown}
          </span>
        );
    }
  };

  // Render individual Fact card with direct edit capability
  const renderFactCard = (fact: FactItem, moduleName: string) => {
    const isEditing = editingFactKey === fact.key;
    const fullFieldKey = `${moduleName}.${fact.key}`;

    return (
      <div
        key={fact.key}
        className={`p-3 rounded-xl border text-xs transition-all ${
          fact.status === 'PROVIDED'
            ? 'bg-white border-slate-200 shadow-sm'
            : fact.status === 'MISSING'
            ? 'bg-rose-50/40 border-rose-200'
            : 'bg-amber-50/40 border-amber-200'
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <span className="font-bold text-slate-800">
            {fact.label[currentLang] || fact.label.en}
          </span>
          <div className="flex items-center space-x-1.5">
            {renderStatusBadge(fact.status)}
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleStartEditFact(fact)}
                title="Edit and correct this field"
                className="p-1 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {isEditing ? (
          <div className="mt-2 space-y-2">
            <input
              type="text"
              value={editingFactValue}
              onChange={(e) => setEditingFactValue(e.target.value)}
              className="w-full p-2 text-xs border border-teal-500 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
              autoFocus
            />
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => handleSaveEditFact(fact.key, fullFieldKey)}
                className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-[11px] font-bold flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>Save</span>
              </button>
              <button
                type="button"
                onClick={handleCancelEditFact}
                className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md text-[11px] font-semibold flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        ) : fact.status === 'PROVIDED' || fact.status === 'UNCLEAR' ? (
          <div className="space-y-1.5 mt-1">
            <p className="text-slate-900 font-medium leading-relaxed bg-slate-50 p-2 rounded-lg border border-slate-100">
              {fact.value || 'Provided'}
            </p>
            {fact.evidenceQuote && (
              <p className="text-[11px] text-slate-500 italic">
                "{fact.evidenceQuote}"
              </p>
            )}
            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
              <span>Source: {fact.source}</span>
              <span>{new Date(fact.lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        ) : (
          <div className="space-y-1 mt-1">
            <p className="text-slate-400 italic text-[11px]">
              Information not provided in pitch. Answer adaptive questions or click edit to supply this detail.
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner with Completeness & Actions */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>Tata STRIVE Qwen3-8B Adaptive Mentor</span>
          </div>
          <h2 className="text-xl font-bold text-white">{profile.title}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Language: {profile.originalLanguage.toUpperCase()} | Submissions Format: {profile.submissionType.toUpperCase()} | Trade: {profile.trade}
          </p>
        </div>

        {/* Completeness Bar & Action Button */}
        <div className="flex items-center space-x-6">
          <div className="w-44 text-right">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-slate-400">{t.profileCompleteness}</span>
              <span className={completeness >= 80 ? 'text-teal-400' : 'text-amber-400'}>
                {completeness}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  completeness >= 80 ? 'bg-teal-400' : 'bg-amber-400'
                }`}
                style={{ width: `${completeness}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={onRequestScoring}
            disabled={isScoringBlocked}
            title={
              isScoringBlocked
                ? 'Scoring locked: Resolve critical contradictions and missing essentials first.'
                : 'Calculate preliminary AI score'
            }
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 transition-all shadow-md ${
              !isScoringBlocked
                ? 'bg-teal-500 hover:bg-teal-600 text-slate-950 hover:scale-[1.02]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
            }`}
          >
            {isScoringBlocked ? <Lock className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            <span>{t.requestPreliminaryScore}</span>
          </button>
        </div>
      </div>

      {/* BLOCKING QUALITY & CONTRADICTION BANNER */}
      {isScoringBlocked && (
        <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 shadow-sm space-y-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold flex-shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-amber-900">
                ⚠️ Scoring & Submission Locked — Quality Validation Required
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Tata STRIVE guarantees genuine evidence-based evaluations. Resolving critical missing details or financial contradictions is required before preliminary AI scoring or assessor submission.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-amber-200 text-xs">
            {unresolvedCritical.length > 0 && (
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="font-bold text-rose-700 block mb-1">
                  • {unresolvedCritical.length} Critical Contradiction(s) To Reconcile:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  {unresolvedCritical.map((c) => (
                    <li key={c.id}>
                      <span className="font-semibold">{c.fieldKey}:</span> {c.contradictionExplanation}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {missingEssentials.length > 0 && (
              <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                <span className="font-bold text-amber-800 block mb-1">
                  • {missingEssentials.length} Essential Business Detail(s) Missing:
                </span>
                <ul className="list-disc list-inside space-y-1 text-slate-700 text-[11px]">
                  {missingEssentials.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTRADICTIONS & INCONSISTENCIES RESOLUTION ACCORDION */}
      {inconsistencies.length > 0 && (
        <div className="bg-white rounded-2xl border-2 border-purple-200 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-purple-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-purple-950">
                  Data Verification & Contradiction Resolution Hub
                </h3>
                <p className="text-xs text-slate-500">
                  Detected conflicting claims or unrealistic financial calculations across your submission and answers.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setActiveContradictionTab('unresolved')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                  activeContradictionTab === 'unresolved'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Needs Confirmation ({inconsistencies.filter((i) => !i.isResolved).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveContradictionTab('resolved')}
                className={`px-3 py-1 text-xs rounded-lg font-bold transition-colors ${
                  activeContradictionTab === 'resolved'
                    ? 'bg-purple-700 text-white'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                }`}
              >
                Reconciled ({inconsistencies.filter((i) => i.isResolved).length})
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-4">
            {inconsistencies
              .filter((i) => (activeContradictionTab === 'unresolved' ? !i.isResolved : i.isResolved))
              .map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border text-xs space-y-3 ${
                    item.isResolved
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : item.severity === 'critical'
                      ? 'bg-rose-50/40 border-rose-300'
                      : 'bg-amber-50/40 border-amber-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          item.severity === 'critical'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {item.severity}
                      </span>
                      <span className="font-bold text-slate-800">{item.fieldKey}</span>
                    </div>
                    {item.isResolved && (
                      <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Reconciled</span>
                      </span>
                    )}
                  </div>

                  <p className="text-slate-800 font-medium leading-relaxed">
                    {item.contradictionExplanation}
                  </p>

                  {/* Side-by-side Conflicting Sources */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                    {/* Source A */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>Source A: {item.sourceA.label}</span>
                      </div>
                      <p className="text-slate-900 font-bold text-xs bg-slate-50 p-1.5 rounded">
                        {item.sourceA.value}
                      </p>
                      {item.sourceA.evidenceQuote && (
                        <p className="text-[10px] text-slate-400 italic">
                          "{item.sourceA.evidenceQuote}"
                        </p>
                      )}
                      {!item.isResolved && (
                        <button
                          type="button"
                          onClick={() => handleResolveContradiction(item, item.sourceA.value)}
                          className="w-full mt-1 px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 rounded border border-purple-200 transition-colors"
                        >
                          Confirm Value A
                        </button>
                      )}
                    </div>

                    {/* Source B */}
                    <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                        <span>Source B: {item.sourceB.label}</span>
                      </div>
                      <p className="text-slate-900 font-bold text-xs bg-slate-50 p-1.5 rounded">
                        {item.sourceB.value}
                      </p>
                      {item.sourceB.evidenceQuote && (
                        <p className="text-[10px] text-slate-400 italic">
                          "{item.sourceB.evidenceQuote}"
                        </p>
                      )}
                      {!item.isResolved && (
                        <button
                          type="button"
                          onClick={() => handleResolveContradiction(item, item.sourceB.value)}
                          className="w-full mt-1 px-2.5 py-1 text-[11px] font-bold bg-purple-50 hover:bg-purple-100 text-purple-800 rounded border border-purple-200 transition-colors"
                        >
                          Confirm Value B
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resolution Notes or Custom Options */}
                  {!item.isResolved ? (
                    <div className="pt-2 flex flex-wrap items-center gap-2">
                      {resolvingId === item.id ? (
                        <div className="w-full flex items-center space-x-2 pt-1">
                          <input
                            type="text"
                            value={customCorrection}
                            onChange={(e) => setCustomCorrection(e.target.value)}
                            placeholder="Type accurate reconciled figure (e.g., ₹35,000 for total equipment)..."
                            className="flex-1 p-2 text-xs border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleResolveContradiction(item, customCorrection.trim(), true)
                            }
                            disabled={!customCorrection.trim()}
                            className="px-3 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg font-bold text-xs"
                          >
                            Save Corrected
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setResolvingId(null);
                              setCustomCorrection('');
                            }}
                            className="px-2.5 py-2 text-slate-500 hover:text-slate-800 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setResolvingId(item.id)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 rounded-lg transition-colors"
                          >
                            Provide Custom Correction
                          </button>
                          <button
                            type="button"
                            onClick={() => handleResolveContradiction(item, '', false, true)}
                            className="px-3 py-1.5 text-[11px] font-bold bg-amber-100 text-amber-900 hover:bg-amber-200 rounded-lg transition-colors"
                          >
                            I Don't Know (Flag for Human Mentor)
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-100/70 text-emerald-950 text-xs space-y-0.5">
                      <p className="font-bold">
                        Reconciled Value: {item.resolvedValue}
                      </p>
                      <p className="text-[11px] text-emerald-800">
                        Resolution Note: {item.resolutionNote}
                      </p>
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* SECTION 10: Split-Screen Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT PANE: AI Adaptive Questioning (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center font-bold text-xs border border-teal-200">
                  AI
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{t.askMentorQuestion}</h3>
                  <span className="text-[10px] text-slate-400">Powered by Qwen3-8B (Ollama)</span>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {pendingQuestions.length} remaining
              </span>
            </div>

            {/* Active Question Box */}
            {activeQuestion ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white space-y-2.5 shadow-md">
                  <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-teal-300">
                    <span>Target: {activeQuestion.module.toUpperCase()}</span>
                    <span>Q 0{selectedQuestionIndex + 1} of 0{pendingQuestions.length}</span>
                  </div>
                  <p className="text-sm font-semibold leading-relaxed font-sans">
                    {activeQuestion.question[currentLang] || activeQuestion.question.en}
                  </p>
                  <p className="text-xs text-slate-300 border-t border-indigo-900/60 pt-2 font-normal">
                    💡 <strong className="text-teal-300">Why it matters:</strong>{' '}
                    {activeQuestion.contextRationale[currentLang] || activeQuestion.contextRationale.en}
                  </p>
                </div>

                {/* Practical Guidance Toggle (especially if they don't know) */}
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-2">
                  <div
                    className="flex items-center justify-between cursor-pointer font-bold text-amber-900"
                    onClick={() =>
                      setShowGuidanceFor(showGuidanceFor === activeQuestion.id ? null : activeQuestion.id)
                    }
                  >
                    <span className="flex items-center space-x-1.5">
                      <HelpCircle className="w-4 h-4 text-amber-600" />
                      <span>{t.practicalGuidanceTitle}</span>
                    </span>
                    {showGuidanceFor === activeQuestion.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>

                  {(showGuidanceFor === activeQuestion.id || activeQuestion.status === 'dont_know') && (
                    <p className="text-amber-800 leading-relaxed pt-1 border-t border-amber-200/60 font-sans">
                      {activeQuestion.practicalGuidance[currentLang] || activeQuestion.practicalGuidance.en}
                    </p>
                  )}
                </div>

                {/* Suggested Benchmark Answers (for quick selection) */}
                {activeQuestion.suggestedAnswers && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Common Trade Benchmarks (Click to use):
                    </span>
                    <div className="space-y-1">
                      {activeQuestion.suggestedAnswers.map((sug, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectSuggested(sug)}
                          className="w-full text-left text-xs p-2 rounded-lg border border-slate-200 hover:border-teal-500 hover:bg-teal-50 text-slate-700 transition-colors"
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Input Area */}
                <div className="space-y-2 pt-2">
                  <label className="block text-xs font-semibold text-slate-700">
                    Your Response ({currentLang.toUpperCase()}):
                  </label>
                  <textarea
                    rows={3}
                    value={currentAnswerText}
                    onChange={(e) => setCurrentAnswerText(e.target.value)}
                    placeholder="Type your response here or select a benchmark above..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                  />

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleSendAnswer}
                      disabled={!currentAnswerText.trim()}
                      className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors flex items-center justify-center space-x-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{t.submitAnswer}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDontKnow}
                      className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs rounded-xl transition-colors"
                    >
                      {t.iDontKnow}
                    </button>

                    <button
                      type="button"
                      onClick={handleSkip}
                      className="py-2 px-2.5 text-slate-500 hover:text-slate-800 text-xs font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                    >
                      {t.skipQuestion}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 space-y-3">
                <CheckCircle2 className="w-10 h-10 text-teal-600 mx-auto" />
                <h4 className="font-bold text-slate-800 text-sm">All Current Questions Answered!</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Your business profile is enriched with facts. Proceed to calculate the preliminary AI screening score.
                </p>
                <button
                  onClick={onRequestScoring}
                  disabled={isScoringBlocked}
                  className={`mt-2 px-4 py-2 font-semibold text-xs rounded-xl shadow-sm transition-colors ${
                    !isScoringBlocked
                      ? 'bg-teal-600 hover:bg-teal-700 text-white'
                      : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {t.requestPreliminaryScore}
                </button>
              </div>
            )}
          </div>

          {/* Answered Questions History Trail */}
          {answeredQuestions.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-2">
              <span className="text-xs font-bold text-slate-700 block">
                Recently Answered Questions ({answeredQuestions.length})
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {answeredQuestions.map((q) => (
                  <div key={q.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs space-y-1">
                    <p className="font-medium text-slate-800 line-clamp-1">
                      {q.question[currentLang] || q.question.en}
                    </p>
                    <p className="text-[11px] text-teal-700 font-semibold">
                      Ans: {q.beneficiaryAnswer}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT PANE: Live Structured Business Profile (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">{t.liveProfileTab}</h3>
                <p className="text-xs text-slate-500">
                  Extracted and verified fact sheet. Click the pencil icon on any item to review or edit.
                </p>
              </div>

              {/* Module Filter Pills */}
              <div className="flex flex-wrap gap-1">
                {(['all', 'overview', 'market', 'finance', 'operations', 'risk'] as const).map((mod) => (
                  <button
                    key={mod}
                    onClick={() => setActiveModuleFilter(mod)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-semibold capitalize transition-colors ${
                      activeModuleFilter === mod
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mod}
                  </button>
                ))}
              </div>
            </div>

            {/* Profile Modules */}
            <div className="space-y-5 max-h-[680px] overflow-y-auto pr-1">
              {/* 1. Overview */}
              {(activeModuleFilter === 'all' || activeModuleFilter === 'overview') && (
                <div className="space-y-2.5">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                    <span>1. Overview & Core Concept</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(profile.overview).map((f) => renderFactCard(f, 'overview'))}
                  </div>
                </div>
              )}

              {/* 2. Market */}
              {(activeModuleFilter === 'all' || activeModuleFilter === 'market') && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <span>2. Market, Demand & Competition</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(profile.market).map((f) => renderFactCard(f, 'market'))}
                  </div>
                </div>
              )}

              {/* 3. Finance */}
              {(activeModuleFilter === 'all' || activeModuleFilter === 'finance') && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>3. Finance & Unit Economics</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(profile.finance).map((f) => renderFactCard(f, 'finance'))}
                  </div>
                </div>
              )}

              {/* 4. Operations */}
              {(activeModuleFilter === 'all' || activeModuleFilter === 'operations') && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    <span>4. Operations & Sourcing</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(profile.operations).map((f) => renderFactCard(f, 'operations'))}
                  </div>
                </div>
              )}

              {/* 5. Risk & Compliance */}
              {(activeModuleFilter === 'all' || activeModuleFilter === 'risk') && (
                <div className="space-y-2.5 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                    <span>5. Risk, Spoilage & FSSAI Compliance</span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {Object.values(profile.risk).map((f) => renderFactCard(f, 'risk'))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
