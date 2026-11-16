"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

// ─────────────────────────────────────────────
// Browser speech-to-text (Web Speech API). Supported in Chrome / Android,
// which covers the Play Store (TWA) build. Indian English by default.
// ─────────────────────────────────────────────

interface SpeechResultEvent {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
}
interface Recognition {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((e: SpeechResultEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

const noopSubscribe = () => () => {};

function getCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * @param onText called with the full text (base + what's been said so far)
 */
export function useSpeech(onText: (text: string) => void, lang = "en-IN") {
  const [listening, setListening] = useState(false);
  // false on the server, real value in the browser — no hydration mismatch.
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => !!getCtor(),
    () => false,
  );
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => () => recRef.current?.stop(), []);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const start = useCallback(
    (baseText = "", onError?: (msg: string) => void) => {
      const Ctor = getCtor();
      if (!Ctor) {
        onError?.("Voice input isn't supported in this browser.");
        return;
      }
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;
      let committed = baseText && !baseText.endsWith(" ") ? `${baseText} ` : baseText;
      rec.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) committed += r[0].transcript;
          else interim += r[0].transcript;
        }
        onText(committed + interim);
      };
      rec.onerror = (e) => {
        if (e.error !== "no-speech" && e.error !== "aborted") onError?.(`Voice input failed: ${e.error}`);
        setListening(false);
      };
      rec.onend = () => setListening(false);
      recRef.current = rec;
      rec.start();
      setListening(true);
    },
    [lang, onText],
  );

  return { listening, supported, start, stop };
}
