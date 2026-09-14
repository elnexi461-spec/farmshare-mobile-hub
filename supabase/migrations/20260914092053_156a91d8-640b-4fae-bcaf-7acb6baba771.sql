CREATE OR REPLACE FUNCTION private.complete_mpesa_deposit(_checkout_request_id text, _receipt text, _amount numeric, _phone text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
DECLARE
  v_transaction public.transactions%ROWTYPE;
BEGIN
  SELECT * INTO v_transaction
  FROM public.transactions
  WHERE checkout_request_id = _checkout_request_id AND type = 'deposit'
  FOR UPDATE;

  IF v_transaction.id IS NULL THEN
    RAISE EXCEPTION 'Unknown checkout request';
  END IF;

  IF v_transaction.status = 'completed' THEN
    RETURN v_transaction.id;
  END IF;

  IF v_transaction.status <> 'pending' THEN
    RAISE EXCEPTION 'Deposit is not pending';
  END IF;

  IF v_transaction.amount_kes <> _amount THEN
    RAISE EXCEPTION 'Deposit amount mismatch';
  END IF;

  UPDATE public.transactions
  SET status = 'completed', provider_reference = _receipt, phone = COALESCE(_phone, phone), metadata = metadata || _metadata, processed_at = now()
  WHERE id = v_transaction.id;

  UPDATE public.profiles
  SET deposit_balance = deposit_balance + _amount
  WHERE id = v_transaction.user_id;

  RETURN v_transaction.id;
END;
$$;
REVOKE ALL ON FUNCTION private.complete_mpesa_deposit(text, text, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.complete_mpesa_deposit(text, text, numeric, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION private.fail_mpesa_deposit(_checkout_request_id text, _reason text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'failed', failure_reason = left(_reason, 500), metadata = metadata || _metadata, processed_at = now()
  WHERE checkout_request_id = _checkout_request_id AND type = 'deposit' AND status = 'pending';
END;
$$;
REVOKE ALL ON FUNCTION private.fail_mpesa_deposit(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.fail_mpesa_deposit(text, text, jsonb) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'mifugo-daily-income') THEN
    PERFORM cron.schedule('mifugo-daily-income', '10 0 * * *', 'SELECT private.accrue_daily_income()');
  END IF;
END $$;

INSERT INTO public.packages (name, animal_key, emoji, price_kes, daily_income_kes, cycle_days, total_profit_kes, is_free, display_order) VALUES
('Starter Duck', 'duck', '🦆', 0, 20, 10, 200, true, 1),
('Rabbit Hutch', 'rabbit', '🐇', 500, 30, 30, 900, false, 2),
('Laying Hen', 'hen', '🐔', 1000, 60, 30, 1800, false, 3),
('Dairy Goat', 'goat', '🐐', 2500, 150, 30, 4500, false, 4),
('Wool Sheep', 'sheep', '🐑', 5000, 300, 30, 9000, false, 5),
('Fattening Pig', 'pig', '🐖', 10000, 620, 30, 18600, false, 6),
('Dairy Cow', 'cow', '🐄', 20000, 1250, 30, 37500, false, 7),
('Working Donkey', 'donkey', '🫏', 35000, 2200, 30, 66000, false, 8),
('Desert Camel', 'camel', '🐪', 50000, 3200, 30, 96000, false, 9),
('Riding Horse', 'horse', '🐎', 75000, 4900, 30, 147000, false, 10),
('Prize Bull', 'bull', '🐂', 100000, 6700, 30, 201000, false, 11)
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.srv_ensure_my_profile(_user_id uuid, _email text, _phone text DEFAULT NULL, _display_name text DEFAULT NULL, _referral_code text DEFAULT NULL)
RETURNS public.profiles LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT * FROM private.ensure_my_profile(_user_id, _email, _phone, _display_name, _referral_code);
$$;
REVOKE ALL ON FUNCTION public.srv_ensure_my_profile(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_ensure_my_profile(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_purchase_package(_user_id uuid, _package_id bigint)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.purchase_package(_user_id, _package_id);
$$;
REVOKE ALL ON FUNCTION public.srv_purchase_package(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_purchase_package(uuid, bigint) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_collect_income(_user_id uuid)
RETURNS numeric LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.collect_income(_user_id);
$$;
REVOKE ALL ON FUNCTION public.srv_collect_income(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_collect_income(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_request_withdrawal(_user_id uuid, _amount numeric, _phone text)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.request_withdrawal(_user_id, _amount, _phone);
$$;
REVOKE ALL ON FUNCTION public.srv_request_withdrawal(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_request_withdrawal(uuid, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_complete_mpesa_deposit(_checkout_request_id text, _receipt text, _amount numeric, _phone text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.complete_mpesa_deposit(_checkout_request_id, _receipt, _amount, _phone, _metadata);
$$;
REVOKE ALL ON FUNCTION public.srv_complete_mpesa_deposit(text, text, numeric, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_complete_mpesa_deposit(text, text, numeric, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_fail_mpesa_deposit(_checkout_request_id text, _reason text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.fail_mpesa_deposit(_checkout_request_id, _reason, _metadata);
$$;
REVOKE ALL ON FUNCTION public.srv_fail_mpesa_deposit(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_fail_mpesa_deposit(text, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION private.review_deposit(_admin_id uuid, _transaction_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_tx public.transactions%ROWTYPE;
BEGIN
  IF NOT private.has_role(_admin_id, 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id AND type = 'deposit' FOR UPDATE;
  IF v_tx.id IS NULL THEN RAISE EXCEPTION 'Deposit not found'; END IF;
  IF v_tx.status <> 'pending' THEN RAISE EXCEPTION 'Deposit already reviewed'; END IF;
  IF _approve THEN
    UPDATE public.transactions
    SET status = 'completed', processed_at = now(),
        metadata = metadata || jsonb_build_object('reviewed_by', _admin_id::text, 'review_note', _reason)
    WHERE id = v_tx.id;
    UPDATE public.profiles SET deposit_balance = deposit_balance + v_tx.amount_kes WHERE id = v_tx.user_id;
  ELSE
    UPDATE public.transactions
    SET status = 'rejected', failure_reason = left(coalesce(nullif(trim(_reason), ''), 'Rejected by reviewer'), 500),
        processed_at = now(), metadata = metadata || jsonb_build_object('reviewed_by', _admin_id::text)
    WHERE id = v_tx.id;
  END IF;
  RETURN v_tx.id;
END;
$$;
REVOKE ALL ON FUNCTION private.review_deposit(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.review_deposit(uuid, uuid, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_review_deposit(_admin_id uuid, _transaction_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.review_deposit(_admin_id, _transaction_id, _approve, _reason);
$$;
REVOKE ALL ON FUNCTION public.srv_review_deposit(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_review_deposit(uuid, uuid, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION private.review_withdrawal(_admin_id uuid, _transaction_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_tx public.transactions%ROWTYPE;
BEGIN
  IF NOT private.has_role(_admin_id, 'admin') THEN RAISE EXCEPTION 'Admin access required'; END IF;
  SELECT * INTO v_tx FROM public.transactions WHERE id = _transaction_id AND type = 'withdrawal' FOR UPDATE;
  IF v_tx.id IS NULL THEN RAISE EXCEPTION 'Withdrawal not found'; END IF;
  IF v_tx.status <> 'pending' THEN RAISE EXCEPTION 'Withdrawal already reviewed'; END IF;
  IF _approve THEN
    UPDATE public.transactions
    SET status = 'completed', processed_at = now(),
        metadata = metadata || jsonb_build_object('reviewed_by', _admin_id::text, 'review_note', _reason)
    WHERE id = v_tx.id;
  ELSE
    UPDATE public.transactions
    SET status = 'rejected', failure_reason = left(coalesce(nullif(trim(_reason), ''), 'Rejected by reviewer'), 500),
        processed_at = now(), metadata = metadata || jsonb_build_object('reviewed_by', _admin_id::text)
    WHERE id = v_tx.id;
    UPDATE public.profiles SET account_balance = account_balance + v_tx.amount_kes WHERE id = v_tx.user_id;
  END IF;
  RETURN v_tx.id;
END;
$$;
REVOKE ALL ON FUNCTION private.review_withdrawal(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.review_withdrawal(uuid, uuid, boolean, text) TO service_role;

CREATE OR REPLACE FUNCTION public.srv_review_withdrawal(_admin_id uuid, _transaction_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS uuid LANGUAGE sql SECURITY DEFINER SET search_path = public, private AS $$
  SELECT private.review_withdrawal(_admin_id, _transaction_id, _approve, _reason);
$$;
REVOKE ALL ON FUNCTION public.srv_review_withdrawal(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.srv_review_withdrawal(uuid, uuid, boolean, text) TO service_role;