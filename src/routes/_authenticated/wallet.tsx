import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDownLeft, ArrowUpRight, Check, Copy, Smartphone, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { useFarmData } from '@/hooks/use-farm-data'
import { withdrawFunds } from '@/lib/farm.functions'
import { COMPANY_ACCOUNT_NAME, COMPANY_ACCOUNT_NUMBER, createDepositRequest } from '@/lib/deposit.functions'
import { kes } from '@/lib/farm-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PageLoading, PageError, EmptyState } from '@/components/page-states'
import { ProfileSetup } from '@/components/profile-setup'

export const Route = createFileRoute('/_authenticated/wallet')({
  head: () => ({
    meta: [
      { title: 'Wallet — Mifugo Farm' },
      { name: 'description', content: 'Recharge your farm wallet, withdraw earnings and track every transaction.' },
      { property: 'og:title', content: 'Wallet — Mifugo Farm' },
      { property: 'og:description', content: 'Recharge, withdraw and track farm payments.' },
      { property: 'og:type', content: 'website' },
      { name: 'twitter:card', content: 'summary' },
    ],
  }),
  component: Wallet,
})

type DepositStep = 'form' | 'details' | 'confirm'

const QUICK_AMOUNTS = [100, 500, 1000, 2500, 5000, 10000]
const DEPOSIT_SECONDS = 30 * 60

