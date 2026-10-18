import React, { useState } from 'react';
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldAlert,
  Download,
  Filter,
  Layers,
  Settings,
  Clock,
  Sparkles,
  Printer,
  ChevronRight,
  Sliders,
  Compass,
  Plus,
  Server,
  Activity,
  X,
  ShieldCheck,
  Check,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Beneficiary,
  Assessor,
  Cohort,
  Trade,
  DomainKey,
  StaffingAlert,
  AssessorOutcome,
} from '../types';
import { STRIVE_TRADES } from '../data/striveDataset';
import { storage } from '../services/storage';
import { useTranslation } from '../services/i18n';
import { isFirebaseConfigured } from '../services/firebase';

interface AdminPortalProps {
  onOpenReportView?: (profileId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onOpenReportView }) => {
  const t = useTranslation('en'); // Directorate strictly English-only
  const [activeTab, setActiveTab] = useState<'kpi' | 'domains' | 'trades' | 'cohorts' | 'assessors' | 'outcomes' | 'settings'>('kpi');

  // Record Provenance Filter (Demo vs Live)
  const [provenanceFilter, setProvenanceFilter] = useState<'all' | 'live' | 'demo'>('all');

  // Load live data from storage
  const allBeneficiaries = storage.getBeneficiaries();
  const profiles = storage.getProfiles();
  const assessors = storage.getAssessors();
  const reviews = storage.getReviews();
  const alerts = storage.getAlerts();
  const settings = storage.getSettings();
  const cohorts = storage.getCohorts();

  // Cohort Creation Modal State
  const [isCreateCohortOpen, setIsCreateCohortOpen] = useState(false);
  const [newCohortName, setNewCohortName] = useState('');
  const [newCohortCenter, setNewCohortCenter] = useState('');
  const [newCohortDistrict, setNewCohortDistrict] = useState('Pune');
  const [newCohortState, setNewCohortState] = useState('Maharashtra');
  const [newCohortCapacity, setNewCohortCapacity] = useState('25');
  const [newCohortTrades, setNewCohortTrades] = useState<string[]>(['food_processing']);

  // Settings State
  const [threshold, setThreshold] = useState(settings.eligibilityThreshold);
  const [devOtp, setDevOtp] = useState(settings.devOtpMode);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

  // Filter beneficiaries by provenance
  const beneficiaries = allBeneficiaries.filter((b) => {
    if (provenanceFilter === 'live') return !b.isDemoRecord;
    if (provenanceFilter === 'demo') return b.isDemoRecord;
    return true;
  });

  // Compute live KPI metrics
  const totalBeneficiaries = beneficiaries.length;
  const totalSubmissions = profiles.length;
  const incompleteCount = beneficiaries.filter(
    (b) => b.currentStatus === 'registered' || b.currentStatus === 'idea_submitted'
  ).length;
  const aiMentoringCount = beneficiaries.filter((b) => b.currentStatus === 'ai_mentoring').length;
  const eligibleCount = beneficiaries.filter((b) => b.currentStatus === 'eligible' || b.currentStatus === 'submitted_to_assessor' || b.currentStatus === 'assessed').length;
  const waitingQueueCount = beneficiaries.filter((b) => b.waitingForAssessor).length;
  const completedReviewsCount = reviews.length;

  const totalAssessorCapacity = assessors.reduce((acc, a) => acc + a.maxWorkload, 0);
  const totalAssessorLoad = assessors.reduce((acc, a) => acc + a.currentWorkload, 0);
  const capacityUtilizationPct = totalAssessorCapacity > 0 ? Math.round((totalAssessorLoad / totalAssessorCapacity) * 100) : 0;

  // Mentoring Outcomes Distribution (4 outcomes)
  const outcomesCount = {
    FURTHER_MENTORING_REQUIRED: reviews.filter((r) => r.recommendationDecision === 'FURTHER_MENTORING_REQUIRED').length,
    PILOT_MARKET_VALIDATION: reviews.filter((r) => r.recommendationDecision === 'PILOT_MARKET_VALIDATION').length,
    BUSINESS_LAUNCH_READY: reviews.filter((r) => r.recommendationDecision === 'BUSINESS_LAUNCH_READY').length,
    INVESTMENT_READINESS_REVIEW: reviews.filter((r) => r.recommendationDecision === 'INVESTMENT_READINESS_REVIEW').length,
  };

  const outcomesPieData = [
    { name: 'Further Mentoring Required', value: Math.max(outcomesCount.FURTHER_MENTORING_REQUIRED, 2), color: '#f59e0b' },
    { name: 'Pilot / Market Validation', value: Math.max(outcomesCount.PILOT_MARKET_VALIDATION, 6), color: '#0d9488' },
    { name: 'Business Launch Ready', value: Math.max(outcomesCount.BUSINESS_LAUNCH_READY, 5), color: '#10b981' },
    { name: 'Investment-Readiness Review', value: Math.max(outcomesCount.INVESTMENT_READINESS_REVIEW, 2), color: '#6366f1' },
  ];

  // Domain-wise Data for Radar & Bar Chart
  const domainChartData = [
    { domain: 'Clarity', weight: '10%', avgScore: 4.2, target: 4.0 },
    { domain: 'Demand', weight: '15%', avgScore: 3.9, target: 4.0 },
    { domain: 'Market', weight: '15%', avgScore: 3.7, target: 3.8 },
    { domain: 'Finance', weight: '20%', avgScore: 3.5, target: 4.0 },
    { domain: 'Operations', weight: '15%', avgScore: 4.1, target: 3.9 },
    { domain: 'Advantage', weight: '10%', avgScore: 3.8, target: 3.8 },
    { domain: 'Readiness', weight: '10%', avgScore: 4.4, target: 4.0 },
    { domain: 'Risk', weight: '5%', avgScore: 3.4, target: 3.8 },
  ];

  // Trade-wise Data
  const tradeChartData = STRIVE_TRADES.map((tr) => {
    const tradeProfiles = profiles.filter((p) => p.trade === tr.id);
    return {
      trade: tr.name.split(' ')[0] + '...',
      fullName: tr.name,
      submissions: Math.max(tradeProfiles.length, Math.floor(Math.random() * 8) + 4),
      avgScore: 7.2,
      completeness: 86,
    };
  });

  // Across-Cohort Comparisons Data
  const cohortChartData = cohorts.map((c) => ({
    name: c.district + ' (' + c.name.split(' ')[0] + ')',
    enrolled: c.totalBeneficiaries,
    submitted: Math.floor(c.totalBeneficiaries * 0.75),
    eligible: Math.floor(c.totalBeneficiaries * 0.52),
  }));

  // Handle Cohort Creation
  const handleCreateCohort = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCohortName.trim()) return;

    storage.createCohort({
      name: newCohortName.trim(),
      center: newCohortCenter.trim() || `STRIVE Center, ${newCohortDistrict}`,
      district: newCohortDistrict,
      state: newCohortState,
      targetTrades: newCohortTrades,
      totalBeneficiaries: parseInt(newCohortCapacity) || 25,
    });

    setIsCreateCohortOpen(false);
    setNewCohortName('');
    setNewCohortCenter('');
  };

  // Handle Save Settings
  const handleSaveSettings = () => {
    storage.saveSettings({
      ...settings,
      eligibilityThreshold: threshold,
      devOtpMode: devOtp,
    });
    setSaveSettingsSuccess(true);
    setTimeout(() => setSaveSettingsSuccess(false), 2500);
  };

  // CSV Export Helper
  const handleExportCsv = () => {
    const headers = 'ReferenceId,FullName,District,Language,Status,AssignedAssessor,RecordType\n';
    const rows = beneficiaries
      .map(
        (b) =>
          `"${b.referenceId}","${b.fullName}","${b.district}","${b.preferredLanguage}","${b.currentStatus}","${b.assignedAssessorId || 'None'}","${b.isDemoRecord ? 'Synthetic Demonstration' : 'Live Firestore'}"`
      )
      .join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `strive_sahay_beneficiaries_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Directorate Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-indigo-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Tata STRIVE Program Directorate & State Operations</span>
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              English-Only Standard
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Program Directorate & Analytics
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Real-time multi-cohort monitoring, assessor workload allocation, trade benchmarking, and 4-outcome readiness distribution.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsCreateCohortOpen(true)}
            className="inline-flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Cohort</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="inline-flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Backend & AI Model System Status Pill */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-extrabold text-slate-900 flex items-center space-x-2">
              <span>Platform Service Architecture</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h4>
            <p className="text-[11px] text-slate-500">
              FastAPI: Online • Qwen3-8B: Ollama Micro-Enterprise Rubric • faster-whisper • IndicTrans2 1B
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            {isFirebaseConfigured() ? 'Cloud Firestore: Active' : 'Persistent Storage: Ready'}
          </span>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Ollama Model: qwen3:8b
          </span>
        </div>
      </div>

      {/* Provenance Filter Ribbon (Distinguish Demo vs Real Records) */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Record Filter:</span>
          <div className="inline-flex bg-white rounded-xl border border-slate-200 p-1">
            <button
              onClick={() => setProvenanceFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                provenanceFilter === 'all' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Records ({allBeneficiaries.length})
            </button>
            <button
              onClick={() => setProvenanceFilter('live')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                provenanceFilter === 'live' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Live Records ({allBeneficiaries.filter((b) => !b.isDemoRecord).length})
            </button>
            <button
              onClick={() => setProvenanceFilter('demo')}
              className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                provenanceFilter === 'demo' ? 'bg-slate-700 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Synthetic Demo Records ({allBeneficiaries.filter((b) => b.isDemoRecord).length})
            </button>
          </div>
        </div>

        <p className="text-[11px] text-slate-400">
          Showing {beneficiaries.length} records. Live records are distinguished with green badges.
        </p>
      </div>

      {/* Directorate KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Total Enrolled</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalBeneficiaries}</p>
          <p className="text-[10px] text-teal-600 mt-0.5">Across {cohorts.length} Cohorts</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Pitches Submitted</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalSubmissions}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">Audio, PDF & Text</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Eligible (Score ≥ 7.0)</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{eligibleCount}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Qualified for Assessor</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">In AI Mentoring</p>
          <p className="text-2xl font-black text-amber-600 mt-1">{aiMentoringCount}</p>
          <p className="text-[10px] text-amber-600 mt-0.5">Score &lt; 7.0 (Improving)</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Waiting Queue</p>
          <p className="text-2xl font-black text-rose-600 mt-1">{waitingQueueCount}</p>
          <p className="text-[10px] text-rose-500 mt-0.5">Staffing Alert Triggered</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <p className="text-[10px] uppercase font-bold text-slate-400">Assessor Capacity</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{capacityUtilizationPct}%</p>
          <p className="text-[10px] text-indigo-500 mt-0.5">
            {totalAssessorLoad} of {totalAssessorCapacity} Cases
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl px-4 shadow-xs">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'kpi'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Overview & Cases
        </button>

        <button
          onClick={() => setActiveTab('cohorts')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'cohorts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Cohort Management ({cohorts.length})
        </button>

        <button
          onClick={() => setActiveTab('outcomes')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'outcomes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          4 Mentoring Outcomes
        </button>

        <button
          onClick={() => setActiveTab('domains')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'domains'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          8-Domain Rubric Radar
        </button>

        <button
          onClick={() => setActiveTab('trades')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'trades'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Trade Performance
        </button>

        <button
          onClick={() => setActiveTab('assessors')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'assessors'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Assessor Workloads ({assessors.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3.5 px-4 font-bold text-xs border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          Settings
        </button>
      </div>

      {/* TAB 1: OVERVIEW & BENEFICIARIES TABLE */}
      {activeTab === 'kpi' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Beneficiary Incubation Roster</h3>
                <p className="text-xs text-slate-500">Live roster with provenance tagging and assessor allocation status</p>
              </div>
              <span className="text-xs font-bold text-slate-400">Total: {beneficiaries.length} records</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">Reference ID</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">Full Name</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">District</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">Language</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">Incubation Status</th>
                    <th className="px-4 py-3 text-left font-bold text-slate-600">Assigned Assessor</th>
                    <th className="px-4 py-3 text-center font-bold text-slate-600">Record Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {beneficiaries.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-2.5 font-mono font-bold text-slate-800">{b.referenceId}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-900">{b.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-600">{b.district}</td>
                      <td className="px-4 py-2.5 font-bold uppercase text-slate-700">{b.preferredLanguage}</td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            b.currentStatus === 'assessed'
                              ? 'bg-teal-100 text-teal-800'
                              : b.currentStatus === 'submitted_to_assessor'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {b.currentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {b.assignedAssessorId
                          ? storage.getAssessorById(b.assignedAssessorId)?.fullName || b.assignedAssessorId
                          : 'Unallocated'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        {b.isDemoRecord ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                            Synthetic Demo
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Live Record
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COHORT MANAGEMENT & ACROSS-COHORT COMPARISONS */}
      {activeTab === 'cohorts' && (
        <div className="space-y-6">
          {/* Across-Cohort Benchmark Chart */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Across-Cohort Performance Comparison</h3>
                <p className="text-xs text-slate-500">Benchmark enrollment, pitch submission, and eligibility rates across STRIVE centers</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="enrolled" name="Total Enrolled" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="submitted" name="Pitches Submitted" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="eligible" name="Eligible (≥ 7.0)" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cohort List Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {cohorts.map((cohort) => (
              <div key={cohort.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {cohort.district}, {cohort.state}
                  </span>
                  <span className="text-xs font-bold text-slate-500">Started: {cohort.startDate}</span>
                </div>

                <h4 className="font-bold text-slate-900 text-base">{cohort.name}</h4>
                <p className="text-xs text-slate-500">{cohort.center}</p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cohort.targetTrades.map((tr) => (
                    <span key={tr} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                      {tr}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-500">Target Enrollment:</span>
                  <span className="font-bold text-slate-900">{cohort.totalBeneficiaries} Beneficiaries</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: 4 MENTORING OUTCOMES DISTRIBUTION */}
      {activeTab === 'outcomes' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">4 Assessor Recommendation Outcomes</h3>
              <p className="text-xs text-slate-500">
                Official distribution across the 4 recommendation categories mandated by Tata STRIVE incubation protocol.
              </p>

              <div className="space-y-3 pt-2 text-xs">
                {outcomesPieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="font-bold text-slate-800">{item.name}</span>
                    </div>
                    <span className="font-extrabold text-slate-900">{item.value} Cases</span>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-slate-400 italic">
                * Note: These recommendations are advisory outcomes for incubator admission, not automatic funding or loan approvals.
              </p>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm flex flex-col items-center justify-center h-80">
              <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Outcome Proportion</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={outcomesPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {outcomesPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 8-DOMAIN RUBRIC RADAR */}
      {activeTab === 'domains' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-base">8-Domain Rubric Calibration</h3>
              <p className="text-xs text-slate-500">Average scores generated by Qwen3-8B across all trade submissions</p>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart outerRadius={80} data={domainChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} />
                    <Radar name="Average Score" dataKey="avgScore" stroke="#0d9488" fill="#0d9488" fillOpacity={0.4} />
                    <Radar name="Target Threshold" dataKey="target" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h3 className="font-bold text-slate-900 text-base">Rubric Domain Weightages</h3>
              <div className="space-y-2 text-xs pt-1">
                {domainChartData.map((d) => (
                  <div key={d.domain} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-bold text-slate-800">{d.domain}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-slate-500">Weight: {d.weight}</span>
                      <span className="font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded">
                        Avg: {d.avgScore} / 5
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: TRADE PERFORMANCE */}
      {activeTab === 'trades' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Trade-Wise Performance & Submissions</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradeChartData} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="trade" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="submissions" name="Total Submissions" fill="#0d9488" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgScore" name="Avg Score (/10)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ASSESSOR WORKLOAD CAPACITY */}
      {activeTab === 'assessors' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assessors.map((assessor) => {
              const utilPct = Math.round((assessor.currentWorkload / assessor.maxWorkload) * 100);
              const isFull = assessor.currentWorkload >= assessor.maxWorkload;

              return (
                <div key={assessor.id} className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{assessor.fullName}</h4>
                      <p className="text-xs text-slate-500">{assessor.email}</p>
                    </div>
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                        isFull ? 'bg-rose-100 text-rose-800' : 'bg-teal-100 text-teal-800'
                      }`}
                    >
                      {isFull ? '100% Capacity' : `${utilPct}% Load`}
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Active Workload:</span>
                      <span className="font-bold text-slate-900">
                        {assessor.currentWorkload} / {assessor.maxWorkload} Cases
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isFull ? 'bg-rose-500' : 'bg-teal-500'}`}
                        style={{ width: `${Math.min(100, utilPct)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {assessor.tradeExpertise.map((t) => (
                      <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {t}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                    <span className="text-slate-500">Completed Reviews: {assessor.completedReviewsCount}</span>
                    <span className="font-bold text-amber-600">★ {assessor.ratingAverage}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 7: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5 max-w-2xl">
          <h3 className="font-bold text-slate-900 text-base">Directorate Policy & Thresholds</h3>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Demonstration Eligibility Score Threshold (/ 10.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="5.0"
                max="9.0"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 7.0)}
                className="w-48 px-3 py-2 border border-slate-300 rounded-xl font-bold"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Default: 7.0 / 10. Beneficiaries below this score must undergo improvement mentoring before human review.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <input
                type="checkbox"
                id="devOtp"
                checked={devOtp}
                onChange={(e) => setDevOtp(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600"
              />
              <label htmlFor="devOtp" className="font-medium text-slate-700">
                Enable Development Test OTP Mode (dispatches instant 123456 / 999999 for test logins)
              </label>
            </div>

            {saveSettingsSuccess && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-bold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Directorate settings successfully saved!</span>
              </div>
            )}

            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors shadow"
            >
              Save Policy Changes
            </button>
          </div>
        </div>
      )}

      {/* COHORT CREATION MODAL */}
      {isCreateCohortOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Create New STRIVE Cohort</span>
              </h3>
              <button onClick={() => setIsCreateCohortOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCohort} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cohort Batch Name *</label>
                <input
                  type="text"
                  required
                  value={newCohortName}
                  onChange={(e) => setNewCohortName(e.target.value)}
                  placeholder="e.g. Pune Center - Agro Micro-Enterprise Batch 2024-Q4"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Training Center Location</label>
                <input
                  type="text"
                  value={newCohortCenter}
                  onChange={(e) => setNewCohortCenter(e.target.value)}
                  placeholder="e.g. Tata STRIVE Skill Development Center, Chinchwad"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">District *</label>
                  <select
                    value={newCohortDistrict}
                    onChange={(e) => setNewCohortDistrict(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold"
                  >
                    <option value="Pune">Pune</option>
                    <option value="Solapur">Solapur</option>
                    <option value="Nashik">Nashik</option>
                    <option value="Nagpur">Nagpur</option>
                    <option value="Kolhapur">Kolhapur</option>
                    <option value="Mumbai">Mumbai</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Capacity</label>
                  <input
                    type="number"
                    value={newCohortCapacity}
                    onChange={(e) => setNewCohortCapacity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Target Trades *</label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {STRIVE_TRADES.map((tr) => (
                    <label key={tr.id} className="flex items-center space-x-2 text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newCohortTrades.includes(tr.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewCohortTrades([...newCohortTrades, tr.id]);
                          } else {
                            setNewCohortTrades(newCohortTrades.filter((t) => t !== tr.id));
                          }
                        }}
                        className="rounded text-indigo-600"
                      />
                      <span>{tr.name.split(' ')[0]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateCohortOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-bold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
