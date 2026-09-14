CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

DROP POLICY profiles_read_own ON public.profiles;
DROP POLICY roles_read_own_or_admin ON public.user_roles;
DROP POLICY packages_read_active ON public.packages;
DROP POLICY investments_read_own_or_admin ON public.investments;
DROP POLICY transactions_read_own_or_admin ON public.transactions;
DROP POLICY commissions_read_own_or_admin ON public.referral_commissions;
DROP POLICY points_read_own_or_admin ON public.points_ledger;

DROP FUNCTION public.has_role(uuid, public.app_role);
DROP FUNCTION public.ensure_my_profile(text, text, text, text);
DROP FUNCTION public.purchase_package(bigint);
DROP FUNCTION public.collect_income();
DROP FUNCTION public.request_withdrawal(numeric, text);
DROP FUNCTION public.accrue_daily_income();

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, private AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

CREATE POLICY profiles_read_own ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY roles_read_own_or_admin ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY packages_read_active ON public.packages FOR SELECT TO authenticated USING (is_active OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY investments_read_own_or_admin ON public.investments FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY transactions_read_own_or_admin ON public.transactions FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY commissions_read_own_or_admin ON public.referral_commissions FOR SELECT TO authenticated USING (earner_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));
CREATE POLICY points_read_own_or_admin ON public.points_ledger FOR SELECT TO authenticated USING (user_id = auth.uid() OR private.has_role(auth.uid(), 'admin'));

REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (phone, display_name, avatar_animal, updated_at) ON public.profiles TO authenticated;

CREATE OR REPLACE FUNCTION private.ensure_my_profile(_user_id uuid, _email text, _phone text DEFAULT NULL, _display_name text DEFAULT NULL, _referral_code text DEFAULT NULL)
RETURNS public.profiles LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_profile public.profiles; v_referrer uuid;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'Authentication required'; END IF;
  IF _referral_code IS NOT NULL AND length(trim(_referral_code)) > 0 THEN
    SELECT id INTO v_referrer FROM public.profiles WHERE referral_code = upper(trim(_referral_code)) AND id <> _user_id;
    IF v_referrer IS NULL THEN RAISE EXCEPTION 'Invalid referral code'; END IF;
  END IF;
  INSERT INTO public.profiles (id, email, phone, display_name, referred_by)
  VALUES (_user_id, lower(nullif(trim(_email), '')), nullif(trim(_phone), ''), nullif(trim(_display_name), ''), v_referrer)
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(public.profiles.email, excluded.email), phone = COALESCE(public.profiles.phone, excluded.phone), display_name = COALESCE(public.profiles.display_name, excluded.display_name)
  RETURNING * INTO v_profile;
  INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, 'user') ON CONFLICT DO NOTHING;
  RETURN v_profile;
