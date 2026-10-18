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
                page=page.dedupe_chars(tolerance=1)
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
                    table_text="\n".join(" | ".join((str(cell).replace("\n"," / ").strip() if cell is not None else "") for cell in row) for row in rows if any(cell and str(cell).strip() for cell in row))
                    if table_text:
                        table_texts.append(table_text)
                        blocks.append((table.bbox[1],table.bbox[0],"[Table "+str(index)+"]\n"+table_text))
                combined="\n".join(block[2] for block in sorted(blocks,key=lambda block:(block[0],block[1]))).strip()
                needs_ocr=needs_ocr or not combined or combined.count("\ufffd")>max(1,len(combined)//100) or "(cid:" in combined
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
