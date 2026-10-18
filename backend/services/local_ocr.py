"""Real local OCR: PDFium renders PDF pixels; Tesseract recognizes the images."""
import io,json,os,shutil,subprocess,tempfile
from pathlib import Path
from services.document_layout import labelled_rows,damaged_text
ROOT=Path(__file__).resolve().parents[2]
LANGS={'en':'eng','hi':'hin','mr':'mar','te':'tel','ta':'tam','kn':'kan','bn':'ben','or':'ori'}
def ready():return (ROOT/'node_modules'/'tesseract.js').exists() and all((ROOT/'.runtime-ocr'/'tessdata'/(lang+'.traineddata')).exists() for lang in LANGS.values())
def extract_pdf(data,language='auto'):
    if not ready():raise RuntimeError('Local OCR is not installed. Run pnpm install and python scripts/setup_ocr.py.')
    import pdfplumber,pypdfium2
    document=pypdfium2.PdfDocument(data)
    if len(document)>25:raise ValueError('OCR supports up to 25 pages per upload. Split this document.')
    try:
        with tempfile.TemporaryDirectory(prefix='strive-ocr-') as temp:
            pages=[]
            with pdfplumber.open(io.BytesIO(data)) as layout:
                for index in range(len(document)):
                    image=document[index].render(scale=2.5).to_pil()
                    path=Path(temp)/(str(index+1)+'.png');image.save(path)
                    pages.append({'path':str(path),'page_number':index+1,'scale':2.5})
                languages=['eng',LANGS[language]] if language in LANGS and language!='en' else ['eng'] if language=='en' else list(LANGS.values())
                job={'pages':pages,'languages':list(dict.fromkeys(languages)),'modelDir':str(ROOT/'.runtime-ocr'/'tessdata')}
                result=subprocess.run([os.getenv('NODE_EXECUTABLE') or shutil.which('node') or 'node',str(ROOT/'scripts'/'ocr_worker.mjs')],input=json.dumps(job),capture_output=True,text=True,encoding='utf-8',timeout=float(os.getenv('OCR_TIMEOUT','600')),cwd=ROOT)
                if result.returncode:raise RuntimeError('Local OCR engine failed. Check installed language models and available memory.')
                recognized=json.loads(result.stdout)['pages']
                context={}
                for page in recognized:
                    original=layout.pages[page['page_number']-1]
                    tables=original.find_tables();blocks=[];used=set()
                    for table in tables:
                        rows=[]
                        for row in table.rows:
                            values=[]
                            for cell in row.cells:
                                if cell is None:values.append('');continue
                                selected=[(i,w) for i,w in enumerate(page['words']) if cell[0]*2.5<=w['left']+w['width']/2<=cell[2]*2.5 and cell[1]*2.5<=w['top']+w['height']/2<=cell[3]*2.5]
                                used.update(i for i,_ in selected)
                                values.append(' '.join(w['text'] for _,w in sorted(selected,key=lambda pair:(pair[1]['top']//10,pair[1]['left']))))
                            rows.append(values)
                        blocks.append((table.bbox[1]*2.5,labelled_rows(rows,context)))
                    lines={}
                    for i,word in enumerate(page['words']):
                        if i not in used:lines.setdefault(word['line'],[]).append(word)
                    for words in lines.values():blocks.append((min(w['top'] for w in words),' '.join(w['text'] for w in sorted(words,key=lambda w:w['left']))))
                    if blocks:page['text']='\n'.join(text for _,text in sorted(blocks,key=lambda block:block[0]) if text.strip())
                    page.pop('words',None)
                    page['method']='LOCAL_TESSERACT_OCR'
                    page['warnings']=['OCR_LOW_CONFIDENCE'] if page['confidence']<65 else []
                    if damaged_text(page['text']):raise ValueError('OCR produced unreadable text. Review the original document.')
            text='\n\n'.join('[Page '+str(page['page_number'])+']\n'+page['text'] for page in recognized)
            if not any(page['text'].strip() for page in recognized):raise ValueError('OCR found no readable text')
            return {'text':text,'pages':recognized,'reviewRequired':True}
    finally:document.close()
