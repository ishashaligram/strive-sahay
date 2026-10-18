import i18next from 'i18next';
import {initReactI18next} from 'react-i18next';
import {translations} from './i18n';
import {STATIC_RESOURCES} from './frontendCopy';
import {SupportedLanguage} from '../types';
const labels={
en:['Business readiness workspace','Submit structured business information','Confirm supported fields','Generate business plan','Download / Save PDF','Financial feasibility','Request human clarification assistance','Get AI domain assessment','Generate 30-day roadmap','Local business insights','To be confirmed','Save','Your answer','Preferred language','Business plan','No verified live market data available'],
hi:['व्यवसाय तैयारी कार्यक्षेत्र','व्यवसाय की जानकारी भरें','समर्थित जानकारी की पुष्टि करें','व्यवसाय योजना बनाएं','डाउनलोड / PDF सहेजें','वित्तीय व्यवहार्यता','मानव मार्गदर्शन का अनुरोध करें','एआई मूल्यांकन प्राप्त करें','30 दिनों की कार्ययोजना बनाएं','स्थानीय व्यवसाय की जानकारी','पुष्टि करना बाकी है','सहेजें','आपका उत्तर','पसंदीदा भाषा','व्यवसाय योजना','सत्यापित स्थानीय बाजार डेटा उपलब्ध नहीं है'],
mr:['व्यवसाय तयारी कार्यक्षेत्र','व्यवसायाची माहिती भरा','माहितीची पुष्टी करा','व्यवसाय आराखडा तयार करा','डाउनलोड / PDF जतन करा','आर्थिक व्यवहार्यता','मानवी मार्गदर्शनाची विनंती करा','एआय मूल्यमापन मिळवा','३० दिवसांचा कृती आराखडा','स्थानिक व्यवसाय माहिती','पुष्टी करणे बाकी आहे','जतन करा','तुमचे उत्तर','पसंतीची भाषा','व्यवसाय आराखडा','सत्यापित स्थानिक बाजार माहिती उपलब्ध नाही'],
te:['వ్యాపార సంసిద్ధత వేదిక','వ్యాపార వివరాలను నమోదు చేయండి','వివరాలను నిర్ధారించండి','వ్యాపార ప్రణాళిక రూపొందించండి','డౌన్‌లోడ్ / PDF సేవ్ చేయండి','ఆర్థిక సాధ్యత','మానవ మార్గదర్శకత్వం కోరండి','ఏఐ మూల్యాంకనం పొందండి','30 రోజుల కార్యాచరణ ప్రణాళిక','స్థానిక వ్యాపార సమాచారం','నిర్ధారించాలి','సేవ్ చేయండి','మీ సమాధానం','ప్రాధాన్య భాష','వ్యాపార ప్రణాళిక','ధృవీకరించిన స్థానిక మార్కెట్ డేటా అందుబాటులో లేదు'],
ta:['வணிகத் தயார்நிலை பணித்தளம்','வணிக விவரங்களை உள்ளிடவும்','விவரங்களை உறுதிப்படுத்தவும்','வணிகத் திட்டத்தை உருவாக்கவும்','பதிவிறக்கம் / PDF சேமிக்கவும்','நிதி சாத்தியக்கூறு','மனித வழிகாட்டுதல் கோரவும்','AI மதிப்பீடு பெறவும்','30 நாள் செயல் திட்டம்','உள்ளூர் வணிகத் தகவல்கள்','உறுதிப்படுத்த வேண்டும்','சேமிக்கவும்','உங்கள் பதில்','விருப்ப மொழி','வணிகத் திட்டம்','சரிபார்க்கப்பட்ட உள்ளூர் சந்தைத் தரவு இல்லை'],
kn:['ವ್ಯಾಪಾರ ಸಿದ್ಧತೆ ಕಾರ್ಯಕ್ಷೇತ್ರ','ವ್ಯಾಪಾರ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ','ವಿವರಗಳನ್ನು ದೃಢೀಕರಿಸಿ','ವ್ಯಾಪಾರ ಯೋಜನೆ ರಚಿಸಿ','ಡೌನ್‌ಲೋಡ್ / PDF ಉಳಿಸಿ','ಹಣಕಾಸಿನ ಕಾರ್ಯಸಾಧ್ಯತೆ','ಮಾನವ ಮಾರ್ಗದರ್ಶನ ಕೋರಿರಿ','AI ಮೌಲ್ಯಮಾಪನ ಪಡೆಯಿರಿ','30 ದಿನಗಳ ಕ್ರಿಯಾ ಯೋಜನೆ','ಸ್ಥಳೀಯ ವ್ಯಾಪಾರ ಮಾಹಿತಿ','ದೃಢೀಕರಿಸಬೇಕಿದೆ','ಉಳಿಸಿ','ನಿಮ್ಮ ಉತ್ತರ','ಆದ್ಯತೆಯ ಭಾಷೆ','ವ್ಯಾಪಾರ ಯೋಜನೆ','ಪರಿಶೀಲಿಸಿದ ಸ್ಥಳೀಯ ಮಾರುಕಟ್ಟೆ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ'],
bn:['ব্যবসা প্রস্তুতির কর্মক্ষেত্র','ব্যবসার তথ্য লিখুন','তথ্য নিশ্চিত করুন','ব্যবসায়িক পরিকল্পনা তৈরি করুন','ডাউনলোড / PDF সংরক্ষণ করুন','আর্থিক সম্ভাব্যতা','মানবিক সহায়তা অনুরোধ করুন','এআই মূল্যায়ন পান','৩০ দিনের কর্মপরিকল্পনা','স্থানীয় ব্যবসার তথ্য','নিশ্চিত করা বাকি','সংরক্ষণ করুন','আপনার উত্তর','পছন্দের ভাষা','ব্যবসায়িক পরিকল্পনা','যাচাইকৃত স্থানীয় বাজার তথ্য অনুপলব্ধ']
};
const keys=['workspace','structured','confirmFacts','generatePlan','pdf','financials','escalate','aiScore','roadmap','insights','unconfirmed','save','answer','language','plan','noMarketData'];
const resources=Object.fromEntries(Object.entries(labels).map(([lang,values])=>[lang,{translation:{...translations[lang as SupportedLanguage],...STATIC_RESOURCES[lang as SupportedLanguage],...Object.fromEntries(keys.map((key,index)=>[key,values[index]]))}}]));
void i18next.use(initReactI18next).init({resources,lng:'en',fallbackLng:'en',keySeparator:false,interpolation:{escapeValue:false}});
export function ui(language:SupportedLanguage){return i18next.getFixedT(language);}
export default i18next;

