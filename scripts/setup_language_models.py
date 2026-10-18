"""Download pinned ungated inference files; never send user documents to a model host."""
import concurrent.futures,json,urllib.request,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'.runtime-models'
MODELS={
 'nllb':('JustFrederik/nllb-200-distilled-600M-ct2-int8',['model.bin','config.json','shared_vocabulary.txt','sentencepiece.bpe.model']),
 'whisper-small':('Systran/faster-whisper-small',['model.bin','config.json','tokenizer.json','vocabulary.txt']),
}
def fetch(job):
    url,target=job
    target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists() and target.stat().st_size>0:return
    partial=target.with_suffix(target.suffix+'.partial')
    subprocess.run(['curl.exe','-sS','-L','--fail','--retry','2','-o',str(partial),url],check=True)
    partial.replace(target)
def main():
    if '--odia' in sys.argv:
        MODELS['mms-odia']=('facebook/mms-1b-all',['model.safetensors','adapter.ory.safetensors','config.json','preprocessor_config.json','tokenizer_config.json','vocab.json','special_tokens_map.json'])
    jobs=[]
    for name,(repo,files) in MODELS.items():
        folder=ROOT/name;folder.mkdir(parents=True,exist_ok=True)
        if (folder/'source.json').exists():revision=json.loads((folder/'source.json').read_text())['revision']
        else:
            with urllib.request.urlopen('https://huggingface.co/api/models/'+repo) as response:meta=json.load(response)
            revision=meta['sha']
        (folder/'source.json').write_text(json.dumps({'repo':repo,'revision':revision}),encoding='utf-8')
        jobs.extend((f'https://huggingface.co/{repo}/resolve/{revision}/{file}',folder/file) for file in files)
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,jobs))
    print('Local translation and speech weights downloaded.')
if __name__=='__main__':main()
