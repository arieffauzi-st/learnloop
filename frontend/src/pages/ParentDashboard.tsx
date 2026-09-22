import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { apiFetch } from './TeacherDashboard'

interface Child { child_id: number; child_name: string }
interface Summary {
  child: { id: number; name: string }
  level: number; xp: number; streak: number; on_time: number; late: number
  per_class: { class_id: number; class_name: string; xp: number; total: number }[]
  recent_submissions: { assignment_title: string; status: string; submitted_at: string; version: number }[]
  missing: { assignment_title: string; status: string }[]
}

const STATUS: Record<string, { icon: string; label: string; cls: string }> = {
  on_time: { icon: '✅', label: 'On time', cls: 'bg-lime/15 text-lime' },
  late: { icon: '⏰', label: 'Late', cls: 'bg-amber-warm/15 text-amber-warm' },
  missing: { icon: '⚠️', label: 'Not submitted', cls: 'bg-coral-deep/10 text-coral-deep' },
}

function StatusChip({ s }: { s: string }) {
  const c = STATUS[s] ?? STATUS.missing
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-display text-xs font-bold ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  )
}

/** Parent glanceable dashboard (Stitch design: design/stitch/parent-dashboard).
 *  Calm, reassuring summary: child selector, stat cards, per-class XP bars,
 *  recent activity. Same API flows as before. */
