from services.document_layout import damaged_text,overwritten_text,labelled_rows
import io
import os
import httpx

class PDFProcessingService:
    @staticmethod
    def extract_text_from_pdf(file_bytes, filename="proposal.pdf", language="auto", allow_local=True):
        import pdfplumber
        pages=[]
        needs_ocr=False
        qa_context={}
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for number,page in enumerate(pdf.pages,1):
                page=page.dedupe_chars(tolerance=1)
                ambiguous=overwritten_text(page)
                tables=page.find_tables()
                bounds=[t.bbox for t in tables]
                def outside_tables(obj):
                    if obj.get("object_type")!="char":return True
                    x=(obj.get("x0",0)+obj.get("x1",0))/2
                    y=(obj.get("top",0)+obj.get("bottom",0))/2
                    return not any(x0<=x<=x1 and y0<=y<=y1 for x0,y0,x1,y1 in bounds)
                blocks=[]
                for line in page.filter(outside_tables).extract_text_lines(layout=False):
                    if line["text"].strip():blocks.append((line["top"],line["x0"],line["text"].strip()))
                table_texts=[]
                for index,table in enumerate(tables,1):
                    rows=table.extract()
                    # Retain cell boundaries and empty cells: never attach a price to
                    # the neighbouring row, repeat merged values, or invent a total.
                    table_text=labelled_rows(rows,qa_context)
                    if table_text:
                        table_texts.append(table_text)
                        blocks.append((table.bbox[1],table.bbox[0],"[Table "+str(index)+"]\n"+table_text))
                combined="\n".join(block[2] for block in sorted(blocks,key=lambda block:(block[0],block[1]))).strip()
                needs_ocr=needs_ocr or not combined or combined.count("\ufffd")>max(1,len(combined)//100) or damaged_text(combined) or ambiguous
                pages.append({"page_number":number,"text":combined,"tables":table_texts,"warnings":["OVERWRITTEN_ANSWERS"] if ambiguous else []})
        if not pages or needs_ocr:
            endpoint=os.getenv("OCR_ENDPOINT")
            if not endpoint:
                from services.local_ocr import extract_pdf,ready
                if not allow_local or not ready():raise ValueError('Scanned or damaged document requires local OCR setup or OCR_ENDPOINT. Run scripts/setup_ocr.py.')
                data=extract_pdf(file_bytes,language)
                for page in data['pages']:page['warnings']=sorted(set(page.get('warnings',[]))|{w for original in pages for w in original.get('warnings',[])})
                return {'full_text':data['text'],'pages':data['pages'],'is_scanned':True}
            headers={"Authorization":"Bearer "+os.environ["OCR_API_KEY"]} if os.getenv("OCR_API_KEY") else {}
            response=httpx.post(endpoint,headers=headers,files={"file":(filename,file_bytes,"application/pdf")},data={"language":language},timeout=float(os.getenv("AI_TIMEOUT","180")))
            response.raise_for_status()
            data=response.json()
            text=data["text"]
            if not isinstance(text,str) or not text.strip():raise ValueError("OCR returned no text")
            if damaged_text(text):raise ValueError("OCR text still contains unreadable characters. Paste a reviewed transcript instead.")
            ocr_pages=data.get('pages',[]) or pages
            if not isinstance(ocr_pages,list) or any(not isinstance(page,dict) for page in ocr_pages):raise ValueError('OCR returned invalid page metadata')
            document_warnings=sorted({warning for original in pages for warning in original.get('warnings',[])})
            for page in ocr_pages:
                page['warnings']=sorted(set(page.get('warnings',[]))|set(document_warnings))
                original=next((old for old in pages if old['page_number']==page.get('page_number')),None)
                if original:page['warnings']=sorted(set(page['warnings'])|set(original.get('warnings',[])))
            return {"full_text":text,"pages":ocr_pages,"is_scanned":True,"warnings":sorted({warning for page in pages for warning in page.get("warnings",[])})}
        return {"full_text":"\n\n".join("[Page "+str(p["page_number"])+"]\n"+p["text"] for p in pages),"pages":pages,"is_scanned":False}
