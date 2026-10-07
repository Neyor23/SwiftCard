ALTER TABLE public.gift_card_rates ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'none';
ALTER TABLE public.gift_card_sales ADD COLUMN IF NOT EXISTS receipt_type text NOT NULL DEFAULT 'none';
CREATE OR REPLACE FUNCTION public.submit_sale(_brand text, _country text, _card_type text, _receipt text, _value numeric, _qty integer, _currency currency_code, _codes text, _images text[])
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
declare r record; payout numeric; sid uuid; tid uuid; rc text := coalesce(nullif(_receipt,''),'none');
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if _value <= 0 or _value > 5000 or _qty < 1 or _qty > 50 then raise exception 'Invalid amount'; end if;
  select * into r from gift_card_rates where brand=_brand and country=_country and card_type=_card_type and receipt_type=rc and active limit 1;
  if not found then raise exception 'No rate for this card'; end if;
  payout := case when _currency='NGN' then round(_value*_qty*r.rate_ngn,2) else round(_value*_qty*r.rate_usd,2) end;
  insert into transactions(user_id,type,status,currency,amount,description)
    values (auth.uid(),'sell','pending',_currency,payout,_brand||' '||_country||' '||_card_type||case when rc<>'none' then ' ('||replace(rc,'_',' ')||')' else '' end||' '||_value||' x'||_qty) returning id into tid;
  insert into gift_card_sales(user_id,brand,country,card_type,receipt_type,card_value,quantity,payout_currency,expected_payout,card_codes,image_paths,transaction_id)
    values (auth.uid(),_brand,_country,_card_type,rc,_value,_qty,_currency,payout,left(_codes,4000),coalesce(_images,'{}'),tid) returning id into sid;
  insert into notifications(user_id,title,body) values (auth.uid(),'Card submitted','Your '||_brand||' card is under review.');
  return sid;
end; $function$;
GRANT EXECUTE ON FUNCTION public.submit_sale(text,text,text,text,numeric,integer,currency_code,text,text[]) TO authenticated;