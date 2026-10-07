export type Currency = "NGN" | "USD";

export function money(amount: number | string | null | undefined, currency: Currency = "NGN") {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat(currency === "NGN" ? "en-NG" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(n);
}

export function shortDate(d: string) {
  return new Date(d).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const BRANDS = ["Apple", "Steam", "Razer Gold", "Xbox", "eBay", "Sephora", "Google Play", "Vanilla", "American Express", "VISA", "Nordstrom", "Footlocker", "Macy's", "GameStop", "PlayStation", "Roblox", "CVS Pharmacy", "Walmart", "Dollar General", "Kohl's", "Target", "Amazon", "DoorDash", "PaysafeCard"] as const;

export const BRAND_COLORS: Record<string, string> = {
  Apple: "from-zinc-700 to-zinc-900",
  Amazon: "from-amber-500 to-orange-600",
  Steam: "from-sky-700 to-slate-900",
  "Google Play": "from-emerald-500 to-teal-700",
  Sephora: "from-neutral-800 to-black",
  Nordstrom: "from-stone-600 to-stone-900",
  Walmart: "from-blue-500 to-blue-800",
  "Razer Gold": "from-green-600 to-zinc-900",
  Xbox: "from-green-500 to-green-800",
  eBay: "from-red-500 to-blue-600",
  Vanilla: "from-yellow-500 to-amber-700",
  "American Express": "from-sky-500 to-blue-800",
  VISA: "from-blue-700 to-indigo-900",
  Footlocker: "from-neutral-700 to-red-700",
  "Macy's": "from-red-600 to-red-900",
  GameStop: "from-red-500 to-neutral-900",
  PlayStation: "from-blue-600 to-blue-900",
  Roblox: "from-zinc-500 to-zinc-800",
  "CVS Pharmacy": "from-red-500 to-rose-800",
  "Dollar General": "from-yellow-400 to-neutral-900",
  "Kohl's": "from-purple-700 to-neutral-900",
  Target: "from-red-500 to-red-700",
  DoorDash: "from-orange-500 to-red-600",
  PaysafeCard: "from-sky-600 to-cyan-900",
};

export function errMsg(e: unknown) {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: string }).message);
  return "Something went wrong";
}
