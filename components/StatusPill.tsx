// app/components/StatusPill.tsx
export type BetState = "Won" | "Lost" | "Void" | "Open" | "Pending" | string;

export default function StatusPill({ state }: { state: BetState }) {
  const map: Record<string, string> = {
    Won: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
    Lost: "border-rose-500/40 text-rose-300 bg-rose-500/10",
    Void: "border-slate-500/40 text-slate-300 bg-slate-500/10",
    Open: "border-amber-500/40 text-amber-300 bg-amber-500/10",
    Pending: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  };
  const cls =
    map[state] ?? "border-slate-500/40 text-slate-300 bg-slate-500/10"; // fallback

  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        "border",
        cls,
      ].join(" ")}
    >
      {state}
    </span>
  );
}
