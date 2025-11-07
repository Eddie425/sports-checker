'use client';

import { useCallback, useMemo, useState } from 'react';

type BetLeg = {
  betTypeName?: string;              // "Trebles" | "Accumulator" | etc.
  betLegStatus?: string;             // "Won" | "Open" | "Lost" ...
  betResult?: string | null;
  betState?: string | null;
  betStateName?: string | null;
  selectionName?: string | null;
  marketName?: string | null;
  eventName?: string | null;
  eventResult?: string | null;
  tournamentName?: string | null;
  tournamentCountryName?: string | null;
  tsEventTime?: string | null;
  totalStake?: number | null;
  wunitStake?: number | null;
  legOrder?: number | null;
  [k: string]: unknown;
};

type ApiOk = {
  status: number;
  data: unknown;
};

type UiState = {
  loading: boolean;
  banner: { type: 'info' | 'error' | 'warn'; msg: string } | null;
  ticket: string;
};

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : [];
}

function asNumber(n: unknown, def = 0): number {
  if (typeof n === 'number' && Number.isFinite(n)) return n;
  if (typeof n === 'string') {
    const v = Number(n);
    if (Number.isFinite(v)) return v;
  }
  return def;
}

function currency(n: unknown) {
  const v = asNumber(n, 0);
  return new Intl.NumberFormat('zh-TW', { style: 'currency', currency: 'TWD', maximumFractionDigits: 0 }).format(v);
}

export default function Page() {
  const [ui, setUi] = useState<UiState>({ loading: false, banner: null, ticket: '' });
  const [raw, setRaw] = useState<ApiOk | null>(null);

  const handleTicketChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUi(s => ({ ...s, ticket: e.target.value.trim() }));
  }, []);

  const handleQuery = useCallback(async () => {
    const ticket = ui.ticket.trim();
    if (!ticket) {
      setUi(s => ({ ...s, banner: { type: 'warn', msg: '請輸入 14 位票號' } }));
      return;
    }
    setUi(s => ({ ...s, loading: true, banner: null }));
    try {
      const r = await fetch(`/api/check?ticket=${encodeURIComponent(ticket)}`, { method: 'GET' });
      const data = await r.json().catch(() => ({}));
      // 這裡不假設後端結構，一律安全處理
      setRaw({ status: r.status, data });
      if (r.status !== 200) {
        setUi(s => ({
          ...s,
          banner: { type: 'error', msg: typeof (data?.error) === 'string' ? data.error : `查詢失敗（${r.status}）` },
        }));
      } else {
        setUi(s => ({ ...s, banner: null }));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setUi(s => ({ ...s, banner: { type: 'error', msg } }));
    } finally {
      setUi(s => ({ ...s, loading: false }));
    }
  }, [ui.ticket]);

  // ---- 將不確定的 data 轉成我們要顯示的最小子集（全都做防呆） -----------------
  const parsed = useMemo(() => {
    const data = raw?.data as any;

    // 常見回傳：{ status, data: [...] } 或 { data: { legs: [...] } } 或其他
    const payload = data?.data ?? data ?? null;

    // 嘗試從陣列中挑出 legs
    let legs: BetLeg[] = [];
    if (Array.isArray(payload)) {
      legs = payload as BetLeg[];
    } else if (payload && Array.isArray(payload.legs)) {
      legs = payload.legs as BetLeg[];
    } else if (payload && Array.isArray(payload.data)) {
      legs = payload.data as BetLeg[];
    }

    const trebles = legs.filter(l => (l.betTypeName || '').toLowerCase().includes('treble'));
    const accumulators = legs.filter(l => (l.betTypeName || '').toLowerCase().includes('accumulator'));

    const totalStake =
      legs.reduce((acc, l) => acc + asNumber(l.totalStake ?? l.wunitStake ?? 0, 0), 0);

    return {
      legs,
      trebles,
      accumulators,
      totalStake,
      count: legs.length,
    };
  }, [raw]);

  // ---- UI blocks -----------------------------------------------------------
  const Banner = ui.banner ? (
    <div
      className={`mt-4 rounded-md px-4 py-3 text-sm ${
        ui.banner.type === 'error'
          ? 'bg-red-900/30 text-red-200 ring-1 ring-red-700/40'
          : ui.banner.type === 'warn'
          ? 'bg-yellow-900/30 text-yellow-100 ring-1 ring-yellow-700/40'
          : 'bg-slate-700/40 text-slate-100 ring-1 ring-slate-600/40'
      }`}
    >
      {ui.banner.msg}
    </div>
  ) : null;

  return (
    <main className="min-h-screen bg-[#0B0F13] text-slate-100">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <h1 className="text-xl font-semibold tracking-wide">運彩票據查詢（Notion Dark）</h1>

        <div className="mt-6 flex gap-3">
          <input
            value={ui.ticket}
            onChange={handleTicketChange}
            placeholder="輸入 14 位票號"
            className="w-full rounded-md bg-[#12171D] px-3 py-2 text-sm outline-none ring-1 ring-slate-700/50 focus:ring-2 focus:ring-indigo-500"
            inputMode="numeric"
          />
          <button
            onClick={handleQuery}
            disabled={ui.loading}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 disabled:opacity-50"
          >
            {ui.loading ? '查詢中…' : '查詢'}
          </button>
        </div>

        {Banner}

        {/* 概覽卡片 */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-[#12171D] p-4 ring-1 ring-slate-700/40">
            <div className="text-xs text-slate-400">票號</div>
            <div className="mt-1 text-lg">{ui.ticket || '—'}</div>
          </div>
          <div className="rounded-xl bg-[#12171D] p-4 ring-1 ring-slate-700/40">
            <div className="text-xs text-slate-400">筆數</div>
            <div className="mt-1 text-lg">{parsed.count}</div>
          </div>
          <div className="rounded-xl bg-[#12171D] p-4 ring-1 ring-slate-700/40">
            <div className="text-xs text-slate-400">總 Stake</div>
            <div className="mt-1 text-lg">{currency(parsed.totalStake)}</div>
          </div>
        </div>

        {/* Trebles */}
        <Section title="Trebles（串關）" items={asArray(parsed.trebles)} emptyHint="無資料 / 或賽事尚未結束" />

        {/* Accumulator */}
        <Section title="Accumulator（全串）" items={asArray(parsed.accumulators)} emptyHint="無資料 / 或賽事尚未結束" />
      </div>
    </main>
  );
}

function Section({
  title,
  items,
  emptyHint,
}: {
  title: string;
  items: BetLeg[];
  emptyHint: string;
}) {
  return (
    <div className="mt-6">
      <div className="mb-2 text-sm text-slate-300">{title}</div>
      <div className="rounded-xl bg-[#12171D] p-4 ring-1 ring-slate-700/40">
        {items.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-400">{emptyHint}</div>
        ) : (
          <ul className="space-y-3">
            {items.map((l, i) => (
              <li
                key={`${i}-${l.eventName ?? ''}-${l.selectionName ?? ''}`}
                className="rounded-lg bg-[#0D1217] p-3 ring-1 ring-slate-700/30"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {l.eventName ?? '—'}
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {l.marketName ?? '—'} · {l.selectionName ?? '—'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400">
                      {l.betLegStatus ?? l.betStateName ?? l.betState ?? '—'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {l.tsEventTime ?? ''}
                    </div>
                  </div>
                </div>
                {l.eventResult ? (
                  <div className="mt-1 text-xs text-slate-400">結果：{l.eventResult}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
