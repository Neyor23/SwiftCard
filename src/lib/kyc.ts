import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const kycQuery = queryOptions({
  queryKey: ["kyc"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase.from("kyc_submissions").select("*").eq("user_id", u.user.id).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const ID_TYPES = [
  { v: "nin", l: "National ID (NIN)" },
  { v: "bvn", l: "BVN" },
  { v: "passport", l: "International passport" },
  { v: "drivers_license", l: "Driver's licence" },
] as const;
