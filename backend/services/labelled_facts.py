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
