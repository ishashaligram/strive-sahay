"""Odia ASR with Meta MMS and its actual ory adapter; no Whisper substitution."""
import io,threading,os
from pathlib import Path
LOCK=threading.Lock()
MODEL=PROCESSOR=None
FOLDER=Path(__file__).resolve().parents[2]/'.runtime-models/mms-odia'
def ready():return (FOLDER/'model.safetensors').is_file() and (FOLDER/'adapter.ory.safetensors').is_file()
def transcribe(data):
    global MODEL,PROCESSOR
    import torch
    from transformers import AutoProcessor,Wav2Vec2ForCTC
    from faster_whisper.audio import decode_audio
    if not ready():raise RuntimeError('Download the MMS Odia speech model with scripts/setup_language_models.py --odia')
    audio=decode_audio(io.BytesIO(data),sampling_rate=16000)
    if not len(audio):raise ValueError('No audio samples found')
    if len(audio)>16000*600:raise ValueError('Limit recordings to 10 minutes')
    with LOCK:
        torch.set_num_threads(int(os.getenv('MODEL_CPU_THREADS','4')))
        if MODEL is None:
            PROCESSOR=AutoProcessor.from_pretrained(str(FOLDER),target_lang='ory',local_files_only=True)
            MODEL=Wav2Vec2ForCTC.from_pretrained(str(FOLDER),target_lang='ory',ignore_mismatched_sizes=True,torch_dtype=torch.float16,local_files_only=True).eval()
            # Quantize each linear layer separately to avoid a second full
            # float32 copy of this 1B model on a memory-limited demo laptop.
            from torch.ao.quantization import quantize_dynamic
            for name,module in list(MODEL.named_modules()):
                if isinstance(module,torch.nn.Linear):
                    parent_path,_,child=name.rpartition('.')
                    parent=MODEL.get_submodule(parent_path) if parent_path else MODEL
                    converted=quantize_dynamic(torch.nn.Sequential(module.float()),{torch.nn.Linear},dtype=torch.qint8)[0]
                    setattr(parent,child,converted)
            MODEL.float()
        texts=[]
        for start in range(0,len(audio),16000*15):
            inputs=PROCESSOR(audio[start:start+16000*15],sampling_rate=16000,return_tensors='pt')
            with torch.inference_mode():logits=MODEL(**inputs).logits
            texts.append(PROCESSOR.batch_decode(logits.argmax(dim=-1))[0])
        text=' '.join(texts).strip()
        if not text:raise ValueError('No Odia speech was recognized; review or enter the transcript')
        return {'original_transcript':text,'detected_language':'or','confidence':None,'provider':'Meta MMS ory adapter','reviewRequired':True}
