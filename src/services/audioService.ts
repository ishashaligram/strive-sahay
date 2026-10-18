import { SupportedLanguage } from '../types';

export interface AudioRecordingResult {
  audioBlob: Blob;
  audioUrl: string;
  durationSeconds: number;
}

export class AudioService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private startTime = 0;

  async startRecording(): Promise<void> {
    this.audioChunks = [];
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.mediaRecorder = new MediaRecorder(stream);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        this.audioChunks.push(event.data);
      }
    };

    this.startTime = Date.now();
    this.mediaRecorder.start();
  }

  stopRecording(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        return reject(new Error('MediaRecorder not initialized'));
      }

      this.mediaRecorder.onstop = () => {
        const durationSeconds = Math.round((Date.now() - this.startTime) / 1000);
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        // Stop all tracks to release mic
        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());

        resolve({
          audioBlob,
          audioUrl,
          durationSeconds: Math.max(durationSeconds, 1),
        });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Simulates faster-whisper multilingual speech transcription
   */
  static async transcribeAudio(
    audioBlob: Blob,
    preferredLanguage: SupportedLanguage
  ): Promise<{ originalTranscript: string; translatedEn: string; detectedLanguage: string; confidence: number }> {
    // Artificial small delay to simulate faster-whisper pipeline
    await new Promise((r) => setTimeout(r, 1200));

    if (preferredLanguage === 'mr') {
      return {
        detectedLanguage: 'Marathi (मराठी)',
        confidence: 0.96,
        originalTranscript:
          'मी सोलापूर मध्ये घरगुती लोणचे आणि अस्सल महाराष्ट्रीयन मसाले बनवण्याचा उद्योग सुरू करू इच्छित आहे. यात आंबा, लिंबू, मिरचीचे पारंपारिक लोणचे आणि गोडा मसाला बनवून काचेच्या बरणीत स्थानिक सोसायट्या आणि किराणा दुकानांमध्ये विकण्याची माझी योजना आहे.',
        translatedEn:
          'I want to start a homemade pickles and authentic Maharashtrian spices business in Solapur. My plan is to produce traditional mango, lemon, and chili pickles along with goda masala, packaged in glass jars for sale to local housing societies and grocery stores.',
      };
    } else if (preferredLanguage === 'hi') {
      return {
        detectedLanguage: 'Hindi (हिंदी)',
        confidence: 0.94,
        originalTranscript:
          'मैं घर पर पारंपरिक अचार और शुद्ध मसालों का व्यवसाय शुरू करना चाहता हूँ। आम, नींबू और हरी मिर्च का अचार शीशे के जार में पैक करके स्थानीय सोसायटियों और किराना दुकानों में बेचने की योजना है।',
        translatedEn:
          'I want to start a traditional homemade pickle and pure spices enterprise. The plan is to package mango, lemon, and green chili pickles in glass jars to sell to local housing societies and grocery shops.',
      };
    } else {
      return {
        detectedLanguage: 'English',
        confidence: 0.97,
        originalTranscript:
          'I want to launch an artisanal homemade pickle and traditional spice processing micro-enterprise, focusing on preservative-free recipes packaged in glass jars for direct delivery to housing societies.',
        translatedEn:
          'I want to launch an artisanal homemade pickle and traditional spice processing micro-enterprise, focusing on preservative-free recipes packaged in glass jars for direct delivery to housing societies.',
      };
    }
  }
}
