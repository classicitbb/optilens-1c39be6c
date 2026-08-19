import { useCallback, useEffect, useRef, useState } from "react";

/* ─── Web Speech API type declarations ──────────────────────────────────────── */

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  onspeechend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

/* ─── Browser capability detection ──────────────────────────────────────────── */

const getSpeechRecognitionConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
};

const isSpeechSynthesisSupported = (): boolean =>
  typeof window !== "undefined" && "speechSynthesis" in window;

/* ─── Voice selection ───────────────────────────────────────────────────────── */

const PREFERRED_VOICE_PATTERNS = [
  /google.*us.*english/i,
  /google.*english/i,
  /microsoft.*zira/i,
  /microsoft.*david/i,
  /microsoft.*mark/i,
  /samantha/i,
  /alex/i,
];

const pickBestVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const englishVoices = voices.filter((v) => /^en[-_]/i.test(v.lang));
  if (englishVoices.length === 0) return null;

  for (const pattern of PREFERRED_VOICE_PATTERNS) {
    const match = englishVoices.find((v) => pattern.test(v.name));
    if (match) return match;
  }

  // Prefer a non-default local voice if available, otherwise first English
  return englishVoices.find((v) => v.localService && !v.default) ?? englishVoices[0];
};

/* ─── Strip markdown for TTS ────────────────────────────────────────────────── */

const stripMarkdownForSpeech = (text: string): string =>
  text
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/!\[.*?\]\(.+?\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/>\s*/gm, "")
    .replace(/\n{2,}/g, ". ")
    .replace(/\n/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

/* ─── Hook interface ────────────────────────────────────────────────────────── */

export interface VoiceEngineState {
  /** Whether the browser supports speech recognition (STT) */
  sttSupported: boolean;
  /** Whether the browser supports speech synthesis (TTS) */
  ttsSupported: boolean;
  /** Whether the microphone is actively listening */
  isListening: boolean;
  /** Whether the assistant is currently speaking */
  isSpeaking: boolean;
  /** Final recognized transcript from the current listening session */
  transcript: string;
  /** Interim (in-progress) transcript while the user is still speaking */
  interimTranscript: string;
  /** Whether auto-read-aloud is enabled for assistant responses */
  autoSpeak: boolean;
  /** Start or stop listening */
  toggleListening: () => void;
  /** Speak the given text aloud */
  speak: (text: string) => void;
  /** Stop any ongoing speech synthesis */
  stopSpeaking: () => void;
  /** Toggle auto-speak mode */
  toggleAutoSpeak: () => void;
  /** Clear the current transcript */
  clearTranscript: () => void;
}

/* ─── The hook ──────────────────────────────────────────────────────────────── */

export function useVoiceEngine(options?: {
  onFinalTranscript?: (text: string) => void;
  lang?: string;
}): VoiceEngineState {
  const { onFinalTranscript, lang = "en-US" } = options ?? {};

  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [autoSpeak, setAutoSpeak] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const intentionalStopRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  onFinalTranscriptRef.current = onFinalTranscript;

  // Preferred voice cache
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const sttSupported = typeof window !== "undefined" && getSpeechRecognitionConstructor() !== null;
  const ttsSupported = isSpeechSynthesisSupported();

  // Load voices (they can arrive asynchronously in Chrome)
  useEffect(() => {
    if (!ttsSupported) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      voiceRef.current = pickBestVoice(voices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, [ttsSupported]);

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        intentionalStopRef.current = true;
        recognitionRef.current.abort();
        recognitionRef.current = null;
      }
      if (ttsSupported) {
        window.speechSynthesis.cancel();
      }
    };
  }, [ttsSupported]);

  const stopSpeaking = useCallback(() => {
    if (!ttsSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [ttsSupported]);

  const speak = useCallback(
    (text: string) => {
      if (!ttsSupported || !text.trim()) return;

      // Cancel any in-progress speech
      window.speechSynthesis.cancel();

      const cleaned = stripMarkdownForSpeech(text);
      if (!cleaned) return;

      // Split into chunks for long text (Chrome has a ~15s utterance limit)
      const MAX_CHUNK = 200;
      const sentences = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
      const chunks: string[] = [];
      let current = "";

      for (const sentence of sentences) {
        if ((current + sentence).length > MAX_CHUNK && current) {
          chunks.push(current.trim());
          current = sentence;
        } else {
          current += sentence;
        }
      }
      if (current.trim()) chunks.push(current.trim());

      setIsSpeaking(true);

      chunks.forEach((chunk, index) => {
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = lang;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        if (voiceRef.current) {
          utterance.voice = voiceRef.current;
        }

        if (index === chunks.length - 1) {
          utterance.onend = () => setIsSpeaking(false);
          utterance.onerror = () => setIsSpeaking(false);
        }

        window.speechSynthesis.speak(utterance);
      });
    },
    [lang, ttsSupported],
  );

  const startListening = useCallback(() => {
    const RecognitionCtor = getSpeechRecognitionConstructor();
    if (!RecognitionCtor) return;

    // Stop TTS when mic opens (duplex courtesy)
    stopSpeaking();

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;
    recognition.maxAlternatives = 1;

    let finalAccumulated = "";

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript("");
      setInterimTranscript("");
      finalAccumulated = "";
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      let finalText = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalText += text;
        } else {
          interim += text;
        }
      }

      if (finalText) {
        finalAccumulated += finalText;
        setTranscript(finalAccumulated);
      }
      setInterimTranscript(interim);
    };

    recognition.onspeechend = () => {
      // The user stopped speaking — stop recognition after a brief delay
      // so any final results can arrive
      setTimeout(() => {
        intentionalStopRef.current = true;
        recognition.stop();
      }, 800);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // "aborted" is intentional, "no-speech" is a timeout — both non-fatal
      if (event.error === "aborted" || event.error === "no-speech") return;
      console.warn("[VoiceEngine] recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript("");
      recognitionRef.current = null;

      if (finalAccumulated.trim() && intentionalStopRef.current) {
        onFinalTranscriptRef.current?.(finalAccumulated.trim());
      }

      intentionalStopRef.current = false;
    };

    recognitionRef.current = recognition;
    intentionalStopRef.current = false;

    try {
      recognition.start();
    } catch (err) {
      console.warn("[VoiceEngine] Failed to start recognition:", err);
      setIsListening(false);
    }
  }, [lang, stopSpeaking]);

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    intentionalStopRef.current = true;
    recognitionRef.current.stop();
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeak((prev) => !prev);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript("");
    setInterimTranscript("");
  }, []);

  return {
    sttSupported,
    ttsSupported,
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    autoSpeak,
    toggleListening,
    speak,
    stopSpeaking,
    toggleAutoSpeak,
    clearTranscript,
  };
}
