import {
  BusinessProfile,
  InconsistencyItem,
  MentorQuestion,
  DomainKey,
  FactItem,
} from '../types';

export class ContradictionEngine {
  /**
   * Helper to parse currency and numbers out of messy user text (e.g., "₹ 35,000", "35k", "65 rs")
   */
  static parseNumeric(val: string): number | null {
    if (!val) return null;
    const clean = val.replace(/,/g, '').trim().toLowerCase();
    
    // Check for 'k' suffix e.g. 35k
    const kMatch = clean.match(/([\d.]+)\s*k/);
    if (kMatch) {
      return parseFloat(kMatch[1]) * 1000;
    }

    // Extract first decimal or integer number
    const match = clean.match(/[\d.]+/);
    if (!match) return null;
    const num = parseFloat(match[0]);
    return isNaN(num) ? null : num;
  }

  /**
   * Deterministic financial metrics calculator
   */
  static calculateFinancialMetrics(profile: BusinessProfile): {
    unitCost: number;
    sellingPrice: number;
    initialCapex: number;
    expectedMonthlyVolume: number;
    monthlyFixedCosts: number;
    contributionMargin: number;
    grossMarginPercent: number;
    monthlyRevenue: number;
    monthlyGrossProfit: number;
    monthlyNetProfit: number;
    breakevenUnitsMonthly: number;
    breakevenRevenueMonthly: number;
    isViable: boolean;
    financialHealthStatus: 'HEALTHY' | 'UNREALISTIC' | 'CRITICAL_GAP';
    notes: string[];
  } {
    const rawCapex = profile.finance.initialInvestment.value;
    const rawCost = profile.finance.unitCost.value;
    const rawPrice = profile.finance.sellingPrice.value;
    const rawVolume = profile.finance.expectedSales.value;
    const rawExpenses = profile.finance.monthlyExpenses.value;

    const initialCapex = this.parseNumeric(rawCapex) || 35000;
    const unitCost = this.parseNumeric(rawCost) || 65;
    const sellingPrice = this.parseNumeric(rawPrice) || 130;
    const expectedMonthlyVolume = this.parseNumeric(rawVolume) || 250;
    const monthlyFixedCosts = this.parseNumeric(rawExpenses) || 4500;

    const contributionMargin = Math.max(0, sellingPrice - unitCost);
    const grossMarginPercent =
      sellingPrice > 0 ? Math.round(((sellingPrice - unitCost) / sellingPrice) * 100) : 0;
    const monthlyRevenue = sellingPrice * expectedMonthlyVolume;
    const monthlyGrossProfit = contributionMargin * expectedMonthlyVolume;
    const monthlyNetProfit = monthlyGrossProfit - monthlyFixedCosts;

    const breakevenUnitsMonthly =
      contributionMargin > 0 ? Math.ceil(monthlyFixedCosts / contributionMargin) : 0;
    const breakevenRevenueMonthly = breakevenUnitsMonthly * sellingPrice;

    const notes: string[] = [];
    let financialHealthStatus: 'HEALTHY' | 'UNREALISTIC' | 'CRITICAL_GAP' = 'HEALTHY';
    let isViable = true;

    if (sellingPrice <= unitCost && rawCost && rawPrice) {
      financialHealthStatus = 'UNREALISTIC';
      isViable = false;
      notes.push(
        `Critical: Selling price (₹${sellingPrice}) is less than or equal to unit production cost (₹${unitCost}), causing a negative gross margin of ${grossMarginPercent}%.`
      );
    } else if (grossMarginPercent < 25 && rawCost && rawPrice) {
      financialHealthStatus = 'UNREALISTIC';
      notes.push(
        `Warning: Gross margin of ${grossMarginPercent}% is below the sustainable benchmark (35-50%) for micro-food processing.`
      );
    }

    if (breakevenUnitsMonthly > expectedMonthlyVolume * 1.5) {
      financialHealthStatus = 'UNREALISTIC';
      notes.push(
        `Break-even volume (${breakevenUnitsMonthly} units) significantly exceeds projected monthly demand (${expectedMonthlyVolume} units).`
      );
    }

    return {
      unitCost,
      sellingPrice,
      initialCapex,
      expectedMonthlyVolume,
      monthlyFixedCosts,
      contributionMargin,
      grossMarginPercent,
      monthlyRevenue,
      monthlyGrossProfit,
      monthlyNetProfit,
      breakevenUnitsMonthly,
      breakevenRevenueMonthly,
      isViable,
      financialHealthStatus,
      notes,
    };
  }

