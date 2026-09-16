import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Check, X } from 'lucide-react'
import { useFarmData } from '@/hooks/use-farm-data'
import { getPendingDeposits, reviewDeposit } from '@/lib/deposit.functions'
import { kes } from '@/lib/farm-types'
import { PageLoading, PageError, EmptyState } from '@/components/page-states'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async ({ context }) => { void context },
  head: () => ({
    meta: [
      { title: 'Administration — Mifugo Farm' },
      { name: 'description', content: 'Protected Mifugo Farm administration workspace.' },
      { property: 'og:title', content: 'Administration — Mifugo Farm' },
      { property: 'og:description', content: 'Protected estate operations.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Admin,
})

function Admin() {
  const q = useFarmData()
  const qc = useQueryClient()
  const fetchPending = useServerFn(getPendingDeposits)
  const review = useServerFn(reviewDeposit)
  const [busyId, setBusyId] = useState<string | null>(null)
  const pending = useQuery({
    queryKey: ['pending-deposits'],
    queryFn: () => fetchPending(),
    enabled: Boolean(q.data?.isAdmin),
  })

  if (q.isLoading) return <PageLoading />
  if (q.error) return <PageError message={q.error.message} />
  if (!q.data?.isAdmin) return <PageError message="This area is for administrators only." />
  const d = q.data

  async function act(id: string, approve: boolean) {
    setBusyId(id)
    try {
      let reason: string | undefined
      if (!approve) {
        reason = window.prompt('Reason for rejection (optional)') ?? undefined
      }
      const result = await review({ data: { transactionId: id, approve, reason } })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(result.message)
      await qc.invalidateQueries({ queryKey: ['pending-deposits'] })
      await qc.invalidateQueries({ queryKey: ['farm-data'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Review failed')
    } finally {
      setBusyId(null)
    }
  }

  const deposits = pending.data?.deposits ?? []
  const profiles = new Map((pending.data?.profiles ?? []).map((pr) => [pr.id, pr]))

  return (
    <div>
      <p className="text-xs font-extrabold uppercase text-primary">Operations</p>
      <h1 className="mt-2 text-3xl sm:text-5xl">Estate administration</h1>
      <p className="mt-3 text-sm text-muted-foreground">Live catalog and financial activity visible to authorized administrators only.</p>

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <div className="rounded-md border bg-card p-6"><p className="text-xs font-bold uppercase text-muted-foreground">Active packages</p><p className="mt-2 text-3xl font-extrabold">{d.packages.length}</p></div>
        <div className="rounded-md border bg-card p-6"><p className="text-xs font-bold uppercase text-muted-foreground">Pending deposits</p><p className="mt-2 text-3xl font-extrabold">{deposits.length}</p></div>
        <div className="rounded-md border bg-card p-6"><p className="text-xs font-bold uppercase text-muted-foreground">My commissions</p><p className="mt-2 text-3xl font-extrabold">{kes(d.commissions.reduce((s, c) => s + Number(c.amount), 0))}</p></div>
      </section>

      <section className="mt-6 overflow-hidden rounded-md border bg-card">
        <div className="border-b p-5"><h2 className="text-2xl">Deposit review queue</h2><p className="mt-1 text-xs text-muted-foreground">Approve only after confirming the payment in the company account.</p></div>
        {pending.isLoading ? (
          <p className="p-5 text-sm text-muted-foreground">Loading pending deposits…</p>
        ) : deposits.length === 0 ? (
          <div className="p-5"><EmptyState title="Nothing to review" body="New deposit submissions will appear here." /></div>
        ) : (
          <div>
            {deposits.map((t) => {
              const owner = profiles.get(t.user_id)
              return (
                <article key={t.id} className="grid gap-3 border-b p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="min-w-0">
                    <p className="font-extrabold tabular-nums">{kes(t.amount_kes)} <Badge variant="secondary" className="ml-2">pending</Badge></p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {owner?.display_name ?? 'Farmer'}{owner?.email ? ` · ${owner.email}` : ''} · paid from {t.phone ?? '—'}
                    </p>
                    <p className="mt-1 break-all text-xs text-muted-foreground">Ref: <span className="font-bold text-foreground">{t.provider_reference ?? '—'}</span> · {new Date(t.created_at).toLocaleString('en-KE')}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" disabled={busyId === t.id} onClick={() => act(t.id, true)}><Check className="size-4" /> Approve</Button>
                    <Button size="sm" variant="outline" disabled={busyId === t.id} onClick={() => act(t.id, false)}><X className="size-4" /> Reject</Button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section className="mt-6 overflow-hidden rounded-md border bg-card">
        <div className="border-b p-5"><h2 className="text-2xl">Package catalog</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground"><tr><th className="p-4">Package</th><th>Price</th><th>Daily</th><th>Cycle</th><th>Status</th></tr></thead>
            <tbody>{d.packages.map((p) => <tr key={p.id} className="border-t"><td className="p-4 font-bold">{p.name}</td><td>{kes(p.price_kes)}</td><td>{kes(p.daily_income_kes)}</td><td>{p.cycle_days} days</td><td><Badge>{p.is_active ? 'Active' : 'Hidden'}</Badge></td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
