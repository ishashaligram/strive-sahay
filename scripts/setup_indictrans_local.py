"""Download approved official models; switch only after 14 real translation checks."""
import argparse,json,os,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend'))
from dotenv import load_dotenv,set_key

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--activate',action='store_true');args=parser.parse_args()
    env_file=ROOT/'backend/.env';load_dotenv(env_file,override=True)
    from services.local_indictrans import MODELS,translate
    from services.indictrans_service import LANGUAGES,numbers
    if not os.getenv('HF_TOKEN') and not all(os.getenv('INDICTRANS_LOCAL_'+d.upper()) for d in MODELS):
        print('MODEL ACCESS REQUIRED: save HF_TOKEN in backend/.env after obtaining access to both official distilled IndicTrans2 models. Existing translation provider is unchanged.');return 2
    import truststore
    truststore.inject_into_ssl()
    from huggingface_hub import HfApi,snapshot_download
    from IndicTransToolkit import IndicProcessor
    IndicProcessor(inference=True)
    for direction,(repo,revision) in MODELS.items():
        existing=os.getenv('INDICTRANS_LOCAL_'+direction.upper())
        if existing:
            if not Path(existing).is_dir():raise RuntimeError('Configured local model directory does not exist: '+direction)
            continue
        api=HfApi(token=os.getenv('HF_TOKEN'));meta=api.model_info(repo,revision=revision)
        # Request a gated file first, so permission failures occur before a large download.
        from huggingface_hub import hf_hub_download
        folder=ROOT/'.runtime-models'/('indictrans-'+direction)
        hf_hub_download(repo,'config.json',revision=revision,token=os.getenv('HF_TOKEN'),local_dir=folder)
        files=[f.rfilename for f in meta.siblings]
        weights=['*.safetensors'] if any(f.endswith('.safetensors') for f in files) else ['pytorch_model*.bin']
        snapshot_download(repo,revision=revision,token=os.getenv('HF_TOKEN'),local_dir=folder,allow_patterns=['*.json','*.py','*.model','*.spm','*.txt']+weights,max_workers=2)
        os.environ['INDICTRANS_LOCAL_'+direction.upper()]=str(folder)
        (folder/'source.json').write_text(json.dumps({'repo':repo,'revision':revision}),encoding='utf-8')
    results=[]
    for language,code in LANGUAGES.items():
        if language=='en':continue
        start=time.monotonic();source='I plan to start a tailoring business. I need 5000 rupees.'
        regional=translate(source,'eng_Latn',code)
        english=translate(regional,code,'eng_Latn')
        if not regional.strip() or not english.strip() or sorted(numbers(source))!=sorted(numbers(regional)) or sorted(numbers(source))!=sorted(numbers(english)):
            raise RuntimeError('Translation smoke check failed for '+language+'; provider unchanged')
        if regional.strip()==source:raise RuntimeError('Regional translation was unchanged for '+language)
        results.append({'language':language,'regional':regional,'backToEnglish':english,'seconds':round(time.monotonic()-start,2)})
        print(language+': both directions passed',flush=True)
    output=ROOT/'output/indictrans-verification.json';output.parent.mkdir(exist_ok=True);output.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
    if args.activate:
        for direction in MODELS:set_key(str(env_file),'INDICTRANS_LOCAL_'+direction.upper(),os.environ['INDICTRANS_LOCAL_'+direction.upper()])
        set_key(str(env_file),'INDICTRANS_ENDPOINT','http://127.0.0.1:8001/translate')
        set_key(str(env_file),'TRANSLATION_PROVIDER','indictrans2')
        print('All 14 translations passed. IndicTrans2 configured; restart the two local API services to apply.')
    else:print('All 14 translations passed. Use --activate to switch the backend provider.')
    return 0

if __name__=='__main__':
    try:sys.exit(main())
    except Exception as exc:
        # Exception text from network libraries can contain authentication details.
        print('IndicTrans2 setup failed ('+type(exc).__name__+'). Check model access, local folders and dependencies. Existing provider was not switched.');sys.exit(1)
