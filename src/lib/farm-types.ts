import type { Tables } from '@/integrations/supabase/types'
export type Profile = Tables<'profiles'>
export type Package = Tables<'packages'>
export type Transaction = Tables<'transactions'>
export type Commission = Tables<'referral_commissions'>
export type Investment = Tables<'investments'> & { packages: Package | null }
export type FarmData = { profile: Profile | null; packages: Package[]; investments: Investment[]; transactions: Transaction[]; commissions: Commission[]; isAdmin: boolean }
export const kes = (value: number | string | null | undefined) => `KES ${Number(value ?? 0).toLocaleString('en-KE', { maximumFractionDigits: 2 })}`
