import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Bird, Home, LogOut, Menu, PawPrint, PiggyBank, UserRound, Users, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { useFarmData } from '@/hooks/use-farm-data'

function CompleteProfileNotice() {
  const q = useFarmData()
  const [hidden, setHidden] = useState(false)
  const profile = q.data?.profile
  if (hidden || !profile || profile.phone) return null
  return <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-dashed bg-card p-4">
    <div className="min-w-0">
      <p className="font-bold">Finish setting up your estate</p>
      <p className="mt-1 text-xs text-muted-foreground">Add your real name, M-Pesa number and referral code on the profile page.</p>
    </div>
    <div className="flex items-center gap-2">
      <Button asChild size="sm"><Link to="/profile">Add details</Link></Button>
      <Button variant="ghost" size="icon" aria-label="Dismiss reminder" onClick={() => setHidden(true)}><X /></Button>
    </div>
  </div>
}


const nav = [
  { to: '/dashboard', label: 'Estate', icon: Home }, { to: '/shop', label: 'Shop', icon: Bird }, { to: '/farm', label: 'My farm', icon: PawPrint },
  { to: '/wallet', label: 'Wallet', icon: PiggyBank }, { to: '/referrals', label: 'Invite', icon: Users }, { to: '/profile', label: 'Profile', icon: UserRound },
] as const

export function FarmShell() {
  const [open, setOpen] = useState(false)
  const path = useRouterState({ select: (s) => s.location.pathname })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  async function signOut() { await queryClient.cancelQueries(); queryClient.clear(); await supabase.auth.signOut(); await navigate({ to: '/auth', replace: true }) }
  return <div className="min-h-screen bg-background paper-grain">
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-sidebar text-sidebar-foreground transition-transform duration-300 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-full flex-col px-4 py-5">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-2">
          <div className="grid size-11 place-items-center rounded-full bg-sidebar-primary text-xl">🐄</div>
          <div className="min-w-0"><p className="font-display text-xl leading-none">Mifugo</p><p className="mt-1 text-[10px] font-bold uppercase text-sidebar-primary">Farm estate</p></div>
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="lg:hidden"><X /></Button>
        </div>
        <nav className="mt-10 space-y-1">
          {nav.map((item) => { const active = path === item.to; return <Link key={item.to} to={item.to} onClick={() => setOpen(false)} className={`flex items-center gap-3 rounded-md px-3 py-3 text-sm font-bold transition-colors ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'}`}><item.icon className="size-5" />{item.label}</Link> })}
        </nav>
        <div className="mt-auto rounded-md border border-sidebar-border bg-sidebar-accent p-4"><p className="font-display text-lg">Your estate grows daily.</p><p className="mt-1 text-xs text-sidebar-foreground/70">Track every animal, cycle and shilling in one place.</p></div>
        <Button variant="ghost" onClick={signOut} className="mt-3 justify-start text-sidebar-foreground/80"><LogOut /> Sign out</Button>
      </div>
    </aside>
    {open && <button aria-label="Close navigation" className="fixed inset-0 z-30 bg-foreground/40 lg:hidden" onClick={() => setOpen(false)} />}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-20 grid h-16 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/70 bg-background/90 px-4 backdrop-blur-lg lg:px-8">
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} className="lg:hidden"><Menu /></Button>
        <div className="min-w-0"><p className="truncate font-display text-lg capitalize">{path.replace('/', '').replace('-', ' ') || 'Mifugo'}</p><p className="hidden text-xs text-muted-foreground sm:block">Live estate account</p></div>
        <div className="flex items-center gap-2"><span className="hidden rounded-md bg-secondary px-3 py-1 text-xs font-bold text-secondary-foreground sm:inline">KES account</span></div>
      </header>
      <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10"><CompleteProfileNotice /><Outlet /></main>
    </div>
    <nav className="fixed inset-x-3 bottom-3 z-20 grid grid-cols-6 rounded-lg border border-border bg-card/95 p-1.5 shadow-xl backdrop-blur-lg lg:hidden">
      {nav.map((item) => { const active = path === item.to; return <Link key={item.to} to={item.to} className={`flex min-w-0 flex-col items-center gap-1 rounded-md py-2 text-[9px] font-bold ${active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}><item.icon className="size-4"/><span className="truncate">{item.label}</span></Link> })}
    </nav>
  </div>
}
