// lib/cfSession.ts
import path from "node:path";
import os from "node:os";
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { chromium, type BrowserContext, type Cookie } from "playwright";

const BETSLIP_URL =
  "https://www-talo-ssb-pr.sportslottery.com.tw/betslipbrowser";
const SLIP_API_ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";

const PROFILE_DIR =
  process.env.CF_PROFILE_DIR ||
  path.join(os.tmpdir(), "sports-checker-profile");

const USER_AGENT =
  process.env.USER_AGENT ||
  // 你之前成功用的 UA；必要時再換
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36";

const RENEW_THRESHOLD_MIN = Number(process.env.RENEW_THRESHOLD_MIN || 15);

// ensure dir exists
try {
  if (!fs.existsSync(PROFILE_DIR)) fs.mkdirSync(PROFILE_DIR, { recursive: true });
} catch (e) {
  console.warn("[cfSession] cannot ensure profile dir:", (e as Error).message);
}

// ---- 單例 Context ----------------------------------------------------------
// context() 單例
let ctxPromise: Promise<BrowserContext> | null = null;
async function context(): Promise<BrowserContext> {
  if (!ctxPromise) {
    ctxPromise = (async () => {
      return chromium.launchPersistentContext(PROFILE_DIR, {
        headless: true,
        viewport: { width: 1280, height: 800 },
        userAgent: USER_AGENT,
        ignoreHTTPSErrors: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-zygote",
          "--single-process"
        ],
      });
    })();
  }
  return ctxPromise;
}

// ---- 工具: 讀 cookies / 組 Cookie Header -----------------------------------
function toCookieHeader(cookies: Cookie[]) {
  return cookies.map((c) => `${c.name}=${c.value}`).join("; ");
}

async function getCookies(url = SLIP_API_ORIGIN) {
  const c = await context();
  return c.cookies(url);
}

// ---- 狀態: 是否有 clearance（修正版 minutesLeft）---------------------------
export async function currentStatus() {
  const cookies = await getCookies();
  const cf = cookies.find((c) => c.name === "cf_clearance");
  const sid = cookies.find((c) => c.name === "SERVERID");
  const has = Boolean(cf && sid);

  if (!has) {
    return {
      hasClearance: false,
      minutesLeft: 0,
      expiresAt: 0,
      cookieHeader: toCookieHeader(cookies),
    };
  }

  // 有些站回很遠的 expires；做合理上限與預設
  let expiresAt = cf!.expires ? cf!.expires * 1000 : Date.now() + 55 * 60_000;
  const MAX_WINDOW = 24 * 60 * 60 * 1000; // 24h 上限
  if (expiresAt - Date.now() > MAX_WINDOW) {
    expiresAt = Date.now() + 60 * 60_000; // 收斂為 60 分鐘
  }

  const minutesLeft = Math.max(
    0,
    Math.floor((expiresAt - Date.now()) / 60_000)
  );

  return {
    hasClearance: true,
    minutesLeft,
    expiresAt,
    cookieHeader: toCookieHeader(cookies),
  };
}

// ---- 續命: 進頁面等到 Cloudflare cookies 出現 -------------------------------
// async function refreshClearance(opts?: { reason?: string; waitMs?: number }) {
//   const c = await context();
//   const page = await c.newPage();

//   const reason = opts?.reason || "force";
//   console.log(`[CF] refreshing (${reason})...`);

//   // 等待到 cf_clearance + SERVERID 兩者到齊
//   await page.goto(BETSLIP_URL, {
//     waitUntil: "domcontentloaded",
//     timeout: 45_000,
//   });

//   await page.waitForFunction(
//     () =>
//       document.cookie.includes("cf_clearance") &&
//       document.cookie.includes("SERVERID"),
//     null,
//     { timeout: 90_000 } // Cloudflare 偶爾慢，給寬一點
//   );

//   // 稍微等一下寫盤
//   await delay(opts?.waitMs ?? 800);

//   const cookies = await getCookies();
//   const cf = cookies.find((c) => c.name === "cf_clearance");
//   const sid = cookies.find((c) => c.name === "SERVERID");

//   if (!cf || !sid) {
//     await page.close().catch(() => {});
//     throw new Error("CF cookies missing after refresh");
//   }

//   const minutesLeft =
//     cf.expires && cf.expires * 1000 > Date.now()
//       ? Math.floor((cf.expires * 1000 - Date.now()) / 60_000)
//       : 60;

//   console.log(
//     `[CF] clearance OK (minutesLeft=${minutesLeft}). cookie=${
//       cf.name
//     }=${cf.value.slice(0, 20)}...`
//   );

//   await page.close().catch(() => {});
// }


// refreshClearance：在頁面等待 cf cookie 與 SERVERID
async function refreshClearance(opts?: { reason?: string; waitMs?: number }) {
  const c = await context();
  const page = await c.newPage();
  const reason = opts?.reason || "force";
  console.log(`[CF] refreshing (${reason})...`);

  await page.goto(BETSLIP_URL, { waitUntil: "domcontentloaded", timeout: 45000 });

  // 等待 cf_clearance + SERVERID，延長 timeout
  await page.waitForFunction(
    () => document.cookie.includes("cf_clearance") && document.cookie.includes("SERVERID"),
    { timeout: 90000 }
  ).catch(() => {
    console.warn("[CF] cookies not present after wait (continue anyway)");
  });

  // 小等一下讓 chrome 把 cookie 寫入 profile
  await delay(opts?.waitMs ?? 800);

  // close page (keep context)
  await page.close().catch(() => {});
}



// ---- 對外：用帶 cookie 的 fetch；自動在需要時續命 ---------------------------
export async function fetchWithSession(input: string, init: RequestInit = {}) {
  const st = await currentStatus();
  if (!st.hasClearance || st.minutesLeft <= RENEW_THRESHOLD_MIN) {
    await refreshClearance({
      reason: st.hasClearance ? "threshold" : "missing",
    });
  }

  const refreshed = await currentStatus();

  const headers = new Headers(init.headers || {});
  // 從 context 帶 Cookie
  headers.set("cookie", refreshed.cookieHeader);
  headers.set("user-agent", USER_AGENT);
  if (!headers.has("accept")) headers.set("accept", "application/json");
  if (!headers.has("content-type"))
    headers.set("content-type", "application/json");

  return fetch(input, { ...init, headers });
}

// ---- 背景 keep-alive（每 5 分鐘檢查一次）-----------------------------------
let keepaliveStarted = false;
export function startCfKeepalive() {
  if (keepaliveStarted) return;
  keepaliveStarted = true;

  console.log(`[CF keepalive] timer started. profile=${PROFILE_DIR}`);

  const loop = async () => {
    try {
      const st = await currentStatus();
      if (!st.hasClearance || st.minutesLeft <= RENEW_THRESHOLD_MIN) {
        await refreshClearance({
          reason: st.hasClearance ? "poll-threshold" : "poll-missing",
        });
      }
    } catch (e) {
      console.warn("[CF keepalive] error:", (e as Error).message);
    } finally {
      setTimeout(loop, 5 * 60_000);
    }
  };

  setTimeout(loop, 5 * 60_000);
}
