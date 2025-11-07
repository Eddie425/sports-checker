// app/page.tsx
"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/** ---------------------------
 *  Types (subset of API fields)
 *  --------------------------*/
type ApiLeg = {
  idFOSelection?: number | string | null;
  mtag?: string | null;

  betTypeName: "Doubles" | "Treble" | string;
  betLegStatus?: "Won" | "Lost" | "Void" | "Open" | "Pending" | string | null;

  eventName?: string | null;
  marketName?: string | null;
  selectionName?: string | null;

  eventResult?: string | null;
  tsEventTime?: string | null;

  totalStake?: number | null; // duplicated on each leg within same bet
};

type CheckApiResp =
  | {
      status: number;
      data: ApiLeg[];
      error?: undefined;
    }
  | {
      status: number;
      error: string;
      data?: undefined;
    };

type OcrResp = {
  ok: boolean;
  error?: string;
  bestTicket?: string;
};

/** ---------------------------
 *  Small UI atoms
 *  --------------------------*/
function StatusPill({
  state,
}: {
  state: "Won" | "Lost" | "Void" | "Open" | "Pending" | string;
}) {
  const cls =
    state === "Won"
      ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
      : state === "Lost"
      ? "border-rose-500/40 text-rose-300 bg-rose-500/10"
      : state === "Void"
      ? "border-slate-500/40 text-slate-300 bg-slate-500/10"
      : "border-amber-500/40 text-amber-300 bg-amber-500/10";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium border",
        cls,
      ].join(" ")}
    >
      {state}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="w-28 shrink-0 select-none text-neutral-400">
        {label} :
      </div>
      <div className="min-w-0 text-neutral-100">{value || "—"}</div>
    </div>
  );
}

function BetCard({ leg }: { leg: ApiLeg }) {
  const safe = (s?: string | null) => (s?.trim() ? s.trim() : "—");
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/60 p-4 hover:bg-neutral-900/70">
      <div className="flex items-start justify-between gap-3">
        <div className="text-sm font-medium leading-6 text-neutral-200">
          {safe(leg.eventName)}
        </div>
        <StatusPill state={(leg.betLegStatus || "Open") as any} />
      </div>
      <div className="mt-3 grid gap-1.5">
        <Row label="Market" value={safe(leg.marketName)} />
        <Row label="Pick" value={safe(leg.selectionName)} />
        <Row
          label="ET"
          value={safe(
            leg.tsEventTime ? leg.tsEventTime.replace(" ", " ") : undefined
          )}
        />
        <Row label="Score" value={safe(leg.eventResult)} />
      </div>
    </div>
  );
}

function EmptyCard({ text = "無資料 / 或賽事尚未結束" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/40 p-6 text-center text-neutral-400">
      {text}
    </div>
  );
}

/** ---------------------------
 *  Helpers
 *  --------------------------*/
function normalizeDigits(v: string) {
  return v.replace(/[^\d]/g, "");
}

function groupStakeTotal(legs: ApiLeg[]) {
  // 官網的總 Stake = 各 betType 的投注金額總和（不要把同一 bet 的每一個 leg 重複加總）
  const byType = new Map<string, number>();
  for (const l of legs) {
    const k = l.betTypeName || "Other";
    const val = Number(l.totalStake ?? 0);
    // 取該 betType 最高值即可（或第一次填入）
    if (!byType.has(k)) byType.set(k, val);
    else byType.set(k, Math.max(byType.get(k)!, val));
  }
  let sum = 0;
  for (const v of byType.values()) sum += v;
  return sum;
}

/** ---------------------------
 *  Page (Client Component)
 *  --------------------------*/
