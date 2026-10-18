import io
import os
import httpx

class PDFProcessingService:
    @staticmethod
    def extract_text_from_pdf(file_bytes, filename="proposal.pdf"):
        import pdfplumber
        pages=[]
        needs_ocr=False
        with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
            for number,page in enumerate(pdf.pages,1):
                tables=page.find_tables()
                bounds=[t.bbox for t in tables]
                def outside_tables(obj):
                    if obj.get("object_type")!="char":
                        return True
                    x=(obj.get("x0",0)+obj.get("x1",0))/2
                    y=(obj.get("top",0)+obj.get("bottom",0))/2
                    return not any(x0<=x<=x1 and y0<=y<=y1 for x0,y0,x1,y1 in bounds)
                text=page.filter(outside_tables).extract_text(layout=True) or ""
                table_texts=[]
                for table in tables:
                    rows=table.extract()
                    table_texts.append("\n".join(" | ".join(str(cell or "") for cell in row) for row in rows))
                combined="\n\n".join([text.strip()]+table_texts).strip()
                needs_ocr=needs_ocr or not combined or combined.count("\ufffd")>max(1,len(combined)//100)
                pages.append({"page_number":number,"text":combined,"tables":table_texts})
        if not pages or needs_ocr:
            endpoint=os.getenv("OCR_ENDPOINT")
            if not endpoint:
                raise ValueError("Scanned or garbled document requires OCR_ENDPOINT. Upload a searchable replacement or paste reviewed text.")
            headers={"Authorization":"Bearer "+os.environ["OCR_API_KEY"]} if os.getenv("OCR_API_KEY") else {}
            response=httpx.post(endpoint,headers=headers,files={"file":(filename,file_bytes,"application/pdf")},timeout=float(os.getenv("AI_TIMEOUT","180")))
            response.raise_for_status()
            data=response.json()
            text=data["text"]
            if not isinstance(text,str) or not text.strip():raise ValueError("OCR returned no text")
            return {"full_text":text,"pages":data.get("pages",[]),"is_scanned":True}
        return {"full_text":"\n\n".join("[Page "+str(p["page_number"])+"]\n"+p["text"] for p in pages),"pages":pages,"is_scanned":False}
