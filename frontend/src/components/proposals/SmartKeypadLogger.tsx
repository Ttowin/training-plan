import { useState } from "react";
import { computeVolume, formatShorthand } from "../../utils/shorthandParser.js";
import type { LoggerProps } from "./types.js";

type Seg = "weight" | "reps" | "sets";

export function SmartKeypadLogger({ lastWeek, onLog }: LoggerProps) {
  const [weight, setWeight] = useState<string>(lastWeek?.weight != null ? String(lastWeek.weight) : "");
  const [bw, setBw] = useState<boolean>(lastWeek?.weight === null);
  const [reps, setReps] = useState<string>(lastWeek?.reps ? String(lastWeek.reps) : "");
  const [sets, setSets] = useState<string>(lastWeek?.sets ? String(lastWeek.sets) : "");
  const [active, setActive] = useState<Seg>("weight");

  const getters: Record<Seg, string> = { weight, reps, sets };
  const setters: Record<Seg, (v: string) => void> = { weight: setWeight, reps: setReps, sets: setSets };

  function press(key: string) {
    if (active === "weight" && bw) return;
    const cur = getters[active];
    if (key === "." ) {
      if (active !== "weight" || cur.includes(".")) return;
      setters[active](cur === "" ? "0." : cur + ".");
      return;
    }
    const next = (cur + key).replace(/^0+(?=\d)/, "");
    if (next.replace(".", "").length > 4) return;
    setters[active](next);
  }
  function backspace() {
    if (active === "weight" && bw) {
      setBw(false);
      return;
    }
    setters[active](getters[active].slice(0, -1));
  }
  function advance() {
    setActive((a) => (a === "weight" ? "reps" : a === "reps" ? "sets" : "weight"));
  }
  function toggleBw() {
    setBw((v) => !v);
    setWeight("");
    setActive("weight");
  }

  const wNum = bw ? null : parseFloat(weight);
  const rNum = parseInt(reps, 10);
  const sNum = parseInt(sets, 10);
  const valid = (bw || (!isNaN(wNum as number) && (wNum as number) > 0)) && rNum > 0 && sNum > 0;
  const volume = valid ? computeVolume(bw ? null : wNum, rNum, sNum) : 0;

  function submit() {
    if (!valid) return;
    onLog({
      method: "Smart Pad",
      summary: formatShorthand(bw ? null : wNum, rNum, sNum),
      volume,
    });
  }

  const segClass = (s: Seg) =>
    `flex-1 rounded-lg border px-2 py-3 text-center transition-colors cursor-pointer ${
      active === s ? "border-matrix-green bg-matrix-green-dark/40 shadow-matrix-sm" : "border-matrix-border bg-matrix-bg-card"
    }`;

  function Segment({ s, label, value }: { s: Seg; label: string; value: string }) {
    return (
      <div className={segClass(s)} onClick={() => setActive(s)} data-testid={`pad-seg-${s}`}>
        <div className="text-[10px] font-terminal text-matrix-text-muted uppercase tracking-widest">{label}</div>
        <div className={`font-terminal text-2xl tabular-nums mt-1 ${value ? "text-matrix-green" : "text-matrix-text-muted"}`}>
          {value || "–"}
          {active === s && <span className="animate-flicker text-matrix-green">_</span>}
        </div>
      </div>
    );
  }

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];

  return (
    <div className="space-y-4">
      <div className="flex items-stretch gap-2">
        <Segment s="weight" label="Weight" value={bw ? "BW" : weight} />
        <div className="flex items-center font-terminal text-matrix-text-muted text-xl">×</div>
        <Segment s="reps" label="Reps" value={reps} />
        <div className="flex items-center font-terminal text-matrix-text-muted text-xl">×</div>
        <Segment s="sets" label="Sets" value={sets} />
      </div>

      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={toggleBw}
          data-testid="pad-bw"
          className={`px-3 py-1.5 rounded border font-terminal text-[10px] uppercase tracking-widest transition-colors ${
            bw ? "border-matrix-cyan text-matrix-cyan bg-matrix-cyan/10" : "border-matrix-border text-matrix-text-muted hover:border-matrix-green hover:text-matrix-green"
          }`}
        >
          Bodyweight
        </button>
        <span className="font-terminal text-xs text-matrix-cyan tabular-nums">
          {valid ? `vol ${volume.toFixed(0)} kg` : "enter values"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            data-testid={`pad-key-${k}`}
            onClick={() => (k === "⌫" ? backspace() : press(k))}
            className="min-h-[52px] rounded-lg border border-matrix-border bg-matrix-bg-card font-terminal text-xl text-matrix-green hover:border-matrix-green hover:bg-matrix-green-dark/30 active:scale-95 transition-all"
          >
            {k}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={advance}
        data-testid="pad-next"
        className="w-full py-2.5 rounded-lg border border-matrix-border text-matrix-text-muted font-terminal text-xs uppercase tracking-widest hover:border-matrix-green hover:text-matrix-green transition-colors"
      >
        ▸ Next field
      </button>

      <button
        type="button"
        onClick={submit}
        disabled={!valid}
        data-testid="pad-log"
        className={`w-full py-4 rounded-xl font-terminal text-sm tracking-[0.15em] uppercase transition-colors ${
          valid ? "bg-matrix-green text-matrix-bg shadow-matrix-sm hover:bg-matrix-green-dim" : "bg-matrix-bg-card text-matrix-text-muted border border-matrix-border cursor-not-allowed"
        }`}
      >
        ▸ Log set
      </button>
    </div>
  );
}
