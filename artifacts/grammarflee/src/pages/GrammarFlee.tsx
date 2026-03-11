import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap, Lock, AlertTriangle, Type, PenTool, BookOpen, Shuffle,
  Activity, X, ChevronRight, Eye
} from "lucide-react";

interface MangleError {
  type: "spelling" | "punctuation" | "grammar" | "wordOrder";
  original: string;
  destroyed: string;
  explanation: string;
  startIndex: number;
  length: number;
}

interface MangleResponse {
  destroyedText: string;
  errors: MangleError[];
  chaosScore: number;
}

interface ChaosSliders {
  spelling: number;
  punctuation: number;
  grammar: number;
  wordOrder: number;
}

interface ActiveError {
  error: MangleError;
  x: number;
  y: number;
}

const ERROR_ICONS = {
  spelling: Type,
  punctuation: PenTool,
  grammar: BookOpen,
  wordOrder: Shuffle,
};

const ERROR_LABELS = {
  spelling: "Spelling",
  punctuation: "Punctuation",
  grammar: "Grammar",
  wordOrder: "Word Order",
};

const SARCASTIC_LOADING = [
  "Corrupting your words...",
  "Unleashing linguistic chaos...",
  "Destroying perfectly good grammar...",
  "Making linguists cry...",
  "Annihilating coherence...",
  "Converting English to Chaos...",
];

