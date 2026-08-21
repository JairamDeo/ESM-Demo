import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Mic, Square } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: SpeechResultEvent) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
};

type SpeechResultEvent = {
  resultIndex: number;
  results: Array<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

function joinTranscript(base: string, extra: string) {
  const a = base.trimEnd();
  const b = extra.trim();
  if (!b) return a;
  if (!a) return b;
  return `${a} ${b}`;
}

function recognitionLang(uiLang: string) {
  // Hindi UI → Devanagari. English UI → English + Hinglish (Latin).
  return uiLang.startsWith("hi") ? "hi-IN" : "en-IN";
}

interface VoiceDescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const VoiceDescriptionField = memo(function VoiceDescriptionField({
  value,
  onChange,
  placeholder,
}: VoiceDescriptionFieldProps) {
  const { t, i18n } = useTranslation();
  const [listening, setListening] = useState(false);
  const valueRef = useRef(value);
  const committedRef = useRef(value);
  const sessionBaseRef = useRef(value);
  const listeningRef = useRef(false);
  const recRef = useRef<SpeechRec | null>(null);
  const rafRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activityRef = useRef(0);
  const onChangeRef = useRef(onChange);

  valueRef.current = value;
  onChangeRef.current = onChange;

  const stopWaveform = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    setListening(false);
    try {
      recRef.current?.stop();
    } catch {
      /* already stopped */
    }
    recRef.current = null;
    stopWaveform();
    onChangeRef.current(committedRef.current);
  }, [stopWaveform]);

  const startWaveform = useCallback(() => {
    const bars = 18;
    let tick = 0;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const el = canvasRef.current;
      if (!el) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 8 || h < 8) return;
      if (el.width !== Math.floor(w * dpr) || el.height !== Math.floor(h * dpr)) {
        el.width = Math.floor(w * dpr);
        el.height = Math.floor(h * dpr);
      }
      const g = el.getContext("2d");
      if (!g) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, w, h);
      tick += 1;
      activityRef.current *= 0.9;
      const voice = activityRef.current;
      const gap = 3;
      const barW = Math.max(2.5, (w - gap * (bars - 1)) / bars);
      const mid = h / 2;
      const accent = (getComputedStyle(el).getPropertyValue("--voice-bar") || "#826CF3").trim();
      const glow = (getComputedStyle(el).getPropertyValue("--voice-glow") || "#c4b5fd").trim();
      for (let i = 0; i < bars; i++) {
        const wave = 0.2 + Math.abs(Math.sin(tick / 8 + i * 0.42)) * (0.18 + voice * 0.7);
        const amp = Math.min(1, wave);
        const barH = Math.max(8, amp * (h - 2));
        const x = i * (barW + gap);
        const y = mid - barH / 2;
        const r = Math.min(2, barW / 2);
        g.shadowColor = glow || "#c4b5fd";
        g.shadowBlur = 10 + amp * 8;
        g.fillStyle = accent || "#826CF3";
        g.globalAlpha = 0.92;
        g.beginPath();
        g.moveTo(x + r, y);
        g.lineTo(x + barW - r, y);
        g.quadraticCurveTo(x + barW, y, x + barW, y + r);
        g.lineTo(x + barW, y + barH - r);
        g.quadraticCurveTo(x + barW, y + barH, x + barW - r, y + barH);
        g.lineTo(x + r, y + barH);
        g.quadraticCurveTo(x, y + barH, x, y + barH - r);
        g.lineTo(x, y + r);
        g.quadraticCurveTo(x, y, x + r, y);
        g.fill();
      }
      g.shadowBlur = 0;
      g.globalAlpha = 1;
    };
    draw();
  }, []);

  const startListening = useCallback(async () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error(t("voiceNotSupported"));
      return;
    }
    committedRef.current = valueRef.current;
    sessionBaseRef.current = valueRef.current;
    activityRef.current = 0;
    listeningRef.current = true;
    setListening(true);

    const rec = new Ctor();
    rec.lang = recognitionLang(i18n.language || "en");
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let finals = "";
      let interim = "";
      // Rebuild the full buffer every time so fast speech is not skipped.
      for (let i = 0; i < event.results.length; i++) {
        const piece = (event.results[i][0]?.transcript || "").trim();
        if (!piece) continue;
        activityRef.current = Math.min(1, activityRef.current + 0.55);
        if (event.results[i].isFinal) finals = joinTranscript(finals, piece);
        else interim = joinTranscript(interim, piece);
      }
      committedRef.current = joinTranscript(sessionBaseRef.current, finals);
      onChangeRef.current(joinTranscript(committedRef.current, interim));
    };

    rec.onerror = (event) => {
      const err = event.error || "";
      if (err === "not-allowed" || err === "service-not-allowed") {
        toast.error(t("voiceMicDenied"));
        stopListening();
        return;
      }
      if (err === "audio-capture") {
        toast.error(t("voiceMicDenied"));
        stopListening();
      }
    };

    rec.onend = () => {
      if (!listeningRef.current) return;
      // Keep the latest live text (including fast words not yet marked final).
      sessionBaseRef.current = valueRef.current;
      committedRef.current = valueRef.current;
      try {
        rec.start();
      } catch {
        window.setTimeout(() => {
          if (!listeningRef.current) return;
          try {
            rec.start();
          } catch {
            stopListening();
          }
        }, 40);
      }
    };

    recRef.current = rec;
    try {
      rec.start();
    } catch {
      toast.error(t("voiceNotSupported"));
      stopListening();
    }
  }, [i18n.language, stopListening, t]);

  const toggle = useCallback(() => {
    if (listeningRef.current) stopListening();
    else void startListening();
  }, [startListening, stopListening]);

  useEffect(() => {
    if (!listening) return;
    startWaveform();
    return () => stopWaveform();
  }, [listening, startWaveform, stopWaveform]);

  useEffect(() => () => stopListening(), [stopListening]);

  const supported = !!getSpeechRecognitionCtor();

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => {
          committedRef.current = e.target.value;
          onChange(e.target.value);
        }}
        rows={4}
        placeholder={placeholder}
        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 pb-14 pr-12 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors resize-none leading-relaxed"
      />

      {listening && (
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute bottom-2 left-3 right-12 h-10 [--voice-bar:#826CF3] [--voice-glow:#c4b5fd] dark:[--voice-bar:#c4b5fd] dark:[--voice-glow:#e9d5ff]"
          aria-hidden
        />
      )}

      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-pressed={listening}
          aria-label={listening ? t("voiceStop") : t("voiceStart")}
          title={listening ? t("voiceStop") : t("voiceStart")}
          className={`absolute bottom-2.5 right-2.5 w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
            listening
              ? "bg-destructive text-destructive-foreground"
              : "bg-primary/15 text-primary hover:bg-primary/25"
          }`}
        >
          {listening ? <Square className="w-3.5 h-3.5 fill-current" /> : <Mic className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
});

export default VoiceDescriptionField;
