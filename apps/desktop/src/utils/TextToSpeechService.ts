export class TextToSpeechService {
    private isSpeaking = false;
    private voices: SpeechSynthesisVoice[] = [];

    constructor() {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            // Load voices immediately if possible
            this.voices = window.speechSynthesis.getVoices();

            // Wait for voices to be loaded (common in Chrome/Electron)
            window.speechSynthesis.onvoiceschanged = () => {
                this.voices = window.speechSynthesis.getVoices();
                console.log(`🔊 Voices loaded/updated: ${this.voices.length} voices available`);
            };
        }
    }

    private getBestVoice(lang: string): SpeechSynthesisVoice | null {
        if (this.voices.length === 0) {
            this.voices = window.speechSynthesis.getVoices();
        }

        // 1. Try to find a premium/natural voice for the language
        let voice = this.voices.find(v =>
            v.lang.startsWith(lang) &&
            (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Enhanced') || v.name.includes('Neural'))
        );

        // 2. Try any voice for that language
        if (!voice) {
            voice = this.voices.find(v => v.lang.startsWith(lang));
        }

        // 3. Fallback to English if no voice found (at least they hear SOMETHING)
        if (!voice && lang !== 'en') {
            voice = this.voices.find(v => v.lang.startsWith('en'));
        }

        return voice || null;
    }

    speak(text: string, lang: string = 'en') {
        if (!('speechSynthesis' in window)) {
            console.error("Speech Synthesis not supported in this browser/environment");
            return;
        }

        if (!text || !text.trim()) return;

        console.log(`🗣️ Speaking in [${lang}]: "${text.substring(0, 50)}..."`);
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const selectedVoice = this.getBestVoice(lang);

        if (selectedVoice) {
            console.log(`🎤 Selected voice: ${selectedVoice.name} (${selectedVoice.lang})`);
            utterance.voice = selectedVoice;
            // Use the specific voice lang code if available (e.g. hi-IN)
            utterance.lang = selectedVoice.lang;
        } else {
            console.warn(`⚠️ No voice found for language: ${lang}. Available voices:`, this.voices.map(v => `${v.name} (${v.lang})`));
            utterance.lang = lang;
        }

        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
            this.isSpeaking = false;
        };

        utterance.onerror = (event) => {
            console.error('SpeechSynthesisUtterance error:', event);
            this.isSpeaking = false;
        };

        window.speechSynthesis.speak(utterance);
    }

    stop() {
        if (window.speechSynthesis.speaking) {
            window.speechSynthesis.cancel();
            this.isSpeaking = false;
        }
    }

    isCurrentlySpeaking() {
        return this.isSpeaking;
    }
}

export const ttsService = new TextToSpeechService();
