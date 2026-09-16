import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

type AnyClient = {
  from: (t: string) => any
  rpc: (n: string, a: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
}

async function assertAdmin(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin')
  if (!data || data.length === 0) throw new Error('Admin access required')
}

export type AdminUserRow = {
  id: string
  email: string | null
  phone: string | null
  display_name: string | null
  account_balance: number
  deposit_balance: number
  unclaimed_income: number
  referral_code: string
  is_active: boolean
  created_at: string
}

export const listMembers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const [{ data: profiles, error }, { data: roles }, { data: investments }] = await Promise.all([
      admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      admin.from('user_roles').select('user_id, role'),
      admin.from('investments').select('user_id, status'),
    ])
    if (error) throw new Error(error.message)
    const adminIds = new Set((roles ?? []).filter((r: any) => r.role === 'admin').map((r: any) => r.user_id))
    const counts = new Map<string, number>()
    for (const i of (investments ?? []) as any[]) {
      if (i.status === 'active') counts.set(i.user_id, (counts.get(i.user_id) ?? 0) + 1)
    }
    return {
      members: ((profiles ?? []) as any[]).map((p) => ({
        id: p.id as string,
        email: p.email as string | null,
        phone: p.phone as string | null,
        display_name: p.display_name as string | null,
        account_balance: Number(p.account_balance),
        deposit_balance: Number(p.deposit_balance),
        unclaimed_income: Number(p.unclaimed_income),
        referral_code: p.referral_code as string,
        is_active: Boolean(p.is_active),
        created_at: p.created_at as string,
        is_admin: adminIds.has(p.id),
        active_animals: counts.get(p.id) ?? 0,
      })),
    }
  })

export const adjustMemberBalance = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        userId: z.string().uuid(),
        amount: z.number().positive().max(1_000_000),
        direction: z.enum(['credit', 'debit']),
        wallet: z.enum(['deposit_balance', 'account_balance']),
        note: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const { data: profile, error } = await admin.from('profiles').select('*').eq('id', data.userId).maybeSingle()
    if (error) return { ok: false as const, message: error.message }
    if (!profile) return { ok: false as const, message: 'Member not found' }

    const current = Number(profile[data.wallet] ?? 0)
    const delta = data.direction === 'credit' ? data.amount : -data.amount
    const next = current + delta
    if (next < 0) return { ok: false as const, message: `Member only has ${current.toLocaleString()} in that balance` }

    const { error: updErr } = await admin.from('profiles').update({ [data.wallet]: next }).eq('id', data.userId)
    if (updErr) return { ok: false as const, message: updErr.message }

    await admin.from('transactions').insert({
      user_id: data.userId,
      type: data.direction === 'credit' ? 'deposit' : 'withdrawal',
      status: 'completed',
      amount_kes: data.amount,
      provider: 'manual',
      provider_reference: `ADMIN-${Date.now()}`,
      processed_at: new Date().toISOString(),
      metadata: { admin_id: context.userId, wallet: data.wallet, note: data.note ?? null, source: 'admin_adjustment' },
    })

    return {
      ok: true as const,
      message: `${data.direction === 'credit' ? 'Credited' : 'Debited'} KES ${data.amount.toLocaleString()}`,
      balance: next,
    }
  })

export const setMemberActive = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid(), isActive: z.boolean() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    if (data.userId === context.userId) return { ok: false as const, message: 'You cannot suspend your own account' }
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const { error } = await admin.from('profiles').update({ is_active: data.isActive }).eq('id', data.userId)
    if (error) return { ok: false as const, message: error.message }
    return { ok: true as const, message: data.isActive ? 'Member reinstated' : 'Member suspended' }
  })

export const getMemberRecords = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const [{ data: transactions }, { data: investments }, { data: commissions }] = await Promise.all([
      admin.from('transactions').select('*').eq('user_id', data.userId).order('created_at', { ascending: false }).limit(50),
      admin.from('investments').select('*, packages(name, emoji)').eq('user_id', data.userId).order('started_at', { ascending: false }),
      admin.from('referral_commissions').select('*').eq('earner_id', data.userId).order('created_at', { ascending: false }).limit(50),
    ])
    return { transactions: transactions ?? [], investments: investments ?? [], commissions: commissions ?? [] }
  })

export const getPendingWithdrawals = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const { data, error } = await admin
      .from('transactions')
      .select('*')
      .eq('type', 'withdrawal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const ids = [...new Set(((data ?? []) as any[]).map((t) => t.user_id))]
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, email, phone, display_name')
      .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
    return { withdrawals: (data ?? []) as any[], profiles: (profiles ?? []) as any[] }
  })

export const reviewWithdrawal = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ transactionId: z.string().uuid(), approve: z.boolean(), reason: z.string().max(300).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const admin = supabaseAdmin as unknown as AnyClient
    const { error } = await admin.rpc('srv_review_withdrawal', {
      _admin_id: context.userId,
      _transaction_id: data.transactionId,
      _approve: data.approve,
      _reason: data.reason ?? null,
    })
    if (error) return { ok: false as const, message: error.message }
    return { ok: true as const, message: data.approve ? 'Withdrawal approved' : 'Withdrawal rejected' }
  })
