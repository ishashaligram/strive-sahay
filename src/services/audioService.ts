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

  cancelRecording(): void {
    if (this.mediaRecorder?.state === 'recording') this.mediaRecorder.stop();
    this.mediaRecorder?.stream.getTracks().forEach(track => track.stop());
  }
}