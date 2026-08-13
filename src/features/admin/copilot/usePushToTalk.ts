import { useCallback, useEffect, useRef, useState } from "react";

type SpeechRecognitionEventLike = Event & {
  results: ArrayLike<ArrayLike<{ transcript: string; confidence: number }> & { isFinal?: boolean }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  grammars?: unknown;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: Event & { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechGrammarListLike = { addFromString: (grammar: string, weight?: number) => void };
type SpeechGrammarListConstructor = new () => SpeechGrammarListLike;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
    SpeechGrammarList?: SpeechGrammarListConstructor;
    webkitSpeechGrammarList?: SpeechGrammarListConstructor;
  }
}

export type SpeechSettings = {
  deviceId: string;
  language: "en-BB" | "en-US" | "en-GB";
  silenceTimeoutMs: number;
  confidenceThreshold: number;
  vocabulary: string;
};

const DEFAULT_SETTINGS: SpeechSettings = {
  deviceId: "default",
  language: "en-BB",
  silenceTimeoutMs: 1500,
  confidenceThreshold: 0.65,
  vocabulary: "Innovations, ERP, Classic Visions, portal access, pricelist, lens",
};

export const usePushToTalk = (onTranscript: (transcript: string, confidence: number) => void) => {
  const [settings, setSettings] = useState<SpeechSettings>(DEFAULT_SETTINGS);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const startSequenceRef = useRef(0);

  const refreshDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    const available = await navigator.mediaDevices.enumerateDevices();
    setDevices(available.filter((device) => device.kind === "audioinput"));
  }, []);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refreshDevices(), 0);
    const handler = () => void refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      window.clearTimeout(initialRefresh);
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [refreshDevices]);

  const releaseAudio = useCallback(() => {
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    if (animationRef.current != null) window.cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    void audioContextRef.current?.close();
    audioContextRef.current = null;
    setLevel(0);
  }, []);

  const stop = useCallback(() => {
    startSequenceRef.current += 1;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false);
    releaseAudio();
  }, [releaseAudio]);

  useEffect(() => () => {
    recognitionRef.current?.abort();
    releaseAudio();
  }, [releaseAudio]);

  const start = useCallback(async () => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Constructor) {
      setError("Push-to-talk requires Chrome or Edge speech recognition.");
      return;
    }
    if (isListening) return;
    const startSequence = ++startSequenceRef.current;
    setError(null);
    try {
      // Web Speech must start inside the initiating press. Waiting for
      // getUserMedia/device enumeration first can make Chromium treat the
      // later recognition.start() as detached from the user's gesture and
      // emit `not-allowed` even after microphone access was granted.
      const recognition = new Constructor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = settings.language;
      const GrammarConstructor = window.SpeechGrammarList ?? window.webkitSpeechGrammarList;
      const terms = settings.vocabulary.split(",").map((term) => term.trim()).filter(Boolean);
      if (GrammarConstructor && terms.length > 0) {
        const grammar = new GrammarConstructor();
        grammar.addFromString(`#JSGF V1.0; grammar cv; public <term> = ${terms.join(" | ")} ;`, 1);
        recognition.grammars = grammar;
      }
      recognition.onresult = (event) => {
        let transcript = "";
        let confidence = 0;
        let confidenceCount = 0;
        for (let index = 0; index < event.results.length; index += 1) {
          const alternative = event.results[index]?.[0];
          if (!alternative) continue;
          transcript += `${alternative.transcript} `;
          if (alternative.confidence > 0) {
            confidence += alternative.confidence;
            confidenceCount += 1;
          }
        }
        onTranscript(transcript.trim(), confidenceCount ? confidence / confidenceCount : 1);
        if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = window.setTimeout(stop, settings.silenceTimeoutMs);
      };
      recognition.onerror = (event) => {
        setError(event.error === "not-allowed" ? "Microphone or speech permission was denied." : `Speech recognition stopped: ${event.error ?? "unknown error"}`);
        stop();
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        releaseAudio();
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: settings.deviceId === "default" ? true : { deviceId: { exact: settings.deviceId } },
      });
      if (startSequence !== startSequenceRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      await refreshDevices();
      if (startSequence !== startSequenceRef.current) {
        releaseAudio();
        return;
      }
      const AudioContextClass = window.AudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      const values = new Uint8Array(analyser.frequencyBinCount);
      const meter = () => {
        analyser.getByteFrequencyData(values);
        const average = values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
        setLevel(Math.min(100, Math.round((average / 128) * 100)));
        animationRef.current = window.requestAnimationFrame(meter);
      };
      meter();
    } catch (caught) {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
      setIsListening(false);
      setError(caught instanceof Error ? caught.message : "Could not start the selected microphone.");
      releaseAudio();
    }
  }, [isListening, onTranscript, refreshDevices, releaseAudio, settings, stop]);

  const activeDeviceLabel = devices.find((device) => device.deviceId === settings.deviceId)?.label
    || devices.find((device) => device.deviceId === "default")?.label
    || "System default microphone";

  return { settings, setSettings, devices, activeDeviceLabel, isListening, level, error, start, stop };
};
