"""On-device MMS speech synthesis; private page text never goes to a cloud TTS API."""
import io,wave,base64,threading,os,re,unicodedata
from pathlib import Path
LOCK=threading.Lock();MODEL=TOKENIZER=None;LANG=None
DIGITS={
 'en':'zero one two three four five six seven eight nine',
 'hi':'शून्य एक दो तीन चार पाँच छह सात आठ नौ',
 'mr':'शून्य एक दोन तीन चार पाच सहा सात आठ नऊ',
 'te':'సున్నా ఒకటి రెండు మూడు నాలుగు ఐదు ఆరు ఏడు ఎనిమిది తొమ్మిది',
 'ta':'பூஜ்யம் ஒன்று இரண்டு மூன்று நான்கு ஐந்து ஆறு ஏழு எட்டு ஒன்பது',
 'kn':'ಸೊನ್ನೆ ಒಂದು ಎರಡು ಮೂರು ನಾಲ್ಕು ಐದು ಆರು ಏಳು ಎಂಟು ಒಂಬತ್ತು',
 'bn':'শূন্য এক দুই তিন চার পাঁচ ছয় সাত আট নয়',
 'or':'ଶୂନ୍ୟ ଏକ ଦୁଇ ତିନି ଚାରି ପାଞ୍ଚ ଛଅ ସାତ ଆଠ ନଅ'}
POINT={'en':'point','hi':'दशमलव','mr':'दशांश','te':'దశాంశం','ta':'புள்ளி','kn':'ದಶಮಾಂಶ','bn':'দশমিক','or':'ଦଶମିକ'}
def spoken_numbers(text,language):
    words=DIGITS[language].split()
    def expand(match):
        return ' '.join(words[unicodedata.digit(char)] if char.isdigit() else POINT[language] if char=='.' else '' for char in match.group())
    return re.sub(r'\d+(?:[.,]\d+)*',expand,text)
def synthesize(text,language):
    global MODEL,TOKENIZER,LANG
    import torch
    from transformers import VitsModel,AutoTokenizer
    folder=Path(__file__).resolve().parents[2]/'.runtime-models'/('tts-'+language)
    if not (folder/'model.safetensors').is_file():raise RuntimeError('Regional read-aloud model is not installed for this language')
    with LOCK:
        torch.set_num_threads(int(os.getenv('MODEL_CPU_THREADS','4')))
        if LANG!=language:
            MODEL=None;TOKENIZER=None
            TOKENIZER=AutoTokenizer.from_pretrained(str(folder),local_files_only=True)
            MODEL=VitsModel.from_pretrained(str(folder),local_files_only=True).eval();LANG=language
        inputs=TOKENIZER(spoken_numbers(text,language),return_tensors='pt')
        if inputs['input_ids'].shape[1]<2:raise ValueError('No readable text was supplied')
        with torch.inference_mode():samples=MODEL(**inputs).waveform[0].cpu().numpy()
        output=io.BytesIO()
        with wave.open(output,'wb') as audio:
            audio.setnchannels(1);audio.setsampwidth(2);audio.setframerate(MODEL.config.sampling_rate);audio.writeframes((samples.clip(-1,1)*32767).astype('int16').tobytes())
        return {'audio_base64':base64.b64encode(output.getvalue()).decode(),'mime_type':'audio/wav','provider':'Local MMS TTS','language':language}