function Wallet() {
  const q = useFarmData()
  const qc = useQueryClient()
  const withdraw = useServerFn(withdrawFunds)
  const submitDeposit = useServerFn(createDepositRequest)
  const [tab, setTab] = useState<'recharge' | 'withdraw'>('recharge')
  const [step, setStep] = useState<DepositStep>('form')
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState<number | null>(null)
  const [payPhone, setPayPhone] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(DEPOSIT_SECONDS)

  useEffect(() => {
    if (step !== 'details') return
    setSecondsLeft(DEPOSIT_SECONDS)
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [step])

  if (q.isLoading) return <PageLoading />
  if (q.error) return <PageError message={q.error.message} />
  if (!q.data?.profile) return <ProfileSetup onDone={() => qc.invalidateQueries({ queryKey: ['farm-data'] })} />
  const p = q.data.profile

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0')
  const ss = String(secondsLeft % 60).padStart(2, '0')

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`))
  }

  function startRecharge(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const amt = Number(fd.get('depositAmount'))
    const phone = String(fd.get('depositPhone'))
    if (!amt || amt < 50) { toast.error('Minimum deposit is KES 50'); return }
    setAmount(amt)
    setPayPhone(phone)
    setStep('details')
  }

  async function confirmPaid(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    try {
      const result = await submitDeposit({
        data: {
          amount: Number(fd.get('paidAmount')),
          phone: String(fd.get('payerPhone')),
          transactionRef: String(fd.get('transactionRef')),
        },
      })
      if (!result.ok) { toast.error(result.message); return }
      toast.success(result.message)
      setStep('form')
      setAmount(null)
      await qc.invalidateQueries({ queryKey: ['farm-data'] })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setBusy(false)
    }
  }

  async function submitWithdrawal(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setBusy(true)
    try {
      await withdraw({ data: { amount: Number(fd.get('amount')), phone: String(fd.get('phone')) } })
      await qc.invalidateQueries({ queryKey: ['farm-data'] })
      toast.success('Withdrawal request sent for review')
      e.currentTarget.reset()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-5">
        <section className="rounded-md bg-primary p-6 text-primary-foreground sm:p-7">
          <div className="flex items-center gap-2 text-xs font-extrabold uppercase text-primary-foreground/70"><Smartphone /> Wallet</div>
          <p className="mt-6 text-sm text-primary-foreground/70">Available to withdraw</p>
          <h1 className="mt-1 text-4xl tabular-nums sm:text-5xl">{kes(p.account_balance)}</h1>
          <div className="mt-7 grid grid-cols-2 gap-3">
            <div className="rounded-md bg-primary-foreground/10 p-4"><p className="text-xs">Deposit balance</p><p className="mt-1 font-extrabold">{kes(p.deposit_balance)}</p></div>
            <div className="rounded-md bg-primary-foreground/10 p-4"><p className="text-xs">Unclaimed</p><p className="mt-1 font-extrabold">{kes(p.unclaimed_income)}</p></div>
          </div>
        </section>

        <section className="rounded-md border bg-card p-5 sm:p-6">
          <div className="grid grid-cols-2 gap-2 rounded-md bg-muted p-1">
            <button type="button" onClick={() => { setTab('recharge'); setStep('form') }} className={`rounded-md py-2 text-sm font-bold ${tab === 'recharge' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Recharge</button>
            <button type="button" onClick={() => setTab('withdraw')} className={`rounded-md py-2 text-sm font-bold ${tab === 'withdraw' ? 'bg-card shadow-sm' : 'text-muted-foreground'}`}>Withdraw</button>
          </div>

          {tab === 'recharge' && step === 'form' && (
            <form onSubmit={startRecharge} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="depositAmount">Amount (KES)</Label>
                <Input id="depositAmount" name="depositAmount" type="number" min="50" max="250000" required className="mt-2" value={amount ?? ''} onChange={(e) => setAmount(Number(e.target.value))} />
                <div className="mt-2 flex flex-wrap gap-2">
                  {QUICK_AMOUNTS.map((a) => (
                    <button key={a} type="button" onClick={() => setAmount(a)} className={`rounded-md border px-3 py-1 text-xs font-bold ${amount === a ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground'}`}>{a.toLocaleString()}</button>
                  ))}
                </div>
              </div>
              <div>
                <Label htmlFor="depositPhone">Your phone number</Label>
                <Input id="depositPhone" name="depositPhone" defaultValue={p.phone ?? ''} pattern="(254[0-9]{9}|0[0-9]{9})" required className="mt-2" placeholder="0712345678" />
              </div>
              <Button size="lg" className="w-full">Proceed to payment</Button>
              <p className="text-xs text-muted-foreground">Minimum deposit: KES 50</p>
            </form>
          )}

          {tab === 'recharge' && step === 'details' && amount !== null && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-md bg-muted p-3">
                <span className="flex items-center gap-2 text-sm font-bold"><Timer className="size-4 text-primary" /> Complete within</span>
                <span className="text-lg font-extrabold tabular-nums text-primary">{mm}:{ss}</span>
              </div>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Amount to send</dt><dd className="font-extrabold tabular-nums">{kes(amount)}</dd></div>
                <div className="flex items-center justify-between gap-3"><dt className="text-muted-foreground">Send from</dt><dd className="font-bold">{payPhone}</dd></div>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div><dt className="text-xs text-muted-foreground">Company account number</dt><dd className="text-lg font-extrabold tracking-wide">{COMPANY_ACCOUNT_NUMBER}</dd></div>
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(COMPANY_ACCOUNT_NUMBER, 'Account number')}><Copy className="size-4" /></Button>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div><dt className="text-xs text-muted-foreground">Account name</dt><dd className="font-bold">{COMPANY_ACCOUNT_NAME}</dd></div>
                  <Button type="button" size="sm" variant="outline" onClick={() => copy(COMPANY_ACCOUNT_NAME, 'Account name')}><Copy className="size-4" /></Button>
                </div>
              </dl>
              <Button size="lg" className="w-full" onClick={() => setStep('confirm')}><Check className="size-4" /> I have paid</Button>
              <button type="button" onClick={() => setStep('form')} className="w-full text-center text-xs font-bold text-muted-foreground">Change amount</button>
            </div>
          )}

          {tab === 'recharge' && step === 'confirm' && amount !== null && (
            <form onSubmit={confirmPaid} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="paidAmount">Amount paid (KES)</Label>
                <Input id="paidAmount" name="paidAmount" type="number" min="50" required className="mt-2" defaultValue={amount} />
              </div>
              <div>
                <Label htmlFor="transactionRef">Transaction ID / confirmation message</Label>
                <Input id="transactionRef" name="transactionRef" required minLength={6} className="mt-2" placeholder="e.g. QGH7X2K9LM" />
              </div>
              <div>
                <Label htmlFor="payerPhone">Phone number you paid from</Label>
                <Input id="payerPhone" name="payerPhone" pattern="(254[0-9]{9}|0[0-9]{9})" required className="mt-2" defaultValue={payPhone} />
              </div>
              <Button size="lg" className="w-full" disabled={busy}>{busy ? 'Submitting…' : 'Paid — submit for review'}</Button>
              <p className="text-xs text-muted-foreground">Your deposit is credited after an admin confirms the payment.</p>
            </form>
          )}

          {tab === 'withdraw' && (
            <form onSubmit={submitWithdrawal} className="mt-5 space-y-4">
              <div>
                <Label htmlFor="amount">Amount (KES)</Label>
                <Input id="amount" name="amount" type="number" min="1" max={Number(p.account_balance)} required className="mt-2" />
              </div>
              <div>
                <Label htmlFor="phone">M-Pesa number</Label>
                <Input id="phone" name="phone" defaultValue={p.phone ?? ''} pattern="254[0-9]{9}" required className="mt-2" placeholder="254712345678" />
              </div>
              <Button size="lg" className="w-full" disabled={busy || Number(p.account_balance) <= 0}>{busy ? 'Sending…' : 'Request withdrawal'}</Button>
              <p className="text-xs text-muted-foreground">Requests are reviewed before payout.</p>
            </form>
          )}
        </section>
      </div>

      <section>
        <div className="mb-4">
          <p className="text-xs font-extrabold uppercase text-primary">Money trail</p>
          <h2 className="mt-1 text-2xl sm:text-3xl">Transaction history</h2>
        </div>
        {q.data.transactions.length === 0 ? (
          <EmptyState title="No transactions yet" body="Your deposits and withdrawal requests will appear here." />
        ) : (
          <div className="overflow-hidden rounded-md border bg-card">
            {q.data.transactions.map((t) => (
              <article key={t.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b p-4 last:border-0">
                <div className={`grid size-10 place-items-center rounded-full ${t.type === 'deposit' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground'}`}>{t.type === 'deposit' ? <ArrowDownLeft /> : <ArrowUpRight />}</div>
                <div className="min-w-0">
                  <p className="truncate font-bold capitalize">{t.type} · {t.provider === 'manual' ? 'Manual review' : 'M-Pesa'}</p>
                  <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleString('en-KE')}{t.provider_reference ? ` · ${t.provider_reference}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold tabular-nums">{t.type === 'deposit' ? '+' : '-'}{kes(t.amount_kes)}</p>
                  <Badge variant={t.status === 'completed' ? 'default' : 'secondary'}>{t.status}</Badge>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
