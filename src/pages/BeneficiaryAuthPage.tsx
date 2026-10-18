import React from 'react';
import {SupportedLanguage} from '../types';
import {AccountLogin} from '../components/AccountLogin';
export const BeneficiaryAuthPage=({onLoginSuccess,currentLang,onLanguageChange}:{onLoginSuccess:(u:{role:'beneficiary';id:string;name:string})=>void;currentLang:SupportedLanguage;onLanguageChange:(l:SupportedLanguage)=>void})=><AccountLogin role="beneficiary" currentLang={currentLang} onLanguageChange={onLanguageChange} onLoginSuccess={u=>{if(u.role==='beneficiary')onLoginSuccess({...u,role:'beneficiary'});}}/>;
