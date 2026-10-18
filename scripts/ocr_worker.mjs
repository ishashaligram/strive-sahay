import {createWorker} from 'tesseract.js';
import fs from 'node:fs';
const job=JSON.parse(fs.readFileSync(0,'utf8'));
let worker;
try{
 worker=await createWorker(job.languages,1,{langPath:job.modelDir,gzip:false,cachePath:job.modelDir,logger:()=>{}});
 await worker.setParameters({preserve_interword_spaces:'1'});
 const pages=[];
 for(const page of job.pages){
  const {data}=await worker.recognize(page.path,{}, {text:true,tsv:true});
  const rows=(data.tsv||'').split('\n').slice(1).map(row=>row.split('\t'));
  const words=rows.filter(row=>row[0]==='5'&&row[11]?.trim()).map(row=>({text:row.slice(11).join('\t'),left:+row[6],top:+row[7],width:+row[8],height:+row[9],confidence:+row[10],line:row.slice(1,5).join('-')}));
  pages.push({page_number:page.page_number,text:data.text,confidence:data.confidence,words});
 }
 process.stdout.write(JSON.stringify({pages}));
}catch(error){process.stderr.write(String(error.message));process.exitCode=1;}
finally{if(worker)await worker.terminate();}
