// Fixed for Vercel - use Supabase auth directly
import { supabase } from "../supabase/client";

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: any, opts?: any) => {
      let redirectUrl = window.location.origin + "/auth";
      if (opts && opts.redirect_uri) {
        redirectUrl = opts.redirect_uri;
      }
      
      const result = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (result.error) {
        return { error: result.error };
      }
      return { redirected: true, url: result.data.url };
    },
  },
};