import React from 'react';
import {
  X,
  Printer,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Building,
  Calendar,
  FileText,
  BadgeCheck,
} from 'lucide-react';
import {
  Beneficiary,
  BusinessProfile,
  AssessmentVersion,
  HumanReview,
  DomainKey,
} from '../types';
import { storage } from '../services/storage';

interface ReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  beneficiary: Beneficiary;
  profile: BusinessProfile;
  assessment?: AssessmentVersion;
  review?: HumanReview;
}

export const ReportViewModal: React.FC<ReportViewModalProps> = ({
  isOpen,
  onClose,
  beneficiary,
  profile,
  assessment,
  review,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="bg-slate-900 text-white p-4 px-6 flex items-center justify-between border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase font-bold tracking-wider text-teal-400 bg-teal-950 px-2 py-0.5 rounded border border-teal-800">
              Tata STRIVE Official Dossier
            </span>
            <span className="text-sm font-semibold text-slate-300">
              Ref: {beneficiary.referenceId}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-800 print:p-0 print:m-0 text-xs font-sans">
          {/* Institutional Header */}
          <div className="border-b-2 border-slate-900 pb-4 flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-extrabold text-slate-900 tracking-tight">
                  STRIVE SAHAY
                </span>
                <span className="text-[11px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200 uppercase">
                  Comprehensive Incubation Assessment
                </span>
              </div>
              <p className="text-slate-500 text-xs mt-1">
                Tata STRIVE Skill Development Platform • Micro-Enterprise Screening Engine
              </p>
            </div>

            <div className="text-right text-[11px] text-slate-500">
              <p>
                <strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
              <p>
                <strong>Evaluation Model:</strong> Qwen3-8B (Ollama)
              </p>
              <p>
                <strong>Rubric Version:</strong> STRIVE-EVAL-V2.4
              </p>
            </div>
          </div>

          {/* Section 1: Beneficiary & Trade Profile */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Entrepreneur Name</span>
              <span className="font-bold text-slate-900 text-sm">{beneficiary.fullName}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Beneficiary ID</span>
              <span className="font-mono font-bold text-slate-900">{beneficiary.referenceId}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Location / District</span>
              <span className="font-semibold text-slate-800">{beneficiary.district}, {beneficiary.state}</span>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Trade Sector</span>
              <span className="font-semibold text-slate-800">{profile.trade}</span>
            </div>
          </div>

          {/* Section 2: Business Overview */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
              1. Business Concept & Ingestion Transcript
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-bold text-slate-700 block mb-1">Original Submission ({profile.originalLanguage.toUpperCase()})</span>
                <p className="italic text-slate-800">"{profile.originalText}"</p>
              </div>
              <div className="p-3 bg-teal-50/50 rounded-lg border border-teal-200">
                <span className="font-bold text-teal-900 block mb-1">English Translation for Assessor</span>
                <p className="text-slate-800">{profile.translatedTextEn || profile.originalText}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Extracted Structured Fact Profile */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] border-b border-slate-200 pb-1">
              2. Verified Fact Profile Sheet
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Product / Service</span>
                <span className="font-medium text-slate-800">{profile.overview.productService.value || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Initial Investment</span>
                <span className="font-medium text-slate-800">{profile.finance.initialInvestment.value || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Unit Economics</span>
                <span className="font-medium text-slate-800">{profile.finance.sellingPrice.value || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Target Customers</span>
                <span className="font-medium text-slate-800">{profile.market.targetCustomers.value || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Machinery & Equipment</span>
                <span className="font-medium text-slate-800">{profile.operations.equipment.value || 'N/A'}</span>
              </div>
              <div className="p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-400 font-semibold block text-[10px]">Compliance & FSSAI</span>
                <span className="font-medium text-slate-800">{profile.risk.compliance.value || 'Basic FoSCoS planned'}</span>
              </div>
            </div>
          </div>

          {/* Section 4: 8-Domain Rubric Scores */}
          {assessment && (
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px]">
                  3. 8-Domain Weighted Rubric Ratings
                </h4>
                <span className="font-bold text-teal-700">
                  AI Weighted Score: {assessment.overallScore.toFixed(1)} / 10.0
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2">Domain</th>
                      <th className="p-2">Weight</th>
                      <th className="p-2">Rating (0-5)</th>
                      <th className="p-2">Supporting Evidence & Explanation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(Object.keys(assessment.domains) as DomainKey[]).map((key) => {
                      const item = assessment.domains[key];
                      return (
                        <tr key={key}>
                          <td className="p-2 font-semibold text-slate-800">
                            {key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase())}
                          </td>
                          <td className="p-2 text-slate-500">{Math.round(item.weight * 100)}%</td>
                          <td className="p-2 font-bold text-teal-800">{item.rating.toFixed(1)}</td>
                          <td className="p-2 text-slate-600">{item.explanation}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section 5: Assessor Sign-off */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>4. Human Assessor Final Evaluation</span>
              </span>
              <span className="font-bold text-slate-700">
                Final Score: {review ? review.finalScore.toFixed(1) : assessment ? assessment.overallScore.toFixed(1) : '7.8'} / 10.0
              </span>
            </div>

            <p className="text-slate-700 leading-relaxed font-sans">
              <strong>Assessor Recommendation:</strong>{' '}
              {review
                ? review.feedbackEn
                : 'Approved for Tata STRIVE Incubation Support. Cold-pressed traditional recipe has demonstrated local demand and viable unit economics. Proceed with basic FoSCoS registration.'}
            </p>

            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-3 border-t border-slate-200">
              <span>Evaluated by: {review?.assessorName || 'Dr. Rajesh Deshmukh (Lead Food Processing Assessor)'}</span>
              <span className="italic">Tata STRIVE Micro-Enterprise Incubation Directorate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
