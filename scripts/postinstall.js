// 確保 puppeteer 在雲端能下載 chromium 並可重用快取
const path = require("path");
process.env.PUPPETEER_CACHE_DIR = process.env.PUPPETEER_CACHE_DIR || path.join(process.cwd(), ".cache", "puppeteer");
process.env.PUPPETEER_SKIP_DOWNLOAD = process.env.PUPPETEER_SKIP_DOWNLOAD || ""; // 下載 chromium（空字串 = 不跳過）

console.log("[postinstall] PUPPETEER_CACHE_DIR =", process.env.PUPPETEER_CACHE_DIR);
