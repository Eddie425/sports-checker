// app/api/health/route.ts
import { NextResponse } from "next/server";
import {
  startCfKeepalive,
  currentStatus,
  fetchWithSession,
} from "@/lib/cfSession";

// 啟動 keepalive（只會啟一次）
startCfKeepalive();

export async function GET() {
  try {
    // 用一次 fetchWithSession 當「探針」：必要時會自動續命
    const probe = await fetchWithSession("https://example.com/ping", {
      method: "GET",
    });
    probe.body?.cancel?.(); // 不需要真的讀取

    const stat = await currentStatus();
    return NextResponse.json(
      {
        ok: true,
        profileDir: process.env.CF_PROFILE_DIR,
        hasClearance: stat.hasClearance,
        minutesLeft: stat.minutesLeft,
        expiresAt: stat.expiresAt,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 200 });
  }
}
