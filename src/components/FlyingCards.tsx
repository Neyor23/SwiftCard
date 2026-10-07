import { BRANDS, BRAND_COLORS } from "@/lib/format";

const CARDS = Array.from({ length: 18 }, (_, i) => ({
  brand: BRANDS[i % BRANDS.length]!,
  left: (i * 37 + 5) % 95,
  delay: -(i * 1.7),
  duration: 12 + ((i * 7) % 8),
  scale: 0.8 + ((i * 13) % 6) / 10,
  spin: i % 2 ? 1 : -1,
}));

export function FlyingCards({ fade = true }: { fade?: boolean }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [perspective:900px]">
      <div className="absolute -top-40 left-1/4 h-[28rem] w-[28rem] rounded-full bg-primary/30 blur-3xl animate-pulse" />
      <div className="absolute bottom-0 right-10 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      {CARDS.map((c, i) => (
        <div
          key={i}
          className="fly-card absolute top-full"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}s`,
            animationDuration: `${c.duration}s`,
            ["--s" as string]: c.scale,
            ["--spin" as string]: c.spin,
          }}
        >
          <div className={`relative h-28 w-44 rounded-2xl bg-gradient-to-br ${BRAND_COLORS[c.brand]} p-3 shadow-2xl ring-1 ring-white/20 [backface-visibility:visible]`}>
            <div className="h-5 w-7 rounded-md bg-gold" />
            <p className="absolute bottom-3 left-3 text-sm font-bold text-white">{c.brand}</p>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-transparent via-white/30 to-transparent" />
          </div>
        </div>
      ))}
      {fade && <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-background" />}
    </div>
  );
}
