// /lib/fetchCookie.ts
import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { chromium, BrowserContext } from "playwright";

const ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";
const PING_API = `${ORIGIN}/API/betting/fo/bets/code/00000000000000`; // 14 碼假單號，目的是觸發 CF
const PING_PAGE = `${ORIGIN}/betslipbrowser`;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

const PROFILE_DIR = path.join(os.tmpdir(), "sports-checker-profile");
const TTL_MS = 10 * 60 * 1000;

// 簡易快取（同機器同網段有效期 10 分鐘）
let cachedCookie = "";
let cachedAt = 0;

function hasClearance(cookie: string) {
  return /(?:^|;\s*)cf_clearance=/.test(cookie);
}

async function readCookie(ctx: BrowserContext) {
  const list = await ctx.cookies(ORIGIN);
  return list.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function dump(page: any, tag: string) {
  try {
    const html = await page.content();
    const file = path.join(PROFILE_DIR, `debug_${Date.now()}_${tag}.html`);
    await fs.mkdir(PROFILE_DIR, { recursive: true }).catch(() => {});
    await fs.writeFile(file, html);
    console.log("  ↳ saved debug:", file);
  } catch {}
}

export async function fetchFreshCookie(): Promise<string> {
  // 1) 記憶體快取playwright.chromium.launchPersistentContext
  if (
    cachedCookie &&
    Date.now() - cachedAt < TTL_MS &&
    hasClearance(cachedCookie)
  ) {
    return cachedCookie;
  }

  // 2) Persistent Profile + 反自動化旗標 + 擬真
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: true, // 先觀察；穩定後可改 true
    userAgent: UA,
    locale: "zh-TW",
    timezoneId: "Asia/Taipei",
    viewport: { width: 1368, height: 868 },
    javaScriptEnabled: true,
    bypassCSP: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--disable-features=IsolateOrigins,site-per-process",
      "--no-sandbox",
      "--disable-dev-shm-usage",
    ],
  });

  try {
    // 啟動前先看是否已經有 clearance
    {
      const cookieStr = await readCookie(context);
      if (hasClearance(cookieStr)) {
        cachedCookie = cookieStr;
        cachedAt = Date.now();
        console.log("  ✔ cookie already exists");
        return cookieStr;
      }
    }

    const page = await context.newPage();
    page.setDefaultNavigationTimeout(60_000);

    // 輪替策略：API → PAGE → reload，直到成功或超時
    const deadline = Date.now() + 120_000; // 最多等 120 秒
    let phase = 0;

    while (Date.now() < deadline) {
      phase++;

      // A. 先用 API 觸發
      console.log(`  [phase ${phase}] goto PING_API`);
      await page
        .goto(PING_API, { waitUntil: "domcontentloaded", timeout: 45_000 })
        .catch(() => {});
      await page.waitForTimeout(2000);

      let cookieStr = await readCookie(context);
      if (hasClearance(cookieStr)) {
        cachedCookie = cookieStr;
        cachedAt = Date.now();
        console.log("  ✔ clearance acquired via API");
        return cookieStr;
      }
      await dump(page, "after_api");

      if (page.url().includes("/cdn-cgi/") || page.url().includes("__cf_chl")) {
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(1500);
          cookieStr = await readCookie(context);
          if (hasClearance(cookieStr)) {
            cachedCookie = cookieStr;
            cachedAt = Date.now();
            console.log("  ✔ clearance acquired during challenge(API)");
            return cookieStr;
          }
        }
      }

      // B. 再換 PAGE
      console.log(`  [phase ${phase}] goto PING_PAGE`);
      await page
        .goto(PING_PAGE, { waitUntil: "domcontentloaded", timeout: 45_000 })
        .catch(() => {});
      await page.waitForTimeout(2500);

      cookieStr = await readCookie(context);
      if (hasClearance(cookieStr)) {
        cachedCookie = cookieStr;
        cachedAt = Date.now();
        console.log("  ✔ clearance acquired via PAGE");
        return cookieStr;
      }
      await dump(page, "after_page");

      if (page.url().includes("/cdn-cgi/") || page.url().includes("__cf_chl")) {
        for (let i = 0; i < 8; i++) {
          await page.waitForTimeout(1500);
          cookieStr = await readCookie(context);
          if (hasClearance(cookieStr)) {
            cachedCookie = cookieStr;
            cachedAt = Date.now();
            console.log("  ✔ clearance acquired during challenge(PAGE)");
            return cookieStr;
          }
        }
      }

      // C. reload 再試一次
      console.log(`  [phase ${phase}] reload`);
      await page
        .reload({ waitUntil: "domcontentloaded", timeout: 45_000 })
        .catch(() => {});
      await page.waitForTimeout(1500);

      cookieStr = await readCookie(context);
      if (hasClearance(cookieStr)) {
        cachedCookie = cookieStr;
        cachedAt = Date.now();
        console.log("  ✔ clearance acquired after reload");
        return cookieStr;
      }
    }

    throw new Error("Cloudflare clearance not acquired within timeout");
  } finally {
    // 保留 context（持久化 cookie），只關掉頁面
    try {
      for (const p of context.pages()) {
        await p.close().catch(() => {});
      }
    } catch {}
  }
}
