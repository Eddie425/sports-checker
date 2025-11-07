// components/Badge.tsx
type Props = { kind: "won" | "lost" | "void"; label?: string };
export default function Badge({ kind, label }: Props) {
  const map = {
    won: {
      bg: "bg-[rgba(167,255,0,.12)]",
      ring: "ring-neon-lime",
      text: "text-neon-lime",
      shadow: "shadow-neon-lime",
      zh: "中",
    },
    lost: {
      bg: "bg-[rgba(255,85,119,.12)]",
      ring: "ring-neon-pink",
      text: "text-neon-red",
      shadow: "shadow-neon-pink",
      zh: "未中",
    },
    void: {
      bg: "bg-[rgba(255,212,0,.10)]",
      ring: "ring-neon-cyan",
      text: "text-neon-yellow",
      shadow: "shadow-neon",
      zh: "作廢",
    },
  } as const;
  const s = map[kind];
  return (
    <span className={`tag ${s.bg} ring-1 ${s.ring} ${s.text} ${s.shadow}`}>
      {label ?? s.zh}
    </span>
  );
}
