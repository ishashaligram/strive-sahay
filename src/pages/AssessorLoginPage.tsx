import React from 'react';
import {AccountLogin} from '../components/AccountLogin';
export const AssessorLoginPage=({onLoginSuccess}:{onLoginSuccess:(u:{role:'assessor';id:string;name:string})=>void})=><AccountLogin role="assessor" onLoginSuccess={u=>{if(u.role==='assessor')onLoginSuccess({...u,role:'assessor'});}}/>;
