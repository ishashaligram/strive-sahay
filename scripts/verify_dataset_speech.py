"""Real dataset audio inference. Private transcripts stay in ignored output/."""
import zipfile,sys,json,time
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
from services.whisper_service import FasterWhisperService
def main():
    language=sys.argv[1]
    label={'hi':'Hindi','or':'Odia','bn':'Bengali','te':'Telegu'}[language]
    with zipfile.ZipFile(Path.home()/'Downloads/Audios -20261017T054309Z-1-001.zip') as z:
        name=next(n for n in z.namelist() if label in n and not n.endswith('/'))
        started=time.time()
        data=z.read(name)
        if '--short' in sys.argv:
            import io,wave
            from faster_whisper.audio import decode_audio
            samples=decode_audio(io.BytesIO(data),sampling_rate=16000)[:16000*15]
            output=io.BytesIO()
            with wave.open(output,'wb') as wav:
                wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(16000);wav.writeframes((samples*32767).astype('int16').tobytes())
            data=output.getvalue();name='sample.wav'
        result=FasterWhisperService.transcribe_local(data,language,name)
    target=Path(__file__).resolve().parents[1]/'output/dataset-audit'/('live-speech-'+language+'.json')
    target.parent.mkdir(parents=True,exist_ok=True)
    target.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
    print(json.dumps({'language':language,'characters':len(result['original_transcript']),'seconds':round(time.time()-started,1),'reviewRequired':True}),flush=True)
if __name__=='__main__':main()
