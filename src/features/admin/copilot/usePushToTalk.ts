import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  formatVoiceTranscript,
  isLikelyTranscriptionPromptEcho,
} from "@/features/admin/copilot/transcriptFormatting";

export type SpeechSettings = {
  deviceId: string;
  language: string;
  confidenceThreshold: number;
  vocabulary: string;
};

type PushToTalkOptions = Partial<Pick<SpeechSettings, "language" | "vocabulary">>;

const DEFAULT_SETTINGS: SpeechSettings = {
  deviceId: "default",
  language: "en-BB",
  confidenceThreshold: 0.65,
  vocabulary: "Innovations, ERP, Classic Visions, portal access, pricelist, lens",
};

export const usePushToTalk = (
  onTranscript: (transcript: string, confidence: number) => void,
  options: PushToTalkOptions = {},
) => {
  const [settings, setSettings] = useState<SpeechSettings>(() => ({ ...DEFAULT_SETTINGS, ...options }));
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationRef = useRef<number | null>(null);
  const startSequenceRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const recorderMimeRef = useRef("audio/webm");
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
    if (chunks.length === 0) return;
    const blob = new Blob(chunks, { type: recorderMimeRef.current || "audio/webm" });
    if (blob.size < 2000 || peakLevelRef.current < 4) {
      setError("No speech was picked up — check the selected microphone, then click Record and speak before clicking Stop.");
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
        body: {
          audio: btoa(binary),
          mimeType: blob.type,
          language: settingsRef.current.language,
          vocabulary: settingsRef.current.vocabulary,
        },
      });
      if (invokeError) throw invokeError;
      const payload = data as { transcript?: string; confidence?: number } | null;
      const transcript = formatVoiceTranscript(String(payload?.transcript ?? ""));
      if (isLikelyTranscriptionPromptEcho(transcript, settingsRef.current.vocabulary)) {
        setError("No speech was detected. Click Record, speak clearly, then click Stop.");
      } else if (transcript) {
        setError(null);
        onTranscript(transcript, typeof payload?.confidence === "number" ? payload.confidence : 0.9);
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
    const recorder = recorderRef.current;
    recorderRef.current = null;
    setIsStarting(false);
    setIsListening(false);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    releaseAudio();
  }, [releaseAudio]);

  useEffect(() => () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder && recorder.state !== "inactive") {
      recorder.onstop = null;
      recorder.stop();
    }
    releaseAudio();
  }, [releaseAudio]);

  const start = useCallback(async () => {
    if (isStarting || isListening || isTranscribing) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record audio. Type the command instead.");
      return;
    }

    const startSequence = ++startSequenceRef.current;
    setIsStarting(true);
    setError(null);
    chunksRef.current = [];
    peakLevelRef.current = 0;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: settings.deviceId === "default" ? true : { deviceId: { exact: settings.deviceId } },
      });
      if (startSequence !== startSequenceRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setIsStarting(false);
        return;
      }
      streamRef.current = stream;
      await refreshDevices();
      if (startSequence !== startSequenceRef.current) {
        setIsStarting(false);
        releaseAudio();
        return;
      }

      const audioContext = new window.AudioContext();
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

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        setIsListening(false);
        releaseAudio();
        void transcribeRecording();
      };
      recorderMimeRef.current = recorder.mimeType || "audio/webm";
      recorder.start();
      recorderRef.current = recorder;
      setIsStarting(false);
      setIsListening(true);
    } catch (caught) {
      recorderRef.current = null;
      setIsStarting(false);
      setIsListening(false);
      const message = caught instanceof Error ? caught.message : "Could not start the selected microphone.";
      setError(message.toLowerCase().includes("permission") || message.toLowerCase().includes("denied")
        ? "Microphone permission was denied. Allow microphone access and try again."
        : message);
      releaseAudio();
    }
  }, [isListening, isStarting, isTranscribing, refreshDevices, releaseAudio, settings.deviceId, transcribeRecording]);

  const activeDeviceLabel = devices.find((device) => device.deviceId === settings.deviceId)?.label
    || devices.find((device) => device.deviceId === "default")?.label
    || "System default microphone";

  return { settings, setSettings, devices, activeDeviceLabel, isStarting, isListening, isTranscribing, level, error, start, stop };
};
