import {Plan} from './screeningApi';
const escape=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
export function printablePlanHtml(plan:Plan,title:string,language:string,headings:Record<string,string>={}){
 const safeLanguage=/^(en|hi|mr|te|ta|kn|bn)$/.test(language)?language:'en';
 return '<!doctype html><html lang="'+safeLanguage+'"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+escape(title)+'</title><style>@page{size:A4;margin:18mm}body{font-family:"Nirmala UI","Noto Sans",Arial,sans-serif;color:#0f172a;line-height:1.65;max-width:780px;margin:24px auto;padding:12px}h1{font-size:26px;border-bottom:3px solid #0d9488;padding-bottom:12px}h2{font-size:17px;margin-top:24px;break-after:avoid}p{font-size:13px;white-space:pre-wrap;overflow-wrap:anywhere;orphans:3;widows:3}footer{font-size:10px;color:#475569;margin-top:30px;border-top:1px solid #cbd5e1;padding-top:10px}@media print{body{margin:0;padding:0}}</style></head><body><h1>'+escape(title)+'</h1>'+Object.entries(plan.sections).map(([heading,text])=>'<section><h2>'+escape(headings[heading]||heading)+'</h2><p>'+escape(text)+'</p></section>').join('')+'<footer>STRIVE SAHAY</footer></body></html>';
}
export function printBusinessPlan(plan:Plan,title:string,language:string,headings:Record<string,string>={}){
 const preview=window.open('','_blank');
 if(!preview)throw new Error('Allow the browser print window and try again');
 preview.opener=null;
 preview.document.open();preview.document.write(printablePlanHtml(plan,title,language,headings));preview.document.close();
 void preview.document.fonts.ready.then(()=>{preview.focus();preview.print();});
}
