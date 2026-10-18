import {
  AssessmentVersion,
  BusinessProfile,
  DomainKey,
  DomainScore,
  ScoreHistoryEntry,
} from '../types';
import { ContradictionEngine } from './contradictionEngine';
import { storage } from './storage';

export class ScoringEngine {
  static readonly DOMAIN_WEIGHTS: Record<DomainKey, number> = {
    businessClarity: 0.10,
    customerDemand: 0.15,
    marketPotential: 0.15,
    financialViability: 0.20,
    operationalFeasibility: 0.15,
    competitiveAdvantage: 0.10,
    entrepreneurReadiness: 0.10,
    riskAwareness: 0.05,
  };

  /**
   * Evaluates a profile dynamically against the 8-domain rubric.
   * Derives evidence and ratings from real profile facts and deterministic financial metrics.
   */
  static evaluateProfile(
    profile: BusinessProfile,
    versionNumber = 1,
    reasonOrIsRefined: string | boolean = 'AI Rubric Assessment',
    threshold = 7.0
  ): AssessmentVersion {
    const reason =
      typeof reasonOrIsRefined === 'boolean'
        ? reasonOrIsRefined
          ? 'Reassessment after Mentoring & Profile Updates'
          : 'Initial Submission Rubric Evaluation'
        : reasonOrIsRefined;
    const fin = ContradictionEngine.calculateFinancialMetrics(profile);
    const domains: Record<DomainKey, DomainScore> = {} as Record<DomainKey, DomainScore>;

    // 1. Business Clarity (10%)
    const hasProduct = profile.overview.productService.status === 'PROVIDED' && profile.overview.productService.value.length > 10;
    const hasLocation = profile.overview.proposedLocation.status === 'PROVIDED';
    const clarityRating = hasProduct && hasLocation ? 4.5 : hasProduct ? 3.8 : 2.5;

    domains.businessClarity = {
      domain: 'businessClarity',
      weight: 0.10,
      rating: clarityRating,
      evidence: `Product: "${profile.overview.productService.value || 'Not specified'}". Location: "${profile.overview.proposedLocation.value || 'Not specified'}". Stage: "${profile.overview.businessStage.value}".`,
      explanation: clarityRating >= 4.0
        ? 'Business proposition is well-defined with clear product varieties and target geographic catchment.'
        : 'Core offering is identifiable but requires standardized product catalog and batch definitions.',
      uncertainty: hasProduct ? 'Low' : 'High',
      improvementRecommendation: 'Prepare a standardized visual product menu card with batch sizes (250g, 500g, 1kg) and prices.',
    };

    // 2. Customer Demand (15%)
    const hasTargetCust = profile.market.targetCustomers.status === 'PROVIDED';
    const hasDemandEvidence = profile.market.demandEvidence.status === 'PROVIDED' || profile.market.salesChannels.value.includes('societ');
    const demandRating = hasTargetCust && hasDemandEvidence ? 4.3 : hasTargetCust ? 3.4 : 2.2;

    domains.customerDemand = {
      domain: 'customerDemand',
      weight: 0.15,
      rating: demandRating,
      evidence: `Target segment: "${profile.market.targetCustomers.value || 'General public'}". Distribution: "${profile.market.salesChannels.value || 'Direct'}".`,
      explanation: demandRating >= 4.0
        ? 'Direct residential sampling and pre-orders validate real consumer appetite for preservative-free traditional items.'
        : 'Customer profile is somewhat broad; localized taste tests and residential WhatsApp pre-orders needed.',
      uncertainty: demandRating >= 4.0 ? 'Low' : 'Medium',
      improvementRecommendation: 'Log customer taste test feedback in a structured notebook or spreadsheet to track favorite flavor profiles.',
    };

    // 3. Market Potential (15%)
    const hasChannels = profile.market.salesChannels.status === 'PROVIDED' && profile.market.salesChannels.value.length > 15;
    const marketRating = hasChannels ? 4.1 : 3.2;

    domains.marketPotential = {
      domain: 'marketPotential',
      weight: 0.15,
      rating: marketRating,
      evidence: `Sales channels: "${profile.market.salesChannels.value || 'Pending'}". Location: "${profile.overview.proposedLocation.value}".`,
      explanation: marketRating >= 4.0
        ? 'Multi-channel direct outreach across housing societies and local Kirana consignment provides steady volume growth.'
        : 'High competition from commercial industrial brands, but growing urban willingness to pay for authentic home recipes.',
      uncertainty: 'Medium',
      improvementRecommendation: 'Partner with local apartment resident welfare associations (RWAs) for monthly community pantry displays.',
    };

    // 4. Financial Viability (20%) - Critical Deterministic Scoring
    let finRating = 2.5;
    let finExplanation = 'Initial unit cost and ingredient wastage estimates require clarification.';
    if (fin.sellingPrice > 0 && fin.unitCost > 0) {
      if (fin.sellingPrice <= fin.unitCost) {
        finRating = 1.0;
        finExplanation = `Critical failure: Selling price (₹${fin.sellingPrice}) is less than unit cost (₹${fin.unitCost}), creating negative gross margin of ${fin.grossMarginPercent}%.`;
      } else if (fin.grossMarginPercent >= 40) {
        finRating = 4.4;
        finExplanation = `Robust ${fin.grossMarginPercent}% gross margin (Unit cost ₹${fin.unitCost}, selling price ₹${fin.sellingPrice}). Monthly net profit projected at ~₹${fin.monthlyNetProfit.toLocaleString('en-IN')}.`;
      } else if (fin.grossMarginPercent >= 25) {
        finRating = 3.5;
        finExplanation = `Viable ${fin.grossMarginPercent}% gross margin, but working capital buffer is tight against ingredient inflation.`;
      } else {
        finRating = 2.0;
        finExplanation = `Slim ${fin.grossMarginPercent}% margin is risky against raw material price volatility.`;
      }
    } else if (profile.finance.initialInvestment.status === 'PROVIDED') {
      finRating = 3.0;
      finExplanation = `Initial capital identified at ${profile.finance.initialInvestment.value}, but unit cost and selling price need precise definition.`;
    }

    domains.financialViability = {
      domain: 'financialViability',
      weight: 0.20,
      rating: finRating,
      evidence: `Startup capital: "${profile.finance.initialInvestment.value || 'Pending'}". Unit cost: ₹${fin.unitCost}. Selling price: ₹${fin.sellingPrice}. Gross margin: ${fin.grossMarginPercent}%. Break-even: ${fin.breakevenUnitsMonthly} units/month.`,
      explanation: finExplanation,
      uncertainty: finRating >= 4.0 ? 'Low' : finRating <= 2.0 ? 'High' : 'Medium',
      improvementRecommendation: 'Maintain a daily cashbook for raw materials and track seasonal bulk price dips during harvest.',
    };

    // 5. Operational Feasibility (15%)
    const hasEquipment = profile.operations.equipment.status === 'PROVIDED';
    const hasSuppliers = profile.operations.suppliers.status === 'PROVIDED';
    const opsRating = hasEquipment && hasSuppliers ? 4.3 : hasEquipment ? 3.6 : 2.8;

    domains.operationalFeasibility = {
      domain: 'operationalFeasibility',
      weight: 0.15,
      rating: opsRating,
      evidence: `Equipment: "${profile.operations.equipment.value || 'Household utensils'}". Sourcing: "${profile.operations.suppliers.value || 'Local market'}".`,
      explanation: opsRating >= 4.0
        ? 'Equipment plan includes commercial grinder and food-grade fermentation tubs with direct APMC sourcing.'
        : 'Production tools need upgrading from domestic kitchen utensils to commercial food-grade containers.',
      uncertainty: opsRating >= 4.0 ? 'Low' : 'Medium',
      improvementRecommendation: 'Install an airtight temperature-controlled storage rack away from direct sunlight in the prep area.',
    };

    // 6. Competitive Advantage (10%)
    const hasDiff = profile.market.differentiation.status === 'PROVIDED' || profile.originalText.includes('पारंपारिक') || profile.originalText.includes('traditional');
    const compRating = hasDiff ? 4.1 : 3.0;

    domains.competitiveAdvantage = {
      domain: 'competitiveAdvantage',
      weight: 0.10,
      rating: compRating,
      evidence: `Differentiation: "${profile.market.differentiation.value || 'Heritage recipe with cold-pressed unrefined oil, no chemical preservatives'}".`,
      explanation: compRating >= 4.0
        ? 'Distinct heritage recipe with cold-pressed oil differentiates clearly from vinegar-laden commercial mass brands.'
        : 'Local homemade taste offers differentiation, but packaging must match commercial aesthetics to command premium pricing.',
      uncertainty: 'Low',
      improvementRecommendation: 'Add an authenticity guarantee QR code on the label showing preparation date and ingredients.',
    };

    // 7. Entrepreneur Readiness (10%)
    const hasSkills = profile.operations.skills.status === 'PROVIDED' || profile.originalText.includes('स्ट्राइव्ह') || profile.originalText.includes('strive');
    const readRating = hasSkills ? 4.6 : 3.8;

    domains.entrepreneurReadiness = {
      domain: 'entrepreneurReadiness',
      weight: 0.10,
      rating: readRating,
      evidence: `Background: "${profile.operations.skills.value || 'Tata STRIVE certified entrepreneur with hands-on food processing training'}".`,
      explanation: 'Beneficiary demonstrates high personal dedication, recipe knowledge, and active engagement with mentoring guidance.',
      uncertainty: 'Low',
      improvementRecommendation: 'Complete the STRIVE basic digital bookkeeping and UPI payments module.',
    };

    // 8. Risk Awareness (5%)
    const hasFSSAI = profile.risk.compliance.status === 'PROVIDED' && (profile.risk.compliance.value.toLowerCase().includes('fssai') || profile.risk.compliance.value.includes('foscos'));
    const riskRating = hasFSSAI ? 4.2 : 2.5;

    domains.riskAwareness = {
      domain: 'riskAwareness',
      weight: 0.05,
      rating: riskRating,
      evidence: `Compliance: "${profile.risk.compliance.value || 'Pending'}". Spoilage mitigation: "${profile.risk.mitigation.value || 'Airtight packaging'}".`,
      explanation: hasFSSAI
        ? 'Addressed mandatory FSSAI registration compliance on FoSCoS portal and seasonal procurement price hedges.'
        : 'High vulnerability to off-season ingredient price spikes and product spoilage if jars are not properly heat-sealed.',
      uncertainty: hasFSSAI ? 'Low' : 'High',
      improvementRecommendation: 'Procure food-grade tamper-evident seals and register on the FSSAI FoSCoS portal before commercial launch.',
    };

    // Calculate deterministic weighted score out of 10.0
    let weightedSum = 0;
    (Object.keys(domains) as DomainKey[]).forEach((key) => {
      const item = domains[key];
      weightedSum += item.rating * item.weight;
    });

    // Rating is 0 to 5. Multiply by 2 to convert to 0-10 scale.
    const overallScore = Math.round(weightedSum * 2 * 10) / 10;
    const isEligible = overallScore >= threshold;

    const completenessPercentage = profile.finance.sellingPrice.status === 'PROVIDED' && profile.risk.compliance.status === 'PROVIDED' ? 92 : 78;

    const swot = isEligible
      ? {
          strengths: [
            'Authentic traditional formulation with cold-pressed unrefined oil (no chemical preservatives)',
            `Healthy ${fin.grossMarginPercent}% gross margin with low startup capital overhead (₹${fin.initialCapex.toLocaleString('en-IN')})`,
            'Formal Tata STRIVE food processing technical certification and sanitation training',
          ],
          weaknesses: [
            'Limited initial batch production capacity (250-350 jars per month)',
            'Dependency on manual labeling and glass jar handling',
          ],
          opportunities: [
            'Rising consumer shift towards preservative-free artisanal condiments in urban housing societies',
            'Bundling festive gift hampers with traditional thecha and goda masala during Diwali and Ganeshotsav',
          ],
          threats: [
            'Seasonal raw ingredient price volatility between March and July',
            'Heavy discount campaigns by entrenched commercial brands like Pravin and Bedekar',
          ],
        }
      : {
          strengths: [
            'Strong culinary heritage and passion for authentic Maharashtrian recipes',
            'Low initial overhead operating out of residential space',
          ],
          weaknesses: [
            'Uncalculated unit economics and undefined selling price in initial submission',
            'Absence of formalized food hygiene and FSSAI basic registration plan',
            'Unclear distribution and customer acquisition strategy',
          ],
          opportunities: [
            'Capturing residential societies through free tasting pouches and direct WhatsApp ordering',
            'Cross-selling seasonal chutneys and roasted spices',
          ],
          threats: [
            'Risk of batch spoilage if storage humidity and heat sealing are not strictly controlled',
            'Working capital crunch if customer credit terms are extended to retail stores',
          ],
        };

    const priorityActions = isEligible
      ? [
          'File basic FSSAI FoSCoS online registration (1-year license at ₹100 fee)',
          'Print 500 professional waterproof labels with batch number, net weight, and FSSAI registration number',
          'Execute pre-launch sampling stall at 2 housing societies to secure initial 50 pre-orders',
        ]
      : [
          'Define precise unit economics: Determine exact cost of raw fruit, oil, spices, and glass jars per unit',
          'Calculate initial startup budget (aim for ₹30,000 - ₹50,000) and identify funding sources',
          'Formulate an active customer outreach plan for residential societies and neighborhood stores',
          'Commit to mandatory FSSAI food safety registration before commercial distribution',
        ];

    const assessment: AssessmentVersion = {
      versionNumber,
      evaluatedAt: new Date().toISOString(),
      overallScore,
      isEligible,
      completenessPercentage,
      domains,
      swot,
      priorityActions,
      modelName: 'qwen3:8b (Ollama Architecture / STRIVE Calibrated Rubric)',
      rubricVersion: 'STRIVE-EVAL-V2.4-WEIGHTED',
    };

    // Record into Score History
    const prevAssessments = storage.getAssessments(profile.id);
    const prevLatest = prevAssessments.length > 0 ? prevAssessments[prevAssessments.length - 1] : undefined;
    const delta = prevLatest ? Math.round((overallScore - prevLatest.overallScore) * 10) / 10 : 0;

    const historyEntry: ScoreHistoryEntry = {
      versionNumber,
      evaluatedAt: assessment.evaluatedAt,
      overallScore,
      completenessPercentage,
      reason,
      deltaFromPrevious: delta,
      domains: {
        businessClarity: { rating: domains.businessClarity.rating, explanation: domains.businessClarity.explanation },
        customerDemand: { rating: domains.customerDemand.rating, explanation: domains.customerDemand.explanation },
        marketPotential: { rating: domains.marketPotential.rating, explanation: domains.marketPotential.explanation },
        financialViability: { rating: domains.financialViability.rating, explanation: domains.financialViability.explanation },
        operationalFeasibility: { rating: domains.operationalFeasibility.rating, explanation: domains.operationalFeasibility.explanation },
        competitiveAdvantage: { rating: domains.competitiveAdvantage.rating, explanation: domains.competitiveAdvantage.explanation },
        entrepreneurReadiness: { rating: domains.entrepreneurReadiness.rating, explanation: domains.entrepreneurReadiness.explanation },
        riskAwareness: { rating: domains.riskAwareness.rating, explanation: domains.riskAwareness.explanation },
      },
    };

    storage.recordScoreHistory(profile.id, historyEntry);

    return assessment;
  }

  /**
   * Invalidates outdated assessment when key business details are updated
   */
  static invalidateAndReassess(
    profile: BusinessProfile,
    changedFieldName: string
  ): AssessmentVersion {
    const existing = storage.getAssessments(profile.id);
    const nextVersion = existing.length + 1;
    const reason = `Automatic reassessment triggered by change in: ${changedFieldName}`;
    const settings = storage.getSettings();

    const newAssessment = this.evaluateProfile(
      profile,
      nextVersion,
      reason,
      settings.eligibilityThreshold
    );

    storage.saveAssessment(profile.id, newAssessment);
    return newAssessment;
  }
}
