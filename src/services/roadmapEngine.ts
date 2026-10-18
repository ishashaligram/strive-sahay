import {
  AssessmentVersion,
  BusinessProfile,
  BusinessRoadmap,
  DomainKey,
  MarketValidationChecklist,
  RoadmapTask,
  SkillMentoringActivity,
  StartupCostCalculator,
  BreakevenAnalysis,
  SupportedLanguage,
} from '../types';
import { ContradictionEngine } from './contradictionEngine';
import { storage } from './storage';

export class RoadmapEngine {
  /**
   * Generates or retrieves the personalized business roadmap for a beneficiary
   */
  static getOrGenerateRoadmap(
    profile: BusinessProfile,
    assessment: AssessmentVersion,
    timeframe: '7_days' | '30_days' = '30_days',
    preferredLang: SupportedLanguage = 'mr'
  ): BusinessRoadmap {
    // Check if an existing roadmap is already saved
    const existing = storage.getRoadmap(profile.id);
    if (existing) {
      return existing;
    }

    return this.generateRoadmap(profile, assessment, timeframe, preferredLang);
  }

  /**
   * Generates a fresh personalized business development roadmap
   */
  static generateRoadmap(
    profile: BusinessProfile,
    assessment: AssessmentVersion,
    timeframe: '7_days' | '30_days' = '30_days',
    preferredLang: SupportedLanguage = 'mr'
  ): BusinessRoadmap {
    const fin = ContradictionEngine.calculateFinancialMetrics(profile);
    const domains = assessment.domains;

    // 1. Generate Practical Tasks based on weak scoring parameters (< 4.2 / 5.0)
    const tasks: RoadmapTask[] = [];

    // Financial Viability Task (if rating < 4.2)
    if (domains.financialViability.rating < 4.2 || fin.financialHealthStatus !== 'HEALTHY') {
      tasks.push({
        id: 'task_finance_unit_economics',
        domain: 'financialViability',
        dayOffset: 2,
        status: 'todo',
        evidenceRequired: true,
        title: {
          en: 'Calculate Exact Unit Costs & Fix 40-50% Profit Margin',
          mr: 'कच्चा माल खर्च मोजून ४०-५०% नफ्याची विक्री किंमत निश्चित करा',
          hi: 'इकाई लागत की गणना करें और 40-50% मुनाफे का विक्रय मूल्य तय करें',
        },
        missingElement: {
          en: 'Detailed ingredient breakdown and exact cost per 500g jar',
          mr: '५०० ग्रॅम बरणीसाठी लागणारा नेमका कच्चा माल, तेल, मसाले व बरणीचा खर्च',
          hi: '500 ग्राम जार के लिए कच्चा माल, तेल, मसाले और जार का सटीक खर्च',
        },
        whyItMatters: {
          en: 'Selling without precise cost breakdown risks operational cash loss on every batch.',
          mr: 'खर्चाचा नेमका हिशोब नसल्यास प्रत्येक बरणीमागे नकळत नुकसान होण्याचा धोका असतो.',
          hi: 'लागत का सटीक आकलन न होने पर हर बिक्री पर अनजाने में नुकसान हो सकता है।',
        },
        howToImprove: {
          en: 'Weigh ingredients for a 10-jar test batch: raw mangoes, cold-pressed oil, salt, chili, turmeric, glass jar, waterproof label, and fuel.',
          mr: '१० बरण्यांच्या एका चाचणी बॅचसाठी कैरी, तेल, मीठ, मिरची, काचेची बरणी, लेबल आणि इंधनाचा नेमका खर्च लिहून काढा.',
          hi: '10 जार के टेस्ट बैच के लिए कच्चा माल, तेल, जार, लेबल और ईंधन का सटीक खर्च डायरी में नोट करें।',
        },
        whatActionToTake: {
          en: 'Fill in the Startup Cost Calculator below, confirm ₹65 cost and ₹130 selling price, and upload a photo of your recipe cost sheet.',
          mr: 'खालील नफा कॅल्क्युलेटरमध्ये ₹६५ खर्च व ₹१३० किंमत तपासा आणि तुमच्या खर्चाच्या टिपणाचा फोटो अपलोड करा.',
          hi: 'नीचे दिए गए कैलकुलेटर में ₹65 लागत व ₹130 बिक्री मूल्य दर्ज करें और अपनी लागत पर्ची का फोटो अपलोड करें।',
        },
      });
    }

    // Customer Demand & Market Task
    if (domains.customerDemand.rating < 4.3 || domains.marketPotential.rating < 4.2) {
      tasks.push({
        id: 'task_market_sampling',
        domain: 'customerDemand',
        dayOffset: timeframe === '7_days' ? 3 : 5,
        status: 'todo',
        evidenceRequired: true,
        title: {
          en: 'Execute 10 Free Taste Tests in Residential Housing Societies',
          mr: 'स्थानिक निवासी सोसायट्यांमध्ये १० मोफत चव चाचणी नमुने (सॅम्पलिंग) द्या',
          hi: 'स्थानीय हाउसिंग सोसायटियों में 10 मुफ्त स्वाद परीक्षण (सैंपलिंग) करें',
        },
        missingElement: {
          en: 'Direct consumer feedback on flavor, saltiness, and price acceptance',
          mr: 'लोणच्याची चव, तिखट-मिठाचे प्रमाण आणि किमतीबाबत ग्राहकांचा थेट अभिप्राय',
          hi: 'अचार के स्वाद, तीखेपन और कीमत पर ग्राहकों की सीधी राय',
        },
        whyItMatters: {
          en: 'First-hand taste feedback proves willingness to pay before spending capital on mass production.',
          mr: 'मोठ्या प्रमाणावर उत्पादन सुरू करण्यापूर्वी ग्राहकांना उत्पादन आवडते का हे खात्रीशीर समजते.',
          hi: 'व्यावसायिक उत्पादन से पहले यह साबित होता है कि ग्राहक पैसे देकर उत्पाद खरीदने को तैयार हैं।',
        },
        howToImprove: {
          en: 'Prepare 10 small 50g sample pouches with printed WhatsApp contact number. Distribute during morning walks or society gatherings.',
          mr: 'व्हॉट्सअ‍ॅप नंबर असलेले ५० ग्रॅमचे १० सॅम्पल पाऊच तयार करून शेजारील सोसायट्यांमध्ये वाटा.',
          hi: 'व्हाट्सएप नंबर के साथ 50 ग्राम के 10 सैंपल पैकेट बनाएं और नजदीकी सोसायटियों में बांटें।',
        },
        whatActionToTake: {
          en: 'Record feedback scores (1-5 stars) from 10 tasters and upload a photo of your sampling log.',
          mr: '१० लोकांकडून मिळालेला अभिप्राय (स्टार रेटिंग) नोंदवा आणि फीडबॅक वहीचा फोटो अपलोड करा.',
          hi: '10 चखने वालों से फीडबैक नोट करें और अपनी फीडबैक डायरी का फोटो अपलोड करें।',
        },
      });
    }

    // Operations & Equipment Task
    if (domains.operationalFeasibility.rating < 4.3) {
      tasks.push({
        id: 'task_operations_equipment_setup',
        domain: 'operationalFeasibility',
        dayOffset: timeframe === '7_days' ? 5 : 10,
        status: 'todo',
        evidenceRequired: true,
        title: {
          en: 'Set Up Food-Grade Storage Containers & Digital Scale',
          mr: 'फूड-ग्रेड साठवणूक कंटेनर्स व डिजिटल वजन काटा खरेदी करा',
          hi: 'फूड-ग्रेड स्टोरेज कंटेनर और डिजिटल तराजू की व्यवस्था करें',
        },
        missingElement: {
          en: 'Dedicated hygiene-compliant equipment list and supplier quote',
          mr: 'स्वच्छतेचे निकष पाळणारी उपकरणे आणि स्थानिक बाजारपेठेतील दरपत्रक',
          hi: 'स्वच्छता मानकों वाले उपकरण और स्थानीय बाजार से दर सूची',
        },
        whyItMatters: {
          en: 'Improper storage leads to fungal mold growth and entire batch spoilage.',
          mr: 'अयोग्य भांड्यांमध्ये साठवणूक केल्यास लोणच्याला बुरशी लागून संपूर्ण बॅच वाया जाण्याचा धोका असतो.',
          hi: 'गलत बर्तनों में रखने से फंगस लगने और पूरा बैच खराब होने का खतरा रहता है।',
        },
        howToImprove: {
          en: 'Procure 4 food-grade HDPE 50L fermentation buckets, a 50kg digital scale, and manual heat induction foil sealer.',
          mr: '४ फूड-ग्रेड ५० लिटरच्या टाक्या, ५० किलोचा डिजिटल काटा आणि फॉइल सीलिंग मशीन खरेदी करा.',
          hi: '4 फूड-ग्रेड 50 लीटर के ड्रम, 50 किलो का डिजिटल तराजू और फॉइल सीलिंग मशीन खरीदें।',
        },
        whatActionToTake: {
          en: 'Photograph your dedicated clean preparation area with digital scale and upload receipt/photo.',
          mr: 'स्वच्छ उत्पादन जागेचा आणि वजन काट्याचा फोटो काढून येथे पुरावा म्हणून अपलोड करा.',
          hi: 'अपने साफ-सुथरे कार्यस्थल और डिजिटल तराजू का फोटो खींचकर यहां अपलोड करें।',
        },
      });
    }

    // Risk & FSSAI Compliance Task
    if (domains.riskAwareness.rating < 4.2) {
      tasks.push({
        id: 'task_risk_fssai_registration',
        domain: 'riskAwareness',
        dayOffset: timeframe === '7_days' ? 6 : 14,
        status: 'todo',
        evidenceRequired: true,
        title: {
          en: 'File Basic FSSAI FoSCoS Online Registration (₹100 Fee)',
          mr: 'FoSCoS पोर्टलवर प्राथमिक FSSAI अन्न सुरक्षा परवान्यासाठी ऑनलाइन अर्ज करा (केवळ ₹१००)',
          hi: 'FoSCoS पोर्टल पर बुनियादी FSSAI खाद्य पंजीकरण के लिए ऑनलाइन आवेदन करें (केवल ₹100)',
        },
        missingElement: {
          en: 'Government food safety registration number for legal retail sale',
          mr: 'किराणा दुकाने आणि सोसायट्यांमध्ये अधिकृत विक्रीसाठी आवश्यक FSSAI नोंदणी क्रमांक',
          hi: 'दुकानों और सोसायटियों में कानूनी बिक्री के लिए आवश्यक FSSAI पंजीकरण संख्या',
        },
        whyItMatters: {
          en: 'FSSAI license is legally mandatory and builds instant trust with residential buyers.',
          mr: 'FSSAI परवाना कायद्यानुसार आवश्यक आहे आणि यामुळे ग्राहकांचा विश्वास लगेच वाढतो.',
          hi: 'FSSAI लाइसेंस कानूनी रूप से जरूरी है और ग्राहकों का तुरंत भरोसा जीतता है।',
        },
        howToImprove: {
          en: 'Log in to foscos.fssai.gov.in, select petty food manufacturer (turnover < ₹12 Lakhs), upload Aadhaar & photo, pay ₹100.',
          mr: 'foscos.fssai.gov.in वर जाऊन आधार कार्ड आणि फोटो अपलोड करा, ₹१०० सरकारी फी भरून अर्ज करा.',
          hi: 'foscos.fssai.gov.in पर जाकर आधार और फोटो अपलोड करें, ₹100 सरकारी फीस जमा करके रसीद प्राप्त करें।',
        },
        whatActionToTake: {
          en: 'Upload your FSSAI FoSCoS application acknowledgement receipt or certificate here.',
          mr: 'FSSAI अर्जाची पोचपावती किंवा प्रमाणपत्राची प्रत येथे अपलोड करा.',
          hi: 'FSSAI आवेदन की रसीद या प्रमाणपत्र की कॉपी यहां अपलोड करें।',
        },
      });
    }

    // Business Launch / Marketing Task
    tasks.push({
      id: 'task_launch_preorders',
      domain: 'marketPotential',
      dayOffset: timeframe === '7_days' ? 7 : 25,
      status: 'todo',
      evidenceRequired: true,
      title: {
        en: 'Secure First 25 Paid Pre-Orders via WhatsApp Community Broadcast',
        mr: 'व्हॉट्सअ‍ॅप ग्रुप्स व परिचितांमधून पहिल्या २५ बरण्यांच्या आगाऊ ऑर्डर्स मिळवा',
        hi: 'व्हाट्सएप ग्रुप्स और परिचितों से पहले 25 जार के एडवांस ऑर्डर प्राप्त करें',
      },
      missingElement: {
        en: 'Confirmed advance paying customers before full batch bottling',
        mr: 'मोठ्या प्रमाणावर बॉटल्स भरण्यापूर्वी आगाऊ पैसे देणारे निश्चित ग्राहक',
        hi: 'पूरी बॉटलिंग करने से पहले अग्रिम भुगतान करने वाले पक्के ग्राहक',
      },
      whyItMatters: {
        en: 'Pre-orders guarantee immediate revenue and eliminate unsold inventory storage risk.',
        mr: 'आगाऊ ऑर्डर्समुळे पहिल्याच दिवशी पैसे मिळतात आणि माल पडून राहण्याचा धोका नसतो.',
        hi: 'एडवांस ऑर्डर से पहले ही दिन आय सुनिश्चित होती है और माल खराब होने का खतरा नहीं रहता।',
      },
      howToImprove: {
        en: 'Create a simple WhatsApp catalog with photo of your sanitized glass jar, net weight, price (₹130), and free home delivery promise.',
        mr: 'सुंदर काचेच्या बरणीचा फोटो, ५०% नफ्याची किंमत (₹१३०) आणि मोफत घरपोच डिलिव्हरीचा संदेश पाठवा.',
        hi: 'कांच के जार का फोटो, ₹130 कीमत और फ्री होम डिलीवरी का संदेश व्हाट्सएप पर भेजें।',
      },
      whatActionToTake: {
        en: 'Take a screenshot of your customer order list or UPI payment confirmations and upload.',
        mr: 'मिळालेल्या ऑर्डर्सच्या यादीचा किंवा UPI पेमेंटचा स्क्रीनशॉट येथे अपलोड करा.',
        hi: 'मिले हुए ऑर्डर्स की सूची या यूपीआई भुगतान का स्क्रीनशॉट यहां अपलोड करें।',
      },
    });

    // 2. Interactive Startup Cost Calculator
    const calculator: StartupCostCalculator = {
      capexItems: [
        { name: 'Heavy-Duty Commercial Grinder (1000W)', cost: 16500, category: 'Equipment' },
        { name: 'Precision Digital Weighing Scale (50kg)', cost: 2400, category: 'Equipment' },
        { name: 'Food-Grade Fermentation Tubs (4 x 50L)', cost: 3800, category: 'Storage' },
        { name: 'Glass Jars (500g x 300 units) + Foil Caps', cost: 5400, category: 'Packaging' },
        { name: 'Printed Waterproof Labels (500 units)', cost: 1500, category: 'Branding' },
        { name: 'FSSAI FoSCoS Basic Registration', cost: 100, category: 'Compliance' },
        { name: 'First Batch Raw Mangoes, Spices & Cold-Pressed Oil', cost: 8500, category: 'Raw Materials' },
      ],
      totalCapex: 38200,
      unitCost: fin.unitCost || 65,
      sellingPrice: fin.sellingPrice || 130,
      monthlyExpectedVolume: fin.expectedMonthlyVolume || 250,
      monthlyFixedCosts: fin.monthlyFixedCosts || 4500,
      grossMarginPercent: fin.grossMarginPercent || 50,
      monthlyGrossProfit: fin.monthlyGrossProfit || 16250,
      monthlyNetProfit: fin.monthlyNetProfit || 11750,
    };

    // 3. Break-even Estimation
    const breakeven: BreakevenAnalysis = {
      fixedCostsMonthly: calculator.monthlyFixedCosts,
      contributionMarginPerUnit: Math.max(1, calculator.sellingPrice - calculator.unitCost),
      breakevenUnitsMonthly: fin.breakevenUnitsMonthly || 70,
      breakevenRevenueMonthly: fin.breakevenRevenueMonthly || 9100,
      capacityUtilizationAtBreakeven: Math.round((70 / (calculator.monthlyExpectedVolume || 250)) * 100),
      isViable: true,
      riskAssessment:
        'Low risk: Selling 70 jars per month (approx. 2–3 jars per day) covers all monthly fixed costs. Beyond unit 70, every jar contributes ₹65 net cash.',
    };

    // 4. Market Validation Checklist
    const checklist: MarketValidationChecklist[] = [
      {
        id: 'chk_taste_tests',
        title: {
          en: '10 Complimentary Taste Tests in Local Housing Societies',
          mr: 'स्थानिक सोसायट्यांमध्ये १० मोफत चव चाचणी नमुने (सॅम्पल्स)',
          hi: 'स्थानीय सोसायटियों में 10 मुफ्त स्वाद परीक्षण',
        },
        targetCount: 10,
        completedCount: 4,
        isCompleted: false,
        notes: ['Sampled at Shanti Heights Society: feedback loved the traditional garlic thecha touch.'],
      },
      {
        id: 'chk_kirana_interviews',
        title: {
          en: '5 Neighborhood Kirana Store Owner Interviews on Consignment',
          mr: '५ स्थानिक किराणा दुकानदारांशी विक्री व कमिशनबाबत चर्चा',
          hi: '5 स्थानीय किराना दुकानदारों से बिक्री और कमीशन पर चर्चा',
        },
        targetCount: 5,
        completedCount: 2,
        isCompleted: false,
        notes: ['Mahesh Kirana agreed to 15% shelf display margin on weekly payment.'],
      },
      {
        id: 'chk_consumer_survey',
        title: {
          en: '15 Target Customer Survey on Preferred Jar Sizes & Price',
          mr: '१५ ग्राहकांचे बरणीचे आकारमान (२५० ग्रॅम/५०० ग्रॅम) व किंमत सर्वेक्षण',
          hi: '15 ग्राहकों से पसंदीदा जार का आकार (250 ग्राम/500 ग्राम) और कीमत सर्वेक्षण',
        },
        targetCount: 15,
        completedCount: 7,
        isCompleted: false,
        notes: ['Working households strongly prefer 500g jars over 1kg due to freshness.'],
      },
      {
        id: 'chk_advance_preorders',
        title: {
          en: '20 Confirmed Advance Pre-Orders before Full Batch Production',
          mr: 'उत्पादनापूर्वी २० ग्राहकांच्या आगाऊ नोंदणीकृत ऑर्डर्स',
          hi: 'उत्पादन से पहले 20 ग्राहकों के एडवांस ऑर्डर',
        },
        targetCount: 20,
        completedCount: 8,
        isCompleted: false,
        notes: ['8 advance orders secured via WhatsApp society group.'],
      },
    ];

    // 5. Relevant Skills & Mentoring Activities
    const skills: SkillMentoringActivity[] = [
      {
        id: 'skill_strive_hygiene',
        title: {
          en: 'Tata STRIVE Micro-Food Processing & Hygiene Practices Module',
          mr: 'टाटा स्ट्राइव्ह सूक्ष्म अन्न प्रक्रिया व स्वच्छता निकष प्रशिक्षण',
          hi: 'टाटा स्ट्राइव सूक्ष्म खाद्य प्रसंस्करण एवं स्वच्छता मानक प्रशिक्षण',
        },
        category: 'Tata STRIVE Training',
        description: {
          en: 'Learn temperature control, glass jar steam sterilization, and mold prevention techniques.',
          mr: 'काचेच्या बरण्यांचे निर्जंतुकीकरण, तापमान नियंत्रण आणि बुरशी प्रतिबंधाचे शास्त्रीय तंत्र शिका.',
          hi: 'कांच के जार का निर्जर्मीकरण, तापमान नियंत्रण और फंगस से बचाव की तकनीक सीखें।',
        },
        actionUrl: 'https://tatastrive.org',
        isCompleted: true,
      },
      {
        id: 'skill_foscos_guide',
        title: {
          en: 'FSSAI FoSCoS Step-by-Step 48-Hour Online Filing Guide',
          mr: 'FSSAI FoSCoS ४८ तासांत ऑनलाइन अर्ज करण्याची संपूर्ण मार्गदर्शिका',
          hi: 'FSSAI FoSCoS 48 घंटे में ऑनलाइन आवेदन करने की संपूर्ण गाइड',
        },
        category: 'FSSAI/Compliance',
        description: {
          en: 'Follow our 5-minute video walkthrough to upload your Aadhaar and obtain registration for ₹100.',
          mr: 'आधार कार्ड वापरून ₹१०० मध्ये FSSAI नोंदणी प्रमाणपत्र कसे मिळवायचे ते ५ मिनिटांत शिका.',
          hi: 'आधार कार्ड से ₹100 में FSSAI पंजीकरण प्राप्त करने की सरल 5 मिनट की गाइड देखें।',
        },
        actionUrl: 'https://foscos.fssai.gov.in',
        isCompleted: false,
      },
      {
        id: 'skill_mudra_shishu',
        title: {
          en: 'Pradhan Mantri Mudra Yojana (Shishu Loan up to ₹50,000) Kit',
          mr: 'प्रधानमंत्री मुद्रा योजना (शिशू कर्ज ₹५०,००० पर्यंत) माहिती व कागदपत्रे',
          hi: 'प्रधानमंत्री मुद्रा योजना (शिशु ऋण ₹50,000 तक) आवेदन किट',
        },
        category: 'Government Schemes (Mudra/Standup)',
        description: {
          en: 'Zero-collateral micro-loan for equipment purchase supported by public sector banks.',
          mr: 'यंत्रसामग्री खरेदीसाठी कोणत्याही तारण किंवा हमीशिवाय मिळणाऱ्या कर्जाची माहिती.',
          hi: 'उपकरण खरीदने के लिए बिना किसी गारंटी के मिलने वाले बैंक ऋण की पूरी जानकारी।',
        },
        actionUrl: 'https://www.mudra.org.in',
        isCompleted: false,
      },
      {
        id: 'skill_digital_bookkeeping',
        title: {
          en: 'Grassroots Digital Bookkeeping & UPI Payment QR Setup',
          mr: 'दैनिक हिशोब वही आणि मोफत UPI क्यूआर कोड (QR Code) प्रणाली',
          hi: 'दैनिक बहीखाता और मुफ्त यूपीआई क्यूआर कोड (QR Code) व्यवस्था',
        },
        category: 'Financial Literacy',
        description: {
          en: 'Keep track of daily ingredient purchases, customer credit, and direct UPI collections.',
          mr: 'दैनिक खर्च, ग्राहकांची उधारी आणि थेट बँक खात्यात पैसे जमा करण्याचे सोपे नियोजन शिका.',
          hi: 'दैनिक खर्च, ग्राहकों की उधारी और सीधे खाते में भुगतान प्राप्त करने का सरल तरीका।',
        },
        actionUrl: '#',
        isCompleted: false,
      },
    ];

    const completedTasksCount = tasks.filter((t) => t.status === 'completed').length;
    const overallProgressPercentage = Math.round((completedTasksCount / Math.max(1, tasks.length)) * 100);

    const roadmap: BusinessRoadmap = {
      id: `road_${profile.id}`,
      profileId: profile.id,
      beneficiaryId: profile.beneficiaryId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timeframe,
      tasks,
      calculator,
      breakeven,
      checklist,
      skills,
      overallProgressPercentage,
      reassessmentRequested: false,
      humanMentoringRequested: false,
    };

    storage.saveRoadmap(roadmap);
    return roadmap;
  }

