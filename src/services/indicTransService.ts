import {SupportedLanguage} from '../types';
import {api} from './screeningApi';
export class IndicTransClientService {
  static async translateToEnglish(text:string,sourceLanguage:SupportedLanguage) {
    const result=await api<{translated_text:string}>('/translation/translate',{text,source:sourceLanguage,target:'en'});
    return {translatedTextEn:result.translated_text,engine:sourceLanguage==='en'?'Direct English':'IndicTrans2'};
  }
}