END;
$$;
REVOKE ALL ON FUNCTION private.ensure_my_profile(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.ensure_my_profile(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION private.purchase_package(_user_id uuid, _package_id bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_pkg public.packages; v_profile public.profiles; v_investment uuid; v_l1 uuid; v_l2 uuid; v_amount numeric;
BEGIN
  SELECT * INTO v_pkg FROM public.packages WHERE id = _package_id AND is_active FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Package unavailable'; END IF;
  SELECT * INTO v_profile FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Profile not found'; END IF;
  IF v_pkg.is_free AND EXISTS (SELECT 1 FROM public.investments WHERE user_id = _user_id AND package_id = _package_id) THEN RAISE EXCEPTION 'Free package already claimed'; END IF;
  IF NOT v_pkg.is_free AND v_profile.deposit_balance < v_pkg.price_kes THEN RAISE EXCEPTION 'Insufficient deposit balance'; END IF;
  UPDATE public.profiles SET deposit_balance = deposit_balance - v_pkg.price_kes WHERE id = _user_id;
  INSERT INTO public.investments (user_id, package_id, price_paid, daily_income, cycle_days)
  VALUES (_user_id, v_pkg.id, v_pkg.price_kes, v_pkg.daily_income_kes, v_pkg.cycle_days) RETURNING id INTO v_investment;
  IF NOT v_pkg.is_free AND v_profile.referred_by IS NOT NULL THEN
    v_l1 := v_profile.referred_by; v_amount := round(v_pkg.price_kes * 0.15, 2);
    UPDATE public.profiles SET account_balance = account_balance + v_amount WHERE id = v_l1;
    INSERT INTO public.referral_commissions (earner_id, source_user_id, level, investment_id, amount) VALUES (v_l1, _user_id, 1, v_investment, v_amount);
    SELECT referred_by INTO v_l2 FROM public.profiles WHERE id = v_l1;
    IF v_l2 IS NOT NULL THEN
      v_amount := round(v_pkg.price_kes * 0.05, 2);
      UPDATE public.profiles SET account_balance = account_balance + v_amount WHERE id = v_l2;
      INSERT INTO public.referral_commissions (earner_id, source_user_id, level, investment_id, amount) VALUES (v_l2, _user_id, 2, v_investment, v_amount);
    END IF;
  END IF;
  RETURN v_investment;
END;
$$;
REVOKE ALL ON FUNCTION private.purchase_package(uuid, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.purchase_package(uuid, bigint) TO service_role;

CREATE OR REPLACE FUNCTION private.collect_income(_user_id uuid)
RETURNS numeric LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_amount numeric;
BEGIN
  UPDATE public.profiles SET account_balance = account_balance + unclaimed_income, unclaimed_income = 0 WHERE id = _user_id RETURNING account_balance INTO v_amount;
  IF v_amount IS NULL THEN RAISE EXCEPTION 'Profile not found'; END IF;
  RETURN v_amount;
END;
$$;
REVOKE ALL ON FUNCTION private.collect_income(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.collect_income(uuid) TO service_role;

CREATE OR REPLACE FUNCTION private.request_withdrawal(_user_id uuid, _amount numeric, _phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_id uuid;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'Amount must be greater than zero'; END IF;
  IF _phone !~ '^254[0-9]{9}$' THEN RAISE EXCEPTION 'Use a valid 254 mobile number'; END IF;
  UPDATE public.profiles SET account_balance = account_balance - _amount WHERE id = _user_id AND account_balance >= _amount;
  IF NOT FOUND THEN RAISE EXCEPTION 'Insufficient account balance'; END IF;
  INSERT INTO public.transactions (user_id, type, amount_kes, phone, provider) VALUES (_user_id, 'withdrawal', _amount, _phone, 'mpesa') RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION private.request_withdrawal(uuid, numeric, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.request_withdrawal(uuid, numeric, text) TO service_role;

CREATE OR REPLACE FUNCTION private.accrue_daily_income()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private AS $$
DECLARE v_count integer := 0; v_row record; v_days integer; v_credit numeric;
BEGIN
  FOR v_row IN SELECT * FROM public.investments WHERE status = 'active' AND last_accrued_on < current_date FOR UPDATE LOOP
    v_days := LEAST((current_date - v_row.last_accrued_on), v_row.cycle_days - v_row.days_elapsed);
    IF v_days > 0 THEN
      v_credit := v_row.daily_income * v_days;
      UPDATE public.profiles SET unclaimed_income = unclaimed_income + v_credit, available_points = available_points + v_days WHERE id = v_row.user_id;
      UPDATE public.investments SET days_elapsed = days_elapsed + v_days, last_accrued_on = current_date, status = CASE WHEN days_elapsed + v_days >= cycle_days THEN 'completed'::public.investment_status ELSE status END, completed_at = CASE WHEN days_elapsed + v_days >= cycle_days THEN now() ELSE completed_at END WHERE id = v_row.id;
      INSERT INTO public.points_ledger (user_id, delta, reason, investment_id) VALUES (v_row.user_id, v_days, 'Daily farm activity', v_row.id);
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION private.accrue_daily_income() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.accrue_daily_income() TO service_role;