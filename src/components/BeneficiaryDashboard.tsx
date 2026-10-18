import React from 'react';
import {SupportedLanguage} from '../types';
import {ScreeningWorkspace} from './ScreeningWorkspace';
export const BeneficiaryDashboard = ({currentLang}:{currentLang:SupportedLanguage})=><ScreeningWorkspace role="beneficiary" language={currentLang}/>;
