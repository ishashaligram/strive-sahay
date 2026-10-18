"""Optional local IndicTrans2 inference, using official pinned AI4Bharat checkpoints."""
import os,threading
from pathlib import Path
LOCK=threading.Lock();CACHE={}
MODELS={
 'to_en':('ai4bharat/indictrans2-indic-en-dist-200M','d66a2122ad6d28184f3dc3797b652bd80ae3f65f'),
 'from_en':('ai4bharat/indictrans2-en-indic-dist-200M','2cfd0a20057756d756bf3e53528f492afc52f91a')}
def translate(text,source,target):
    if source==target:return text
    if source!='eng_Latn' and target!='eng_Latn':return translate(translate(text,source,'eng_Latn'),'eng_Latn',target)
    try:
        import torch
        from transformers import AutoTokenizer,AutoModelForSeq2SeqLM
        from IndicTransToolkit import IndicProcessor
    except ImportError as exc:raise RuntimeError('IndicTrans2 runtime is not installed. Install backend/requirements-models.txt in a Python 3.11 model environment and approve the official model access in Hugging Face.') from exc
    direction='to_en' if target=='eng_Latn' else 'from_en'
    with LOCK:
        if direction not in CACHE:
            default,revision=MODELS[direction]
            folder=os.getenv('INDICTRANS_LOCAL_'+direction.upper())
            if not folder and not os.getenv('HF_TOKEN'):raise RuntimeError('IndicTrans2 model access is required. Set HF_TOKEN after accepting the official model access, or configure local model directories.')
            args={'trust_remote_code':True,'token':os.getenv('HF_TOKEN')}
            if not folder:args['revision']=revision
            tokenizer=AutoTokenizer.from_pretrained(folder or default,**args)
            model=AutoModelForSeq2SeqLM.from_pretrained(folder or default,torch_dtype=torch.float32,attn_implementation='eager',**args).eval()
            CACHE[direction]=(tokenizer,model,IndicProcessor(inference=True))
        tokenizer,model,processor=CACHE[direction]
        lines=text.splitlines() or [text];nonempty=[line for line in lines if line.strip()]
        translated=[]
        for start in range(0,len(nonempty),4):
            batch=processor.preprocess_batch(nonempty[start:start+4],src_lang=source,tgt_lang=target)
            inputs=tokenizer(batch,truncation=False,padding=True,return_tensors='pt',return_attention_mask=True)
            if inputs['input_ids'].shape[1]>1024:raise ValueError('Translation paragraph is too long. Split it into shorter paragraphs.')
            with torch.inference_mode():outputs=model.generate(**inputs,use_cache=True,max_new_tokens=1024,num_beams=4)
            decoded=tokenizer.batch_decode(outputs,skip_special_tokens=True,clean_up_tokenization_spaces=True)
            translated.extend(processor.postprocess_batch(decoded,lang=target))
        iterator=iter(translated)
        return '\n'.join(next(iterator) if line.strip() else line for line in lines)
