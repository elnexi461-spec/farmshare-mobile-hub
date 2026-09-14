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