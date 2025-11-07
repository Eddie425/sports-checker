// lib/i18n.ts
export function zhStatus(s: string | undefined) {
  const k = (s ?? "").toLowerCase();
  if (k.includes("won")) return { zh: "中", kind: "won" as const };
  if (k.includes("void")) return { zh: "作廢", kind: "void" as const };
  return { zh: "未中", kind: "lost" as const };
}

export function zhLabel(en: string | undefined, zh?: string) {
  // 優先中文欄位
  if (zh && zh.trim()) return zh.trim();
  // 常見詞彙 quick map
  const m: Record<string, string> = {
    "1st Half": "上半場",
    Total: "總分",
    Over: "大",
    Under: "小",
    "Exact Sets (Best Of 3)": "正確盤數（3戰2勝）",
  };
  let out = en ?? "";
  for (const [k, v] of Object.entries(m)) out = out.replaceAll(k, v);
  // 箭頭與符號轉中文格式
  out = out.replaceAll("->", "→").replaceAll("(", "（").replaceAll(")", "）");
  return out;
}

export function zhMoney(n: number | string | undefined) {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return `NT$ ${v.toLocaleString("zh-TW")}`;
}