export function knownText(text:string,language:SupportedLanguage){
 const t=ui(language);
 const statuses:Record<string,string>={PROVIDED:'Supported',MISSING:'Missing',UNCLEAR:'Unclear',CONFLICTING:'Conflicting',UNKNOWN:'Unknown',evidence_submitted:'Submitted',pending:'Pending',answered:'Answered',unknown:'Unknown',PROVISIONAL:'Provisional',FINAL:'Final',low:'Low',expected:'Expected',high:'High'};
 const key=statuses[text]||text;
 return t(key,{defaultValue:text});
}

export function workflowLabel(state:string,language:SupportedLanguage){
 const labels:Record<string,string>={DRAFT:'Submit idea',EXTRACTED:'Review facts',PROVISIONALLY_SCORED:'Assessment',CLARIFICATION:'Clarify',FINAL_SCORED:'Final',READY_FOR_ASSESSOR:'Human review',SUBMITTED:'Submitted',CLARIFICATION_REQUIRED:'Needs clarification',AWAITING_BENEFICIARY:'Pending',ADMIN_REVIEW:'Program decision',PROGRAM_DECIDED:'Program decision',MENTORING_REQUIRED:'Further mentoring required'};
 return ui(language)(labels[state]||state);
}
export function recommendationLabel(value:string,language:SupportedLanguage){
 const labels:Record<string,string>={FURTHER_MENTORING_REQUIRED:'Further mentoring required',PILOT_VALIDATION_RECOMMENDED:'Pilot / market validation recommended',BUSINESS_LAUNCH_READY:'Business launch ready',INVESTMENT_READINESS_REVIEW_RECOMMENDED:'Investment-readiness review recommended'};
 return ui(language)(labels[value]||value);
}
export function decisionLabel(value:string,language:SupportedLanguage){
 const labels:Record<string,string>={APPROVE_RECOMMENDATION:'Approve recommendation',RETURN_FOR_CLARIFICATION:'Return for clarification',RETURN_FOR_MENTORING:'Return for mentoring',REJECT_WITH_REASON:'Reject with reason'};
 return ui(language)(labels[value]||value);
}
export function financialLabel(value:string,language:SupportedLanguage){
 const labels:Record<string,string>={startupCosts:'Startup costs',fundingGap:'Funding gap',unitContribution:'Unit contribution',monthlyRevenue:'Estimated monthly revenue',monthlyVariableCosts:'Monthly variable costs',monthlyOperatingCosts:'Monthly operating costs',estimatedMonthlyProfit:'Estimated monthly profit',breakEvenQuantity:'Break-even quantity'};
 return ui(language)(labels[value]||value);
}


