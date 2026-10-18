"""Map explicit form labels to answers, never question numbers or filenames."""
import re
RULES=[
 ('overview.proposedLocation',r'where.*(?:business|set.?up)|business location'),
 ('overview.productService',r'(?:services?\s*/?\s*products?|products?\s*(?:or|and|/)\s*services?).*(?:provide|offer|sell)|what.*(?:business.*(?:start|run)|sell)|product or service'),
 ('overview.businessName',r'business name|name of (?:your |the )?business'),
 ('market.targetCustomers',r'target(?:ed)? customers?|who.*(?:customers|buys|buy)'),
 ('market.demandEvidence',r'market research|evidence.*demand|demand evidence'),
 ('operations.rawMaterials',r'raw material'),
 ('operations.suppliers',r'who.*suppliers|supplier details'),
 ('finance.fundingSources',r'avenues.*fund|sources.*fund|funding sources'),
 ('market.competition',r'competition|competitors'),
 ('finance.sellingPrice',r'(?:selling )?price.*(?:product|service)|selling price'),
 ('finance.revenueAssumptions',r'(?:expected |monthly )?revenue'),
 ('finance.initialInvestment',r'initial investment|start.?up (?:cost|investment)|investment.*(?:start|business)'),
 ('finance.unitCost',r'unit cost|cost.*(?:one|each|per unit|per product)'),
 ('finance.monthlyExpenses',r'monthly (?:expenses|costs)|expenses.*month'),
 ('finance.expectedSales',r'(?:expected sales|orders|units).*month'),
 ('operations.equipment',r'equipment|machines.*(?:need|have)'),
 ('operations.skills',r'skills|experience.*(?:business|trade)'),
]
def explicit_answers(source):
    if source.get('documentWarnings'):return {}
    matches=re.findall(r'\[Question\]\s*(.*?)\n\[Submitted answer\]\s*(.*?)(?=\n\[Question\]|\n\[Page |\Z)',source['english'],re.S)
    result={}
    for question,answer in matches:
        answer=re.split(r'\n\[Answer state:',answer)[0].strip()
        if not answer or re.search(r'\[EMPTY\]|left blank|don[’\x27]?t know|do not know|not sure|no answer|not provided',answer,re.I):continue
        keys=[key for key,pattern in RULES if re.search(pattern,question,re.I)]
        if len(keys)!=1:continue
        key=keys[0]
        if key in result and result[key]!=answer:result[key]=None
        else:result[key]=answer
    return {key:value for key,value in result.items() if value is not None}

# Conservative speech/text anchors. Capture exact excerpts, never calculate or
# use general business knowledge to fill a field.
NARRATIVE=[
 ('overview.productService',r'\b(?:I|we)\s+(?:want|plan|would like|intend)\s+to\s+(?:start|open|set up)\s+(?:an?\s+)?(.+?\b(?:business|shop|unit|service))(?:\s+in\b|[.,!?\n]|$)'),
 ('overview.proposedLocation',r'\b(?:start|open|set up)\s+[^.!?\n]+?\b(?:business|shop|unit|service)\s+in\s+(.+?)(?:\s+(?:My|Our)\s+(?:customers|clients)\b|[.,!?\n]|$)'),
 ('market.targetCustomers',r'\b(?:my|our)\s+(?:target\s+)?clients\s+(?:are|will be|include)\s+([^.!?\n]+)'),

 ('overview.productService',r'\b(?:I|we)\s+(?:sell|make|provide|offer|produce)\s+([^.!?\n]+)'),
 ('overview.productService',r'\b(?:my|our)\s+business\s+(?:is|will be)\s+(?!\s*(?:in|located)\b)([^.!?\n]+)'),
 ('overview.proposedLocation',r'\b(?:my|our|the)\s+(?:business|shop|unit)\s+(?:is|will be|operates?|is located)\s+(?:located\s+)?in\s+([^.!?\n]+)'),
 ('market.targetCustomers',r'\b(?:my|our)\s+(?:target\s+)?customers\s+(?:are|will be|include)\s+([^.!?\n]+)'),
 ('finance.initialInvestment',r'\b(?:initial|startup|start-up)\s+(?:investment|cost)\s+(?:is|will be|of)\s+([^.!?\n]+)'),
 ('finance.availableCapital',r'\b(?:available capital|my savings|our savings)\s+(?:is|are|of)\s+([^.!?\n]+)'),
 ('finance.unitCost',r'\b(?:unit cost|cost per unit|cost per item)\s+(?:is|will be|of)\s+([^.!?\n]+)'),
 ('finance.sellingPrice',r'\b(?:selling price|price per unit|price per item)\s+(?:is|will be|of)\s+([^.!?\n]+)'),
 ('finance.monthlyExpenses',r'\b(?:monthly expenses|monthly operating costs|monthly costs)\s+(?:are|is|will be|of)\s+([^.!?\n]+)'),
 ('finance.expectedSales',r'\b(?:expected sales|monthly orders|monthly sales)\s+(?:are|is|will be|of)\s+([^.!?\n]+)'),
 ('finance.revenueAssumptions',r'\b(?:monthly revenue|expected revenue)\s+(?:are|is|will be|of)\s+([^.!?\n]+)'),
 ('operations.equipment',r'\b(?:my|our)\s+(?:equipment|machines)\s+(?:are|is|include)\s+([^.!?\n]+)'),
 ('operations.suppliers',r'\b(?:my|our)\s+suppliers\s+(?:are|include|will be)\s+([^.!?\n]+)'),
 ('operations.rawMaterials',r'\b(?:my|our|the)\s+raw materials\s+(?:are|include|will be)\s+([^.!?\n]+)'),
 ('operations.staffing',r'\b(?:I|we)\s+(?:employ|have hired)\s+([^.!?\n]+)'),
]
def narrative_answers(source):
    if source.get('documentWarnings') or '[Question]' in source['english']:return {}
    result={}
    for key,pattern in NARRATIVE:
        for match in re.finditer(pattern,source['english'],re.I):
            value=match.group(1).strip()
            if re.search(r'\b(?:not sure|unknown|do not know|don.t know)\b',value,re.I):continue
            if key.startswith('finance.') and not re.search(r'\d',value):continue
            if key in result and result[key]!=value:result[key]=None
            else:result[key]=value
    return {key:value for key,value in result.items() if value}