export default function ParentDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const name = (auth.user?.profile.preferred_username as string) ?? 'Parent'
  const [children, setChildren] = useState<Child[]>([])
  const [selected, setSelected] = useState<Child | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [linkCode, setLinkCode] = useState('')
  const [msg, setMsg] = useState('')
  const [msgIsError, setMsgIsError] = useState(false)

  useEffect(() => {
    apiFetch('/parent/children', token)
      .then((r: Child[]) => { setChildren(r); setSelected(r[0] ?? null) })
      .catch(() => setChildren([]))
  }, [token])

  useEffect(() => {
    if (selected) apiFetch(`/parent/children/${selected.child_id}/summary`, token).then(setSummary).catch(() => setSummary(null))
    else setSummary(null)
  }, [selected, token])

  const link = async () => {
    try {
      const r = await apiFetch('/parent/link', token, { method: 'POST', body: JSON.stringify({ link_code: linkCode.trim() }) })
      setMsg(`Connected to ${r.child_name}! 🎉`)
      setMsgIsError(false)
      setLinkCode('')
      apiFetch('/parent/children', token)
        .then((kids: Child[]) => { setChildren(kids); setSelected(kids[0] ?? null) })
        .catch(() => {})
    } catch (e) {
      // Friendly messages instead of raw API error JSON (issue #52).
      // apiFetch throws Error("<status> <body>")
      const status = Number((e as Error)?.message?.split(' ')[0])
      if (status === 409) {
        setMsg('Already connected to this child ✅')
        setMsgIsError(false)
      } else if (status === 422) {
        setMsg('Cannot use that code (self-link or parent child limit reached)')
        setMsgIsError(true)
      } else {
        setMsg('Invalid code — ask your child for the current code')
        setMsgIsError(true)
      }
    }
  }

  return (
    <main className="min-h-screen bg-cream font-body text-ink relative overflow-hidden">
      {/* Page-level ambient glows (mock: layered blobs) */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-lilac/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-32 w-96 h-96 rounded-full bg-sunny/15 blur-3xl pointer-events-none" />
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Header banner */}
        <section className="relative overflow-hidden bg-white rounded-3xl p-6 md:p-8 shadow-lift border border-border-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-lilac/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-14 left-1/4 w-40 h-40 bg-teal/15 rounded-full blur-3xl pointer-events-none" />
          {/* Playful sticker (mock: parent hero card) */}
          <div className="absolute top-4 right-5 text-3xl rotate-6 select-none pointer-events-none opacity-80">
            💌
          </div>
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-lilac/15 text-[#6c5ce7] font-display text-xs font-bold mb-1">
              <span>🏡</span> Parent View
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Hello, {name}!</h1>
            <p className="text-muted mt-1">A calm, glanceable view of your child's learning journey.</p>
          </div>
          <button
            onClick={() => void auth.signoutRedirect()}
            className="relative z-10 self-start md:self-center px-4 py-2.5 min-h-[40px] rounded-full border-2 border-border-soft bg-warm text-sm font-display font-bold hover:bg-white transition-colors"
          >
            Sign out
          </button>
        </section>

        {/* Link a child */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
          <h2 className="font-display text-xl font-bold">Connect a Child 🔗</h2>
          <p className="text-sm text-muted mb-4">Enter the 8-character connection code shown on your child's dashboard.</p>
          <div className="flex gap-2">
            <input
              value={linkCode}
              onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
              maxLength={8}
              placeholder="CODE8"
              className="input-warm rounded-xl px-4 py-2.5 font-mono flex-1 min-w-0 tracking-widest"
            />
            <button onClick={link} disabled={!linkCode}
              className="btn-push-teal h-12 px-6 rounded-full bg-teal text-white font-display font-bold disabled:opacity-40 disabled:shadow-none">
              Connect
            </button>
          </div>
          {msg && <p className={`text-sm mt-3 ${msgIsError ? 'text-coral-deep font-semibold' : 'text-muted'}`}>{msg}</p>}
        </section>

        {children.length === 0 ? (
          <div className="rounded-3xl dashed-playful bg-warm/40 p-10 text-center">
            <p className="font-display font-bold text-lg">No children connected yet 🌱</p>
            <p className="text-sm text-muted mt-1">Enter the connection code from your child's dashboard to start following their progress.</p>
          </div>
        ) : (
          <>
            {/* Child selector */}
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <button
                  key={c.child_id}
                  onClick={() => setSelected(c)}
                  className={`px-4 py-2.5 min-h-[40px] rounded-full border-2 font-display text-sm font-bold transition-all ${
                    selected?.child_id === c.child_id
                      ? 'border-coral bg-coral/10 text-coral-deep shadow-sm'
                      : 'border-border-soft bg-white text-muted hover:text-ink'
                  }`}
                >
                  {c.child_name}
                </button>
              ))}
            </div>

            {summary && (
              <>
                {/* Stat cards (mock: tinted icon tiles, playful rotations) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { emoji: '🏅', main: `Level ${summary.level}`, sub: 'Current level', tile: 'bg-teal/15', rot: '-rotate-2' },
                    { emoji: '⭐', main: `${summary.xp} XP`, sub: 'Experience earned', tile: 'bg-sunny/30', rot: 'rotate-2' },
                    { emoji: '🔥', main: `${summary.streak} Days`, sub: 'Learning streak', tile: 'bg-coral/15', rot: '-rotate-2' },
                    { emoji: '📌', main: `${summary.on_time} / ${summary.late}`, sub: 'On time / late', tile: 'bg-lilac/15', rot: 'rotate-2' },
                  ].map((s) => (
                    <div key={s.sub} className="bg-white rounded-3xl p-5 shadow-lift border border-border-soft hover:-translate-y-0.5 transition-transform">
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center text-2xl shadow-inner ${s.tile} ${s.rot}`}>
                        {s.emoji}
                      </div>
                      <div className="font-display text-2xl font-extrabold mt-2">{s.main}</div>
                      <div className="text-xs text-muted font-semibold">{s.sub}</div>
                    </div>
                  ))}
                </div>

                {/* XP per class */}
                <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
                  <h2 className="font-display text-xl font-bold mb-1">Progress per Class 📊</h2>
                  <p className="text-sm text-muted mb-4">Experience earned in each class adventure.</p>
                  {summary.per_class.length === 0 && <p className="text-sm text-muted">No data yet.</p>}
                  {summary.per_class.map((pc) => (
                    <div key={pc.class_id} className="mb-4 last:mb-0">
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-display font-bold">{pc.class_name}</span>
                        <span className="text-muted">{pc.xp} XP · {pc.total} missions</span>
                      </div>
                      <div className="h-4 bg-warm rounded-full overflow-hidden p-0.5 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sunny via-teal to-teal-dark transition-all duration-1000"
                          style={{ width: `${Math.min(100, pc.xp * 5)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </section>

                {/* Recent activity */}
                <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
                  <h2 className="font-display text-xl font-bold mb-1">Recent Activity 🕰️</h2>
                  <p className="text-sm text-muted mb-4">The latest missions from your child.</p>
                  <ul className="space-y-3">
                    {summary.recent_submissions.map((r, i) => (
                      <li key={i} className="flex items-center justify-between gap-3 bg-warm/40 rounded-2xl px-4 py-3 border border-border-soft/60">
                        <span className="font-medium">{r.assignment_title}</span>
                        <StatusChip s={r.status} />
                      </li>
                    ))}
                    {summary.missing.map((r, i) => (
                      <li key={`m${i}`} className="flex items-center justify-between gap-3 bg-warm/40 rounded-2xl px-4 py-3 border border-border-soft/60">
                        <span className="font-medium">{r.assignment_title}</span>
                        <StatusChip s="missing" />
                      </li>
                    ))}
                    {summary.recent_submissions.length === 0 && summary.missing.length === 0 && (
                      <li className="text-sm text-muted text-center py-4">No activity to show yet.</li>
                    )}
                  </ul>
                </section>
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
