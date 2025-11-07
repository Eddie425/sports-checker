// lib/callSlipApi.ts
const ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";
import { readBody } from "./http";

const DEFAULT_HEADERS = {
  accept: "application/json",
  "accept-language": "UK",
  authorization: "null",
  "content-type": "application/json",
  referer: `${ORIGIN}/betslipbrowser`,
  "x-mgs-businessunit": "2",
  "x-clientdevice":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  "x-clientip": process.env.SPORTS_IP || "118.165.7.197",
  "x-mgs-clientip": process.env.SPORTS_IP || "118.165.7.197",
  "x-location": "UK",
  "x-mgs-location": "UK",
  priority: "u=1",
  "sec-ch-ua":
    '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
  "sec-ch-ua-platform": '"Windows"',
  "sec-ch-ua-mobile": "?0",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-origin",
} as const;

export async function callSlipApi(code: string, cookieHeader: string) {
  const url = `${ORIGIN}/API/betting/fo/bets/code/${encodeURIComponent(code)}`;

  const headers = new Headers(DEFAULT_HEADERS as Record<string, string>);
  headers.set("cookie", cookieHeader);

  const resp = await fetch(url, {
    method: "GET",
    headers,
  });

  const data = await readBody(resp); // ✅ 僅讀一次（或用 clone），不會觸發「Body already been read」

  return {
    status: resp.status,
    data,
    headers: Object.fromEntries(resp.headers.entries()),
  };
}
