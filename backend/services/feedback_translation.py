"""Cache beneficiary feedback by selected display language, preserving staff originals."""
from services.indictrans_service import IndicTransService
async def localize_feedback(record,language):
    async def field(item,key,cache):
        value=item.get(key)
        if not value:return
        translations=item.setdefault(cache,{})
        if language not in translations:translations[language]=await IndicTransService.translate(value,'en',language)
    await field(record.get('recommendation',{}),'reason','feedbackTranslations')
    await field(record.get('adminDecision',{}),'reason','feedbackTranslations')
    for question in record.get('humanQuestions',[]):await field(question,'question','translations')
    for entry in record.get('programmeProgress',[]):await field(entry,'feedback','feedbackTranslations')
    for task in record.get('roadmap',[]):
        translations=task.setdefault('translations',{})
        if language not in translations:translations[language]={key:await IndicTransService.translate(task[key],'en',language) for key in ('title','reason','instruction','evidenceNeeded') if task.get(key)}
    if record.get('guidance') and language not in record.get('guidanceTranslations',{}):
        record.setdefault('guidanceTranslations',{})[language]={key:[await IndicTransService.translate(value,'en',language) for value in values] for key,values in record['guidance'].items() if isinstance(values,list)}
    if record.get('businessPlan') and language not in record.get('businessPlanTranslations',{}):
        plan=record['businessPlan'];record.setdefault('businessPlanTranslations',{})[language]={**plan,'language':language,'sections':{key:await IndicTransService.translate(value,'en',language) for key,value in plan.get('sections',{}).items()}}
    return record
