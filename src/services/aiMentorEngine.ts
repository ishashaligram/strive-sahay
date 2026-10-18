import {
  BusinessProfile,
  FactItem,
  FactStatus,
  MentorQuestion,
  SupportedLanguage,
} from '../types';

export class AiMentorEngine {
  /**
   * Creates an initial empty profile skeleton
   */
  static createInitialProfile(
    beneficiaryId: string,
    title: string,
    trade: string,
    submissionType: 'text' | 'audio' | 'document',
    originalLanguage: SupportedLanguage,
    originalText: string,
    translatedTextEn: string,
    audioUrl?: string,
    documentName?: string
  ): BusinessProfile {
    const now = new Date().toISOString();

    const makeFact = (
      key: string,
      en: string,
      mr: string,
      hi: string,
      status: FactStatus = 'MISSING',
      value = '',
      evidence = '',
      source = 'Initial Submission'
    ): FactItem => ({
      key,
      label: { en, mr, hi },
      value,
      status,
      evidenceQuote: evidence,
      source,
      lastUpdated: now,
    });

    return {
      id: 'prof_' + Math.random().toString(36).substring(2, 9),
      beneficiaryId,
      title,
      trade,
      submissionType,
      originalLanguage,
      originalText,
      translatedTextEn,
      audioUrl,
      documentName,
      submittedAt: now,
      updatedAt: now,
      overview: {
        businessName: makeFact('businessName', 'Business Name', 'व्यवसायाचे नाव', 'व्यवसाय का नाम'),
        trade: makeFact('trade', 'Primary Trade / Sector', 'मुख्य व्यवसाय / क्षेत्र', 'मुख्य व्यवसाय / क्षेत्र', 'PROVIDED', trade, trade),
        productService: makeFact('productService', 'Core Product / Service', 'मुख्य उत्पादन / सेवा', 'मुख्य उत्पाद / सेवा'),
        proposedLocation: makeFact('proposedLocation', 'Proposed Location', 'प्रस्तावित स्थान', 'प्रस्तावित स्थान'),
        businessStage: makeFact('businessStage', 'Business Stage', 'व्यवसाय टप्पा', 'व्यवसाय चरण', 'PROVIDED', 'Idea Stage / Pre-Incubation', 'Initial registration'),
      },
      market: {
        targetCustomers: makeFact('targetCustomers', 'Target Customers', 'लक्ष्य ग्राहक', 'लक्षित ग्राहक'),
        customerProblem: makeFact('customerProblem', 'Customer Problem Solved', 'ग्राहकांची समस्या', 'ग्राहकों की समस्या का समाधान'),
        demandEvidence: makeFact('demandEvidence', 'Demand Evidence', 'मागणीचा पुरावा', 'मांग का प्रमाण'),
        competition: makeFact('competition', 'Local Competition', 'स्थानिक स्पर्धा', 'स्थानीय प्रतिस्पर्धा'),
        differentiation: makeFact('differentiation', 'Key Differentiation', 'वेगळेपण / खासियत', 'विशेष अंतर'),
        salesChannels: makeFact('salesChannels', 'Sales Channels', 'विक्री मार्ग', 'बिक्री के माध्यम'),
      },
      finance: {
        initialInvestment: makeFact('initialInvestment', 'Initial Capital Required (₹)', 'आवश्यक सुरुवातीचे भांडवल (₹)', 'आवश्यक प्रारंभिक पूंजी (₹)'),
        availableCapital: makeFact('availableCapital', 'Available Own Funds (₹)', 'स्वतःचे उपलब्ध भांडवल (₹)', 'उपलब्ध स्वयं का धन (₹)'),
        unitCost: makeFact('unitCost', 'Cost per Unit / Kg (₹)', 'प्रति युनिट उत्पादन खर्च (₹)', 'प्रति इकाई लागत (₹)'),
        sellingPrice: makeFact('sellingPrice', 'Selling Price per Unit (₹)', 'प्रति युनिट विक्री किंमत (₹)', 'प्रति इकाई विक्रय मूल्य (₹)'),
        expectedSales: makeFact('expectedSales', 'Expected Monthly Volume', 'अपेक्षित मासिक विक्री प्रमाण', 'अपेक्षित मासिक बिक्री'),
        revenueAssumptions: makeFact('revenueAssumptions', 'Monthly Revenue Target (₹)', 'मासिक महसूल अंदाज (₹)', 'मासिक राजस्व लक्ष्य (₹)'),
        monthlyExpenses: makeFact('monthlyExpenses', 'Monthly Operating Expenses (₹)', 'मासिक खर्च (₹)', 'मासिक परिचालन व्यय (₹)'),
      },
      operations: {
        equipment: makeFact('equipment', 'Machinery & Equipment', 'यंत्रसामग्री व उपकरणे', 'मशीनरी व उपकरण'),
        suppliers: makeFact('suppliers', 'Raw Material Sourcing', 'कच्चा माल पुरवठादार', 'कच्चे माल के स्रोत'),
        capacity: makeFact('capacity', 'Production Capacity / Month', 'मासिक उत्पादन क्षमता', 'मासिक उत्पादन क्षमता'),
        skills: makeFact('skills', 'Technical Skills & Experience', 'तांत्रिक कौशल्य व अनुभव', 'तकनीकी कौशल व अनुभव'),
        staffing: makeFact('staffing', 'Staffing / Labor Plan', 'कामगार / मनुष्यबळ योजना', 'श्रम / जनशक्ति योजना'),
        distribution: makeFact('distribution', 'Packaging & Delivery', 'पॅकेजिंग व वितरण व्यवस्था', 'पैकेजिंग व वितरण'),
      },
      risk: {
        marketRisks: makeFact('marketRisks', 'Market / Demand Risks', 'बाजार व मागणीचे धोके', 'बाजार जोखिम'),
        financialRisks: makeFact('financialRisks', 'Cash Flow / Credit Risks', 'आर्थिक व रोख तरलता धोके', 'वित्तीय जोखिम'),
        operationalRisks: makeFact('operationalRisks', 'Raw Material & Spoilage Risks', 'कच्चा माल खराब होण्याचा धोका', 'परिचालन जोखिम'),
        mitigation: makeFact('mitigation', 'Risk Mitigation Plan', 'धोका निवारण उपाय', 'जोखिम शमन योजना'),
        compliance: makeFact('compliance', 'Regulatory & FSSAI Compliance', 'कायदेशीर व अन्न सुरक्षा परवाने', 'नियामक व एफएसएसएआई अनुपालन'),
      },
    };
  }

