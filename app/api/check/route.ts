// /app/api/check/route.ts
import { NextResponse } from "next/server";
import { currentStatus, fetchWithSession, startCfKeepalive } from "@/lib/cfSession";
import { callSlipApi } from "@/lib/callSlipApi";

startCfKeepalive();
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticket = (searchParams.get("ticket") || "").trim();

  if (!/^\d{14}$/.test(ticket)) {
    return NextResponse.json({ error: "票號必須 14 位數" }, { status: 400 });
  }

  try {
    const st = await currentStatus();
    let { status, data } = await callSlipApi(ticket, st.cookieHeader);

    if (status === 403) {
      await fetchWithSession("https://www-talo-ssb-pr.sportslottery.com.tw/betslipbrowser");
      const st2 = await currentStatus();
      ({ status, data } = await callSlipApi(ticket, st2.cookieHeader));
    }

    return NextResponse.json({ status, data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
