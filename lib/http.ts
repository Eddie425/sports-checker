// lib/http.ts
export async function readBody(resp: Response): Promise<unknown> {
  try {
    return await resp.clone().json();
  } catch {
    return await resp.text();
  }
}
