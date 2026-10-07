-- Sell-only: block NEW buy / wallet-deposit / card-funding rows. Historical rows are untouched.
CREATE OR REPLACE FUNCTION public.enforce_sell_only_txn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.type IN ('buy','card_funding') THEN
    RAISE EXCEPTION 'This transaction type is no longer supported';
  END IF;
  IF NEW.type = 'deposit' AND coalesce(NEW.description,'') <> 'Currency conversion' THEN
    RAISE EXCEPTION 'Wallet funding is no longer supported';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS transactions_sell_only ON public.transactions;
CREATE TRIGGER transactions_sell_only BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.enforce_sell_only_txn();

REVOKE EXECUTE ON FUNCTION public.buy_gift_card(uuid, integer, currency_code) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fund_virtual_card(uuid, numeric) FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.gift_card_products IS 'DEPRECATED: buying removed (sell-only app). Kept for history.';
COMMENT ON TABLE public.gift_card_codes IS 'DEPRECATED: buying removed (sell-only app). Kept for history.';
COMMENT ON FUNCTION public.buy_gift_card(uuid, integer, currency_code) IS 'DEPRECATED: buying removed.';
COMMENT ON FUNCTION public.fund_virtual_card(uuid, numeric) IS 'DEPRECATED: card funding disabled until a card issuer is connected.';
COMMENT ON FUNCTION public.apply_deposit(text, bigint, text) IS 'LEGACY: settles pre-existing pending deposits only; no new deposits can be created.';