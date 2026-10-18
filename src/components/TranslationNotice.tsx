import React from 'react';
import {SupportedLanguage} from '../types';
import {ui} from '../services/uiI18n';
export function TranslationNotice({language,pending}:{language:SupportedLanguage;pending:boolean}){
 if(language==='en'||!pending)return null;
 const t=ui(language);
 return <p role="status" className="bg-amber-50 text-amber-900 border border-amber-200 rounded-xl p-3 text-sm print:hidden">{t('Translation pending')}: {t('English source content shown until translation is available')}</p>;
}
