import React from 'react';
import {PresentationLogin} from './PresentationLogin';

// All public portals use the requested phone + on-screen OTP flow.
export function AccountLogin(props:React.ComponentProps<typeof PresentationLogin>){
 return <PresentationLogin {...props}/>;
}