  /**
   * Updates task status, saves evidence file, recalculates roadmap progress
   */
  static updateTaskProgress(
    profileId: string,
    taskId: string,
    status: 'todo' | 'in_progress' | 'completed',
    evidence?: { fileName: string; fileType: string; previewUrl?: string; notes?: string }
  ): BusinessRoadmap | undefined {
    const roadmap = storage.getRoadmap(profileId);
    if (!roadmap) return undefined;

    roadmap.tasks = roadmap.tasks.map((task) => {
      if (task.id === taskId) {
        return {
          ...task,
          status,
          evidenceUploaded: evidence
            ? {
                ...evidence,
                uploadedAt: new Date().toISOString(),
              }
            : task.evidenceUploaded,
        };
      }
      return task;
    });

    const completedCount = roadmap.tasks.filter((t) => t.status === 'completed').length;
    roadmap.overallProgressPercentage = Math.round((completedCount / roadmap.tasks.length) * 100);
    roadmap.updatedAt = new Date().toISOString();

    storage.saveRoadmap(roadmap);
    return roadmap;
  }

  /**
   * Request human mentoring assistance
   */
  static requestHumanMentoring(
    profileId: string,
    notes: string
  ): BusinessRoadmap | undefined {
    const roadmap = storage.getRoadmap(profileId);
    if (!roadmap) return undefined;

    roadmap.humanMentoringRequested = true;
    roadmap.humanMentoringNotes = notes;
    roadmap.updatedAt = new Date().toISOString();

    storage.saveRoadmap(roadmap);
    return roadmap;
  }
}