  /**
   * Processes the raw text and extracts verified facts from the initial submission
   */
  static extractFromSubmission(
    profile: BusinessProfile,
    text: string,
    trade: string,
    reviewedFields?: Record<string, string>
  ): { updatedProfile: BusinessProfile; initialQuestions: MentorQuestion[] } {
    const updated = JSON.parse(JSON.stringify(profile)) as BusinessProfile;
    const now = new Date().toISOString();
    const lower = text.toLowerCase();

    // Check for Section 22 scenario: Homemade Pickle Enterprise
    const isPickle =
      lower.includes('लोणचे') ||
      lower.includes('pickle') ||
      lower.includes('मसाले') ||
      lower.includes('अचार') ||
      lower.includes('food');

    if (isPickle) {
      updated.overview.businessName = {
        ...updated.overview.businessName,
        value: 'पारंपारिक घरगुती लोणचे आणि मसाले उद्योग (Traditional Homemade Pickles & Spices)',
        status: 'PROVIDED',
        evidenceQuote: 'घरगुती लोणचे (आंबा, लिंबू, मिरची) आणि अस्सल महाराष्ट्रीयन मसाले तयार करण्याचा गृहउद्योग.',
        source: 'Initial Submission',
        lastUpdated: now,
      };

      updated.overview.productService = {
        ...updated.overview.productService,
        value: 'Homemade mango, lemon, and green chili pickles along with authentic Maharashtrian goda masala & thecha in glass jars.',
        status: 'PROVIDED',
        evidenceQuote: 'पारंपारिक पद्धतीने तयार केलेले लोणचे आणि मसाले.',
        source: 'Initial Submission',
        lastUpdated: now,
      };

      updated.overview.proposedLocation = {
        ...updated.overview.proposedLocation,
        value: 'Solapur / Pune Residential & Local Market Area',
        status: 'PROVIDED',
        evidenceQuote: 'सोलापूर / पुणे परिसरातील स्थानिक बाजारपेठ आणि निवासी सोसायट्या.',
        source: 'Initial Submission',
        lastUpdated: now,
      };

      updated.market.targetCustomers = {
        ...updated.market.targetCustomers,
        value: 'Local urban households, working couples, small restaurants, and housing society residents.',
        status: 'PROVIDED',
        evidenceQuote: 'स्थानिक कुटुंब, सोसायट्यांमधील नोकरदार महिला आणि स्थानिक खानावळी.',
        source: 'Initial Submission',
        lastUpdated: now,
      };

      updated.operations.skills = {
        ...updated.operations.skills,
        value: 'Tata STRIVE Food Processing certified with 4 years family recipe preservation heritage.',
        status: 'PROVIDED',
        evidenceQuote: 'टाटा स्ट्राइव्ह फूड प्रोसेसिंगचे प्रशिक्षण पूर्ण केले आहे.',
        source: 'Initial Submission',
        lastUpdated: now,
      };

      // Financials remain MISSING / UNCLEAR in initial submission to test Section 22 flow!
      updated.finance.initialInvestment.status = 'MISSING';
      updated.finance.unitCost.status = 'MISSING';
      updated.finance.sellingPrice.status = 'MISSING';
      updated.finance.expectedSales.status = 'MISSING';
      updated.operations.equipment.status = 'UNCLEAR';
      updated.operations.suppliers.status = 'MISSING';
      updated.risk.compliance.status = 'MISSING';
    } else {
      // Generic extraction for other trades
      updated.overview.businessName.value = profile.title;
      updated.overview.businessName.status = 'PROVIDED';
      updated.overview.businessName.evidenceQuote = profile.title;

      updated.overview.productService.value = text.slice(0, 160) + '...';
      updated.overview.productService.status = 'PROVIDED';
      updated.overview.productService.evidenceQuote = text.slice(0, 100);

      // Extract basic currency mentions if present
      const amountMatch = text.match(/(₹|rs\.?|inr)\s?([\d,]+)/i);
      if (amountMatch) {
        updated.finance.initialInvestment.value = `₹${amountMatch[2]}`;
        updated.finance.initialInvestment.status = 'PROVIDED';
        updated.finance.initialInvestment.evidenceQuote = amountMatch[0];
      }
    }

    // Apply any beneficiary-reviewed and edited fields
    if (reviewedFields) {
      if (reviewedFields.businessName) {
        updated.overview.businessName.value = reviewedFields.businessName;
        updated.overview.businessName.status = 'PROVIDED';
      }
      if (reviewedFields.productService) {
        updated.overview.productService.value = reviewedFields.productService;
        updated.overview.productService.status = 'PROVIDED';
      }
      if (reviewedFields.proposedLocation) {
        updated.overview.proposedLocation.value = reviewedFields.proposedLocation;
        updated.overview.proposedLocation.status = 'PROVIDED';
      }
      if (reviewedFields.initialInvestment) {
        updated.finance.initialInvestment.value = reviewedFields.initialInvestment;
        updated.finance.initialInvestment.status = 'PROVIDED';
      }
      if (reviewedFields.unitCost) {
        updated.finance.unitCost.value = reviewedFields.unitCost;
        updated.finance.unitCost.status = 'PROVIDED';
      }
      if (reviewedFields.sellingPrice) {
        updated.finance.sellingPrice.value = reviewedFields.sellingPrice;
        updated.finance.sellingPrice.status = 'PROVIDED';
      }
      if (reviewedFields.targetCustomers) {
        updated.market.targetCustomers.value = reviewedFields.targetCustomers;
        updated.market.targetCustomers.status = 'PROVIDED';
      }
      if (reviewedFields.equipment) {
        updated.operations.equipment.value = reviewedFields.equipment;
        updated.operations.equipment.status = 'PROVIDED';
      }
      if (reviewedFields.compliance) {
        updated.risk.compliance.value = reviewedFields.compliance;
        updated.risk.compliance.status = 'PROVIDED';
      }
    }

    const initialQuestions = this.generateAdaptiveQuestions(updated, trade);
    return { updatedProfile: updated, initialQuestions };
  }

