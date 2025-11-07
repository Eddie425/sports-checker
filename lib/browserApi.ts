// /lib/browserApi.ts
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { chromium } from "playwright";

const PROFILE_DIR = path.join(os.tmpdir(), "sports-checker-profile");
const ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";
const PING_PAGE = `${ORIGIN}/betslipbrowser`;
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

if (!fs.existsSync(PROFILE_DIR)) {
  try {
    fs.mkdirSync(PROFILE_DIR, { recursive: true });
  } catch (e) {
    console.warn("[browserApi] cannot create profile dir:", e);
  }
}

export async function fetchBetInBrowser(code: string) {
  // 使用 persistentContext 以重用 cookie（cf_clearance）
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true,
    userAgent: UA,
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
    viewport: { width: 1300, height: 820 },
    bypassCSP: true,
    ignoreHTTPSErrors: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-zygote",
      "--single-process",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const page = await context.newPage();

  try {
    // 先打入同源頁面，讓 Cloudflare/JS 初始化
    await page.goto(PING_PAGE, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    // 等待 cf cookie 與 SERVERID 出現（最長 90s）
    await page
      .waitForFunction(
        () =>
          document.cookie.includes("cf_clearance") &&
          document.cookie.includes("SERVERID"),
        { timeout: 90000 }
      )
      .catch(() => {
        // 若等不到也別 crash，保留頁面內容去嘗試 API（有時 Cloudflare 以其它方式成功）
        console.warn("[browserApi] cf cookies not detected in time");
      });

    // 再做 fetch（會帶上 cookie）
    const apiUrl = `${ORIGIN}/API/betting/fo/bets/code/${code}`;

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
      const text = await r.text();
      return { status: r.status, text };
    }, apiUrl);

    return result;
  } finally {
    try {
      await page.close();
    } catch {}
    // 不關 context（persistentContext）以便下次重用 cookie
    // context stays open on purpose
  }
}