export function planHeading(title:string,language:SupportedLanguage){
 const t=ui(language);
 const headings:Record<string,string[]>={'Executive summary':['Overview'],'Business idea and problem':['field_productService','field_customerProblem'],'Product or service':['field_productService'],'Target customers':['field_targetCustomers'],'Market and competitors':['Market','field_competition'],'Unique selling proposition':['field_differentiation'],'Marketing and customer acquisition':['field_salesChannels'],'Operations and resources':['Operations','field_equipment'],'Startup investment':['field_initialInvestment'],'Monthly costs and revenue':['field_monthlyExpenses','field_revenueAssumptions'],'Profit and break-even scenarios':['Estimated monthly profit','Break-even quantity'],'Risks and mitigation':['Risk','field_mitigation'],'Funding and use of funds':['field_requestedFunding'],'Business launch roadmap':['Business readiness journey'],'Mentoring recommendations':['AI suggestions'],'Missing information and assumptions':['Remaining unknowns','Beneficiary estimate']};
 return headings[title]?.map(key=>t(key)).join(' / ')||title;
}

const simpleCopy:Record<string,[string,string]>={
 en:["This answer is still missing. Add and confirm the information before continuing, or request mentoring help.","Share your idea, answer the missing details, and review your report."],
 hi:["यह उत्तर अभी बाकी है। आगे बढ़ने से पहले जानकारी भरकर पुष्टि करें या मार्गदर्शन मांगें।","अपना विचार बताएं, बाकी जानकारी भरें और रिपोर्ट देखें।"],
 mr:["हे उत्तर अजून बाकी आहे. पुढे जाण्यापूर्वी माहिती भरून पुष्टी करा किंवा मार्गदर्शन मागा.","तुमची कल्पना सांगा, उर्वरित माहिती भरा आणि अहवाल पहा."],
 te:["ఈ సమాధానం ఇంకా కావాలి. కొనసాగడానికి ముందు వివరాలను జోడించి నిర్ధారించండి లేదా మార్గదర్శకత్వం కోరండి.","మీ ఆలోచన చెప్పండి, మిగిలిన వివరాలను పూరించండి, నివేదికను చూడండి."],
 ta:["இந்த பதில் இன்னும் தேவை. தொடரும் முன் தகவலைச் சேர்த்து உறுதிப்படுத்தவும் அல்லது வழிகாட்டுதல் கோரவும்.","உங்கள் யோசனையைப் பகிர்ந்து, மீதமுள்ள விவரங்களை நிரப்பி, அறிக்கையைப் பாருங்கள்."],
 kn:["ಈ ಉತ್ತರ ಇನ್ನೂ ಬೇಕಾಗಿದೆ. ಮುಂದುವರಿಯುವ ಮೊದಲು ಮಾಹಿತಿ ಸೇರಿಸಿ ದೃಢೀಕರಿಸಿ ಅಥವಾ ಮಾರ್ಗದರ್ಶನ ಕೋರಿರಿ.","ನಿಮ್ಮ ಆಲೋಚನೆ ಹಂಚಿಕೊಳ್ಳಿ, ಉಳಿದ ವಿವರಗಳನ್ನು ಭರ್ತಿ ಮಾಡಿ, ವರದಿ ನೋಡಿ."],
 bn:["এই উত্তর এখনও বাকি। এগোনোর আগে তথ্য দিয়ে নিশ্চিত করুন অথবা সহায়তা চান।","আপনার ধারণা জানান, বাকি তথ্য পূরণ করুন এবং রিপোর্ট দেখুন।"]
};
for(const [language,copy] of Object.entries(simpleCopy))i18next.addResourceBundle(language,'translation',{missingAnswerNotice:copy[0],simpleWorkspaceHelp:copy[1]},true,true);