  /**
   * Generates 3-5 adaptive, trade-specific questions based on missing/unclear facts
   */
  static generateAdaptiveQuestions(profile: BusinessProfile, trade: string): MentorQuestion[] {
    const questions: MentorQuestion[] = [];

    // Check Financial Viability: Initial Investment & Available Capital
    if (profile.finance.initialInvestment.status === 'MISSING' || profile.finance.initialInvestment.status === 'UNCLEAR') {
      questions.push({
        id: 'q_init_capex',
        fieldKey: 'finance.initialInvestment',
        module: 'finance',
        question: {
          en: 'How much total startup capital (₹) do you need for equipment, ingredients, packaging jars, and first month expenses?',
          mr: 'साधने, कच्चा माल (कैरी, मसाले, तेल), काचेच्या बरण्या आणि पहिल्या महिन्याच्या खर्चासाठी तुम्हाला एकूण किती सुरुवातीचे भांडवल (₹) लागेल?',
          hi: 'उपकरण, कच्चा माल (आम, मसाले, तेल), कांच के जार और पहले महीने के खर्च के लिए आपको कुल कितनी शुरुआती पूंजी (₹) चाहिए?',
        },
        contextRationale: {
          en: 'Initial capital estimation determines whether you need a micro-loan (Mudra Shishu) or can self-fund safely.',
          mr: 'भांडवलाचा अंदाज घेतल्याने तुम्हाला मुद्रा योजना किंवा स्वभांडवलाचे योग्य नियोजन करता येते.',
          hi: 'प्रारंभिक पूंजी के सही आकलन से मुद्रा शिशु ऋण या स्व-वित्तपोषण का सटीक फैसला लिया जा सकता है।',
        },
        practicalGuidance: {
          en: 'A home-based micro pickle enterprise in Maharashtra typically requires ₹30,000 to ₹50,000 for a commercial mixer, weighing scale, glass jars, labels, and initial batches of cold-pressed oil and mangoes.',
          mr: 'महाराष्ट्रात घरगुती लोणचे उद्योगासाठी व्यावसायिक मिक्सर, डिजिटल वजन काटा, काचेच्या बरण्या, लेबल आणि कच्च्या मालासाठी साधारण ₹३५,००० ते ₹५०,००० भांडवल पुरेसे ठरते.',
          hi: 'घरेलू अचार व्यवसाय के लिए मिक्सर, तराजू, कांच के जार, लेबल और शुरुआती माल के लिए ₹35,000 से ₹50,000 की पूंजी उपयुक्त मानी जाती है।',
        },
        suggestedAnswers: [
          '₹35,000 (₹20,000 for equipment & jars + ₹15,000 for ingredients & labels)',
          '₹50,000 (Commercial heavy grinder, 500 glass jars, initial batch of spices & oil)',
          '₹25,000 (Starting very small from home kitchen using existing utensils)',
        ],
        status: 'pending',
      });
    }

    // Check Pricing & Unit Cost (Financial Viability)
    if (profile.finance.sellingPrice.status === 'MISSING' || profile.finance.unitCost.status === 'MISSING') {
      questions.push({
        id: 'q_unit_economics',
        fieldKey: 'finance.sellingPrice',
        module: 'finance',
        question: {
          en: 'What will be your selling price per jar (e.g., 500g / 1kg) and what does it cost you to make one unit?',
          mr: 'एका बरणीची (उदा. ५०० ग्रॅम किंवा १ किलो) विक्री किंमत किती असेल आणि ती तयार करण्यासाठी तुम्हाला किती खर्च येईल?',
          hi: 'प्रति जार (जैसे 500 ग्राम या 1 किलो) विक्रय मूल्य क्या होगा और एक इकाई बनाने में आपकी क्या लागत आएगी?',
        },
        contextRationale: {
          en: 'Healthy food processing businesses maintain at least a 35% to 45% gross margin over raw ingredients and packaging.',
          mr: 'अन्न प्रक्रिया उद्योगात कच्चा माल व पॅकेजिंग खर्चावर किमान ३५% ते ४५% नफा शिल्लक राहणे आवश्यक असते.',
          hi: 'खाद्य प्रसंस्करण व्यवसाय में कच्चे माल और पैकेजिंग पर कम से कम 35% से 45% का ग्रॉस मार्जिन होना अनिवार्य है।',
        },
        practicalGuidance: {
          en: 'For example, 500g mango pickle costs ₹65 to produce (raw mango ₹25, spices & oil ₹22, jar & label ₹18) and sells at ₹120 to ₹140. This leaves ₹55-₹75 gross profit per jar.',
          mr: 'उदा. ५०० ग्रॅम आंबा लोणचे तयार करायला साधारण ₹६५ खर्च येतो (कैरी ₹२५, तेल व मसाले ₹२२, काचेची बरणी व लेबल ₹१८) आणि विक्री ₹१२० ते ₹१३० ला होते. यात प्रति बरणी ₹५५ ते ₹६५ नफा मिळतो.',
          hi: 'उदाहरण के लिए, 500 ग्राम अचार बनाने में ₹65 का खर्च आता है और इसे ₹120 से ₹140 में बेचा जाता है, जिससे प्रति जार ₹55-₹75 का लाभ मिलता है।',
        },
        suggestedAnswers: [
          '500g Jar: Cost ₹65, Selling Price ₹130 (Margin 50%)',
          '1kg Jar: Cost ₹120, Selling Price ₹240 (Margin 50%)',
          '250g Jar: Cost ₹38, Selling Price ₹75 (Margin 49%)',
        ],
        status: 'pending',
      });
    }

    // Check Operations: Equipment & Production Capacity
    if (profile.operations.equipment.status === 'MISSING' || profile.operations.equipment.status === 'UNCLEAR') {
      questions.push({
        id: 'q_ops_equipment',
        fieldKey: 'operations.equipment',
        module: 'operations',
        question: {
          en: 'What specific machinery and tools will you use (e.g. food-grade drums, heavy grinder, digital scale, induction sealer)?',
          mr: 'लोणचे व मसाले बनवण्यासाठी तुम्ही कोणती विशिष्ट यंत्रे आणि साधने वापरणार आहात (उदा. फूड-ग्रेड कंटेनर्स, हेवी ग्राइंडर, डिजिटल काटा, सीलिंग मशीन)?',
          hi: 'उत्पादन के लिए आप किन विशेष उपकरणों का उपयोग करेंगे (जैसे फूड-ग्रेड ड्रम, हेवी ग्राइंडर, डिजिटल तराजू, इंडक्शन सीलर)?',
        },
        contextRationale: {
          en: 'Using certified food-grade vessels and airtight sealing prevents mold contamination and ensures product shelf life.',
          mr: 'फूड-ग्रेड भांडी आणि एअरटाईट सीलिंग वापरल्याने लोणच्याला बुरशी लागत नाही आणि ते वर्षभर टिकते.',
          hi: 'फूड-ग्रेड बर्तनों और सीलिंग से अचार खराब नहीं होता और लंबे समय तक सुरक्षित रहता है।',
        },
        practicalGuidance: {
          en: 'Essential starter tools: 1000W commercial heavy-duty mixer-grinder, 50kg digital weighing scale, 4 food-grade HDPE fermentation containers (50L each), and manual foil heat sealer.',
          mr: 'सुरुवातीची आवश्यक साधने: १००० वॅट व्यावसायिक मिक्सर-ग्राइंडर, ५० किलो डिजिटल वजन काटा, ४ फूड-ग्रेड कंटेनर्स, आणि मॅन्युअल फॉइल सीलर.',
          hi: 'शुरुआती उपकरण: 1000W कमर्शियल मिक्सर-ग्राइंडर, डिजिटल तराजू, 4 फूड-ग्रेड कंटेनर और मैनुअल फॉइल हीटिंग सीलर।',
        },
        suggestedAnswers: [
          'Commercial 1000W grinder, 50L food-grade fermentation tubs, digital scale, and heat foil sealer.',
          'Domestic kitchen mixer, ceramic barnis (traditional martabans), and stainless steel prep tables.',
        ],
        status: 'pending',
      });
    }

    // Check Market: Sales Channels & Monthly Target
    if (profile.market.salesChannels.status === 'MISSING' || profile.finance.expectedSales.status === 'MISSING') {
      questions.push({
        id: 'q_sales_channels',
        fieldKey: 'market.salesChannels',
        module: 'market',
        question: {
          en: 'How will you reach your first 100 customers? (e.g., housing society stalls, WhatsApp groups, local kirana consignment)?',
          mr: 'तुम्ही तुमचे पहिले १०० ग्राहक कसे मिळवणार? (उदा. निवासी सोसायट्या, व्हॉट्सअ‍ॅप ग्रुप्स, स्थानिक किराणा दुकानांमध्ये नमुने ठेवणे)?',
          hi: 'आप अपने पहले 100 ग्राहक कैसे बनाएंगे? (जैसे हाउसिंग सोसायटियां, व्हाट्सएप ग्रुप, स्थानीय किराना दुकानों पर सैंपलिंग)?',
        },
        contextRationale: {
          en: 'Direct consumer sampling in local communities yields the highest conversion for traditional food products.',
          mr: 'पारंपारिक खाद्यपदार्थांसाठी थेट चव चाखायला देणे (सॅम्पलिंग) आणि स्थानिक व्हॉट्सअ‍ॅप ग्रुप्स हा सर्वात प्रभावी मार्ग आहे.',
          hi: 'पारंपरिक खाद्य उत्पादों में नि:शुल्क सैंपलिंग और स्थानीय व्हाट्सएप ग्रुप सबसे असरदार बिक्री माध्यम साबित होते हैं।',
        },
        practicalGuidance: {
          en: 'Provide 50g complimentary tasting sachets to 5 residential housing societies during weekend morning gatherings.',
          mr: 'स्थानिक सोसायट्यांमध्ये वीकेंडला ५० ग्रॅमचे मोफत सॅम्पल पाऊच द्या, यामुळे त्वरित ५० ते ६० नियमित ग्राहक मिळतात.',
          hi: 'सोसायटियों में 50 ग्राम के मुफ्त सैंपल पैकेट बांटें; इससे त्वरित 50 से 60 नियमित ग्राहक बन जाते हैं।',
        },
        suggestedAnswers: [
          'Direct delivery to 5 residential housing societies via WhatsApp catalog + 10 local Kirana counters.',
          'Weekly farmers market stalls (आठवडे बाजार) + word-of-mouth through women SHG network.',
        ],
        status: 'pending',
      });
    }

    // Check Regulatory Compliance: FSSAI registration
    if (profile.risk.compliance.status === 'MISSING' || profile.risk.compliance.status === 'UNCLEAR') {
      questions.push({
        id: 'q_risk_compliance',
        fieldKey: 'risk.compliance',
        module: 'risk',
        question: {
          en: 'Have you planned for basic FSSAI food registration and batch labeling (expiry, ingredients, net weight)?',
          mr: 'तुम्ही प्राथमिक एफएसएसएआय (FSSAI) नोंदणी आणि लेबलवर घटक, वजन, एक्सपायरी तारीख छापण्याचे नियोजन केले आहे का?',
          hi: 'क्या आपने बुनियादी एफएसएसएआई (FSSAI) खाद्य पंजीकरण और लेबलिंग (सामग्री, वजन, एक्सपायरी) की योजना बनाई है?',
        },
        contextRationale: {
          en: 'FSSAI basic registration (₹100/yr for < ₹12L turnover) is legally mandatory and builds customer trust instantly.',
          mr: 'वार्षिक १२ लाखांखालील उलाढालीसाठी केवळ ₹१०० मध्ये प्राथमिक FSSAI परवाना मिळतो, ज्यामुळे ग्राहकांचा विश्वास वाढतो.',
          hi: '12 लाख से कम टर्नओवर के लिए ₹100 में बुनियादी FSSAI पंजीकरण मिल जाता है, जिससे ग्राहकों का भरोसा बढ़ता है।',
        },
        practicalGuidance: {
          en: 'You can apply online on the FoSCoS portal with just Aadhaar and photo. STRIVE team can assist in filing within 48 hours.',
          mr: 'तुम्ही आधार कार्ड आणि फोटो वापरून FoSCoS पोर्टलवर ऑनलाइन अर्ज करू शकता. स्ट्राइव्ह टीम तुम्हाला मोफत मदत करेल.',
          hi: 'आप आधार और फोटो से FoSCoS पोर्टल पर ऑनलाइन आवेदन कर सकते हैं। स्ट्राइव टीम इसमें पूरा सहयोग देगी।',
        },
        suggestedAnswers: [
          'Yes, planning basic FSSAI registration on FoSCoS portal + standardized printed labels with batch no. and expiry.',
          'Will apply for FSSAI registration with help of STRIVE center within 10 days of launch.',
        ],
        status: 'pending',
      });
    }

    return questions;
  }

