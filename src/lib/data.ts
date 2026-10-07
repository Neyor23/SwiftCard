import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

async function uid() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not signed in");
  return data.user.id;
}

export const walletQuery = queryOptions({
  queryKey: ["wallet"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase.from("wallets").select("*").eq("user_id", id).maybeSingle();
    if (error) throw error;
    return data ?? { user_id: id, balance_ngn: 0, balance_usd: 0, updated_at: "" };
  },
});

export const txnsQuery = (limit = 50) =>
  queryOptions({
    queryKey: ["txns", limit],
    queryFn: async () => {
      const id = await uid();
      const { data, error } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", id)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
  });

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", u.user.id),
    ]);
    return { user: u.user, profile: p, isAdmin: !!roles?.some((r) => r.role === "admin") };
  },
});

export const notificationsQuery = queryOptions({
  queryKey: ["notifications"],
  queryFn: async () => {
    const id = await uid();
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw error;
    return data;
  },
});

export const ratesQuery = queryOptions({
  queryKey: ["rates"],
  queryFn: async () => {
    const [{ data, error }, { data: s }] = await Promise.all([
      supabase.from("gift_card_rates").select("*").eq("active", true).order("brand"),
      supabase.from("app_settings").select("*").eq("key", "usd_ngn_rate").maybeSingle(),
    ]);
    if (error) throw error;
    return { rates: data, usdNgn: Number(s?.value ?? 1550) };
  },
});
