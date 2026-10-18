import React from 'react';
import {SupportedLanguage} from '../types';
import {ScreeningWorkspace} from './ScreeningWorkspace';
export const ImprovementWorkspace = ({currentLang}:{currentLang:SupportedLanguage})=><ScreeningWorkspace role="beneficiary" language={currentLang}/>;
