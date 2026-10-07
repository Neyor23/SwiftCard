import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ImagePlus, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ratesQuery, profileQuery } from "@/lib/data";
import { BRANDS, BRAND_COLORS, errMsg, money, shortDate, type Currency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/TxnList";

export const Route = createFileRoute("/_authenticated/sell")({
  head: () => ({ meta: [{ title: "Sell gift card — SwiftCard" }, { name: "description", content: "Sell your gift cards at top rates." }] }),
  component: Sell,
});

const COUNTRIES = [
  { code: "US", name: "USA", flag: "🇺🇸", cur: "USD", sym: "$" },
  { code: "UK", name: "UK", flag: "🇬🇧", cur: "GBP", sym: "£" },
  { code: "CA", name: "Canada", flag: "🇨🇦", cur: "CAD", sym: "C$" },
  { code: "AU", name: "Australia", flag: "🇦🇺", cur: "AUD", sym: "A$" },
];
const RECEIPTS = [
  { id: "cash_receipt", label: "Cash receipt" },
  { id: "debit_receipt", label: "Debit receipt" },
  { id: "no_receipt", label: "No receipt" },
];

function Sell() {
  const qc = useQueryClient();
  const { data } = useQuery(ratesQuery);
  const { data: me } = useQuery(profileQuery);
  const { data: sales = [] } = useQuery({
    queryKey: ["my-sales"],
    queryFn: async () => (await supabase.from("gift_card_sales").select("*").eq("user_id", me!.user.id).order("created_at", { ascending: false }).limit(10)).data ?? [],
    enabled: !!me,
  });
  const [brand, setBrand] = useState("Amazon");
  const [country, setCountry] = useState("US");
  const [type, setType] = useState<"ecode" | "physical">("ecode");
  const [receipt, setReceipt] = useState("cash_receipt");
  const [value, setValue] = useState("100");
  const [qty, setQty] = useState(1);
  const [cur, setCur] = useState<Currency>("NGN");
  const [codes, setCodes] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const rc = type === "ecode" ? "none" : receipt;
  const cc = COUNTRIES.find((c) => c.code === country)!;
  const rate = useMemo(() => data?.rates.find((r) => r.brand === brand && r.country === country && r.card_type === type && r.receipt_type === rc), [data, brand, country, type, rc]);
  const total = rate ? Number(value || 0) * qty * (cur === "NGN" ? Number(rate.rate_ngn) : Number(rate.rate_usd)) : 0;

  async function submit() {
    if (!me) return;
    const v = Number(value);
    if (!v || v <= 0 || v > 5000) return toast.error("Enter a card value between 1 and 5,000");
    if (!rate) return toast.error("We don't buy this card yet");
    if (type === "ecode" && !codes.trim() && files.length === 0) return toast.error("Add the card code or an image");
    if (type === "physical" && files.length === 0) return toast.error("Upload a clear photo of the card");
    setBusy(true);
    try {
      const paths: string[] = [];
      for (const f of files) {
        const path = `${me.user.id}/${crypto.randomUUID()}-${f.name.replace(/[^\w.]/g, "_")}`;
        const { error } = await supabase.storage.from("card-images").upload(path, f);
        if (error) throw error;
        paths.push(path);
      }
      const { error } = await supabase.rpc("submit_sale", {
        _brand: brand, _country: country, _card_type: type, _receipt: rc, _value: v, _qty: qty, _currency: cur, _codes: codes.trim(), _images: paths,
      });
      if (error) throw error;
      toast.success("Card submitted for review");
      setCodes(""); setFiles([]);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sell a gift card</h1>
        <p className="text-sm text-muted-foreground">Submit your card and get paid once it's verified.</p>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6 rounded-2xl border bg-card p-5">
          <div>
            <Label>Choose brand</Label>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRANDS.map((b) => {
                const br = data?.rates.find((x) => x.brand === b && x.country === country && x.card_type === type && x.receipt_type === rc);
                const base = data?.rates.find((x) => x.brand === b && x.country === "US" && x.card_type === "ecode" && x.receipt_type === "none");
                const pct = Number(base?.change_pct ?? 0);
                return (
                  <button key={b} onClick={() => setBrand(b)} className={cn(`rounded-xl bg-gradient-to-br ${BRAND_COLORS[b]} p-3 text-left text-sm font-semibold text-white transition`, brand === b ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : br ? "opacity-70 hover:opacity-100" : "opacity-30 grayscale")}>
                    <span className="block">{b}</span>
                    {br ? <span className="mt-1 block text-xs font-normal">{money(br.rate_ngn)} <span className={pct >= 0 ? "text-green-300" : "text-red-300"}>{pct >= 0 ? "+" : ""}{pct}%</span></span>
                      : <span className="mt-1 block text-xs font-normal">Not available in {cc.code}</span>}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Card country</Label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">
              {COUNTRIES.map((c) => (
                <Button key={c.code} type="button" variant={country === c.code ? "default" : "outline"} onClick={() => setCountry(c.code)}>{c.flag} {c.code}</Button>
              ))}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Card type</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["ecode", "physical"] as const).map((t) => (
                  <Button key={t} type="button" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t === "ecode" ? "E-code" : "Physical"}</Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Get paid in</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(["NGN", "USD"] as const).map((c) => (
                  <Button key={c} type="button" variant={cur === c ? "default" : "outline"} onClick={() => setCur(c)}>{c === "NGN" ? "₦ Naira" : "$ Dollar"}</Button>
                ))}
              </div>
            </div>
            {type === "physical" && (
              <div className="sm:col-span-2">
                <Label>Receipt</Label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {RECEIPTS.map((r) => {
                    const rr = data?.rates.find((x) => x.brand === brand && x.country === country && x.card_type === "physical" && x.receipt_type === r.id);
                    return (
                      <button key={r.id} type="button" onClick={() => setReceipt(r.id)} className={cn("rounded-xl border p-3 text-left text-sm transition", receipt === r.id ? "border-primary bg-accent" : "hover:bg-accent/40")}>
                        <p className="font-medium">{r.label}</p>
                        <p className="text-xs text-muted-foreground">{rr ? `₦${rr.rate_ngn}/${cc.sym}1` : "—"}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div className="space-y-1.5"><Label>Card value ({cc.cur})</Label><Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} /></div>
            <div className="space-y-1.5"><Label>Quantity</Label><Input type="number" min={1} max={50} value={qty} onChange={(e) => setQty(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Card code(s)</Label>
            <Textarea placeholder="One code per line" value={codes} onChange={(e) => setCodes(e.target.value)} maxLength={4000} />
          </div>
          <div>
            <Label>Card images</Label>
            <label className="mt-2 flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-sm text-muted-foreground hover:bg-accent/40">
              <ImagePlus className="h-6 w-6 text-primary" /> Tap to upload (max 10MB each)
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => setFiles([...files, ...Array.from(e.target.files ?? [])].slice(0, 6))} />
            </label>
            {files.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {files.map((f, i) => (
                  <span key={i} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">{f.name.slice(0, 20)}
                    <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button></span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="sticky top-20 rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">You'll receive</p>
            <p className="font-display text-4xl font-semibold text-primary transition-all">{money(total, cur)}</p>
            <div className="mt-4 space-y-1 text-sm text-muted-foreground">
              <p>{cc.flag} {brand} {cc.name} · {type === "ecode" ? "E-code" : `Physical · ${RECEIPTS.find((r) => r.id === receipt)?.label}`}</p>
              <p>{cc.sym}{value || 0} × {qty}</p>
              {rate ? <p>Rate: {cur === "NGN" ? `₦${rate.rate_ngn}` : `$${rate.rate_usd}`} / {cc.sym}1</p> : <p>No rate for this card yet</p>}
            </div>
            <Button disabled={busy} onClick={submit} className="mt-5 w-full bg-gold shadow-gold">{busy ? "Submitting…" : "Submit for review"}</Button>
          </div>
        </div>
      </div>
      <div className="rounded-2xl border bg-card p-5">
        <h2 className="mb-3 font-semibold">Your submissions</h2>
        {sales.length === 0 ? <p className="text-sm text-muted-foreground">No cards submitted yet.</p> : (
          <ul className="divide-y">
            {sales.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3 text-sm">
                <div><p className="font-medium">{s.brand} ${s.card_value} × {s.quantity}</p><p className="text-xs text-muted-foreground">{shortDate(s.created_at)}{s.admin_note ? ` · ${s.admin_note}` : ""}</p></div>
                <div className="text-right"><p className="font-semibold">{money(s.expected_payout, s.payout_currency)}</p>
                  <StatusBadge status={s.status === "approved" ? "successful" : s.status === "rejected" ? "failed" : "pending"} /></div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