export default function Page() {
  const [ticket, setTicket] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<ApiLeg[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

const trebles = useMemo(() => {
  return data.filter((d) => (d.betTypeName || "").toLowerCase() === "treble");
}, [data]);

const accumulators = useMemo(() => {
  const t = (s: string | undefined | null) => (s || "").toLowerCase();
  return data.filter((d) =>
    ["accumulator", "doubles"].includes(t(d.betTypeName))
  );
}, [data]);

  const betCount = data.length;
  const totalStake = useMemo(() => groupStakeTotal(data), [data]);

  const runCheck = useCallback(
    async (code: string, debug = false) => {
      const digits = normalizeDigits(code);
      setErr(null);
      setLoading(true);
      try {
        const res = await fetch(
          `/api/check?ticket=${encodeURIComponent(digits)}${
            debug ? "&debug=1" : ""
          }`,
          { method: "GET" }
        );
        const json: CheckApiResp = await res.json();
        if ("error" in json) {
          setErr(json.error || "查詢失敗");
          setData([]);
          return;
        }
        setData(json.data || []);
      } catch (e: any) {
        setErr(e?.message || "網路錯誤");
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    [setData]
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!ticket || normalizeDigits(ticket).length !== 14) {
        setErr("code must be 14 digits");
        return;
      }
      runCheck(ticket);
    },
    [ticket, runCheck]
  );

  const onUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setErr(null);
      // Client-side OCR API
      try {
        const fd = new FormData();
        fd.append("file", f);
        const resp = await fetch("/api/ocr", { method: "POST", body: fd });
        const json: OcrResp = await resp.json();
        if (!json.ok) {
          setErr(json.error || "OCR 辨識失敗，請換一張較清晰的票照");
          return;
        }
        if (json.bestTicket) {
          setTicket(json.bestTicket);
          // 自動查詢
          runCheck(json.bestTicket);
        } else {
          setErr("無法從影像中解析出票號，請手動輸入");
        }
      } catch (e: any) {
        setErr(e?.message || "OCR 失敗");
      } finally {
        // 清檔以便重選相同檔案
        if (fileRef.current) fileRef.current.value = "";
      }
    },
    [runCheck]
  );

  // Enter 快速查詢
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Enter") {
        const el = document.activeElement as HTMLElement | null;
        if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
          // 在輸入框按 Enter 才觸發
          (
            document.getElementById("query-btn") as HTMLButtonElement | null
          )?.click();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0b0f14] to-[#0a0b0d] text-neutral-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <header className="mb-4">
          <h1 className="text-xl font-semibold tracking-wide">
            運彩票據查詢（Notion Dark）
          </h1>
        </header>

        {/* Top controls */}
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="inline-flex items-center gap-3">
            <span className="text-sm text-neutral-300">選擇檔案</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="block w-64 cursor-pointer rounded-lg border border-white/10 bg-neutral-900/60 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-neutral-800 file:px-3 file:py-1.5 file:text-neutral-200 hover:bg-neutral-900/70"
            />
          </label>

          <form onSubmit={onSubmit} className="flex flex-1 items-center gap-2">
            <input
              value={ticket}
              onChange={(e) => setTicket(normalizeDigits(e.target.value))}
              placeholder="輸入 14 位票號"
              className="h-10 flex-1 rounded-lg border border-white/10 bg-neutral-900/60 px-3 text-sm outline-none ring-0 placeholder:text-neutral-500"
            />
            <button
              id="query-btn"
              type="submit"
              disabled={loading}
              className="h-10 rounded-lg bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              查詢
            </button>
          </form>
        </div>

        {/* Error / tip */}
        {err ? (
          <div className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {err}
          </div>
        ) : (
          <div className="mb-3 rounded-lg border border-white/10 bg-neutral-900/40 px-3 py-2 text-xs text-neutral-400">
            OCR runs on client. Use the upload button on the page.
          </div>
        )}

        {/* Stats */}
        <div className="mb-5 grid gap-3 sm:grid-cols-3">
          <StatCard label="票號" value={ticket || "—"} />
          <StatCard label="筆數" value={String(betCount)} />
          <StatCard
            label="總 Stake"
            value={`NT$ ${Number.isFinite(totalStake) ? totalStake : 0}`}
          />
        </div>

        {/* Content grids */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Trebles */}
          <div>
            <SectionTitle>Trebl​es（串關）</SectionTitle>
            <div className="grid gap-3">
              {trebles.length === 0 ? (
                <EmptyCard />
              ) : (
                trebles.map((l, i) => (
                  <BetCard
                    key={(l.idFOSelection ?? l.mtag ?? i).toString()}
                    leg={l}
                  />
                ))
              )}
            </div>
          </div>

          {/* Accumulator / Doubles */}
          <div>
            <SectionTitle>Accumulator（全串）</SectionTitle>
            <div className="grid gap-3">
              {accumulators.length === 0 ? (
                <EmptyCard />
              ) : (
                accumulators.map((l, i) => (
                  <BetCard
                    key={(l.idFOSelection ?? l.mtag ?? i).toString()}
                    leg={l}
                  />
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

/** ---------------------------
 *  Small presentational blocks
 *  --------------------------*/
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-neutral-900/50 p-4">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="mt-2 text-lg font-semibold tracking-wide">{value}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-xl border border-white/10 bg-neutral-900/40 px-4 py-2 text-sm font-medium tracking-wide text-neutral-300">
      {children}
    </div>
  );
}
