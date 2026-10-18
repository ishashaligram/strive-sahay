"""Local NLLB fallback. This is explicitly not an IndicTrans2 model."""
import threading,re,os
from functools import lru_cache
from pathlib import Path
LOCK=threading.Lock()
MODEL=None
TOKENIZER=None
ROOT=Path(__file__).resolve().parents[2]
def ready():return (ROOT/'.runtime-models/nllb/model.bin').is_file()

@lru_cache(maxsize=512)
def translate(text,source,target):
    global MODEL,TOKENIZER
    if source==target:return text
    import ctranslate2
    import sentencepiece
    with LOCK:
        folder=ROOT/'.runtime-models/nllb'
        if MODEL is None:
            MODEL=ctranslate2.Translator(str(folder),device='cpu',compute_type='int8',intra_threads=int(os.getenv('MODEL_CPU_THREADS','4')))
            TOKENIZER=sentencepiece.SentencePieceProcessor(model_file=str(folder/'sentencepiece.bpe.model'))
        parts=[];inputs=[]
        for line in text.splitlines():
            marker=re.match(r'^(\[(?:Question|Submitted answer|Page[^\]]*|Table[^\]]*)\]\s*)(.*)$',line)
            prefix,body=(marker.group(1),marker.group(2)) if marker else ('',line)
            if not body.strip():parts.append((prefix,body,None));continue
            tokens=TOKENIZER.encode(body,out_type=str)
            if len(tokens)>450:raise ValueError('Translation paragraph is too long; split into shorter paragraphs before processing.')
            parts.append((prefix,body,len(inputs)))
            inputs.append([source]+tokens+['</s>'])
        outputs=MODEL.translate_batch(inputs,target_prefix=[[target]]*len(inputs),beam_size=2,max_decoding_length=512,max_batch_size=4) if inputs else []
        translated=[TOKENIZER.decode(result.hypotheses[0][1:]) for result in outputs]
        return '\n'.join(prefix+(translated[index] if index is not None else body) for prefix,body,index in parts)
