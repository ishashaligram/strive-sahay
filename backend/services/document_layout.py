"""Dataset-driven layout safeguards; never infer answers from scenario filenames."""
import re
import unicodedata


def damaged_text(text):
    return bool('\x00' in text or '\ufffd' in text or re.search(r'\(cid:\d+\)',text))


def overwritten_text(page):
    # Distinct ASCII glyphs painted in the same place indicate competing answers.
    # Combining Indic marks are deliberately excluded from this geometric check.
    chars=[c for c in page.chars if re.fullmatch('[A-Za-z0-9]',c.get('text',''))]
    buckets={}
    overlaps=0
    for c in chars:
        key=round(c['top'])
        for other in buckets.get(key,[]):
            width=min(c['x1']-c['x0'],other['x1']-other['x0'])
            intersection=min(c['x1'],other['x1'])-max(c['x0'],other['x0'])
            if c['text']!=other['text'] and width>0 and intersection/width>.65:
                overlaps+=1
        buckets.setdefault(key,[]).append(c)
    if overlaps>=4:return True
    for line in page.lines:
        if abs(line['top']-line['bottom'])>1:continue
        hits=[c for c in page.chars if c.get('text','').strip() and c['x0']>=line['x0']-1 and c['x1']<=line['x1']+1 and c['top']+.2*(c['bottom']-c['top'])<=line['top']<=c['top']+.8*(c['bottom']-c['top'])]
        if len(hits)>=2:return True
    return False


def labelled_rows(rows,context=None):
    context=context if context is not None else {}
    answer_col=question_col=None
    if rows and context and len(rows[0])==context.get('width') and str(rows[0][0] or '').strip().isnumeric():
        answer_col=context['answer'];question_col=context['question']
    if answer_col is None and rows and all(len(row)==2 for row in rows) and any('?' in str(row[0] or '') for row in rows):
        question_col=0;answer_col=1
    output=[]
    for row in rows:
        cells=['' if c is None else str(c).strip() for c in row]
        if answer_col is None:
            for i,text in enumerate(cells):
                if re.search(r'(?i)^(response|answers?|submitted answer|submitted response)|उत्तर|जवाब|సమాధానం|উত্তর|ଉତ୍ତର',text):answer_col=i
                if re.search(r'(?i)questions?|प्रश्न|ప్రశ్న|प्रश्नावली',text):question_col=i
            if answer_col is not None and question_col is not None:context.update(answer=answer_col,question=question_col,width=len(cells))
            output.append(' | '.join(c.replace('\n',' / ') for c in cells))
            continue
        if question_col is None or question_col==answer_col:
            question_col=max(0,answer_col-1)
        if len(cells)<=max(question_col,answer_col):
            output.append(' | '.join(c.replace('\n',' / ') for c in cells));continue
        question=cells[question_col]
        answer=cells[answer_col]
        if not question:continue
        blank=not answer or 'left blank' in answer.casefold() or bool(re.fullmatch(r'(?i)[\s_–—-]+|\[?\s*(left blank|no answer|not answered|not provided|no response)\s*\]?',answer))
        output.append('[Question] '+question.replace('\n',' ')+'\n[Submitted answer] '+(answer.replace('\n',' ') if answer else '[EMPTY]')+('\n[Answer state: EMPTY]' if blank else ''))
    return '\n'.join(output)
