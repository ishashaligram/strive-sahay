import React from 'react';

export class PageErrorBoundary extends React.Component<{children:React.ReactNode},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(error:Error){console.error('Page could not be displayed:',error);}
 render(){
  if(this.state.failed)return <section role="alert" className="max-w-xl mx-auto my-16 bg-white border rounded-2xl p-8 space-y-4"><h1 className="text-xl font-bold">This page could not be displayed</h1><p>Your saved information has not been deleted. Try reopening the page or return to the start page.</p><div className="flex gap-4"><button className="bg-teal-600 text-white rounded-xl p-3" onClick={()=>window.location.reload()}>Reload page</button><a className="border rounded-xl p-3" href="/">Go to start page</a></div></section>;
  return this.props.children;
 }
}