  /**
   * Scans the profile to find:
   * 1. Conflicting information (Value A vs Value B with source evidence)
   * 2. Unrealistic financial claims
   * 3. Uncertain assumptions
   * 4. Critical missing fields
   */
  static detectContradictions(profile: BusinessProfile): InconsistencyItem[] {
    return this.evaluateInconsistencies(profile);
  }

  static evaluateInconsistencies(profile: BusinessProfile): InconsistencyItem[] {
    const items: InconsistencyItem[] = [];
    const origText = profile.originalText.toLowerCase();

    // 1. Check for Contradictions: Initial Investment vs Equipment Plan
    const capexNum = this.parseNumeric(profile.finance.initialInvestment.value);
    const equipText = profile.operations.equipment.value.toLowerCase();
    const equipHasHeavyMachinery =
      equipText.includes('1000w') ||
      equipText.includes('commercial') ||
      equipText.includes('heavy') ||
      equipText.includes('sealer') ||
      equipText.includes('rotary') ||
      equipText.includes('industrial');

    if (capexNum !== null && capexNum < 15000 && equipHasHeavyMachinery) {
      items.push({
        id: 'incon_capex_equipment_clash',
        fieldKey: 'finance.initialInvestment',
        issueType: 'CONTRADICTION',
        severity: 'critical',
        title: {
          en: 'Startup Capital vs. Commercial Machinery Contradiction',
          mr: 'सुरुवातीचे भांडवल आणि व्यावसायिक यंत्रसामग्री यातील तफावत',
          hi: 'शुरुआती पूंजी और व्यावसायिक मशीनरी के बीच विरोधाभास',
        },
        description: {
          en: 'You stated a startup budget of ₹' + capexNum + ', but your operations plan specifies commercial heavy-duty grinder and sealing machinery which typically cost at least ₹25,000–₹40,000.',
          mr: 'तुम्ही सुरुवातीचे भांडवल ₹' + capexNum + ' नमूद केले आहे, परंतु आवश्यक व्यावसायिक मिक्सर आणि सीलिंग यंत्रांचा खर्च किमान ₹२५,००० ते ₹४०,००० येतो.',
          hi: 'आपने शुरुआती पूंजी ₹' + capexNum + ' दर्ज की है, लेकिन उपकरण सूची में भारी मशीनरी शामिल है जिसकी लागत कम से कम ₹25,000 से ₹40,000 है।',
        },
        valueA: {
          value: profile.finance.initialInvestment.value || '₹' + capexNum,
          source: profile.finance.initialInvestment.source || 'Initial Submission',
        },
        valueB: {
          value: '₹35,000 - ₹45,000 (Commercial Equipment Quote)',
          source: 'Operations: Machinery & Equipment Requirement',
        },
        deterministicCalculations: {
          formula: 'Available Capex < Minimum Commercial Machinery Cost',
          result: `₹${capexNum} vs ₹35,000 baseline`,
          benchmark: '₹30,000 - ₹50,000',
          status: 'FAIL',
        },
        resolutionStatus: 'UNRESOLVED',
        blocksSubmission: true,
      });
    }

    // 2. Check for Contradictions: Location vs Delivery Radius
    const loc = profile.overview.proposedLocation.value.toLowerCase();
    const channels = profile.market.salesChannels.value.toLowerCase();
    if (
      (loc.includes('solapur') && channels.includes('pune') && !channels.includes('courier') && !channels.includes('transport')) ||
      (loc.includes('nashik') && channels.includes('mumbai') && !channels.includes('rail') && !channels.includes('logistics'))
    ) {
      items.push({
        id: 'incon_geo_logistics',
        fieldKey: 'market.salesChannels',
        issueType: 'CONTRADICTION',
        severity: 'warning',
        title: {
          en: 'Production Location vs. Target Market Geographic Distance',
          mr: 'उत्पादन स्थान आणि विक्री बाजारपेठेतील अंतराची विसंगती',
          hi: 'उत्पादन स्थल और लक्षित बाजार के बीच भौगोलिक दूरी',
        },
        description: {
          en: 'Your production base is in ' + profile.overview.proposedLocation.value + ', but your main sales target is in ' + profile.market.salesChannels.value + ' without an explicit freight or courier budget.',
          mr: 'तुमचा उत्पादन तळ ' + profile.overview.proposedLocation.value + ' येथे आहे, परंतु विक्री ' + profile.market.salesChannels.value + ' येथे नियोजित आहे. यासाठी वाहतूक खर्चाचे नियोजन आवश्यक आहे.',
          hi: 'आपका उत्पादन ' + profile.overview.proposedLocation.value + ' में है लेकिन बिक्री ' + profile.market.salesChannels.value + ' में नियोजित है। इसके लिए लॉजिस्टिक्स लागत स्पष्ट करें।',
        },
        valueA: {
          value: profile.overview.proposedLocation.value,
          source: 'Overview: Proposed Location',
        },
        valueB: {
          value: profile.market.salesChannels.value,
          source: 'Market: Sales Channels',
        },
        resolutionStatus: 'UNRESOLVED',
        blocksSubmission: false,
      });
    }

    // 3. Unrealistic Financials: Negative Margin or High Profit Claim
    const fin = this.calculateFinancialMetrics(profile);
    if (profile.finance.sellingPrice.value && profile.finance.unitCost.value) {
      if (fin.sellingPrice <= fin.unitCost) {
        items.push({
          id: 'incon_negative_margin',
          fieldKey: 'finance.sellingPrice',
          issueType: 'UNREALISTIC_FINANCIAL',
          severity: 'critical',
          title: {
            en: 'Unrealistic Financial Claim: Negative Gross Margin',
            mr: 'अवास्तव आर्थिक अंदाज: तोट्यातील विक्री किंमत',
            hi: 'अवास्तविक वित्तीय दावा: घाटे का विक्रय मूल्य',
          },
          description: {
            en: `Your selling price (₹${fin.sellingPrice}) is less than or equal to unit cost (₹${fin.unitCost}), meaning every sale results in a loss of ₹${fin.unitCost - fin.sellingPrice}.`,
            mr: `तुमची विक्री किंमत (₹${fin.sellingPrice}) उत्पादन खर्चापेक्षा (₹${fin.unitCost}) कमी आहे. यामुळे प्रति विक्री तोटा होईल.`,
            hi: `आपका विक्रय मूल्य (₹${fin.sellingPrice}) इकाई लागत (₹${fin.unitCost}) से कम या बराबर है, जिससे प्रति इकाई नुकसान होगा।`,
          },
          valueA: {
            value: `Selling Price: ₹${fin.sellingPrice}`,
            source: 'Finance: Selling Price',
          },
          valueB: {
            value: `Unit Cost: ₹${fin.unitCost}`,
            source: 'Finance: Cost per Unit',
          },
          deterministicCalculations: {
            formula: 'Gross Margin = (Selling Price - Unit Cost) / Selling Price',
            result: `${fin.grossMarginPercent}% margin`,
            benchmark: '35% to 50% healthy margin',
            status: 'FAIL',
          },
          resolutionStatus: 'UNRESOLVED',
          blocksSubmission: true,
        });
      } else if (fin.grossMarginPercent > 80 && !equipHasHeavyMachinery) {
        items.push({
          id: 'incon_unrealistic_high_margin',
          fieldKey: 'finance.sellingPrice',
          issueType: 'UNREALISTIC_FINANCIAL',
          severity: 'warning',
          title: {
            en: 'Unusually High Margin Assumption (>80%)',
            mr: 'अतिशय उच्च नफ्याचा अंदाज (८०% पेक्षा जास्त)',
            hi: 'अत्यधिक उच्च लाभ का अनुमान (80% से अधिक)',
          },
          description: {
            en: `Claimed gross margin of ${fin.grossMarginPercent}% is exceptionally high. Please verify that packaging, glass jars, spices, oil, and transport costs have been fully factored in.`,
            mr: `८०% पेक्षा जास्त नफा अन्न प्रक्रिया व्यवसायात दुर्मिळ असतो. यात काचेची बरणी, मसाले, तेल आणि पॅकेजिंगचा खर्च समाविष्ट आहे का?`,
            hi: `80% से अधिक का लाभ दुर्लभ है। क्या इसमें कांच का जार, मसाले, तेल और पैकेजिंग का पूरा खर्च शामिल है?`,
          },
          valueA: {
            value: `Cost ₹${fin.unitCost} vs Price ₹${fin.sellingPrice}`,
            source: 'Finance: Unit Economics',
          },
          valueB: {
            value: 'Industry Average: 40% - 50% Gross Margin',
            source: 'Tata STRIVE Micro-Enterprise Benchmark',
          },
          deterministicCalculations: {
            formula: 'Gross Margin = (Selling Price - Unit Cost) / Selling Price',
            result: `${fin.grossMarginPercent}%`,
            benchmark: '40% - 50%',
            status: 'WARN',
          },
          resolutionStatus: 'UNRESOLVED',
          blocksSubmission: false,
        });
      }
    }

    // 4. Critical Missing Fields (Preventing Submission)
    if (profile.overview.productService.status === 'MISSING' || !profile.overview.productService.value.trim()) {
      items.push({
        id: 'incon_missing_product',
        fieldKey: 'overview.productService',
        issueType: 'CRITICAL_MISSING',
        severity: 'critical',
        title: {
          en: 'Core Product / Service Specification Missing',
          mr: 'मुख्य उत्पादन किंवा सेवेचा तपशील अपूर्ण',
          hi: 'मुख्य उत्पाद या सेवा का विवरण अनुपलब्ध',
        },
        description: {
          en: 'You have not defined the specific products or service packages you intend to produce and sell.',
          mr: 'तुम्ही नेमके कोणते उत्पादन किंवा सेवा विकणार आहात हे स्पष्ट केलेले नाही.',
          hi: 'आपने यह स्पष्ट नहीं किया है कि आप कौन सा उत्पाद या सेवा बेचेंगे।',
        },
        resolutionStatus: 'UNRESOLVED',
        blocksSubmission: true,
      });
    }

    if (profile.finance.initialInvestment.status === 'MISSING' || !profile.finance.initialInvestment.value.trim()) {
      items.push({
        id: 'incon_missing_capex',
        fieldKey: 'finance.initialInvestment',
        issueType: 'CRITICAL_MISSING',
        severity: 'critical',
        title: {
          en: 'Initial Startup Capital Required is Missing',
          mr: 'सुरुवातीचे आवश्यक भांडवल नमूद केलेले नाही',
          hi: 'आवश्यक प्रारंभिक पूंजी अनुपलब्ध',
        },
        description: {
          en: 'A valid financial budget is mandatory before submitting your idea for human assessment.',
          mr: 'परीक्षकांकडे पाठवण्यापूर्वी व्यवसायासाठी लागणारे सुरुवातीचे भांडवल ठरवणे अनिवार्य आहे.',
          hi: 'मूल्यांकनकर्ता के पास भेजने से पहले आवश्यक शुरुआती पूंजी का विवरण अनिवार्य है।',
        },
        resolutionStatus: 'UNRESOLVED',
        blocksSubmission: true,
      });
    }

    if (profile.finance.sellingPrice.status === 'MISSING' || !profile.finance.sellingPrice.value.trim()) {
      items.push({
        id: 'incon_missing_pricing',
        fieldKey: 'finance.sellingPrice',
        issueType: 'CRITICAL_MISSING',
        severity: 'critical',
        title: {
          en: 'Unit Selling Price and Economics Missing',
          mr: 'प्रति नग विक्री किंमत आणि नफ्याचे गणित अपूर्ण',
          hi: 'इकाई विक्रय मूल्य और लाभ का गणित अधूरा',
        },
        description: {
          en: 'Selling price per unit must be specified to verify commercial viability.',
          mr: 'व्यवसाय नफ्यात चालणार की नाही हे पडताळण्यासाठी प्रति नग विक्री किंमत आवश्यक आहे.',
          hi: 'व्यावसायिक व्यवहार्यता की जांच के लिए प्रति इकाई विक्रय मूल्य आवश्यक है।',
        },
        resolutionStatus: 'UNRESOLVED',
        blocksSubmission: true,
      });
    }

    return items;
  }

