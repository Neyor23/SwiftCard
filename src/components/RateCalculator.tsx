import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ratesQuery } from "@/lib/data";
import { BRANDS, money, type Currency } from "@/lib/format";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function RateCalculator({ compact = false }: { compact?: boolean }) {
  const { data } = useQuery(ratesQuery);
  const [brand, setBrand] = useState<string>("Apple");
  const [type, setType] = useState("ecode");
  const [value, setValue] = useState("100");
  const [cur, setCur] = useState<Currency>("NGN");
  const rate = useMemo(() => data?.rates.find((r) => r.brand === brand && r.country === "US" && r.card_type === type && r.receipt_type === (type === "ecode" ? "none" : "cash_receipt")), [data, brand, type]);
  const payout = rate ? Number(value || 0) * (cur === "NGN" ? Number(rate.rate_ngn) : Number(rate.rate_usd)) : 0;

  return (
    <div className="space-y-4">
      <div className={compact ? "grid grid-cols-1 gap-3 min-[400px]:grid-cols-2" : "grid gap-3 sm:grid-cols-2"}>
        <div className="space-y-1.5">
          <Label>Brand</Label>
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{BRANDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ecode">E-code</SelectItem>
              <SelectItem value="physical">Physical</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Card value (USD)</Label>
          <Input inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))} />
        </div>
        <div className="space-y-1.5">
          <Label>Receive in</Label>
          <Select value={cur} onValueChange={(v) => setCur(v as Currency)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="NGN">Naira (₦)</SelectItem>
              <SelectItem value="USD">Dollar ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-xl border bg-accent/50 p-4">
        <p className="text-xs text-muted-foreground">You'll receive</p>
        <p className="font-display text-3xl font-semibold text-primary">{money(payout, cur)}</p>
        {rate && <p className="mt-1 text-xs text-muted-foreground">Rate: {cur === "NGN" ? `₦${rate.rate_ngn}` : `$${rate.rate_usd}`} per $1</p>}
      </div>
    </div>
  );
}
