// 不在 server 端跑 OCR，避免 tesseract.js/wasm 造成打包問題
export const runtime = "nodejs";

export async function POST() {
  return Response.json(
    {
      ok: false,
      error: "OCR runs on client. Use the upload button on the page.",
    },
    { status: 410 }
  );
}
