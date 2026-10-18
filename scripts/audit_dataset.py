"""Read supplied ZIP datasets without importing samples into application records.
Run with --pdfs ZIP --forms ZIP --audios ZIP --output ignored/report.json.
No OCR/model/network calls are made. Raw document text is never written to report.
"""
import argparse,io,json,logging,os,struct,sys,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from services.pdf_service import PDFProcessingService
from services.document_layout import damaged_text,overwritten_text


def audio_tracks(data):
    if data.startswith(b'OggS'):return {'container':'ogg','codec':'opus' if b'OpusHead' in data[:1000] else 'vorbis' if b'vorbis' in data[:1000] else 'unknown','decoded':False}
    if data[4:8]!=b'ftyp':return {'container':'unknown','decoded':False}
    tracks=[]
    def scan(start,end,depth=0):
        if depth>6:return
        while start+8<=end:
            size,kind=struct.unpack('>I4s',data[start:start+8]);header=8
            if size==1:
                if start+16>end:return
                size=struct.unpack('>Q',data[start+8:start+16])[0];header=16
            if size<8 or start+size>end:return
            content=start+header
            if kind in (b'moov',b'trak',b'mdia'):scan(content,start+size,depth+1)
            if kind==b'hdlr' and content+12<=start+size:tracks.append(data[content+8:content+12].decode('ascii',errors='replace'))
            start+=size
    scan(0,len(data))
    return {'container':'mp4','tracks':tracks,'hasAudio':'soun' in tracks,'decoded':False}


def inspect(archive,kind):
    import pdfplumber
    items=[]
    with zipfile.ZipFile(archive) as zipped:
        for entry in zipped.infolist():
            if entry.is_dir():continue
            if entry.file_size>15*1024*1024:items.append({'file':entry.filename,'status':'UPLOAD_LIMIT_EXCEEDED'});continue
            data=zipped.read(entry)
            if kind=='audio':items.append({'file':entry.filename,'bytes':len(data),**audio_tracks(data),'status':'TRANSCRIPTION_NOT_RUN'});continue
            with pdfplumber.open(io.BytesIO(data)) as pdf:
                texts=[page.extract_text() or '' for page in pdf.pages]
                item={'file':entry.filename,'pages':len(texts),'scannedPages':sum(not text.strip() for text in texts),'damagedFontPages':sum(damaged_text(text) for text in texts),'overwrittenPages':sum(overwritten_text(page.dedupe_chars()) for page in pdf.pages)}
            try:
                result=PDFProcessingService.extract_text_from_pdf(data,entry.filename,allow_local=False)
                item.update(status='READABLE',questionBlocks=result['full_text'].count('[Question]'),emptyAnswers=result['full_text'].count('[Answer state: EMPTY]'))
            except ValueError as error:item.update(status='OCR_REQUIRED' if 'OCR' in str(error) else 'REVIEW_REQUIRED')
            items.append(item)
    return items


def main():
    parser=argparse.ArgumentParser()
    for key in ('pdfs','forms','audios'):parser.add_argument('--'+key,required=True)
    parser.add_argument('--output',required=True)
    args=parser.parse_args()
    logging.getLogger('pdfminer').setLevel(logging.ERROR)
    # Audit is intentionally offline; an environment OCR endpoint must not receive dataset files.
    os.environ.pop('OCR_ENDPOINT',None)
    report={key:inspect(getattr(args,key),'audio' if key=='audios' else 'pdf') for key in ('pdfs','forms','audios')}
    output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({key:{'files':len(items),'readable':sum(i['status']=='READABLE' for i in items),'requiresOCR':sum(i['status']=='OCR_REQUIRED' for i in items),'audioTracks':sum(i.get('hasAudio',i.get('container')=='ogg') for i in items)} for key,items in report.items()},indent=2))

if __name__=='__main__':main()