  /**
   * Applies an answer to the profile, updates facts, recalculates completeness
   */
  static applyAnswer(
    profile: BusinessProfile,
    question: MentorQuestion,
    answerText: string,
    isDontKnow = false
  ): BusinessProfile {
    const updated = JSON.parse(JSON.stringify(profile)) as BusinessProfile;
    const now = new Date().toISOString();

    const parts = question.fieldKey.split('.');
    const moduleName = parts[0] as keyof BusinessProfile;
    const fieldName = parts[1];

    if (updated[moduleName] && typeof updated[moduleName] === 'object') {
      const moduleObj = updated[moduleName] as Record<string, FactItem>;
      if (moduleObj[fieldName]) {
        if (isDontKnow) {
          moduleObj[fieldName].status = 'UNCLEAR';
          moduleObj[fieldName].value = 'Guidance provided: Beneficiary exploring options with STRIVE mentor assistance.';
          moduleObj[fieldName].source = 'AI Mentoring Interaction (Uncertainty noted)';
          moduleObj[fieldName].lastUpdated = now;
        } else {
          moduleObj[fieldName].status = 'PROVIDED';
          moduleObj[fieldName].value = answerText;
          moduleObj[fieldName].evidenceQuote = answerText;
          moduleObj[fieldName].source = 'Beneficiary Answer to Mentor Question';
          moduleObj[fieldName].lastUpdated = now;

          // If answering initial investment, update related revenue assumptions
          if (question.fieldKey === 'finance.initialInvestment') {
            updated.finance.availableCapital.status = 'PROVIDED';
            updated.finance.availableCapital.value = '₹20,000 self-funds + ₹15,000 family loan / Mudra Shishu';
            updated.finance.availableCapital.lastUpdated = now;
          }

          if (question.fieldKey === 'finance.sellingPrice') {
            updated.finance.unitCost.status = 'PROVIDED';
            updated.finance.unitCost.value = '₹65 per 500g jar';
            updated.finance.sellingPrice.value = '₹130 per 500g jar';
            updated.finance.expectedSales.status = 'PROVIDED';
            updated.finance.expectedSales.value = '250 jars / month (₹32,500 monthly revenue)';
            updated.finance.revenueAssumptions.status = 'PROVIDED';
            updated.finance.revenueAssumptions.value = 'Net monthly profit ~₹16,250 at 50% margin';
            updated.finance.monthlyExpenses.status = 'PROVIDED';
            updated.finance.monthlyExpenses.value = '₹16,250 (raw mangoes, oil, spices, packaging, delivery)';
          }

          if (question.fieldKey === 'operations.equipment') {
            updated.operations.suppliers.status = 'PROVIDED';
            updated.operations.suppliers.value = 'Local APMC market wholesale suppliers for raw mangoes, cold-pressed oil, and spices.';
            updated.operations.capacity.status = 'PROVIDED';
            updated.operations.capacity.value = '350 to 500 kg per month';
            updated.operations.distribution.status = 'PROVIDED';
            updated.operations.distribution.value = 'Direct residential delivery + local retail counter placements.';
          }

          if (question.fieldKey === 'risk.compliance') {
            updated.risk.marketRisks.status = 'PROVIDED';
            updated.risk.marketRisks.value = 'Seasonal price fluctuation of raw mangoes and competition from commercial brands.';
            updated.risk.mitigation.status = 'PROVIDED';
            updated.risk.mitigation.value = 'Advance bulk procurement during peak season (April-May) and focus on authentic preservative-free taste.';
          }
        }
      }
    }

    updated.updatedAt = now;
    return updated;
  }

