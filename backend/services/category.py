"""Conservative business-category detection from the described product/service only."""
import re

CATEGORIES={
 'Mobile Repair & Maintenance':('mobile repair','phone repair','मोबाइल रिपेयर','मोबाईल दुरुस्ती','ମୋବାଇଲ ମରାମତି'),
 'Bags & Packaging Manufacturing':('cloth bags','jute bags','paper bags','कापडी पिशव्या','कागदी पिशव्या','బ్యాగ్','ବ୍ୟାଗ'),
 'Food Processing & Agro-Allied':('poultry','eggs','vermicompost','compost','seeds','nursery','flower plants','food','tiffin','snacks','papad','bakery','catering','agriculture','farming','pickle','pickles','masala','spice','spices','bakery','baking','catering','food processing','dairy','अचार','मसाला','मसाले','लोणचे','खाद्य','పచ్చడి','మసాలా','ஊறுகாய்','மசாலா','ಉಪ್ಪಿನಕಾಯಿ','ಮಸಾಲೆ','ଆଚାର','ମସଲା','କୃଷି','দুগ্ধ','আচার','মশলা'),
 'Tailoring & Garment Manufacturing':('tailor','tailoring','clothing','clothes','garment','garments','dressmaking','stitching','sewing','सिलाई','शिलाई','शिवण','कपडे','కుట్టు','దర్జీ','தையல்','ಹೊಲಿಗೆ','ସିଲେଇ','সেলাই'),
 'Solar Rooftop & Electrical Services':('solar','electrical service','electrical repair','electrician','सौर','सोलर','इलेक्ट्रिशियन','సౌర','மின்சார','ಸೌರ','ସୌର','সৌর'),
 'Two-Wheeler & Auto Service Center':('two wheeler','two-wheeler','motorcycle','bike repair','auto service','vehicle repair','दुचाकी','वाहन दुरुस्ती','బైక్ రిపేర్','வாகன பழுது','ವಾಹನ ದುರಸ್ತಿ','বাইক মেরামত'),
 'Beauty Salon & Wellness Studio':('beauty salon','beauty parlour','beauty parlor','salon','ब्यूटी पार्लर','सौंदर्य','బ్యూటీ','அழகு நிலையம்','ಬ್ಯೂಟಿ','ପାର୍ଲର','বিউটি পার্লার'),
 'Smart Kirana & Daily Needs Store':('kirana','grocery','groceries','general store','किराना','किराणा','కిరాణా','மளிகை','ಕಿರಾಣಿ','କିରାଣା','মুদির দোকান'),
}


def apply_category(record):
    fact=record.get('facts',{}).get('overview.productService',{})
    text=fact.get('value') if fact.get('status')=='PROVIDED' and fact.get('validation',{}).get('valid') else None
    matches=[]
    if text:
        for category,words in CATEGORIES.items():
            for word in words:
                pattern=r'(?<![a-z])'+re.escape(word)+r'(?![a-z])' if word.isascii() else re.escape(word)
                match=re.search(pattern,text,re.I)
                if match:
                    matches.append((category,match.group(0)))
                    break
    if len(matches)==1:
        name,evidence=matches[0]
        record['trade']=name
        record['category']={'name':name,'status':'DETECTED','evidence':evidence,'sourceField':'overview.productService','method':'PRODUCT_SERVICE_KEYWORDS'}
    else:
        record['trade']=''
        record['category']={'name':None,'status':'NEEDS_CLARIFICATION','evidence':None,'sourceField':'overview.productService','method':'PRODUCT_SERVICE_KEYWORDS'}
    return record
