// app/api/check/route.ts
import { NextResponse } from "next/server";
import {
  fetchWithSession,
  currentStatus,
  startCfKeepalive,
} from "@/lib/cfSession";
import { callSlipApi } from "@/lib/callSlipApi";

startCfKeepalive();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  // 同時支援 ?code= 與 ?ticket=
  const raw = (
    url.searchParams.get("code") ||
    url.searchParams.get("ticket") ||
    ""
  ).trim();
  const debug = url.searchParams.get("debug") || "";

  // 只保留數字，避免圖片 OCR 混入空白或奇怪字元
  const code = raw.replace(/\D+/g, "");

  if (!/^\d{14}$/.test(code)) {
    return NextResponse.json(
      {
        status: 400,
        error: "code must be 14 digits",
        meta: { got: raw, normalized: code },
      },
      { status: 400 }
    );
  }

  try {
    // 確保 cookie 有效
    const st = await currentStatus();

    // 直接用目前的 cookie 打官方
    const first = await callSlipApi(code, st.cookieHeader);

    if (first.status === 403) {
      // 觸發刷新，再打一次
      const ping = await fetchWithSession("https://example.com/ping", {
        method: "GET",
      });
      ping.body?.cancel?.();

      const st2 = await currentStatus();
      const second = await callSlipApi(code, st2.cookieHeader);
      return NextResponse.json(
        debug
          ? {
              status: second.status,
              data: second.data,
              meta: { initStatus: st, retryStatus: st2 },
            }
          : { status: second.status, data: second.data }
      );
    }

    return NextResponse.json(
      debug
        ? { status: first.status, data: first.data, meta: { initStatus: st } }
        : { status: first.status, data: first.data }
    );
  } catch (e: any) {
    console.error("[/api/check] ERROR:", e);
    return NextResponse.json(
      { status: 500, error: String(e?.message || e) },
      { status: 200 } // 前端格式一致
    );
  }
}
