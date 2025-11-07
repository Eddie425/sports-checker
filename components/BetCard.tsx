// app/components/BetCard.tsx
import StatusPill from "./StatusPill";

type Leg = {
  eventName: string;
  marketName: string;
  selectionName: string;
  eventResult?: string | null;
  tsEventTime?: string | null;
  betLegStatus?: string | null; // Won/Lost/Void/Open...
};

export default function BetCard({ leg }: { leg: Leg }) {
  // 安全字串
  const safe = (s?: string | null) => (s && s.trim()) || "—";
  const time =
    leg.tsEventTime?.replace(" ", " ") ?? // non-breaking space，避免換行
    "";

  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 hover:bg-neutral-900/70">
      {/* 頂列：賽事名稱 + 狀態膠囊右對齊 */}
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium leading-6 text-neutral-200">
          {safe(leg.eventName)}
        </div>
        <StatusPill state={(leg.betLegStatus || "Open") as any} />
      </div>

      {/* 內容列：固定標籤寬度 => 和官網一樣整齊 */}
      <div className="mt-3 grid gap-1.5">
        <Row label="Market" value={safe(leg.marketName)} />
        <Row label="Pick" value={safe(leg.selectionName)} />
        <Row label="ET" value={time} />
        <Row label="Score" value={safe(leg.eventResult)} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="w-28 shrink-0 select-none text-neutral-400">
        {label} :
      </div>
      <div className="min-w-0 text-neutral-100">{value}</div>
    </div>
  );
}