function ChaosMeter({ score }: { score: number }) {
  const radius = 54;
  const circumference = Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const hue = Math.round(120 - (score / 100) * 120);
  const color = score > 60 ? "#ff3333" : score > 30 ? "#ff8800" : "#33cc66";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-20">
        <svg width="128" height="80" viewBox="0 0 128 80" className="overflow-visible">
          <path
            d="M 14 74 A 54 54 0 0 1 114 74"
            fill="none"
            stroke="hsl(220, 10%, 18%)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M 14 74 A 54 54 0 0 1 114 74"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: "stroke-dashoffset 0.8s ease-in-out, stroke 0.8s ease-in-out",
              filter: `drop-shadow(0 0 6px ${color})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <motion.span
            key={score}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-bold"
            style={{ color }}
          >
            {score}
          </motion.span>
        </div>
      </div>
    </div>
  );
}

function ChaosSlider({
  label,
  icon: Icon,
  value,
  onChange,
  colorClass,
}: {
  label: string;
  icon: React.ElementType;
  value: number;
  onChange: (v: number) => void;
  colorClass: string;
}) {
  const pct = (value / 100) * 100;
  const bg = `linear-gradient(to right, ${colorClass === "orange" ? "#ff6600" : "#ff3333"} ${pct}%, hsl(220, 10%, 20%) ${pct}%)`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5" style={{ color: colorClass === "orange" ? "#ff6600" : "#ff3333" }} />
          <span className="text-xs font-medium text-[hsl(30,10%,75%)]">{label}</span>
        </div>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color: colorClass === "orange" ? "#ff6600" : "#ff3333" }}
        >
          {value}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="chaos-slider w-full"
        style={{ background: bg }}
      />
    </div>
  );
}

function MangleErrorPopup({ activeError, onClose }: { activeError: ActiveError; onClose: () => void }) {
  const Icon = ERROR_ICONS[activeError.error.type];
  const isSpelling = activeError.error.type === "spelling";
  const accentColor = isSpelling ? "#ff3333" : "#ff8800";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -8 }}
        transition={{ duration: 0.15 }}
        className="fixed z-50 max-w-xs rounded-lg border p-4 shadow-xl"
        style={{
          left: Math.min(activeError.x, window.innerWidth - 320),
          top: activeError.y + 20,
          backgroundColor: "hsl(220, 14%, 10%)",
          borderColor: accentColor + "44",
          boxShadow: `0 0 0 1px ${accentColor}33, 0 8px 32px rgba(0,0,0,0.7)`,
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-[hsl(220,8%,50%)] hover:text-white transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <div
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: accentColor + "22" }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: accentColor }}>
            {ERROR_LABELS[activeError.error.type]} Chaos
          </span>
        </div>

        <div className="flex items-center gap-2 mb-3 text-sm">
          <span className="line-through text-[hsl(220,8%,50%)] bg-[hsl(220,12%,14%)] px-2 py-0.5 rounded text-xs">
            {activeError.error.original}
          </span>
          <ChevronRight className="w-3 h-3 text-[hsl(220,8%,50%)]" />
          <span
            className="font-semibold px-2 py-0.5 rounded text-xs"
            style={{ color: accentColor, backgroundColor: accentColor + "18" }}
          >
            {activeError.error.destroyed}
          </span>
        </div>

        <p className="text-xs text-[hsl(30,10%,72%)] leading-relaxed italic">
          "{activeError.error.explanation}"
        </p>
      </motion.div>
    </AnimatePresence>
  );
}

function DestructionPane({
  result,
  isLoading,
  onErrorClick,
}: {
  result: MangleResponse | null;
  isLoading: boolean;
  onErrorClick: (err: MangleError, x: number, y: number) => void;
}) {
  const loadingMsg = SARCASTIC_LOADING[Math.floor(Math.random() * SARCASTIC_LOADING.length)];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <div className="relative w-16 h-16">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 rounded-full border-2 border-transparent"
            style={{ borderTopColor: "#ff6600", borderRightColor: "#ff330044" }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap className="w-6 h-6 text-[#ff6600]" />
          </div>
        </div>
        <motion.p
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="text-sm text-[hsl(30,10%,60%)] text-center"
        >
          {loadingMsg}
        </motion.p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 opacity-40">
        <AlertTriangle className="w-10 h-10 text-[#ff6600]" />
        <p className="text-sm text-[hsl(30,10%,60%)] text-center max-w-48">
          Your mangled text will appear here. Enter something and unleash chaos.
        </p>
      </div>
    );
  }

  const { destroyedText, errors } = result;

  const sortedErrors = [...errors].sort((a, b) => a.startIndex - b.startIndex);

  const segments: { text: string; error: MangleError | null }[] = [];
  let cursor = 0;

  for (const err of sortedErrors) {
    const start = err.startIndex;
    const end = start + err.length;

    if (start < cursor) continue;
    if (start > cursor) {
      segments.push({ text: destroyedText.slice(cursor, start), error: null });
    }
    segments.push({ text: destroyedText.slice(start, end), error: err });
    cursor = end;
  }

  if (cursor < destroyedText.length) {
    segments.push({ text: destroyedText.slice(cursor), error: null });
  }

  return (
    <div className="h-full overflow-y-auto p-1">
      <p className="text-base leading-8 text-[hsl(30,10%,85%)] whitespace-pre-wrap break-words font-serif select-text">
        {segments.map((seg, i) => {
          if (!seg.error) {
            return <span key={i}>{seg.text}</span>;
          }
          const cls = seg.error.type === "spelling" ? "squiggly-red" : "squiggly-orange";
          return (
            <span
              key={i}
              className={cls}
              onClick={(e) => {
                e.stopPropagation();
                onErrorClick(seg.error!, e.clientX, e.clientY);
              }}
            >
              {seg.text}
            </span>
          );
        })}
      </p>
    </div>
  );
}

function StatsSidebar({
  result,
}: {
  result: MangleResponse | null;
}) {
  const chaosScore = result?.chaosScore ?? 0;
  const linguisticHealth = 100 - chaosScore;

  const errorCounts = {
    spelling: 0,
    punctuation: 0,
    grammar: 0,
    wordOrder: 0,
  };

  if (result) {
    for (const err of result.errors) {
      if (err.type in errorCounts) {
        errorCounts[err.type]++;
      }
    }
  }

  const healthColor =
    linguisticHealth > 60 ? "#33cc66" : linguisticHealth > 30 ? "#ff8800" : "#ff3333";

  return (
    <div className="w-56 flex-shrink-0 flex flex-col gap-4 border-l border-[hsl(220,10%,16%)] p-4 overflow-y-auto">
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,50%)] mb-3">
          Chaos Meter
        </h3>
        <div className="bg-[hsl(220,12%,10%)] rounded-xl p-4 flex flex-col items-center border border-[hsl(220,10%,16%)]">
          <ChaosMeter score={chaosScore} />
          <p className="text-xs text-[hsl(220,8%,50%)] mt-1">/ 100</p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,50%)] mb-3">
          Linguistic Health
        </h3>
        <div className="bg-[hsl(220,12%,10%)] rounded-xl p-4 border border-[hsl(220,10%,16%)]">
          <div className="flex items-end gap-1 mb-2">
            <motion.span
              key={linguisticHealth}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-3xl font-bold"
              style={{ color: healthColor }}
            >
              {linguisticHealth}
            </motion.span>
            <span className="text-sm text-[hsl(220,8%,50%)] mb-1">%</span>
          </div>
          <div className="w-full h-2 bg-[hsl(220,10%,16%)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: healthColor }}
              animate={{ width: `${linguisticHealth}%` }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            />
          </div>
          <p className="text-xs text-[hsl(220,8%,50%)] mt-2">
            {linguisticHealth > 75
              ? "Still readable (barely)"
              : linguisticHealth > 50
              ? "Questionable at best"
              : linguisticHealth > 25
              ? "Thoroughly mangled"
              : "Linguistically deceased"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,50%)] mb-3">
          Error Breakdown
        </h3>
        <div className="space-y-2">
          {(["spelling", "punctuation", "grammar", "wordOrder"] as const).map((type) => {
            const Icon = ERROR_ICONS[type];
            const count = errorCounts[type];
            const isSpelling = type === "spelling";
            const color = isSpelling ? "#ff3333" : "#ff8800";
            return (
              <div
                key={type}
                className="flex items-center gap-2 bg-[hsl(220,12%,10%)] rounded-lg px-3 py-2 border border-[hsl(220,10%,16%)]"
              >
                <Icon className="w-3.5 h-3.5 flex-shrink-0" style={{ color }} />
                <span className="text-xs text-[hsl(30,10%,72%)] flex-1">{ERROR_LABELS[type]}</span>
                <motion.span
                  key={count}
                  initial={{ scale: 1.3, opacity: 0.5 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-xs font-bold tabular-nums"
                  style={{ color: count > 0 ? color : "hsl(220, 8%, 40%)" }}
                >
                  {count}
                </motion.span>
              </div>
            );
          })}
        </div>

        {result && (
          <p className="text-xs text-[hsl(220,8%,50%)] mt-3 text-center">
            {result.errors.length} total corruption{result.errors.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="mt-auto pt-2 border-t border-[hsl(220,10%,16%)]">
        <p className="text-[10px] text-[hsl(220,8%,35%)] text-center leading-tight">
          GrammarFlee™<br />
          <span className="text-[#ff6600] opacity-70">Proudly ruining language since 2026</span>
        </p>
      </div>
    </div>
  );
}

export default function GrammarFlee() {
  const [inputText, setInputText] = useState(
    "The quick brown fox jumps over the lazy dog. This is a perfectly well-written sentence with correct grammar, proper punctuation, and sensible word order."
  );
  const [sliders, setSliders] = useState<ChaosSliders>({
    spelling: 50,
    punctuation: 50,
    grammar: 50,
    wordOrder: 50,
  });
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<MangleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<ActiveError | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMangle = useCallback(async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to destroy.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your Anthropic API key.");
      return;
    }

    setError(null);
    setIsLoading(true);
    setActiveError(null);
    setResult(null);

    try {
      const response = await fetch("/api/mangle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText,
          spellingChaos: sliders.spelling,
          punctuationChaos: sliders.punctuation,
          grammarChaos: sliders.grammar,
          wordOrderChaos: sliders.wordOrder,
          apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Something went wrong.");
        return;
      }

      setResult(data);
    } catch {
      setError("Failed to connect to the chaos engine. Try again.");
    } finally {
      setIsLoading(false);
    }
  }, [inputText, sliders, apiKey]);

  const handleErrorClick = useCallback((err: MangleError, x: number, y: number) => {
    setActiveError((prev) =>
      prev?.error === err ? null : { error: err, x, y }
    );
  }, []);

  return (
    <div
      ref={containerRef}
      className="h-screen flex flex-col bg-[hsl(220,14%,7%)] text-[hsl(30,10%,90%)] overflow-hidden"
      onClick={() => setActiveError(null)}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-[hsl(220,10%,14%)] bg-[hsl(220,14%,8%)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#ff6600]">
            <Zap className="w-4 h-4 text-[hsl(220,14%,7%)]" />
          </div>
          <div>
            <h1 className="text-xl font-bold glow-orange text-[#ff6600] leading-none">
              GrammarFlee
            </h1>
            <p className="text-[10px] text-[hsl(220,8%,45%)] leading-none mt-0.5">
              The Anti-Grammarly™
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[hsl(220,8%,50%)]" />
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              placeholder="sk-ant-... (Anthropic API Key)"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="text-xs bg-[hsl(220,12%,12%)] border border-[hsl(220,10%,20%)] rounded-lg px-3 py-1.5 w-64 text-[hsl(30,10%,80%)] placeholder:text-[hsl(220,8%,40%)] focus:outline-none focus:border-[#ff6600] focus:ring-1 focus:ring-[#ff660033] transition-colors"
            />
            <button
              onClick={() => setShowApiKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[hsl(220,8%,45%)] hover:text-[hsl(30,10%,70%)] transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
          </div>
          {apiKey && (
            <div className="w-2 h-2 rounded-full bg-[#33cc66] shadow-[0_0_6px_#33cc66]" />
          )}
        </div>
      </header>

      {/* Main layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Editor */}
        <div className="w-[42%] flex flex-col border-r border-[hsl(220,10%,14%)]">
          {/* Chaos sliders */}
          <div className="px-5 py-4 border-b border-[hsl(220,10%,14%)] bg-[hsl(220,14%,8%)] flex-shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#ff6600]" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,55%)]">
                Chaos Sliders
              </h2>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <ChaosSlider
                label="Spelling"
                icon={Type}
                value={sliders.spelling}
                onChange={(v) => setSliders((s) => ({ ...s, spelling: v }))}
                colorClass="red"
              />
              <ChaosSlider
                label="Punctuation"
                icon={PenTool}
                value={sliders.punctuation}
                onChange={(v) => setSliders((s) => ({ ...s, punctuation: v }))}
                colorClass="orange"
              />
              <ChaosSlider
                label="Grammar"
                icon={BookOpen}
                value={sliders.grammar}
                onChange={(v) => setSliders((s) => ({ ...s, grammar: v }))}
                colorClass="orange"
              />
              <ChaosSlider
                label="Word Order"
                icon={Shuffle}
                value={sliders.wordOrder}
                onChange={(v) => setSliders((s) => ({ ...s, wordOrder: v }))}
                colorClass="orange"
              />
            </div>
          </div>

          {/* Text area */}
          <div className="flex-1 flex flex-col p-4 gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,55%)]">
                Clean Input
              </h2>
              <div className="flex-1 h-px bg-[hsl(220,10%,16%)]" />
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter your perfectly good text here..."
              className="flex-1 resize-none bg-[hsl(220,12%,10%)] border border-[hsl(220,10%,16%)] rounded-xl p-4 text-sm text-[hsl(30,10%,85%)] placeholder:text-[hsl(220,8%,35%)] focus:outline-none focus:border-[#ff660055] focus:ring-1 focus:ring-[#ff660022] transition-colors leading-relaxed font-serif"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-xs text-[#ff5555] bg-[#ff333311] border border-[#ff333333] rounded-lg px-3 py-2"
              >
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <motion.button
              onClick={handleMangle}
              disabled={isLoading}
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
              className="flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isLoading
                  ? "hsl(220, 12%, 15%)"
                  : "linear-gradient(135deg, #ff6600, #ff3300)",
                color: isLoading ? "hsl(220, 8%, 55%)" : "hsl(220, 14%, 7%)",
                boxShadow: isLoading
                  ? "none"
                  : "0 0 20px rgba(255, 102, 0, 0.3), 0 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <Zap className="w-4 h-4" />
              {isLoading ? "Corrupting..." : "Unleash Chaos"}
            </motion.button>
          </div>
        </div>

        {/* CENTER: Destruction pane */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-5 py-4 border-b border-[hsl(220,10%,14%)] bg-[hsl(220,14%,8%)] flex-shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#ff3333]" />
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[hsl(220,8%,55%)]">
                Destruction Output
              </h2>
              {result && (
                <span className="ml-auto text-xs text-[hsl(220,8%,45%)]">
                  Click highlighted words for explanations
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 p-5 overflow-hidden">
            <div
              className="h-full bg-[hsl(220,12%,9%)] rounded-xl border border-[hsl(220,10%,15%)] p-6 overflow-y-auto"
              style={{
                boxShadow: result
                  ? "inset 0 0 40px rgba(255, 51, 51, 0.04)"
                  : "none",
              }}
            >
              <DestructionPane
                result={result}
                isLoading={isLoading}
                onErrorClick={handleErrorClick}
              />
            </div>
          </div>
        </div>

        {/* RIGHT: Stats sidebar */}
        <StatsSidebar result={result} />
      </div>

      {/* Error popup */}
      {activeError && (
        <MangleErrorPopup
          activeError={activeError}
          onClose={() => setActiveError(null)}
        />
      )}
    </div>
  );
}
