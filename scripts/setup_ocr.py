"""Download official Tesseract language data into an ignored local runtime."""
import concurrent.futures,hashlib,json,urllib.request
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
    info=json.load(urllib.request.urlopen('https://api.github.com/repos/tesseract-ocr/tessdata_fast/commits/main',timeout=30))
    revision=info['sha'];folder=ROOT/'.runtime-ocr'/'tessdata';folder.mkdir(parents=True,exist_ok=True)
    def download(language):
        path=folder/(language+'.traineddata')
        if not path.exists():path.write_bytes(urllib.request.urlopen(f'https://raw.githubusercontent.com/tesseract-ocr/tessdata_fast/{revision}/{language}.traineddata',timeout=120).read())
        return {'language':language,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'bytes':path.stat().st_size}
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:files=list(executor.map(download,['eng','hin','mar','tel','tam','kan','ben','ori']))
    (folder.parent/'manifest.json').write_text(json.dumps({'revision':revision,'files':files},indent=2))
    print('OCR language models ready:',len(files))
if __name__=='__main__':main()
