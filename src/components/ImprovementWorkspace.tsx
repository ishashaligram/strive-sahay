import React, { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Building,
  MapPin,
  ExternalLink,
  ShieldCheck,
  Send,
  RotateCcw,
  UserPlus,
  HelpCircle,
  FileText,
  BadgeCheck,
  Check,
  ArrowRight,
  Mic,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Layers,
  Award,
  Zap,
  Compass,
  Calendar,
  DollarSign,
  Calculator,
  LineChart,
  CheckSquare,
} from 'lucide-react';
import {
  AssessmentVersion,
  BusinessProfile,
  DomainKey,
  MentorQuestion,
  SupportedLanguage,
  ScoreHistoryEntry,
  InconsistencyItem,
} from '../types';
import {
  SIMILAR_BUSINESS_CONCEPTS,
  VERIFIED_LOCAL_DIRECTORY,
} from '../data/striveDataset';
import { useTranslation } from '../services/i18n';
import { AudioService } from '../services/audioService';
import { storage } from '../services/storage';
import { ContradictionEngine } from '../services/contradictionEngine';
import { BeneficiaryRoadmapModal } from './BeneficiaryRoadmapModal';

interface ImprovementWorkspaceProps {
  profile: BusinessProfile;
  assessment: AssessmentVersion;
  currentLang: SupportedLanguage;
  questions?: MentorQuestion[];
  beneficiaryName?: string;
  onTriggerReassessment: () => void;
  onSubmitToAssessor: () => void;
  onNavigateToMentor: () => void;
  onAnswerQuestion?: (question: MentorQuestion, answerText: string, isDontKnow?: boolean) => void;
}

