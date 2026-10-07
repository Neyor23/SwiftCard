ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
CREATE TYPE public.kyc_status AS ENUM ('pending','verified','rejected');
CREATE TABLE public.kyc_submissions (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  id_type text NOT NULL,
  id_last4 text NOT NULL,
  date_of_birth date NOT NULL,
  address text NOT NULL,
  status public.kyc_status NOT NULL DEFAULT 'pending',
  admin_note text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;
ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kyc own or admin read" ON public.kyc_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.submit_kyc(_id_type text, _id_number text, _dob date, _address text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur public.kyc_status;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _id_type NOT IN ('nin','bvn','passport','drivers_license') THEN RAISE EXCEPTION 'Invalid ID type'; END IF;
  IF length(trim(_id_number)) < 6 OR length(_id_number) > 30 THEN RAISE EXCEPTION 'Invalid ID number'; END IF;
  IF _dob > (current_date - interval '18 years') THEN RAISE EXCEPTION 'You must be 18 or older'; END IF;
  IF length(trim(_address)) < 5 OR length(_address) > 300 THEN RAISE EXCEPTION 'Invalid address'; END IF;
  SELECT status INTO cur FROM kyc_submissions WHERE user_id = auth.uid();
  IF cur = 'verified' THEN RAISE EXCEPTION 'Already verified'; END IF;
  INSERT INTO kyc_submissions(user_id,id_type,id_last4,date_of_birth,address,status,submitted_at,admin_note,reviewed_at)
  VALUES (auth.uid(), _id_type, right(trim(_id_number),4), _dob, trim(_address), 'pending', now(), NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE SET id_type=EXCLUDED.id_type, id_last4=EXCLUDED.id_last4, date_of_birth=EXCLUDED.date_of_birth,
    address=EXCLUDED.address, status='pending', submitted_at=now(), admin_note=NULL, reviewed_at=NULL;
END $$;

CREATE OR REPLACE FUNCTION public.review_kyc(_user uuid, _approve boolean, _note text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  UPDATE kyc_submissions SET status = CASE WHEN _approve THEN 'verified'::kyc_status ELSE 'rejected'::kyc_status END,
    admin_note = _note, reviewed_at = now() WHERE user_id = _user AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'No pending submission'; END IF;
  INSERT INTO notifications(user_id,title,body) VALUES (_user,
    CASE WHEN _approve THEN 'Identity verified' ELSE 'Verification declined' END,
    COALESCE(_note, CASE WHEN _approve THEN 'Your account is fully verified.' ELSE 'Please resubmit your details.' END));
END $$;
REVOKE EXECUTE ON FUNCTION public.submit_kyc(text,text,date,text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.review_kyc(uuid,boolean,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.submit_kyc(text,text,date,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_kyc(uuid,boolean,text) TO authenticated;