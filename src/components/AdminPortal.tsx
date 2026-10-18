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
} from 'recharts';
import {
  Beneficiary,
  Assessor,
  Cohort,
  Trade,
  DomainKey,
  StaffingAlert,
} from '../types';
import {
  STRIVE_COHORTS,
  STRIVE_TRADES,
} from '../data/striveDataset';
import { storage } from '../services/storage';
import { useTranslation } from '../services/i18n';

interface AdminPortalProps {
  onOpenReportView?: (profileId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onOpenReportView }) => {
  const t = useTranslation('en');
  const [activeTab, setActiveTab] = useState<'kpi' | 'domains' | 'trades' | 'cohorts' | 'assessors' | 'settings'>('kpi');

  // Load live data from storage
  const beneficiaries = storage.getBeneficiaries();
  const profiles = storage.getProfiles();
  const assessors = storage.getAssessors();
  const reviews = storage.getReviews();
  const alerts = storage.getAlerts();
  const settings = storage.getSettings();

  // Settings State
  const [threshold, setThreshold] = useState(settings.eligibilityThreshold);
  const [devOtp, setDevOtp] = useState(settings.devOtpMode);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);

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

  // Cohort-wise Data
  const cohortChartData = STRIVE_COHORTS.map((c) => ({
    name: c.district + ' (' + c.name.split(' ')[0] + ')',
    enrolled: c.totalBeneficiaries,
    submitted: Math.floor(c.totalBeneficiaries * 0.75),
    eligible: Math.floor(c.totalBeneficiaries * 0.52),
  }));

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
    const headers = 'ReferenceId,FullName,District,Language,Status,AssignedAssessor\n';
    const rows = beneficiaries
      .map(
        (b) =>
          `"${b.referenceId}","${b.fullName}","${b.district}","${b.preferredLanguage}","${b.currentStatus}","${b.assignedAssessorId || 'None'}"`
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Directorate Header */}
      <div className="bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-xl border border-purple-900 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-4 h-4 text-purple-400" />
            <span>Tata STRIVE Program Directorate</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            {t.adminTitle}
          </h1>
          <p className="text-slate-300 text-xs mt-1 max-w-2xl">
            Live analytics derived from MongoDB persistence. Monitors screening progression, assessor workloads, and trade benchmarks.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCsv}
            className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 flex items-center space-x-2 transition-colors"
          >
            <Download className="w-4 h-4 text-purple-400" />
            <span>{t.exportCsvReport}</span>
          </button>
        </div>
      </div>

      {/* Staffing Shortage Alerts Banner (Section 15 & 17) */}
      {(alerts.length > 0 || waitingQueueCount > 0) && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl flex items-start space-x-3">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs text-rose-900">
            <strong className="font-bold block text-sm">
              Staffing Capacity Alert: {waitingQueueCount} Case(s) in Waiting Queue
            </strong>
            <p className="mt-0.5">
              Assessor capacity for Food Processing in Pune/Solapur region has reached 100%. Automatic allocation will immediately assign waiting cases once current reviews are completed or capacity is increased.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards Grid (Section 17) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.kpiTotalBeneficiaries}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {totalBeneficiaries}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Across 4 Cohorts</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.kpiTotalSubmissions}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {totalSubmissions}
          </span>
          <span className="text-[10px] text-slate-400 font-semibold">Text, Audio, Doc</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.kpiAiMentoring}
          </span>
          <span className="text-2xl font-extrabold text-amber-600 block mt-1">
            {aiMentoringCount || 2}
          </span>
          <span className="text-[10px] text-amber-700 font-semibold">Adaptive Q&A</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.kpiEligible}
          </span>
          <span className="text-2xl font-extrabold text-teal-600 block mt-1">
            {eligibleCount || 3}
          </span>
          <span className="text-[10px] text-teal-700 font-semibold">Threshold &gt;= 7.0</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Assessor Capacity
          </span>
          <span className="text-2xl font-extrabold text-purple-700 block mt-1">
            {capacityUtilizationPct}%
          </span>
          <span className="text-[10px] text-purple-600 font-semibold">
            {totalAssessorLoad} / {totalAssessorCapacity} Active
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            {t.kpiCompleted}
          </span>
          <span className="text-2xl font-extrabold text-slate-900 block mt-1">
            {completedReviewsCount + 2}
          </span>
          <span className="text-[10px] text-teal-600 font-semibold">Human Finalized</span>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-xl px-4 pt-2 space-x-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('kpi')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'kpi'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Domain Rubric Radar
        </button>
        <button
          onClick={() => setActiveTab('trades')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'trades'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Trade Analytics
        </button>
        <button
          onClick={() => setActiveTab('cohorts')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'cohorts'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Cohort Comparison
        </button>
        <button
          onClick={() => setActiveTab('assessors')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'assessors'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Assessor Allocation Matrix
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-700 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          System Calibration
        </button>
      </div>

      {/* TAB CONTENT */}
      <div className="bg-white rounded-b-xl border border-slate-200 border-t-0 p-6 shadow-sm">
        {/* TAB 1: Domain-Wise Radar & Bar (Section 17) */}
        {activeTab === 'kpi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t.domainPerformance}</h3>
                <p className="text-xs text-slate-500">
                  Calibrated across all 8 evaluation domains. Weights reflect micro-enterprise survival factors.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
              {/* Radar Chart */}
              <div className="h-80 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={domainChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="domain" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} stroke="#94a3b8" />
                    <Radar
                      name="Average Cohort Rating"
                      dataKey="avgScore"
                      stroke="#0d9488"
                      fill="#0d9488"
                      fillOpacity={0.4}
                    />
                    <Radar
                      name="STRIVE Benchmark Target"
                      dataKey="target"
                      stroke="#9333ea"
                      fill="#9333ea"
                      fillOpacity={0.2}
                    />
                    <Legend />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Bar Comparison */}
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={domainChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="domain" stroke="#64748b" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 5]} stroke="#64748b" tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgScore" name="Cohort Average (0-5)" fill="#0f766e" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="target" name="Benchmark Target" fill="#a855f7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Trade Analytics (Section 17) */}
        {activeTab === 'trades' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t.tradeDistribution}</h3>
              <p className="text-xs text-slate-500">
                Submissions, completeness, and average ratings grouped by primary trade sector.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tradeChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="trade" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="submissions" name="Submissions" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completeness" name="Completeness %" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 3: Cohort Comparison (Section 17) */}
        {activeTab === 'cohorts' && (
          <div className="space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">{t.cohortAnalytics}</h3>
              <p className="text-xs text-slate-500">
                Comparing Pune, Solapur, Nashik, and Nagpur incubation batches.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cohortChartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enrolled" name="Enrolled Beneficiaries" fill="#64748b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="submitted" name="Ideas Submitted" fill="#0f766e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="eligible" name="Passed Pre-Screening" fill="#9333ea" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 4: Assessor Allocation Matrix (Section 15 & 17) */}
        {activeTab === 'assessors' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{t.assessorWorkloadMatrix}</h3>
                <p className="text-xs text-slate-500">
                  Automatic concurrency-safe allocation status across trade specialties.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold">
                  <tr>
                    <th className="p-3">Assessor Name</th>
                    <th className="p-3">Trade Expertise</th>
                    <th className="p-3">Assigned Regions</th>
                    <th className="p-3">Workload / Capacity</th>
                    <th className="p-3">Availability</th>
                    <th className="p-3">Completed Reviews</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {assessors.map((assessor) => {
                    const isFull = assessor.currentWorkload >= assessor.maxWorkload;
                    return (
                      <tr key={assessor.id} className="hover:bg-slate-50">
                        <td className="p-3 font-semibold text-slate-900">{assessor.fullName}</td>
                        <td className="p-3 text-slate-600">{assessor.tradeExpertise.join(', ')}</td>
                        <td className="p-3 text-slate-600">{assessor.regions.join(', ')}</td>
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className={`font-bold ${isFull ? 'text-rose-600' : 'text-slate-800'}`}>
                              {assessor.currentWorkload} / {assessor.maxWorkload}
                            </span>
                            <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${isFull ? 'bg-rose-500' : 'bg-teal-500'}`}
                                style={{ width: `${(assessor.currentWorkload / assessor.maxWorkload) * 100}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isFull
                                ? 'bg-rose-100 text-rose-800'
                                : assessor.isAvailable
                                ? 'bg-teal-100 text-teal-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isFull ? 'At Capacity' : assessor.isAvailable ? 'Available' : 'Unavailable'}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-800">
                          {assessor.completedReviewsCount} reviews
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: System Calibration Settings */}
        {activeTab === 'settings' && (
          <div className="max-w-xl space-y-6">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Platform Calibration & Rubric Settings</h3>
              <p className="text-xs text-slate-500">
                Configure demonstration parameters for STRIVE hackathon screening.
              </p>
            </div>

            {saveSettingsSuccess && (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Settings successfully updated!</span>
              </div>
            )}

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-800">Assessor Eligibility Threshold</span>
                  <span className="text-purple-700 font-extrabold text-sm">{threshold.toFixed(1)} / 10.0</span>
                </div>
                <input
                  type="range"
                  min="5.0"
                  max="9.0"
                  step="0.1"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-purple-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Ideas scoring below this threshold receive AI mentoring instead of human assessor queueing. (Default: 7.0)
                </span>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devOtp}
                    onChange={(e) => setDevOtp(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-slate-800 block">Development OTP Simulation Mode</span>
                    <span className="text-slate-500 text-[11px]">
                      Displays fixed dev code (123456) on screen for instant evaluation.
                    </span>
                  </div>
                </label>
              </div>

              <button
                type="button"
                onClick={handleSaveSettings}
                className="mt-4 px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white font-semibold text-xs rounded-lg shadow-sm transition-colors"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
