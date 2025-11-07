// lib/callSlipApi.ts
const ORIGIN = "https://www-talo-ssb-pr.sportslottery.com.tw";

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
};

export async function callSlipApi(code: string, cookieHeader: string) {
  const url = `${ORIGIN}/API/betting/fo/bets/code/${code}`;

  const headers = new Headers(DEFAULT_HEADERS as Record<string, string>);
  headers.set("cookie", cookieHeader);

  const resp = await fetch(url, {
    method: "GET",
    headers,
  });

  let data: unknown = null;
  try {
    data = await resp.json();
  } catch {
    // 有時 Cloudflare 403 會回 HTML
    data = { raw: await resp.text() };
  }

  return { status: resp.status, data, headers: resp.headers };
}
