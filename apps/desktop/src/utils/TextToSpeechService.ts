export class TextToSpeechService {
    private isSpeaking = false;

    speak(text: string, lang: string = 'en') {
        if (!('speechSynthesis' in window)) {
            console.error("Speech Synthesis not supported in this browser/environment");
            return;
        }

        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Find a calm/natural voice
        const voices = window.speechSynthesis.getVoices();
        let selectedVoice = voices.find(v => v.lang.startsWith(lang) && (v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Natural')));

        if (!selectedVoice) {
            selectedVoice = voices.find(v => v.lang.startsWith(lang));
        }

        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }

        utterance.lang = lang;
        utterance.rate = 0.95; // Slightly slower for a calm mentor feel
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            this.isSpeaking = true;
        };

        utterance.onend = () => {
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
