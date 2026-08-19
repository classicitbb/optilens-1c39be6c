import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";


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
  const [isTranscribing, setIsTranscribing] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const startSequenceRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const gotLiveTranscriptRef = useRef(false);
  const recorderMimeRef = useRef<string>("audio/webm");
  const peakLevelRef = useRef(0);
  const settingsRef = useRef(DEFAULT_SETTINGS);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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

  const transcribeRecording = useCallback(async () => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (gotLiveTranscriptRef.current || chunks.length === 0) return;
    const blob = new Blob(chunks, { type: recorderMimeRef.current || "audio/webm" });
    if (blob.size < 2000 || peakLevelRef.current < 4) {
      setError("No speech was picked up — check the selected microphone, then hold the button and speak.");
      return;
    }
    setIsTranscribing(true);
    try {
      const buffer = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (let index = 0; index < buffer.length; index += 8192) {
        binary += String.fromCharCode(...buffer.subarray(index, index + 8192));
      }
      const { data, error: invokeError } = await supabase.functions.invoke("voice-transcribe", {
        body: { audio: btoa(binary), mimeType: blob.type, vocabulary: settingsRef.current.vocabulary },
      });
      if (invokeError) throw invokeError;
      const transcript = String((data as { transcript?: string } | null)?.transcript ?? "").trim();
      if (transcript) {
        setError(null);
        onTranscript(transcript, 0.9);
      } else {
        setError("Nothing was recognised in that recording. Try again or type the command.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? `Transcription failed: ${caught.message}` : "Transcription failed.");
    } finally {
      setIsTranscribing(false);
    }
  }, [onTranscript]);


  const stop = useCallback(() => {
    startSequenceRef.current += 1;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = () => void transcribeRecording();
      recorder.stop();
    }
    setIsListening(false);
    releaseAudio();
  }, [releaseAudio, transcribeRecording]);


  useEffect(() => () => {
    recognitionRef.current?.abort();
    releaseAudio();
  }, [releaseAudio]);

  const start = useCallback(async () => {
    const Constructor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (isListening) return;
    const startSequence = ++startSequenceRef.current;
    setError(null);
    gotLiveTranscriptRef.current = false;
    chunksRef.current = [];
    peakLevelRef.current = 0;
    try {
      // Web Speech must start inside the initiating press. Waiting for
      // getUserMedia/device enumeration first can make Chromium treat the
      // later recognition.start() as detached from the user's gesture and
      // emit `not-allowed` even after microphone access was granted.
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
        const next = Math.min(100, Math.round((average / 128) * 100));
        peakLevelRef.current = Math.max(peakLevelRef.current, next);
        setLevel(next);
        animationRef.current = window.requestAnimationFrame(meter);
      };
      meter();

      if (typeof MediaRecorder !== "undefined") {
        try {
          const recorder = new MediaRecorder(stream);
          recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
          };
          recorderMimeRef.current = recorder.mimeType || "audio/webm";
          recorder.start();
          recorderRef.current = recorder;
        } catch {
          recorderRef.current = null;
        }
      }

      if (!Constructor) {
        if (!recorderRef.current) {
          setError("This browser cannot capture voice input. Type the command instead.");
          releaseAudio();
          return;
        }
        setIsListening(true);
        return;
      }

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
        if (transcript.trim()) gotLiveTranscriptRef.current = true;
        onTranscript(transcript.trim(), confidenceCount ? confidence / confidenceCount : 1);
        if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
        stopTimerRef.current = window.setTimeout(stop, settings.silenceTimeoutMs);
      };
      recognition.onerror = (event) => {
        const code = event.error ?? "unknown error";
        if (code === "not-allowed" || code === "service-not-allowed") {
          setError("Microphone or speech permission was denied.");
        } else if (code === "network" || code === "language-not-supported" || code === "audio-capture") {
          // Browser speech service is unavailable here (common inside preview frames);
          // the recorded audio is transcribed server-side on release instead.
          setError(null);
        } else if (code !== "no-speech" && code !== "aborted") {
          setError(`Speech recognition stopped: ${code}`);
        }
        recognitionRef.current = null;
        if (!recorderRef.current) stop();
      };
      recognition.onend = () => {
        recognitionRef.current = null;
        setIsListening(false);
        releaseAudio();
      };
      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
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

  return { settings, setSettings, devices, activeDeviceLabel, isListening, isTranscribing, level, error, start, stop };
};
