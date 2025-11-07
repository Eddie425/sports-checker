// app/api/check/route.ts
import { NextResponse } from "next/server";
import { callSlipApi } from "@/lib/callSlipApi";
// 若你是用 Cloudflare/Playwright 取得 cookie，請在此導入你的方法：
// import { currentStatus } from "@/lib/cfSession";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("ticket")?.trim();

    if (!code) {
      return NextResponse.json(
        { status: 400, error: "missing ticket" },
        { status: 400 }
      );
    }

    // 取得 Cookie（以下提供三種取法，擇一保留） -------------------
    // A) 若你在前端把 cookie 放 header 傳上來：
    // const forwardedCookie = req.headers.get("cookie") ?? "";

    // B) 若你有 cfSession 的 keepalive/context（推薦）：
    // const st = await currentStatus();
    // const forwardedCookie = st.cookieHeader;

    // C) 如果你暫時沒有 cookie（只做本地測試會被 CF 擋），先給空字串：
    const forwardedCookie = "";
    // -------------------------------------------------------------

    const result = await callSlipApi(code, forwardedCookie);

    // 直接回傳查詢結果；這裡不再對任何 Response 二次讀取 body
    return NextResponse.json(
      {
        status: result.status,
        data: result.data,
      },
      { status: 200 }
    );
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : typeof e === "string" ? e : "unknown";
    return NextResponse.json({ status: 500, error: msg }, { status: 500 });
  }
}
