import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware'

// Manual deposits: the user sends money to the company number, then submits
// the transaction reference. An admin reviews it before the balance is credited.
export const COMPANY_ACCOUNT_NUMBER = '0700000000'
export const COMPANY_ACCOUNT_NAME = 'Mifugo Farm (Demo)'
export const DEPOSIT_WINDOW_MINUTES = 30

const phoneSchema = z
  .string()
  .regex(/^(254\d{9}|0\d{9})$/, 'Use a valid Kenyan number, e.g. 0712345678')
  .transform((v) => (v.startsWith('0') ? `254${v.slice(1)}` : v))

export const createDepositRequest = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        amount: z.number().int().min(50, 'Minimum deposit is KES 50').max(250_000),
        phone: phoneSchema,
        transactionRef: z.string().trim().min(6, 'Enter the full M-Pesa confirmation code or message').max(200),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from('transactions').insert({
      user_id: context.userId,
      type: 'deposit',
      status: 'pending',
      amount_kes: data.amount,
      phone: data.phone,
      provider: 'manual',
      provider_reference: data.transactionRef.toUpperCase(),
      metadata: { payer_phone: data.phone, submitted_ref: data.transactionRef },
    })
    if (error) {
      if (error.message.includes('provider_reference') || error.code === '23505') {
        return { ok: false as const, message: 'This confirmation code was already submitted.' }
      }
      return { ok: false as const, message: 'Could not submit your payment. Please try again.' }
    }
    return { ok: true as const, message: 'Payment submitted. It will be reviewed shortly.' }
  })

async function assertAdmin(supabase: { from: (t: string) => any }, userId: string) {
  const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin')
  if (!data || data.length === 0) throw new Error('Admin access required')
}

export const getPendingDeposits = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { data, error } = await context.supabase
      .from('transactions')
      .select('*')
      .eq('type', 'deposit')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    if (error) throw new Error(error.message)
    const userIds = [...new Set((data ?? []).map((t: { user_id: string }) => t.user_id))]
    const { data: profiles } = await context.supabase
      .from('profiles')
      .select('id, email, phone, display_name')
      .in('id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
    return { deposits: data ?? [], profiles: profiles ?? [] }
  })

export const reviewDeposit = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        transactionId: z.string().uuid(),
        approve: z.boolean(),
        reason: z.string().max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId)
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server')
    const { error } = await (supabaseAdmin as unknown as { rpc: (n: string, a: Record<string, unknown>) => Promise<{ error: { message: string } | null }> }).rpc('srv_review_deposit', {
      _admin_id: context.userId,
      _transaction_id: data.transactionId,
      _approve: data.approve,
      _reason: data.reason ?? null,
    })
    if (error) return { ok: false as const, message: error.message }
    return { ok: true as const, message: data.approve ? 'Deposit approved and balance credited' : 'Deposit rejected' }
  })