  /**
   * Generates 3-5 adaptive, trade-specific questions per round.
   * Avoids repeating answered questions and prioritizes critical gaps.
   */
  static generateAdaptiveQuestionRound(
    profile: BusinessProfile,
    existingQuestions: MentorQuestion[]
  ): MentorQuestion[] {
    const answeredKeys = new Set(
      existingQuestions.filter((q) => q.status === 'answered' || q.status === 'dont_know').map((q) => q.fieldKey)
    );

    const candidateQuestions: MentorQuestion[] = [];

    // 1. Initial Investment (Capex)
    if (!answeredKeys.has('finance.initialInvestment') && profile.finance.initialInvestment.status !== 'PROVIDED') {
      candidateQuestions.push({
        id: 'q_capex_adaptive_' + Date.now().toString(36),
        fieldKey: 'finance.initialInvestment',
        module: 'finance',
        question: {
          en: 'What is your exact startup budget (₹) for tools, machinery, and first-batch ingredients?',
          mr: 'साधने, यंत्रसामग्री आणि पहिल्या बॅचच्या कच्च्या मालासाठी तुम्हाला नेमके किती भांडवल (₹) लागेल?',
          hi: 'उपकरण, मशीनरी और पहली खेप के लिए आपको कुल कितनी शुरुआती पूंजी (₹) चाहिए?',
        },
        contextRationale: {
          en: 'Accurate capital estimation is required to determine self-funding versus Mudra Shishu loan eligibility.',
          mr: 'भांडवलाचा अचूक अंदाज घेतल्याने मुद्रा योजनेतून कर्ज घ्यायचे की स्वतःचे भांडवल वापरायचे हे स्पष्ट होते.',
          hi: 'पूंजी के सटीक आकलन से मुद्रा शिशु ऋण या स्वयं के वित्तपोषण का निर्णय लिया जा सकता है।',
        },
        practicalGuidance: {
          en: 'Typical micro-enterprise setup in Maharashtra: ₹30,000–₹50,000 for equipment and food packaging.',
          mr: 'महाराष्ट्रात घरगुती प्रक्रिया उद्योगासाठी ₹३५,००० ते ₹५०,००० भांडवल पुरेसे ठरते.',
          hi: 'घरेलू प्रसंस्करण व्यवसाय के लिए ₹35,000 से ₹50,000 की पूंजी उपयुक्त मानी जाती है।',
        },
        suggestedAnswers: [
          '₹35,000 (₹20,000 equipment/jars + ₹15,000 ingredients/labels)',
          '₹50,000 (Commercial heavy grinder, jars, initial raw material)',
          '₹25,000 (Starting lean with existing home equipment)',
        ],
        status: 'pending',
      });
    }

    // 2. Unit Economics & Pricing
    if (!answeredKeys.has('finance.sellingPrice') && profile.finance.sellingPrice.status !== 'PROVIDED') {
      candidateQuestions.push({
        id: 'q_pricing_adaptive_' + Date.now().toString(36),
        fieldKey: 'finance.sellingPrice',
        module: 'finance',
        question: {
          en: 'What will be your selling price per unit/jar and what does each unit cost to make?',
          mr: 'प्रति बरणी किंवा प्रति किलो विक्री किंमत किती असेल आणि ती तयार करण्यासाठी किती खर्च येईल?',
          hi: 'प्रति जार या प्रति किलो विक्रय मूल्य क्या होगा और इसे बनाने में कितनी लागत आएगी?',
        },
        contextRationale: {
          en: 'A 35% to 50% gross margin is the gold standard for sustainable grassroots retail businesses.',
          mr: 'अन्न प्रक्रिया उद्योगात कच्च्या मालावर किमान ३५% ते ५०% नफा शिल्लक राहणे आवश्यक असते.',
          hi: 'खाद्य प्रसंस्करण व्यवसाय में 35% से 50% का ग्रॉस मार्जिन होना अनिवार्य है।',
        },
        practicalGuidance: {
          en: 'Example: 500g jar cost is ₹65; selling price is ₹130, yielding a 50% gross profit margin.',
          mr: 'उदा. ५०० ग्रॅम बरणीसाठी ₹६५ खर्च आणि ₹१३० विक्री किंमत, ज्यामुळे प्रति बरणी ५०% नफा मिळतो.',
          hi: 'उदा. 500 ग्राम जार की लागत ₹65 और बिक्री ₹130, जिससे 50% का ग्रॉस मुनाफा मिलता है।',
        },
        suggestedAnswers: [
          '500g Jar: Cost ₹65, Selling Price ₹130 (50% Margin)',
          '1kg Jar: Cost ₹120, Selling Price ₹240 (50% Margin)',
          '250g Jar: Cost ₹38, Selling Price ₹75 (49% Margin)',
        ],
        status: 'pending',
      });
    }

    // 3. Machinery & Equipment
    if (!answeredKeys.has('operations.equipment') && profile.operations.equipment.status !== 'PROVIDED') {
      candidateQuestions.push({
        id: 'q_equipment_adaptive_' + Date.now().toString(36),
        fieldKey: 'operations.equipment',
        module: 'operations',
        question: {
          en: 'What specific tools or equipment will you use to produce your goods safely and hygienically?',
          mr: 'उत्पादन सुरक्षित आणि स्वच्छ पद्धतीने करण्यासाठी तुम्ही कोणती यंत्रसामग्री व साधने वापरणार आहात?',
          hi: 'सुरक्षित और स्वच्छ उत्पादन के लिए आप किन उपकरणों और मशीनरी का उपयोग करेंगे?',
        },
        contextRationale: {
          en: 'Food-grade storage and proper equipment ensure consistency and eliminate contamination risks.',
          mr: 'फूड-ग्रेड भांडी व उपकरणांमुळे पदार्थाची चव टिकून राहते व बुरशी लागण्याचा धोका टळतो.',
          hi: 'फूड-ग्रेड बर्तनों और उपकरणों से गुणवत्ता बनी रहती है और खराब होने का खतरा नहीं रहता।',
        },
        practicalGuidance: {
          en: 'Standard setup: Heavy-duty 1000W grinder, digital weighing scale, and airtight containers.',
          mr: 'आवश्यक साधने: १००० वॅट कमर्शियल मिक्सर, डिजिटल वजन काटा आणि हवाबंद कंटेनर्स.',
          hi: 'शुरुआती उपकरण: 1000 वाट कमर्शियल मिक्सर, डिजिटल तराजू और एयरटाइट कंटेनर।',
        },
        suggestedAnswers: [
          'Commercial 1000W grinder, digital weighing scale, food-grade storage drums, and foil sealer.',
          'Domestic kitchen utensils, ceramic barnis, and manual packaging tools.',
        ],
        status: 'pending',
      });
    }

    // 4. Customer Acquisition & Sales Channels
    if (!answeredKeys.has('market.salesChannels') && profile.market.salesChannels.status !== 'PROVIDED') {
      candidateQuestions.push({
        id: 'q_channels_adaptive_' + Date.now().toString(36),
        fieldKey: 'market.salesChannels',
        module: 'market',
        question: {
          en: 'How will you reach your first 50–100 paying customers in your target neighborhood?',
          mr: 'स्थानिक परिसरातील पहिले ५० ते १०० नियमित ग्राहक मिळवण्यासाठी तुम्ही काय योजना केली आहे?',
          hi: 'अपने इलाके में पहले 50 से 100 नियमित ग्राहक बनाने के लिए आपकी क्या योजना है?',
        },
        contextRationale: {
          en: 'Direct consumer sampling in residential societies delivers immediate conversion without advertising cost.',
          mr: 'सोसायट्यांमध्ये मोफत सॅम्पल वाटणे हा विनाखर्च थेट ग्राहक जोडण्याचा सर्वोत्तम मार्ग आहे.',
          hi: 'सोसायटियों में मुफ्त सैंपलिंग से तुरंत ग्राहक बनते हैं और कोई विज्ञापन खर्च नहीं होता।',
        },
        practicalGuidance: {
          en: 'Hand out 50g tasting packs at morning community walks or apartment association gatherings.',
          mr: 'सोसायट्यांच्या वीकेंड मीटिंगमध्ये ५० ग्रॅमचे मोफत टेस्टिंग पाऊच द्या, यामुळे थेट नियमित ग्राहक मिळतात.',
          hi: 'सोसायटियों में 50 ग्राम के मुफ्त सैंपल पैकेट बांटें; इससे त्वरित नियमित ग्राहक बनते हैं।',
        },
        suggestedAnswers: [
          'Direct residential sampling in 5 housing societies + WhatsApp ordering group.',
          'Consignment stalls at 10 neighborhood Kirana stores + weekly vegetable market stall.',
        ],
        status: 'pending',
      });
    }

    // 5. FSSAI & Regulatory Compliance
    if (!answeredKeys.has('risk.compliance') && profile.risk.compliance.status !== 'PROVIDED') {
      candidateQuestions.push({
        id: 'q_fssai_adaptive_' + Date.now().toString(36),
        fieldKey: 'risk.compliance',
        module: 'risk',
        question: {
          en: 'Have you planned for basic FSSAI FoSCoS registration and batch label details (weights, expiry)?',
          mr: 'तुम्ही प्राथमिक एफएसएसएआय (FSSAI) नोंदणी आणि लेबलवर घटक, वजन, एक्सपायरी तारीख छापण्याचे नियोजन केले आहे का?',
          hi: 'क्या आपने बुनियादी एफएसएसएआई (FSSAI) खाद्य पंजीकरण और लेबलिंग (सामग्री, वजन, एक्सपायरी) की योजना बनाई है?',
        },
        contextRationale: {
          en: 'Basic FSSAI registration (₹100/yr on FoSCoS portal) is legally required and builds customer trust.',
          mr: 'केवळ ₹१०० मध्ये प्राथमिक FSSAI परवाना मिळतो, ज्यामुळे ग्राहकांचा विश्वास त्वरित वाढतो.',
          hi: 'केवल ₹100 में बुनियादी FSSAI पंजीकरण मिल जाता है, जिससे ग्राहकों का भरोसा बढ़ता है।',
        },
        practicalGuidance: {
          en: 'STRIVE centers assist beneficiaries with free 48-hour online FoSCoS filing.',
          mr: 'टाटा स्ट्राइव्ह केंद्र ४८ तासांत मोफत ऑनलाइन अर्ज करण्यास मार्गदर्शन करते.',
          hi: 'टाटा स्ट्राइव केंद्र 48 घंटे में ऑनलाइन आवेदन में पूरा सहयोग करता है।',
        },
        suggestedAnswers: [
          'Yes, planning basic FSSAI registration (₹100) on FoSCoS + printed batch labels.',
          'Will complete FSSAI registration with Tata STRIVE center assistance within 10 days.',
        ],
        status: 'pending',
      });
    }

    // Limit to 3 to 5 questions per round
    return candidateQuestions.slice(0, 5);
  }
}