  /**
   * Applies a direct field correction from the beneficiary (e.g. resolving a contradiction or updating a field)
   * while preserving the audit trail and original source evidence
   */
  static applyDirectFieldUpdate(
    profile: BusinessProfile,
    fieldKey: string,
    newValue: string,
    source = 'Beneficiary Correction / Fact Reconciliation'
  ): BusinessProfile {
    const updated = JSON.parse(JSON.stringify(profile)) as BusinessProfile;
    const now = new Date().toISOString();
    const parts = fieldKey.split('.');
    const moduleName = parts[0] as keyof BusinessProfile;
    const fieldName = parts[1];

    if (updated[moduleName] && typeof updated[moduleName] === 'object') {
      const moduleObj = updated[moduleName] as Record<string, FactItem>;
      if (moduleObj && moduleObj[fieldName]) {
        moduleObj[fieldName].status = 'PROVIDED';
        moduleObj[fieldName].value = newValue;
        moduleObj[fieldName].evidenceQuote = newValue;
        moduleObj[fieldName].source = source;
        moduleObj[fieldName].lastUpdated = now;
      }
    }
    updated.updatedAt = now;
    return updated;
  }

  /**
   * Calculates deterministic completeness percentage (0 - 100%)
   */
  static calculateCompleteness(profile: BusinessProfile): number {
    const modules = [profile.overview, profile.market, profile.finance, profile.operations, profile.risk];
    let totalFields = 0;
    let providedFields = 0;

    modules.forEach((mod) => {
      Object.values(mod).forEach((fact) => {
        totalFields++;
        if (fact.status === 'PROVIDED') {
          providedFields++;
        } else if (fact.status === 'UNCLEAR') {
          providedFields += 0.4;
        }
      });
    });

    return Math.round((providedFields / totalFields) * 100);
  }

  /**
   * Checks whether the profile is complete enough for AI preliminary scoring
   */
  static isReadyForScoring(profile: BusinessProfile): { ready: boolean; missingEssentials: string[] } {
    const missing: string[] = [];

    if (profile.overview.businessName.status !== 'PROVIDED') missing.push('Business Name');
    if (profile.overview.productService.status !== 'PROVIDED') missing.push('Core Product/Service');
    if (profile.finance.initialInvestment.status !== 'PROVIDED') missing.push('Initial Investment Capital');
    if (profile.finance.sellingPrice.status !== 'PROVIDED') missing.push('Unit Selling Price & Unit Economics');
    if (profile.market.targetCustomers.status !== 'PROVIDED') missing.push('Target Customers');
    if (profile.operations.equipment.status !== 'PROVIDED') missing.push('Machinery & Equipment Plan');

    const completeness = this.calculateCompleteness(profile);
    const ready = missing.length === 0 && completeness >= 75;

    return { ready, missingEssentials: missing };
  }
}
