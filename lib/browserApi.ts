// lib/browserApi.ts
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";

const PROFILE_DIR = path.join(os.tmpdir(), "sports-checker-profile");
const ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";
const PING_PAGE = `${ORIGIN}/betslipbrowser`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

export async function fetchBetInBrowser(code: string) {
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    userAgent: UA,
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
    viewport: { width: 1300, height: 820 },
    bypassCSP: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = await context.newPage();

  try {
    await page.goto(PING_PAGE, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    await page.waitForTimeout(2000);

    const apiUrl = `${ORIGIN}/API/betting/fo/bets/code/${encodeURIComponent(
      code
    )}`;

    const result = await page.evaluate(async (url) => {
      const r = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          accept: "application/json",
          "accept-language": "UK",
          "content-type": "application/json",
          authorization: "null",
          referer:
            "https://www-talo-ssb-pr.sportslottery.com.tw/betslipbrowser",
          "x-mgs-businessunit": "2",
        },
      });

      // ✅ 只讀一次 body：先嘗試 JSON，失敗就回 text
      let data: unknown;
      try {
        data = await r.clone().json();
      } catch {
        data = await r.text();
      }
      return { status: r.status, data };
    }, apiUrl);

    return result;
  } finally {
    try {
      await page.close();
    } catch {}
    // 保留 context 以保留 cf_clearance
  }
}
