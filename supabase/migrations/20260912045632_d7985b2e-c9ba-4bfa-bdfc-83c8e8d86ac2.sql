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