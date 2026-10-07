-- Idempotent seed: 24 USA e-code (no receipt) rates + % change from the owner's screenshot.
-- Safe to run repeatedly. Requires migrations 0000-0006 (receipt_type + change_pct + unique key).
-- USD rate = NGN / 1550.
INSERT INTO public.gift_card_rates (brand, country, card_type, receipt_type, rate_ngn, rate_usd, change_pct, active)
SELECT b, 'US', 'ecode', 'none', n, round(n / 1550, 4), c, true
FROM (VALUES
  ('Apple',1123.97,-2.28),('Steam',1039.21,1.58),('Razer Gold',1154.23,0.09),('Xbox',1023.07,0.4),
  ('eBay',766.80,1.33),('Sephora',1150.20,-0.35),('Google Play',585.19,-29.27),('Vanilla',1170.38,0.87),
  ('American Express',403.58,-31.03),('VISA',887.87,2.33),('Nordstrom',908.05,-1.1),('Footlocker',1164.32,1.05),
  ('Macy''s',1150.20,6.12),('GameStop',1089.66,-0.19),('PlayStation',928.23,-2.13),('Roblox',867.69,2.38),
  ('CVS Pharmacy',1089.66,-0.92),('Walmart',746.62,-2.63),('Dollar General',1089.66,-0.92),('Kohl''s',726.44,12.5),
  ('Target',857.60,2.41),('Amazon',867.69,2.38),('DoorDash',746.62,-2.89),('PaysafeCard',1008.95,-6.54)
) AS v(b, n, c)
ON CONFLICT (brand, country, card_type, receipt_type)
DO UPDATE SET rate_ngn = EXCLUDED.rate_ngn, rate_usd = EXCLUDED.rate_usd, change_pct = EXCLUDED.change_pct, active = true;

UPDATE public.gift_card_rates SET active = false WHERE brand = 'iTunes' OR country = 'EU';
