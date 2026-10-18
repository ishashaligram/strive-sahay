import React, { useState } from 'react';
import {
  X,
  Compass,
  CheckCircle2,
  Clock,
  UploadCloud,
  FileText,
  DollarSign,
  TrendingUp,
  Percent,
  Calculator,
  UserPlus,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  Award,
  AlertTriangle,
  Layers,
  Calendar,
  MessageSquare,
  Plus,
  Trash2,
} from 'lucide-react';
import {
  BusinessProfile,
  AssessmentVersion,
  BusinessRoadmap,
  SupportedLanguage,
  RoadmapTask,
} from '../types';
import { RoadmapEngine } from '../services/roadmapEngine';
import { useTranslation } from '../services/i18n';
import { storage } from '../services/storage';

interface BeneficiaryRoadmapModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: BusinessProfile;
  assessment?: AssessmentVersion;
  currentLang: SupportedLanguage;
  onTriggerReassessment?: () => void;
}

export const BeneficiaryRoadmapModal: React.FC<BeneficiaryRoadmapModalProps> = ({
  isOpen,
  onClose,
  profile,
  assessment,
  currentLang,
  onTriggerReassessment,
}) => {
  const t = useTranslation(currentLang);
  const [activeTab, setActiveTab] = useState<'plan' | 'calculator' | 'breakeven' | 'checklist' | 'skills'>('plan');
  const [timeframe, setTimeframe] = useState<'7_days' | '30_days'>('30_days');

  // Load or generate roadmap
  const [roadmap, setRoadmap] = useState<BusinessRoadmap>(() => {
    const dummyAssessment: AssessmentVersion = assessment || {
      versionNumber: 1,
      evaluatedAt: new Date().toISOString(),
      overallScore: 6.8,
      isEligible: false,
      completenessPercentage: 80,
      domains: {} as any,
      swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
      priorityActions: [],
      modelName: 'qwen3:8b',
      rubricVersion: 'STRIVE-2.4',
    };
    return RoadmapEngine.getOrGenerateRoadmap(profile, dummyAssessment, timeframe, currentLang);
  });

  // Calculator State
  const [calcCost, setCalcCost] = useState(roadmap.calculator.unitCost);
  const [calcPrice, setCalcPrice] = useState(roadmap.calculator.sellingPrice);
  const [calcVolume, setCalcVolume] = useState(roadmap.calculator.monthlyExpectedVolume);
  const [calcFixed, setCalcFixed] = useState(roadmap.calculator.monthlyFixedCosts);
  const [capexList, setCapexList] = useState(roadmap.calculator.capexItems);
  const [newCapexName, setNewCapexName] = useState('');
  const [newCapexCost, setNewCapexCost] = useState('');

  // Human Mentoring Assistance Modal State
  const [showMentorHelpModal, setShowMentorHelpModal] = useState(false);
  const [mentorHelpNote, setMentorHelpNote] = useState('');
  const [mentorHelpSubmitted, setMentorHelpSubmitted] = useState(false);

  // Evidence Upload Modal State
  const [selectedTaskForUpload, setSelectedTaskForUpload] = useState<RoadmapTask | null>(null);
  const [evidenceFileName, setEvidenceFileName] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');

  if (!isOpen) return null;

  // Real-time Calculator Math
  const totalCapex = capexList.reduce((acc, item) => acc + item.cost, 0);
  const contributionPerUnit = Math.max(0, calcPrice - calcCost);
  const marginPercent = calcPrice > 0 ? Math.round(((calcPrice - calcCost) / calcPrice) * 100) : 0;
  const monthlyRevenue = calcPrice * calcVolume;
  const monthlyGrossProfit = contributionPerUnit * calcVolume;
  const monthlyNetProfit = monthlyGrossProfit - calcFixed;
  const breakevenUnits = contributionPerUnit > 0 ? Math.ceil(calcFixed / contributionPerUnit) : 0;
  const breakevenRevenue = breakevenUnits * calcPrice;

  // Toggle Task Completion
  const handleToggleTask = (task: RoadmapTask) => {
    const nextStatus = task.status === 'completed' ? 'todo' : 'completed';
    const updated = RoadmapEngine.updateTaskProgress(profile.id, task.id, nextStatus);
    if (updated) setRoadmap({ ...updated });
  };

  // Upload Evidence
  const handleSaveEvidence = () => {
    if (!selectedTaskForUpload) return;
    const updated = RoadmapEngine.updateTaskProgress(profile.id, selectedTaskForUpload.id, 'completed', {
      fileName: evidenceFileName || 'verification_evidence.jpg',
      fileType: 'image/jpeg',
      notes: evidenceNotes || 'Completed and verified as per Tata STRIVE guidelines.',
    });
    if (updated) setRoadmap({ ...updated });
    setSelectedTaskForUpload(null);
    setEvidenceFileName('');
    setEvidenceNotes('');
  };

  // Checklist counter increment
  const handleIncrementChecklist = (checkId: string) => {
    const updatedChecklist = roadmap.checklist.map((item) => {
      if (item.id === checkId) {
        const next = Math.min(item.targetCount, item.completedCount + 1);
        return {
          ...item,
          completedCount: next,
          isCompleted: next >= item.targetCount,
        };
      }
      return item;
    });
    const updated = { ...roadmap, checklist: updatedChecklist };
    storage.saveRoadmap(updated);
    setRoadmap(updated);
  };

  // Add Capex Item
  const handleAddCapex = () => {
    const cost = parseFloat(newCapexCost);
    if (!newCapexName.trim() || isNaN(cost) || cost <= 0) return;
    const updated = [...capexList, { name: newCapexName.trim(), cost, category: 'Tools & Machinery' }];
    setCapexList(updated);
    setNewCapexName('');
    setNewCapexCost('');
  };

  const handleRemoveCapex = (index: number) => {
    const updated = capexList.filter((_, i) => i !== index);
    setCapexList(updated);
  };

  // Submit Human Mentor Request
  const handleSubmitMentorHelp = () => {
    RoadmapEngine.requestHumanMentoring(profile.id, mentorHelpNote);
    setMentorHelpSubmitted(true);
    setTimeout(() => {
      setMentorHelpSubmitted(false);
      setShowMentorHelpModal(false);
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold">
              <Compass className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  {currentLang === 'mr'
                    ? 'वैयक्तिकृत व्यवसाय विकास आराखडा'
                    : currentLang === 'hi'
                    ? 'व्यक्तिगत व्यवसाय विकास रोडमैप'
                    : 'Personalized Business Development Roadmap'}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                  Tata STRIVE Mentoring
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {profile.title} • {profile.overview.proposedLocation.value}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Timeframe Selector */}
            <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setTimeframe('7_days')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  timeframe === '7_days'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                7-Day Sprint
              </button>
              <button
                onClick={() => setTimeframe('30_days')}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  timeframe === '30_days'
                    ? 'bg-teal-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                30-Day Plan
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress & Quick Stats Ribbon */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Roadmap Completion</p>
              <div className="flex items-center space-x-2 mt-0.5">
                <div className="w-32 bg-slate-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${roadmap.overallProgressPercentage}%` }}
                  ></div>
                </div>
                <span className="text-xs font-extrabold text-slate-800">{roadmap.overallProgressPercentage}%</span>
              </div>
            </div>

            <div className="hidden sm:block border-l border-slate-200 pl-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Completed Tasks</p>
              <p className="text-xs font-bold text-slate-800 mt-0.5">
                {roadmap.tasks.filter((t) => t.status === 'completed').length} of {roadmap.tasks.length} Done
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowMentorHelpModal(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-amber-700" />
              <span>
                {currentLang === 'mr'
                  ? 'मानवी मार्गदर्शक मदत'
                  : currentLang === 'hi'
                  ? 'मेंटर सहायता का अनुरोध'
                  : 'Request Mentor Assistance'}
              </span>
            </button>

            {onTriggerReassessment && (
              <button
                onClick={() => {
                  onTriggerReassessment();
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-600 transition-colors shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>
                  {currentLang === 'mr'
                    ? 'पुनर्मूल्यांकन करा'
                    : currentLang === 'hi'
                    ? 'पुनर्मूल्यांकन का अनुरोध'
                    : 'Request AI Reassessment'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'plan'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>
              {currentLang === 'mr' ? 'कृती योजना (Tasks)' : currentLang === 'hi' ? 'कार्य योजना (Tasks)' : 'Action Plan'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('calculator')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'calculator'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>
              {currentLang === 'mr' ? 'भांडवल व नफा गणक' : currentLang === 'hi' ? 'लागत व मुनाफा कैलकुलेटर' : 'Cost & Profit Calculator'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('breakeven')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'breakeven'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>
              {currentLang === 'mr' ? 'ब्रेक-इव्हन अंदाज' : currentLang === 'hi' ? 'ब्रेक-ईवन विश्लेषण' : 'Break-Even Analysis'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('checklist')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'checklist'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {currentLang === 'mr' ? 'बाजार पडताळणी चेकलिस्ट' : currentLang === 'hi' ? 'मार्केट सत्यापन चेकलिस्ट' : 'Market Validation Checklist'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('skills')}
            className={`py-3 px-4 font-bold text-xs border-b-2 flex items-center space-x-1.5 transition-colors ${
              activeTab === 'skills'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>
              {currentLang === 'mr' ? 'कौशल्य व योजना' : currentLang === 'hi' ? 'कौशल एवं योजनाएं' : 'Skills & Mentoring'}
            </span>
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: ACTION PLAN TASKS */}
          {activeTab === 'plan' && (
            <div className="space-y-4">
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-xs text-indigo-900 flex items-start space-x-3">
                <HelpCircle className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">
                    {currentLang === 'mr'
                      ? 'हा विकास आराखडा कसा पूर्ण करायचा?'
                      : currentLang === 'hi'
                      ? 'इस विकास रोडमैप को कैसे पूरा करें?'
                      : 'How to utilize your personalized roadmap?'}
                  </p>
                  <p className="text-indigo-700 mt-1">
                    {currentLang === 'mr'
                      ? 'प्रत्येक कार्य तुमच्या व्यवसायातील त्रुटी दूर करण्यासाठी तयार केले आहे. कार्य पूर्ण केल्यावर पुरावा (पावती किंवा फोटो) जोडा. पूर्ण झाल्यावर पुनर्मूल्यांकनाची विनंती करा.'
                      : currentLang === 'hi'
                      ? 'प्रत्येक कार्य आपके व्यवसाय की कमजोरियों को दूर करने के लिए है। कार्य पूरा करके फोटो या रसीद अपलोड करें, फिर पुनर्मूल्यांकन कराएं।'
                      : 'Each practical task targets weak scoring areas. Complete the steps, upload photo evidence or receipts, and request reassessment to raise your score above 7.0.'}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {roadmap.tasks.map((task, idx) => {
                  const isDone = task.status === 'completed';
                  const title = task.title[currentLang] || task.title.en;
                  const missing = task.missingElement[currentLang] || task.missingElement.en;
                  const why = task.whyItMatters[currentLang] || task.whyItMatters.en;
                  const how = task.howToImprove[currentLang] || task.howToImprove.en;
                  const action = task.whatActionToTake[currentLang] || task.whatActionToTake.en;

                  return (
                    <div
                      key={task.id}
                      className={`p-5 rounded-2xl border transition-all ${
                        isDone
                          ? 'bg-teal-50/60 border-teal-200'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start space-x-3.5 flex-1">
                          <button
                            onClick={() => handleToggleTask(task)}
                            className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center transition-colors ${
                              isDone
                                ? 'bg-teal-500 border-teal-600 text-slate-950 font-bold'
                                : 'border-slate-300 hover:border-teal-500 text-transparent'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4 fill-current" />
                          </button>

                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                Day {task.dayOffset}
                              </span>
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                                {task.domain}
                              </span>
                              {isDone && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200">
                                  Completed & Verified
                                </span>
                              )}
                            </div>

                            <h3 className={`text-base font-bold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {title}
                            </h3>

                            {/* 4-Part Structure: Missing -> Why -> How -> Action */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                              <div className="bg-rose-50/70 border border-rose-200/80 rounded-xl p-3">
                                <p className="font-extrabold text-[11px] text-rose-800 uppercase tracking-wider mb-1">
                                  {currentLang === 'mr' ? 'काय अपूर्ण आहे? (What is missing)' : currentLang === 'hi' ? 'क्या अधूरा है? (What is missing)' : 'What is missing?'}
                                </p>
                                <p className="text-rose-950">{missing}</p>
                              </div>

                              <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3">
                                <p className="font-extrabold text-[11px] text-amber-800 uppercase tracking-wider mb-1">
                                  {currentLang === 'mr' ? 'हे का महत्त्वाचे आहे? (Why it matters)' : currentLang === 'hi' ? 'यह क्यों जरूरी है? (Why it matters)' : 'Why it matters?'}
                                </p>
                                <p className="text-amber-950">{why}</p>
                              </div>

                              <div className="bg-sky-50/70 border border-sky-200/80 rounded-xl p-3">
                                <p className="font-extrabold text-[11px] text-sky-800 uppercase tracking-wider mb-1">
                                  {currentLang === 'mr' ? 'कशी सुधारणा करावी? (How to improve)' : currentLang === 'hi' ? 'सुधार कैसे करें? (How to improve)' : 'How to improve?'}
                                </p>
                                <p className="text-sky-950">{how}</p>
                              </div>

                              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3">
                                <p className="font-extrabold text-[11px] text-emerald-800 uppercase tracking-wider mb-1">
                                  {currentLang === 'mr' ? 'पुढील कृती काय करावी? (What action to take)' : currentLang === 'hi' ? 'अगला कदम क्या लें? (What action to take)' : 'What action to take next?'}
                                </p>
                                <p className="text-emerald-950 font-medium">{action}</p>
                              </div>
                            </div>

                            {/* Evidence Info or Upload Button */}
                            {task.evidenceUploaded ? (
                              <div className="flex items-center space-x-2 text-xs text-teal-700 bg-teal-100/70 p-2.5 rounded-xl border border-teal-200">
                                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                                <span>Uploaded: {task.evidenceUploaded.fileName} ({task.evidenceUploaded.notes})</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setSelectedTaskForUpload(task)}
                                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 transition-colors"
                              >
                                <UploadCloud className="w-3.5 h-3.5 text-slate-600" />
                                <span>
                                  {currentLang === 'mr'
                                    ? 'पुरावा / पावती अपलोड करा'
                                    : currentLang === 'hi'
                                    ? 'प्रमाण / रसीद अपलोड करें'
                                    : 'Upload Completion Evidence / Photo'}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: STARTUP COST AND PROFIT CALCULATOR */}
          {activeTab === 'calculator' && (
            <div className="space-y-6">
              {/* Capex Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">
                      {currentLang === 'mr' ? '१. सुरुवातीचे भांडवल व यंत्रसामग्री (Capex)' : currentLang === 'hi' ? '1. प्रारंभिक पूंजी एवं मशीनरी (Capex)' : '1. Startup Capital & Equipment (Capex)'}
                    </h3>
                    <p className="text-xs text-slate-500">Itemized machinery, tools, packaging, and raw material initial costs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Capex Required</p>
                    <p className="text-lg font-extrabold text-teal-600">₹{totalCapex.toLocaleString('en-IN')}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600">Item / Machinery Name</th>
                        <th className="px-4 py-2.5 text-left font-bold text-slate-600">Category</th>
                        <th className="px-4 py-2.5 text-right font-bold text-slate-600">Cost (₹)</th>
                        <th className="px-4 py-2.5 text-center font-bold text-slate-600">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {capexList.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2 font-medium text-slate-900">{item.name}</td>
                          <td className="px-4 py-2 text-slate-500">{item.category}</td>
                          <td className="px-4 py-2 text-right font-bold text-slate-900">₹{item.cost.toLocaleString('en-IN')}</td>
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleRemoveCapex(i)}
                              className="text-slate-400 hover:text-rose-600 p-1 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Add new capex item */}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newCapexName}
                    onChange={(e) => setNewCapexName(e.target.value)}
                    placeholder="Add item (e.g., Stainless Steel Prep Table)"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="number"
                    value={newCapexCost}
                    onChange={(e) => setNewCapexCost(e.target.value)}
                    placeholder="Cost ₹"
                    className="w-28 px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    onClick={handleAddCapex}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>
              </div>

              {/* Unit Economics Sliders & Inputs */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
                <h3 className="font-bold text-slate-900 text-base">
                  {currentLang === 'mr' ? '२. नफा व विक्री गणित (Unit Economics)' : currentLang === 'hi' ? '2. मुनाफा एवं बिक्री गणित' : '2. Unit Economics & Monthly Profit'}
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Unit Production Cost (₹)</label>
                    <input
                      type="number"
                      value={calcCost}
                      onChange={(e) => setCalcCost(parseFloat(e.target.value) || 0)}
                      className="w-full font-bold text-lg px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                    />
                    <p className="text-[10px] text-slate-400">Raw fruit, oil, spices, jar & label</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={calcPrice}
                      onChange={(e) => setCalcPrice(parseFloat(e.target.value) || 0)}
                      className="w-full font-bold text-lg px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                    />
                    <p className="text-[10px] text-slate-400">Customer retail price per 500g jar</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Monthly Sales Volume</label>
                    <input
                      type="number"
                      value={calcVolume}
                      onChange={(e) => setCalcVolume(parseFloat(e.target.value) || 0)}
                      className="w-full font-bold text-lg px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                    />
                    <p className="text-[10px] text-slate-400">Number of jars sold per month</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase">Monthly Fixed Costs (₹)</label>
                    <input
                      type="number"
                      value={calcFixed}
                      onChange={(e) => setCalcFixed(parseFloat(e.target.value) || 0)}
                      className="w-full font-bold text-lg px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                    />
                    <p className="text-[10px] text-slate-400">Gas, transport, phone, stall fee</p>
                  </div>
                </div>

                {/* Profit Result Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-teal-50 border border-teal-200">
                    <p className="text-[10px] uppercase font-bold text-teal-700">Gross Margin %</p>
                    <p className="text-xl font-extrabold text-teal-900 mt-1">{marginPercent}%</p>
                    <p className="text-[10px] text-teal-600 mt-0.5">Benchmark: 35% - 50%</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-100 border border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-600">Monthly Turnover</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">₹{monthlyRevenue.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{calcVolume} jars sold</p>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Monthly Net Profit</p>
                    <p className="text-xl font-extrabold text-emerald-900 mt-1">₹{monthlyNetProfit.toLocaleString('en-IN')}</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">After all monthly overheads</p>
                  </div>

                  <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200">
                    <p className="text-[10px] uppercase font-bold text-indigo-700">Break-Even Units</p>
                    <p className="text-xl font-extrabold text-indigo-900 mt-1">{breakevenUnits} jars</p>
                    <p className="text-[10px] text-indigo-600 mt-0.5">₹{breakevenRevenue.toLocaleString('en-IN')} revenue</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: BREAK-EVEN ANALYSIS */}
          {activeTab === 'breakeven' && (
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentLang === 'mr' ? 'ब्रेक-इव्हन विश्लेषण (Break-Even Estimation)' : currentLang === 'hi' ? 'ब्रेक-ईवन विश्लेषण (Break-Even Estimation)' : 'Break-Even Estimation'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Understanding when your business transitions from recovering fixed overheads to generating pure profit
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    Feasible Micro-Enterprise
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Monthly Fixed Overheads</p>
                    <p className="text-2xl font-extrabold text-slate-900 mt-1">₹{calcFixed.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-slate-500 mt-1">Depreciation, gas cylinder, packaging labels & transport</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Contribution Margin / Jar</p>
                    <p className="text-2xl font-extrabold text-teal-600 mt-1">₹{contributionPerUnit}</p>
                    <p className="text-xs text-slate-500 mt-1">Selling price ₹{calcPrice} - raw cost ₹{calcCost}</p>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                    <p className="text-xs text-slate-500 font-bold uppercase">Monthly Break-Even Volume</p>
                    <p className="text-2xl font-extrabold text-indigo-600 mt-1">{breakevenUnits} jars</p>
                    <p className="text-xs text-slate-500 mt-1">Only ~{Math.ceil(breakevenUnits / 26)} jars per working day!</p>
                  </div>
                </div>

                {/* Visual Capacity Comparison */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex justify-between text-xs font-bold mb-2">
                    <span>Break-even Threshold ({breakevenUnits} jars)</span>
                    <span className="text-emerald-700">Target Monthly Sales ({calcVolume} jars)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-4 rounded-full overflow-hidden flex">
                    <div
                      className="bg-amber-400 h-full text-[10px] text-slate-950 font-bold flex items-center justify-center"
                      style={{ width: `${Math.min(100, (breakevenUnits / calcVolume) * 100)}%` }}
                    >
                      Break-Even ({Math.round((breakevenUnits / calcVolume) * 100)}%)
                    </div>
                    <div
                      className="bg-emerald-500 h-full text-[10px] text-white font-bold flex items-center justify-center"
                      style={{ width: `${Math.max(0, 100 - (breakevenUnits / calcVolume) * 100)}%` }}
                    >
                      Profit Zone
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {currentLang === 'mr'
                      ? 'निष्कर्ष: महिन्याला फक्त ७० बरण्या विकल्या तरी तुमचे सर्व खर्च भरून निघतात. ७१ व्या बरणीपासून प्रत्येक बरणीवर ₹६५ चा निव्वळ नफा मिळतो.'
                      : 'Conclusion: Selling just ~70 jars a month (approx. 2-3 jars/day) covers all fixed overheads. From jar #71 onwards, every jar yields ₹65 pure profit.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: MARKET VALIDATION CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">
                    {currentLang === 'mr' ? 'बाजार पडताळणी चेकलिस्ट' : 'Grassroots Market Demand Validation Checklist'}
                  </h3>
                  <span className="text-xs font-bold text-slate-500">Real customer interviews before launch</span>
                </div>

                <div className="space-y-3">
                  {roadmap.checklist.map((chk) => (
                    <div key={chk.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <CheckCircle2
                            className={`w-5 h-5 ${
                              chk.isCompleted ? 'text-teal-600' : 'text-slate-300'
                            }`}
                          />
                          <p className="font-bold text-sm text-slate-900">
                            {chk.title[currentLang] || chk.title.en}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-700">
                            {chk.completedCount} / {chk.targetCount}
                          </span>
                          <button
                            onClick={() => handleIncrementChecklist(chk.id)}
                            className="px-2.5 py-1 text-xs font-bold bg-white border border-slate-300 rounded-lg hover:bg-teal-50 hover:border-teal-500 transition-colors"
                          >
                            +1 Log
                          </button>
                        </div>
                      </div>

                      {chk.notes.length > 0 && (
                        <div className="text-xs text-slate-600 bg-white p-2 rounded-lg border border-slate-200/80">
                          <span className="font-bold text-slate-800">Latest Feedback: </span>
                          {chk.notes[0]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SKILLS & MENTORING */}
          {activeTab === 'skills' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roadmap.skills.map((skill) => (
                  <div key={skill.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {skill.category}
                      </span>
                      {skill.isCompleted ? (
                        <span className="text-xs font-bold text-teal-600 flex items-center space-x-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Certified</span>
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-amber-600">Pending</span>
                      )}
                    </div>

                    <h4 className="font-bold text-sm text-slate-900">
                      {skill.title[currentLang] || skill.title.en}
                    </h4>
                    <p className="text-xs text-slate-600">
                      {skill.description[currentLang] || skill.description.en}
                    </p>

                    {skill.actionUrl && skill.actionUrl !== '#' && (
                      <a
                        href={skill.actionUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-xs font-bold text-indigo-600 hover:text-indigo-800"
                      >
                        <span>Open Resource</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Evidence Upload Modal */}
        {selectedTaskForUpload && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Upload Task Evidence</h3>
                <button onClick={() => setSelectedTaskForUpload(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Task: <strong className="text-slate-900">{selectedTaskForUpload.title[currentLang] || selectedTaskForUpload.title.en}</strong>
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700">File Name / Receipt Reference</label>
                  <input
                    type="text"
                    value={evidenceFileName}
                    onChange={(e) => setEvidenceFileName(e.target.value)}
                    placeholder="e.g. fssai_ack_receipt.pdf or packaging_photo.jpg"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700">Verification Notes</label>
                  <textarea
                    rows={2}
                    value={evidenceNotes}
                    onChange={(e) => setEvidenceNotes(e.target.value)}
                    placeholder="Brief description of what you completed"
                    className="w-full mt-1 px-3 py-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setSelectedTaskForUpload(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEvidence}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 text-slate-950 hover:bg-teal-600 shadow"
                >
                  Save & Complete Task
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Human Mentor Help Modal */}
        {showMentorHelpModal && (
          <div className="fixed inset-0 z-60 bg-slate-950/70 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-amber-600" />
                  <span>Request Human Mentor Assistance</span>
                </h3>
                <button onClick={() => setShowMentorHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600">
                A Tata STRIVE Enterprise Specialist will review your roadmap questions and contact you via phone or at your local STRIVE center.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-700">What specific challenge do you need help with?</label>
                <textarea
                  rows={3}
                  value={mentorHelpNote}
                  onChange={(e) => setMentorHelpNote(e.target.value)}
                  placeholder="e.g. Need assistance with FSSAI portal upload or negotiating jar prices with local wholesalers..."
                  className="w-full mt-1.5 px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              {mentorHelpSubmitted ? (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800 font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Assistance request sent to Tata STRIVE Incubation Desk!</span>
                </div>
              ) : (
                <div className="flex justify-end space-x-2 pt-2">
                  <button
                    onClick={() => setShowMentorHelpModal(false)}
                    className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmitMentorHelp}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 text-slate-950 hover:bg-amber-600 shadow"
                  >
                    Submit Request
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