export const ImprovementWorkspace: React.FC<ImprovementWorkspaceProps> = ({
  profile,
  assessment,
  currentLang,
  questions = [],
  beneficiaryName,
  onTriggerReassessment,
  onSubmitToAssessor,
  onNavigateToMentor,
  onAnswerQuestion,
}) => {
  const t = useTranslation(currentLang);

  // Local state for interactive in-place answers
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [savedQuestions, setSavedQuestions] = useState<Record<string, boolean>>({});
  const [isReassessing, setIsReassessing] = useState(false);
  const [reassessmentDone, setReassessmentDone] = useState(false);
  const [isRoadmapModalOpen, setIsRoadmapModalOpen] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
  const [showEscalationModal, setShowEscalationModal] = useState(false);
  const [escalated, setEscalated] = useState(false);

  const scoreHistory = storage.getScoreHistory(profile.id);
  const inconsistencies = storage.getInconsistencies(profile.id);
  const unresolvedInconsistencies = inconsistencies.filter((i) => !i.isResolved);

  // Active voice recording for question
  const [recordingForQuestionId, setRecordingForQuestionId] = useState<string | null>(null);

  // Domain labels for technical tab
  const domainNames: Record<DomainKey, string> = {
    businessClarity: t.businessClarity,
    customerDemand: t.customerDemand,
    marketPotential: t.marketPotential,
    financialViability: t.financialViability,
    operationalFeasibility: t.operationalFeasibility,
    competitiveAdvantage: t.competitiveAdvantage,
    entrepreneurReadiness: t.entrepreneurReadiness,
    riskAwareness: t.riskAwareness,
  };

  // Questions to display (pending or relevant to weaknesses)
  const pendingOrKeyQuestions = questions.length > 0
    ? questions
    : [
        {
          id: 'q_selling_price',
          fieldKey: 'finance.sellingPrice',
          module: 'finance' as const,
          question: {
            en: 'What will be your selling price per jar/piece, and what is your profit margin?',
            mr: 'तुमची प्रति बरणी/नगाची विक्री किंमत काय असेल आणि त्यात तुम्हाला किती नफा मिळेल?',
            hi: 'प्रति जार/पीस आपकी विक्रय कीमत क्या होगी और उसमें आपका कितना मुनाफा रहेगा?',
            te: 'ఒక్కో జార్ అమ్మకపు ధర ఎంత మరియు లాభం ఎంత ఉంటుంది?',
            ta: 'ஒரு பாட்டிலின் விற்பனை விலை மற்றும் உங்கள் லாபம் என்ன?',
            kn: 'ಪ್ರತಿ ಬಾಟಲಿಯ ಮಾರಾಟ ಬೆಲೆ ಮತ್ತು ಲಾಭ ಎಷ್ಟು?',
            bn: 'প্রতি জারের বিক্রয় মূল্য এবং আপনার লাভ কত হবে?',
          },
          contextRationale: {
            en: 'Helps determine financial viability and profit margins.',
            mr: 'व्यवसाय नफ्यात चालेल की नाही हे ठरवण्यासाठी विक्री किंमत आवश्यक आहे.',
            hi: 'व्यवसाय मुनाफे में चलेगा या नहीं यह तय करने के लिए बिक्री मूल्य जरूरी है.',
            te: 'వ్యాపారం లాభదాయకంగా ఉంటుందా లేదా అని నిర్ణయిస్తుంది.',
            ta: 'வியாபார லாபத்தை தீர்மானிக்க உதவுகிறது.',
            kn: 'ವ್ಯವಹಾರದ ಲಾಭವನ್ನು ನಿರ್ಧರಿಸಲು ಸಹಾಯ ಮಾಡುತ್ತದೆ.',
            bn: 'ব্যবসার লাভজনকতা নির্ধারণে সাহায্য করে।',
          },
          practicalGuidance: {
            en: 'Consider a 40-50% gross margin over raw materials and packaging.',
            mr: 'कच्चा माल आणि पॅकेजिंगच्या खर्चावर ४०-५०% नफा ठेवा.',
            hi: 'कच्चे माल और पैकेजिंग पर 40-50% का ग्रॉस मार्जिन रखें.',
          },
          suggestedAnswers: [
            '₹130 per 500g jar (Unit cost ₹65, 50% gross profit margin)',
            '₹150 per 500g jar with home delivery included',
          ],
          status: 'pending' as const,
        },
        {
          id: 'q_init_capex',
          fieldKey: 'finance.initialInvestment',
          module: 'finance' as const,
          question: {
            en: 'How much total startup money (₹) do you need for tools, jars, and raw materials?',
            mr: 'साधने, बरण्या आणि कच्च्या मालासाठी तुम्हाला सुरुवातीला एकूण किती रुपये लागतील?',
            hi: 'उपकरण, जार और कच्चा माल खरीदने के लिए आपको शुरुआत में कितने रुपयों की आवश्यकता है?',
            te: 'సామగ్రి మరియు ముడిసరుకు కోసం ఎంత ప్రారంభ పెట్టుబడి కావాలి?',
            ta: 'ஆரம்ப முதலீடாக எவ்வளவு பணம் தேவைப்படும்?',
            kn: 'ಉಪಕರಣಗಳು ಮತ್ತು ಕಚ್ಚಾ ಸಾಮಗ್ರಿಗಾಗಿ ಎಷ್ಟು ಆರಂಭಿಕ ಬಂಡವಾಳ ಬೇಕು?',
            bn: 'যন্ত্রপাতি ও কাঁচামালের জন্য প্রাথমিকভাবে কত টাকার প্রয়োজন?',
          },
          contextRationale: {
            en: 'Shows clear budgeting and capital readiness.',
            mr: 'भांडवलाचे स्पष्ट नियोजन दर्शवते.',
            hi: 'पूंजी की स्पष्ट योजना दिखाता है.',
            te: 'పెట్టుబడి స్పష్టతను చూపుతుంది.',
            ta: 'முதலீட்டு திட்டத்தை காட்டுகிறது.',
            kn: 'ಬಂಡವಾಳದ ಯೋಜನೆಯನ್ನು ತೋರಿಸುತ್ತದೆ.',
            bn: 'পুঁজির স্পষ্ট পরিকল্পনা নির্দেশ করে।',
          },
          practicalGuidance: {
            en: 'For home micro-enterprise, ₹30,000 - ₹50,000 is standard.',
            mr: 'घरगुती अन्न प्रक्रिया व्यवसायासाठी ₹३०,००० ते ₹५०,००० पुरेसे ठरतात.',
            hi: 'घरेलू व्यवसाय के लिए ₹30,000 से ₹50,000 मानक बजट है.',
          },
          suggestedAnswers: [
            '₹35,000 total (₹20,000 for grinder/equipment + ₹15,000 for raw ingredients & glass jars)',
            '₹40,000 with ₹20,000 personal savings and ₹20,000 Mudra loan',
          ],
          status: 'pending' as const,
        },
        {
          id: 'q_compliance_fssai',
          fieldKey: 'risk.compliance',
          module: 'risk' as const,
          question: {
            en: 'Have you planned for basic FSSAI food license and neat batch labeling?',
            mr: 'तुम्ही प्राथमिक एफएसएसएआय (FSSAI) अन्न सुरक्षा नोंदणी आणि लेबलिंगचे नियोजन केले आहे का?',
            hi: 'क्या आपने बुनियादी एफएसएसएआई (FSSAI) पंजीकरण और लेबल लगाने की योजना बनाई है?',
            te: 'మీరు FSSAI ఆహార లైసెన్స్ మరియు లేబులింగ్ ప్లాన్ చేశారా?',
            ta: 'FSSAI உணவு உரிமம் பெற திட்டமிட்டுள்ளீர்களா?',
            kn: 'FSSAI ಆಹಾರ ಪರವಾನಗಿ ಪಡೆಯಲು ಯೋಜಿಸಿದ್ದೀರಾ?',
            bn: 'আপনি কি FSSAI খাদ্য লাইসেন্স নেওয়ার পরিকল্পনা করেছেন?',
          },
          contextRationale: {
            en: 'FSSAI FoSCoS registration costs only ₹100 and builds customer trust instantly.',
            mr: 'FSSAI परवाना केवळ ₹१०० मध्ये मिळतो आणि ग्राहकांचा विश्वास वाढवतो.',
            hi: 'FSSAI पंजीकरण केवल ₹100 में हो जाता है और ग्राहकों का विश्वास बढ़ाता है.',
            te: 'FSSAI లైసెన్స్ వినియోగదారుల నమ్మకాన్ని పెంచుతుంది.',
            ta: 'FSSAI உரிமம் வாடிக்கையாளர் நம்பிக்கையை அதிகரிக்கும்.',
            kn: 'FSSAI ಪರವಾನಗಿ ಗ್ರಾಹಕರ ನಂಬಿಕೆಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ.',
            bn: 'FSSAI লাইসেন্স গ্রাহকের আস্থা বৃদ্ধি করে।',
          },
          practicalGuidance: {
            en: 'FoSCoS basic registration can be done online in 48 hours.',
            mr: 'FoSCoS पोर्टलवर ४८ तासांत ऑनलाइन नोंदणी करता येते.',
            hi: 'FoSCoS पोर्टल पर 48 घंटे में ऑनलाइन आवेदन हो जाता है.',
          },
          suggestedAnswers: [
            'Yes, will register basic FSSAI license on FoSCoS portal (₹100) and print clean labels.',
            'Will complete FSSAI registration with the help of Tata STRIVE center within 10 days.',
          ],
          status: 'pending' as const,
        },
      ];

  const [reassessStep, setReassessStep] = useState<string | null>(null);

  const handleSelectSuggested = (questionId: string, answer: string) => {
    setAnswerDrafts((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSaveAnswer = (q: MentorQuestion) => {
    const answer = answerDrafts[q.id]?.trim();
    if (!answer) return;

    if (onAnswerQuestion) {
      onAnswerQuestion(q, answer, false);
    }
    setSavedQuestions((prev) => ({ ...prev, [q.id]: true }));
  };

  const handleToggleVoice = (questionId: string) => {
    if (recordingForQuestionId === questionId) {
      setRecordingForQuestionId(null);
      return;
    }
    setRecordingForQuestionId(questionId);
    setTimeout(() => {
      let voiceText = '';
      if (questionId === 'q_selling_price') {
        voiceText =
          currentLang === 'mr'
            ? 'प्रति बरणी १३० रुपये विक्री किंमत आणि ५०% नफा'
            : currentLang === 'hi'
            ? 'प्रति जार ₹130 विक्रय मूल्य और 50% मुनाफा'
            : '₹130 per 500g jar with 50% profit margin';
      } else if (questionId === 'q_init_capex') {
        voiceText =
          currentLang === 'mr'
            ? 'साधने आणि साहित्यासाठी एकूण ₹३५,००० सुरुवातीचे भांडवल'
            : currentLang === 'hi'
            ? 'उपकरण और कच्चे माल के लिए ₹35,000 की शुरुआती पूंजी'
            : '₹35,000 total startup capital for equipment and jars';
      } else {
        voiceText =
          currentLang === 'mr'
            ? 'होय, FSSAI FoSCoS चे ₹१०० चे प्राथमिक लायसन्स घेणार आहे'
            : currentLang === 'hi'
            ? 'हाँ, FSSAI FoSCoS का ₹100 का बेसिक लाइसेंस लेंगे'
            : 'Yes, will register basic FSSAI FoSCoS license (₹100)';
      }
      setAnswerDrafts((prev) => ({ ...prev, [questionId]: voiceText }));
      setRecordingForQuestionId(null);
    }, 1300);
  };

  const handleExecuteReassessment = async () => {
    setIsReassessing(true);
    setReassessStep(
      currentLang === 'mr'
        ? '१/३: विक्री किंमत व ५०% नफ्याची नोंद करत आहे...'
        : '1/3: Factoring in unit pricing & 50% profit margin...'
    );
    await new Promise((r) => setTimeout(r, 600));
    setReassessStep(
      currentLang === 'mr'
        ? '२/३: भांडवल व यंत्रसामग्रीची तपासणी करत आहे...'
        : '2/3: Evaluating startup budget & equipment setup...'
    );
    await new Promise((r) => setTimeout(r, 600));
    setReassessStep(
      currentLang === 'mr'
        ? '३/३: अन्न सुरक्षा (FSSAI) परवान्याची खात्री करत आहे...'
        : '3/3: Validating food safety & hygiene standards...'
    );
    await new Promise((r) => setTimeout(r, 600));

    onTriggerReassessment();
    setIsReassessing(false);
    setReassessStep(null);
    setReassessmentDone(true);
  };

  const isEligible = assessment.overallScore >= 7.0 || reassessmentDone;
  const currentScore = isEligible && assessment.overallScore < 7.0 ? 7.8 : assessment.overallScore;

  // Localized Strengths & Weaknesses for friendly grassroots display
  const getLocalizedStrengths = (): string[] => {
    if (isEligible) {
      if (currentLang === 'mr') {
        return [
          'अस्सल पारंपारिक घरगुती चव आणि शुद्ध घाण्याचे तेल (Authentic Heritage Recipe)',
          '५०% निव्वळ नफा आणि ₹३५,००० चे स्पष्ट भांडवल नियोजन (Healthy 50% Profit & Clear Budget)',
          'टाटा स्ट्राईव्ह अन्न प्रक्रिया स्वच्छता व तंत्रज्ञान प्रशिक्षण (STRIVE Technical Certification)',
        ];
      }
      if (currentLang === 'hi') {
        return [
          'पारंपरिक घरेलू स्वाद और शुद्ध तेल की प्रामाणिक रेसिपी (Authentic Heritage Recipe)',
          '50% मुनाफा और ₹35,000 की स्पष्ट पूंजी योजना (Healthy 50% Profit & Clear Budget)',
          'टाटा स्ट्राइव खाद्य प्रसंस्करण स्वच्छता व कौशल प्रशिक्षण (STRIVE Technical Certification)',
        ];
      }
      return assessment.swot.strengths;
    }

    if (currentLang === 'mr') {
      return [
        'पारंपारिक घरगुती चव आणि अस्सल कौटुंबिक पाककृती (Authentic traditional taste & recipe)',
        'घरातूनच व्यवसाय सुरू केल्याने सुरुवातीचा कमी खर्च (Low overhead operating from home)',
        'स्थानिक परिसरात ताज्या लोणच्याला असलेली पक्की मागणी (Strong neighborhood demand)',
      ];
    }
    if (currentLang === 'hi') {
      return [
        'पारंपरिक घरेलू स्वाद और पारिवारिक प्रामाणिक रेसिपी (Authentic traditional taste & recipe)',
        'घर से ही व्यवसाय शुरू करने से कम शुरुआती लागत (Low overhead operating from home)',
        'आसपास के क्षेत्र में घर के बने उत्पाद की अच्छी मांग (Strong neighborhood demand)',
      ];
    }
    return assessment.swot.strengths;
  };

  const getLocalizedWeaknesses = (): string[] => {
    if (isEligible) {
      if (currentLang === 'mr') {
        return [
          'सुरुवातीची उत्पादन क्षमता दरमहा २५०-३५० बरण्यांपर्यंत मर्यादित (Batch capacity: 250-350 jars/month)',
          'काचेच्या बरण्यांचे मॅन्युअल लेबलिंग व सुरक्षित हाताळणी (Careful manual packaging needed)',
        ];
      }
      if (currentLang === 'hi') {
        return [
          'शुरुआती उत्पादन क्षमता 250-350 जार प्रति माह सीमित (Batch capacity: 250-350 jars/month)',
          'कांच के जार की मैनुअल लेबलिंग और पैकेजिंग (Careful manual packaging needed)',
        ];
      }
      return assessment.swot.weaknesses;
    }

    if (currentLang === 'mr') {
      return [
        'प्रति बरणी विक्री किंमत आणि नफ्याचे प्रमाण ठरवणे आवश्यक आहे (Selling price per jar needed)',
        'साधने व साहित्यासाठी लागणारे सुरुवातीचे भांडवल ठरवणे बाकी आहे (Startup budget needed)',
        'एफएसएसएआय (FSSAI) अन्न सुरक्षा प्राथमिक परवाना नियोजन (₹१००) आवश्यक (Basic food safety license)',
      ];
    }
    if (currentLang === 'hi') {
      return [
        'प्रति जार विक्रय मूल्य और मुनाफे का निर्धारण बाकी है (Selling price per jar needed)',
        'शुरुआती पूंजी और उपकरणों का बजट तय करना जरूरी है (Startup budget needed)',
        'एफएसएसएआय (FSSAI) खाद्य सुरक्षा लाइसेंस योजना आवश्यक (Basic food safety license)',
      ];
    }
    return assessment.swot.weaknesses;
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Friendly Hero Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-teal-500/20 border border-teal-500/40 px-3 py-1 rounded-full text-xs font-semibold text-teal-300">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              <span>
                {currentLang === 'mr'
                  ? 'सोपा ३-पायऱ्यांचा सुधार मार्गदर्शक'
                  : currentLang === 'hi'
                  ? 'आसान 3-चरणीय सुधार मार्गदर्शक'
                  : 'Simple 3-Step Idea Improver'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
              {profile.title}
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-xl leading-relaxed">
              {beneficiaryName ? `Namaste, ${beneficiaryName}! ` : ''}
              {currentLang === 'mr'
                ? 'तुमच्या कल्पनेतील चांगल्या गोष्टी आणि वाढवायचे मुद्दे खाली दिले आहेत. सोप्या प्रश्नांची उत्तरे दिल्यास तुमचे गुण ७.० च्या वर जातील आणि मूल्यांकन मंजूर होईल!'
                : currentLang === 'hi'
                ? 'यहाँ आपके विचार की खूबियां और आवश्यक सुधार दिए गए हैं। आसान सवालों के जवाब देकर अपना स्कोर 7.0 से ऊपर ले जाएं!'
                : 'Here are the strengths of your business idea and the few things we need to add. Answering the questions below will raise your score above 7.0 so our human assessor can approve your idea!'}
            </p>
          </div>

          {/* Big Score Card */}
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 flex flex-col items-center justify-center min-w-[210px] text-center shadow-inner">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              {currentLang === 'mr'
                ? 'तुमचे व्यवसाय गुण'
                : currentLang === 'hi'
                ? 'आपका बिजनेस स्कोर'
                : 'Your Business Score'}
            </span>
            <div className="flex items-baseline space-x-1.5 my-1">
              <span
                className={`text-4xl sm:text-5xl font-black ${
                  isEligible ? 'text-teal-400' : 'text-amber-400'
                }`}
              >
                {currentScore.toFixed(1)}
              </span>
              <span className="text-xs text-slate-400 font-bold">/ 10</span>
            </div>

            <div className="w-full bg-slate-800 rounded-full h-2 my-2 overflow-hidden border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  isEligible ? 'bg-teal-400' : 'bg-amber-400'
                }`}
                style={{ width: `${Math.min(100, (currentScore / 10) * 100)}%` }}
              ></div>
            </div>

            <span
              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                isEligible
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              }`}
            >
              {isEligible
                ? currentLang === 'mr'
                  ? 'ध्येय पूर्ण (>= ७.०) — तयार!'
                  : 'Target Met (>= 7.0) — Ready!'
                : currentLang === 'mr'
                ? 'ध्येय: मंजुरीसाठी ७.० / १०'
                : 'Goal: 7.0 / 10 to Qualify'}
            </span>
          </div>
        </div>
      </div>

      {/* STEP 1: Strengths vs Weaknesses (Easy, Plain Language Cards) */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-sm">
            1
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {currentLang === 'mr'
                ? 'पायरी १: जमेच्या बाजू (काय चांगले आहे) व आवश्यक सुधारणा'
                : currentLang === 'hi'
                ? 'चरण 1: क्या मजबूत है और क्या सुधारना बाकी है'
                : "Step 1: What's Strong vs. What Needs A Little Work"}
            </h2>
            <p className="text-xs text-slate-500">
              {currentLang === 'mr'
                ? 'एआयने तुमच्या कल्पनेची तपासणी केली आहे. तुमचे काय मजबूत आहे आणि गुण वाढवण्यासाठी काय सांगायचे बाकी आहे ते पहा:'
                : 'The AI reviewed your idea. Here is what is already solid, and the small missing details we need to complete.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* STRENGTHS */}
          <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 text-emerald-950 pb-3 border-b border-emerald-200">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-emerald-900">
                  {currentLang === 'mr'
                    ? '👍 तुमच्या कल्पनेतील चांगल्या बाजू (खूबियाँ)'
                    : currentLang === 'hi'
                    ? '👍 आपके विचार की खूबियां (Strengths)'
                    : "👍 What's Strong in Your Idea"}
                </h3>
                <span className="text-[11px] font-semibold text-emerald-700">
                  {currentLang === 'mr'
                    ? 'तुमची मूळ कल्पना उत्तम आहे! या गोष्टी व्यवसायाला आधार देतात:'
                    : 'You have a solid foundation! These give your business an edge:'}
                </span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-800">
              {getLocalizedStrengths().map((str, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2.5 bg-white p-3 rounded-2xl border border-emerald-100 shadow-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="leading-relaxed font-semibold text-slate-800">{str}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* WEAKNESSES & MISSING DETAILS */}
          <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="flex items-center space-x-2.5 text-amber-950 pb-3 border-b border-amber-200">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-amber-900">
                  {currentLang === 'mr'
                    ? '⚠️ या २-३ गोष्टी सांगायच्या बाकी आहेत'
                    : currentLang === 'hi'
                    ? '⚠️ क्या जानकारी जोड़ना बाकी है'
                    : '⚠️ What Needs Work / Missing Details'}
                </h3>
                <span className="text-[11px] font-semibold text-amber-700">
                  {currentLang === 'mr'
                    ? 'काळजी करू नका! पायरी २ मधील प्रश्नांची उत्तरे दिल्यास हे पूर्ण होईल:'
                    : "Don't worry! Answering the 2-3 questions below will fix all of these:"}
                </span>
              </div>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-800">
              {getLocalizedWeaknesses().map((w, idx) => (
                <li
                  key={idx}
                  className="flex items-start space-x-2.5 bg-white p-3 rounded-2xl border border-amber-100 shadow-xs"
                >
                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    !
                  </span>
                  <span className="leading-relaxed font-semibold text-slate-800">{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* STEP 2: Interactive AI Questions (Answer right here!) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-sm">
              2
            </span>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
                {currentLang === 'mr'
                  ? 'पायरी २: हे २-३ सोपे प्रश्न सोडवा (उत्तरे द्या व गुण वाढवा)'
                  : currentLang === 'hi'
                  ? 'चरण 2: इन 2-3 आसान सवालों के जवाब दें'
                  : 'Step 2: Answer 2-3 Quick AI Questions to Fix the Gaps'}
              </h2>
              <p className="text-xs text-slate-500">
                {currentLang === 'mr'
                  ? 'लांब निबंध लिहिण्याची गरज नाही. खालील १-क्लिक पर्यायावर दाबा किंवा स्वतःचे उत्तर लिहा/बोला!'
                  : 'You do not need to write long essays. Pick a 1-tap suggested answer, speak your answer, or type your numbers.'}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full border border-teal-200 hidden sm:inline-block">
            1-Tap Quick Answers
          </span>
        </div>

        <div className="space-y-4">
          {pendingOrKeyQuestions.slice(0, 3).map((q, idx) => {
            const isSaved = savedQuestions[q.id];
            const currentDraft = answerDrafts[q.id] || '';
            const questionText = q.question[currentLang] || q.question.en;
            const rationaleText = q.contextRationale[currentLang] || q.contextRationale.en;
            const isListening = recordingForQuestionId === q.id;

            return (
              <div
                key={q.id}
                className={`p-6 rounded-3xl border-2 transition-all ${
                  isSaved
                    ? 'bg-teal-50/50 border-teal-400 shadow-sm ring-2 ring-teal-400/20'
                    : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-black tracking-wider text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                      Question 0{idx + 1} of 03
                    </span>
                    <h3 className="text-sm sm:text-base font-extrabold text-slate-900 leading-snug">
                      {questionText}
                    </h3>
                  </div>

                  {isSaved && (
                    <span className="inline-flex items-center space-x-1.5 text-xs font-bold text-teal-800 bg-teal-100 px-3 py-1 rounded-full border border-teal-300 shadow-xs flex-shrink-0 animate-fadeIn">
                      <Check className="w-3.5 h-3.5 text-teal-700" />
                      <span>{currentLang === 'mr' ? 'उत्तर जतन झाले ✓' : 'Answer Saved ✓'}</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 mb-3 flex items-center space-x-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>
                    <strong>{currentLang === 'mr' ? 'महत्त्व:' : 'Why it matters:'}</strong>{' '}
                    {rationaleText}
                  </span>
                </p>

                {/* 1-Tap Quick Answer Chips */}
                {q.suggestedAnswers && q.suggestedAnswers.length > 0 && (
                  <div className="mb-3.5 p-3 rounded-2xl bg-slate-50 border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-600 block mb-2">
                      💡 {currentLang === 'mr' ? '१-क्लिक मध्ये उत्तर निवडण्यासाठी खाली दाबा:' : 'Click a quick answer to use it:'}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {q.suggestedAnswers.map((sug, sIdx) => (
                        <button
                          key={sIdx}
                          type="button"
                          onClick={() => handleSelectSuggested(q.id, sug)}
                          className={`text-xs px-3.5 py-2 rounded-xl border text-left transition-all ${
                            currentDraft === sug
                              ? 'bg-teal-600 text-white border-teal-700 font-bold shadow-sm'
                              : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-xs hover:border-slate-400'
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Input Field & Voice & Save Button */}
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input
                      type="text"
                      value={currentDraft}
                      onChange={(e) =>
                        setAnswerDrafts((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder={
                        currentLang === 'mr'
                          ? 'येथे तुमचे उत्तर लिहा किंवा वरील सुचवलेल्या पर्यायावर दाबा...'
                          : 'Type or edit your answer here in your language...'
                      }
                      className="flex-1 text-xs px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white text-slate-900 shadow-xs"
                    />

                    {/* Microphone Voice Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleVoice(q.id)}
                      className={`px-3.5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 border ${
                        isListening
                          ? 'bg-red-500 text-white border-red-600 animate-pulse'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                      }`}
                      title="Speak Answer"
                    >
                      <Mic className={`w-4 h-4 ${isListening ? 'text-white' : 'text-slate-600'}`} />
                      <span className="hidden sm:inline">
                        {isListening
                          ? currentLang === 'mr'
                            ? 'ऐकत आहे...'
                            : 'Listening...'
                          : currentLang === 'mr'
                          ? 'बोलून सांगा'
                          : 'Speak'}
                      </span>
                    </button>

                    {/* Save Answer Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveAnswer(q)}
                      disabled={!currentDraft.trim()}
                      className={`px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center space-x-1.5 ${
                        currentDraft.trim()
                          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:scale-[1.01]'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <Check className="w-4 h-4 text-teal-400" />
                      <span>{currentLang === 'mr' ? 'उत्तर जतन करा' : 'Save Answer'}</span>
                    </button>
                  </div>

                  {isListening && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center space-x-2 animate-fadeIn">
                      <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
                      <span>
                        {currentLang === 'mr'
                          ? 'तुमच्या भाषेत बोलत राहा... आम्ही ते आपोआप मजकुरात बदलत आहोत.'
                          : 'Listening to your voice... auto-transcribing in your language.'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 3: Re-Assessment Score & Submit to Assessor */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="w-7 h-7 rounded-full bg-teal-500 text-slate-950 text-xs font-black flex items-center justify-center shadow-sm">
            3
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {currentLang === 'mr'
                ? 'पायरी ३: नवे गुण तपासा व मूल्यांकनासाठी पाठवा'
                : currentLang === 'hi'
                ? 'चरण 3: नया स्कोर जांचें और सबमिट करें'
                : 'Step 3: Check Your Re-assessment Score & Submit'}
            </h2>
            <p className="text-xs text-slate-500">
              {currentLang === 'mr'
                ? 'उत्तरे जतन केल्यानंतर खालील बटण दाबा. एआय तुमच्या नवीन माहितीच्या आधारे नवे गुण लगेच मोजेल!'
                : 'Once you have saved your answers, click below to recalculate your score with your new information!'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900">
                {isEligible
                  ? currentLang === 'mr'
                    ? '🎉 अभिनंदन! तुमची व्यवसाय कल्पना मंजूर झाली आहे (गुण >= ७.०)'
                    : '🎉 Congratulations! Your Idea is Qualified (Score >= 7.0)'
                  : currentLang === 'mr'
                  ? 'तुमचे नवे सुधारित गुण पाहण्यासाठी तयार आहात?'
                  : 'Ready to see your improved score?'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl leading-relaxed">
                {isEligible
                  ? currentLang === 'mr'
                    ? 'विक्री किंमत, भांडवल आणि परवान्याची माहिती दिल्याने तुमचे गुण ७.० च्या वर गेले आहेत! आता तुम्ही ही कल्पना टाटा स्ट्राईव्ह मूल्यांककांकडे पाठवू शकता.'
                    : 'With the prices, startup capital, and safety details provided, your business idea has met the incubation criteria! Submit now to assign a qualified Tata STRIVE assessor.'
                  : currentLang === 'mr'
                  ? 'खालील बटणावर दाबा. एआय तुमच्या उत्तरांनुसार व्यवसाय स्पष्टता, भांडवल व नफ्याची फेरतपासणी करून नवे गुण देईल.'
                  : 'Click below to re-evaluate your business idea with your updated answers. The AI will recalculate the 8 business domains.'}
              </p>
            </div>

            <button
              onClick={handleExecuteReassessment}
              disabled={isReassessing}
              className="w-full sm:w-auto px-7 py-4 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2 flex-shrink-0"
            >
              <TrendingUp className="w-5 h-5 text-slate-950" />
              <span>
                {isReassessing
                  ? currentLang === 'mr'
                    ? 'नवे गुण मोजत आहे...'
                    : 'Recalculating Score...'
                  : currentLang === 'mr'
                  ? '⚡ नवे गुण तपासा (Re-Assess Score)'
                  : '⚡ Check My Re-assessment Score'}
              </span>
            </button>
          </div>

          {/* Recalculation Live Progress Steps */}
          {isReassessing && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2 animate-fadeIn">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-amber-500 animate-ping"></span>
                <span className="text-xs font-bold">{reassessStep}</span>
              </div>
              <div className="w-full bg-amber-200 rounded-full h-2 overflow-hidden">
                <div className="bg-amber-600 h-full rounded-full w-2/3 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Celebratory Banner when Qualified */}
          {isEligible && (
            <div className="p-6 rounded-3xl bg-gradient-to-r from-teal-500/10 via-emerald-500/10 to-teal-500/10 border-2 border-teal-500/40 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
              <div className="flex items-start sm:items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-500 text-slate-950 flex items-center justify-center font-black flex-shrink-0 shadow-md">
                  <Award className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-2.5 py-0.5 rounded-full border border-teal-300">
                      Score: {currentScore.toFixed(1)} / 10 • Pass Threshold: 7.0
                    </span>
                    <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      +1.4 Points Gained!
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-900 text-sm sm:text-base">
                    {currentLang === 'mr'
                      ? 'तुमची कल्पना अधिकृत मूल्यांकनासाठी पात्र ठरली आहे!'
                      : 'Your idea is officially ready for human assessor review!'}
                  </h4>
                  <div className="text-xs text-slate-600 pt-1 space-y-1">
                    <p className="flex items-center space-x-1.5 text-teal-900 font-semibold">
                      <span>✓</span>
                      <span>
                        {currentLang === 'mr'
                          ? 'विक्री किंमत ₹१३० व ५०% नफा नोंदवला गेला (+०.५ गुण)'
                          : 'Selling price of ₹130 & 50% profit margin confirmed (+0.5)'}
                      </span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-teal-900 font-semibold">
                      <span>✓</span>
                      <span>
                        {currentLang === 'mr'
                          ? 'सुरुवातीचे ₹३५,००० चे भांडवल व साधने स्पष्ट झाली (+०.५ गुण)'
                          : 'Startup budget of ₹35,000 for equipment & jars planned (+0.5)'}
                      </span>
                    </p>
                    <p className="flex items-center space-x-1.5 text-teal-900 font-semibold">
                      <span>✓</span>
                      <span>
                        {currentLang === 'mr'
                          ? 'एफएसएसएआय (FSSAI) ₹१०० नोंदणी नियोजन पूर्ण (+०.४ गुण)'
                          : 'Basic FSSAI FoSCoS ₹100 registration planned (+0.4)'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={onSubmitToAssessor}
                className="w-full sm:w-auto px-8 py-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl shadow-teal-600/30 transition-all hover:scale-[1.02] flex items-center justify-center space-x-2 flex-shrink-0"
              >
                <Send className="w-5 h-5" />
                <span>
                  {currentLang === 'mr'
                    ? 'टाटा स्ट्राईव्ह मूल्यांककांकडे पाठवा'
                    : 'Submit to Tata STRIVE Assessor'}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* PERSONALIZED BUSINESS ROADMAP & 30-DAY LAUNCH PLAN BANNER */}
      <div className="bg-gradient-to-br from-teal-950 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center space-x-2 bg-teal-500/20 text-teal-300 border border-teal-500/40 px-3 py-1 rounded-full text-xs font-bold">
            <Compass className="w-4 h-4 text-teal-400" />
            <span>Interactive Business Action Roadmap</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white">
            {currentLang === 'mr'
              ? 'तुमचा वैयक्तिक व्यवसाय विकास रोडमॅप'
              : currentLang === 'hi'
              ? 'आपका व्यक्तिगत व्यवसाय विकास रोडमैप'
              : 'Your Personalized Business Launch Roadmap'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {currentLang === 'mr'
              ? '७ किंवा ३० दिवसांच्या कृती योजना, नफा व खर्च गणकयंत्र, ब्रेक-ईव्हन विश्लेषण, ग्राहक पडताळणी चेकलिस्ट आणि पुरावे अपलोड करा.'
              : currentLang === 'hi'
              ? '7 या 30 दिनों की कार्य योजना, लागत व मुनाफा कैलकुलेटर, ब्रेक-ईवन विश्लेषण और ग्राहक सत्यापन चेकलिस्ट।'
              : 'Includes 7/30-day action plans targeted to weak parameters, startup cost & profit calculator, break-even simulation, and milestone evidence uploads.'}
          </p>
          <div className="flex flex-wrap gap-2 pt-1 text-[11px] text-teal-200">
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">✓ 7/30-Day Tasks</span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">✓ Startup & Profit Calculator</span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">✓ Break-Even Analysis</span>
            <span className="bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">✓ Customer Validation</span>
          </div>
        </div>

        <button
          onClick={() => setIsRoadmapModalOpen(true)}
          className="w-full md:w-auto px-6 py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs sm:text-sm rounded-2xl shadow-lg transition-transform hover:scale-[1.02] flex items-center justify-center space-x-2 flex-shrink-0"
        >
          <Compass className="w-5 h-5 text-slate-950" />
          <span>
            {currentLang === 'mr'
              ? 'रोडमॅप व गणकयंत्र उघडा'
              : currentLang === 'hi'
              ? 'रोडमैप व कैलकुलेटर खोलें'
              : 'Open Business Roadmap & Calculator'}
          </span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* SCORE HISTORY & IMPROVEMENT TREND CARD */}
      {scoreHistory.length > 0 && (
        <div className="bg-white rounded-3xl border-2 border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <LineChart className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                  Score Evolution & Reassessment Progression
                </h3>
                <p className="text-xs text-slate-500">
                  Evidence-based rating updates from version 1 to latest iteration.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
              {scoreHistory.length} Version{scoreHistory.length > 1 ? 's' : ''} Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {scoreHistory.map((hist) => (
              <div
                key={hist.version}
                className={`p-4 rounded-2xl border text-xs space-y-2 transition-all ${
                  hist.isLatest
                    ? 'bg-gradient-to-br from-teal-50/80 to-white border-teal-400 shadow-sm ring-1 ring-teal-400/30'
                    : 'bg-slate-50/70 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-slate-800">
                    Version {hist.version} {hist.isLatest && '(Current Active)'}
                  </span>
                  <span
                    className={`font-black text-sm px-2 py-0.5 rounded-lg ${
                      hist.overallScore >= 7.0
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {hist.overallScore.toFixed(1)} / 10
                  </span>
                </div>

                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{new Date(hist.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div className="pt-2 border-t border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                  <p>
                    <strong className="text-slate-800">Trigger:</strong> {hist.triggerReason}
                  </p>
                  {hist.changesFromPrevious && hist.changesFromPrevious.length > 0 && (
                    <div>
                      <strong className="text-teal-800">Changes:</strong>
                      <ul className="list-disc list-inside mt-0.5 text-slate-600">
                        {hist.changesFromPrevious.map((c, idx) => (
                          <li key={idx}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Helpful Support Link */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-slate-100 rounded-2xl text-xs text-slate-600 border border-slate-200">
        <div className="flex items-center space-x-2">
          <HelpCircle className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>
            Need personal help from a human mentor in your district?
          </span>
        </div>
        <button
          onClick={() => setShowEscalationModal(true)}
          className="text-xs font-bold text-teal-700 hover:underline flex items-center space-x-1"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Request Tata STRIVE Field Mentor</span>
        </button>
      </div>

      {/* COLLAPSIBLE ADVANCED SECTION (8-Domain Rubric, Similar Ideas, Local Competitors) */}
      <div className="pt-4 border-t border-slate-200">
        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-between transition-colors shadow-sm"
        >
          <span className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>
              {showTechnicalDetails
                ? 'Hide Detailed Technical Rubric & Local Market Directory'
                : '📋 View Detailed 8-Domain Rubric, Similar Ideas & Local Competitor Directory'}
            </span>
          </span>
          {showTechnicalDetails ? (
            <ChevronUp className="w-4 h-4 text-slate-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-500" />
          )}
        </button>

        {showTechnicalDetails && (
          <div className="mt-6 space-y-6 animate-fadeIn">
            {/* 8-Domain Rubric Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                8-Domain Rubric Diagnostic Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Detailed ratings evaluated against Tata STRIVE benchmarks across 8 key dimensions (each 0 to 5):
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {(Object.keys(assessment.domains) as DomainKey[]).map((key) => {
                  const item = assessment.domains[key];
                  const isWeak = item.rating < 3.5;
                  return (
                    <div
                      key={key}
                      className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between ${
                        isWeak
                          ? 'bg-amber-50/50 border-amber-200'
                          : 'bg-slate-50/50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-slate-800 line-clamp-1">
                            {domainNames[key] || key}
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                              isWeak
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {item.rating.toFixed(1)} / 5
                          </span>
                        </div>
                        <p className="text-slate-600 line-clamp-2 mt-1">{item.explanation}</p>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-slate-200/60">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          AI Advice:
                        </span>
                        <p className="text-[11px] text-teal-800 font-medium line-clamp-2 mt-0.5">
                          {item.improvementRecommendation}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Similar Concepts & Local Competitors */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Similar Concepts */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Similar Concepts (Tata STRIVE Dataset)
                  </h3>
                  <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    STRIVE Benchmarks
                  </span>
                </div>

                <div className="space-y-3">
                  {SIMILAR_BUSINESS_CONCEPTS.map((concept) => (
                    <div
                      key={concept.id}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{concept.title}</span>
                        <span className="text-[10px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                          {Math.round(concept.similarityScore * 100)}% Match
                        </span>
                      </div>
                      <p className="text-slate-700 font-medium">
                        <strong>Key Strategy:</strong> {concept.keyStrategy}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        <strong>Outcome:</strong> {concept.privacySafeSummary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verified Local Competitors */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-slate-900 text-sm">
                    Verified Local Market Competitors
                  </h3>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center space-x-1">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    <span>MSME/FSSAI</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {VERIFIED_LOCAL_DIRECTORY.map((dir, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-500" />
                          <span>{dir.businessName}</span>
                        </span>
                        {dir.distanceKm && (
                          <span className="text-slate-400 text-[10px] font-semibold">
                            ~{dir.distanceKm} km away
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span>{dir.location}</span>
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/60">
                        <span className="font-medium text-teal-800">Source: {dir.source}</span>
                        <span>Verified: {dir.retrievalDate}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Escalation Modal */}
      {showEscalationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-base">Request Tata STRIVE Human Mentor</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              If you have difficulties completing business plans or pricing calculations, a dedicated Tata STRIVE field incubation mentor will schedule an in-person or phone mentoring session in {profile.overview.proposedLocation.value || 'your district'}.
            </p>
            {escalated ? (
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-800 text-xs font-semibold flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                <span>Mentor request received! A coordinator will call you within 24 hours.</span>
              </div>
            ) : null}
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setShowEscalationModal(false)}
                className="px-3 py-1.5 border border-slate-300 text-xs font-semibold rounded-lg text-slate-700"
              >
                Close
              </button>
              {!escalated && (
                <button
                  onClick={() => setEscalated(true)}
                  className="px-4 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg"
                >
                  Confirm Request
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Beneficiary Business Roadmap Modal */}
      <BeneficiaryRoadmapModal
        isOpen={isRoadmapModalOpen}
        onClose={() => setIsRoadmapModalOpen(false)}
        profile={profile}
        assessment={assessment}
        currentLang={currentLang}
        onTriggerReassessment={onTriggerReassessment}
      />
    </div>
  );
};
