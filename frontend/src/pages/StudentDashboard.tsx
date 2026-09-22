import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { apiFetch } from './TeacherDashboard'
import { parseUtcNaive, formatDueAt } from '../utils/datetime'

interface Assignment {
  id: number
  class_id: number
  title: string
  instructions: string
  due_at: string
}

const XP_PER_LEVEL = 1000
const level = (xp: number) => Math.floor(xp / XP_PER_LEVEL) + 1
const levelProgress = (xp: number) => xp % XP_PER_LEVEL

function dueLabel(due: string): { text: string; tone: 'teal' | 'amber' | 'red' } {
  // due_at arrives as a naive UTC datetime — anchor to UTC before formatting (issue #74).
  const diff = parseUtcNaive(due).getTime() - Date.now()
  const d = formatDueAt(due)
  if (diff < 0) return { text: `Was due ${d}`, tone: 'red' }
  if (diff < 24 * 3600e3) return { text: `Due ${d} (soon)`, tone: 'amber' }
  return { text: `Due ${d}`, tone: 'teal' }
}

const dueTone: Record<'teal' | 'amber' | 'red', string> = {
  teal: 'bg-teal/15 text-teal-dark',
  amber: 'bg-amber-warm/15 text-amber-warm',
  red: 'bg-coral-deep/10 text-coral-deep',
}

const QUEST_EMOJI = ['🍕', '🌀', '🦁', '🔺', '🌿', '🪐', '🧩', '🎨']

/** Student dashboard (Stitch design: design/stitch/student-dashboard).
 *  Same API behavior as before: /me/progress, /classes/join, /student/assignments,
 *  /assignments/:id/submit, /me/link-code — restyled to the Playful Warmth design. */
export default function StudentDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const name = (auth.user?.profile.preferred_username as string) ?? 'Explorer'
  const [joinCode, setJoinCode] = useState('')
  const [progress, setProgress] = useState<{ xp: number; streak: number } | null>(null)
  const [msg, setMsg] = useState('')
  const [msgIsError, setMsgIsError] = useState(false)
  const [active, setActive] = useState<Assignment | null>(null)
  const [celebrate, setCelebrate] = useState<string | null>(null)

  useEffect(() => {
    apiFetch('/me/progress', token).then(setProgress).catch(() => {})
  }, [token])

  const join = async () => {
    try {
      const r = await apiFetch('/classes/join', token, { method: 'POST', body: JSON.stringify({ join_code: joinCode.trim() }) })
      setMsg(`Welcome to ${r.class_name}! 🎉`)
      setMsgIsError(false)
      setJoinCode('')
    } catch (e) {
      // Friendly messages instead of raw API error JSON (issue #52).
      // apiFetch throws Error("<status> <body>")
      const status = Number((e as Error)?.message?.split(' ')[0])
      if (status === 409) {
        setMsg("You're already in this class — pick a mission below! 🎒")
      } else {
        setMsg('Invalid code — check with your teacher')
      }
      setMsgIsError(true)
    }
  }

  const xp = progress?.xp ?? 0
  const streak = progress?.streak ?? 0
  const pct = progress ? Math.round((levelProgress(xp) / XP_PER_LEVEL) * 100) : 0

  return (
    <main className="min-h-screen bg-cream font-body text-ink relative overflow-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header stats banner */}
        <section className="relative overflow-hidden bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-teal/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-12 w-56 h-56 bg-coral/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Profile */}
            <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-sunny/40 shadow-md p-1 flex items-center justify-center">
                  <span className="w-full h-full rounded-full bg-white flex items-center justify-center font-display text-3xl font-bold text-coral">
                    {name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 bg-white px-2.5 py-0.5 rounded-full shadow-md font-display text-xs font-bold">
                  Lv {level(xp)}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-display text-2xl font-bold tracking-tight">{name}</h1>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal/15 text-teal-dark font-display text-xs font-bold">
                    Kid Adventurer
                  </span>
                </div>
                <p className="text-sm text-muted mt-0.5">Ready for today's learning quests!</p>
              </div>
            </div>
            {/* XP progress */}
            <div className="flex flex-col w-full lg:max-w-md bg-warm/70 rounded-2xl p-4 border border-border-soft">
              <div className="flex items-center justify-between mb-2">
                <span className="font-display text-sm font-bold">🚀 XP Progress to Level {level(xp) + 1}</span>
                <span className="font-display text-sm font-bold text-coral">{xp} XP</span>
              </div>
              <div className="relative h-6 w-full bg-warm rounded-full overflow-hidden p-1 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-sunny via-teal to-teal-dark transition-all duration-1000"
                  style={{ width: `${Math.max(pct, 3)}%` }}
                />
                {[25, 50, 75].map((m) => (
                  <div
                    key={m}
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-sm flex items-center justify-center text-[8px] text-sunny"
                    style={{ left: `${m}%` }}
                  >
                    ★
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-xs text-muted">
                <span>Level {level(xp)}</span>
                <span className="text-teal-dark font-bold">{XP_PER_LEVEL - levelProgress(xp)} XP left to Level {level(xp) + 1} 🚀</span>
              </div>
            </div>
            {/* Streak */}
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-gradient-to-br from-sunny/30 to-warm shadow-sm">
              <span className="text-3xl animate-bounce">🔥</span>
              <div className="flex flex-col">
                <span className="font-display text-xl font-extrabold leading-none">{streak} Days</span>
                <span className="text-xs font-semibold text-muted">Streak on Fire!</span>
              </div>
            </div>
          </div>
        </section>

        {/* Join a class */}
        <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
          <h2 className="font-display text-xl font-bold mb-1">Join a Class 🎒</h2>
          <p className="text-sm text-muted mb-4">Got a join code from your teacher? Enter it here to start the adventure.</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              maxLength={6}
              placeholder="CODE6"
              className="input-warm rounded-xl px-4 py-2.5 font-mono flex-1 min-w-0 tracking-widest"
            />
            <button onClick={join} disabled={!joinCode}
              className="btn-push-teal h-12 px-6 rounded-full bg-teal text-white font-display font-bold disabled:opacity-40 disabled:shadow-none">
              Join
            </button>
          </div>
          {msg && <p className={`text-sm mt-3 ${msgIsError ? 'text-coral-deep font-semibold' : 'text-muted'}`}>{msg}</p>}
        </section>

        {/* Quests */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h2 className="font-display text-3xl font-bold flex items-center gap-2.5">
                Your Active Quests <span className="text-2xl">🎒</span>
              </h2>
              <p className="text-muted">Pick a mission below, submit your answer, and collect Super XP!</p>
            </div>
          </div>
          <AssignmentList token={token} emojiSeed={xp + streak} onOpen={setActive} />
          <LinkCodeSection token={token} />
        </div>

        {/* Header actions */}
        <div className="flex justify-end">
          <button
            onClick={() => void auth.signoutRedirect()}
            className="px-4 py-2.5 min-h-[40px] rounded-full border-2 border-border-soft bg-warm text-sm font-display font-bold hover:bg-white transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Quest modal */}
      {active && (
        <QuestModal
          assignment={active}
          token={token}
          onClose={() => setActive(null)}
          onSubmitted={(title) => {
            setActive(null)
            setCelebrate(title)
            apiFetch('/me/progress', token).then(setProgress).catch(() => {})
          }}
        />
      )}

      {/* Celebration modal */}
      {celebrate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/50 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-8 text-center shadow-2xl flex flex-col items-center">
            <div className="relative w-28 h-28 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 bg-sunny rounded-full animate-ping opacity-30" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-sunny via-teal to-coral/60 flex items-center justify-center text-5xl shadow-lg">
                🎉
              </div>
            </div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-teal/15 text-teal-dark font-display text-sm font-bold mb-2 shadow-sm">
              XP Earned! 🌟
            </div>
            <h3 className="font-display text-2xl font-extrabold tracking-tight mt-2">Awesome work, {name}!</h3>
            <p className="text-muted mt-2 leading-relaxed">
              "{celebrate}" has been turned in. Your teacher will review it soon!
            </p>
            <button
              onClick={() => setCelebrate(null)}
              className="btn-push-teal w-full mt-6 py-3.5 rounded-full bg-teal text-white font-display font-bold"
            >
              Woohoo! Back to Dashboard
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function AssignmentList({ token, onOpen, emojiSeed }: {
  token: string
  onOpen: (a: Assignment) => void
  emojiSeed: number
}) {
  const [assignments, setAssignments] = useState<Assignment[]>([])

  useEffect(() => {
    apiFetch('/student/assignments', token).then(setAssignments).catch(() => setAssignments([]))
  }, [token])

  if (assignments.length === 0) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-border-soft text-center">
        <p className="font-display font-bold text-lg">No quests yet</p>
        <p className="text-sm text-muted mt-1">Join a class to receive your first missions!</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {assignments.map((a, i) => {
        const due = dueLabel(a.due_at)
        const emoji = QUEST_EMOJI[(i + emojiSeed) % QUEST_EMOJI.length]
        return (
          <div
            key={a.id}
            className="group p-5 rounded-3xl bg-white hover:bg-warm/40 transition-all duration-200 shadow-sm hover:shadow-md border border-border-soft flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-warm flex-shrink-0 flex items-center justify-center text-2xl shadow-inner group-hover:scale-105 transition-transform">
                {emoji}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="font-display text-lg font-bold group-hover:text-coral transition-colors">{a.title}</h4>
                  <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full font-display text-xs font-bold ${dueTone[due.tone]}`}>
                    ⏳ {due.text}
                  </span>
                </div>
                <p className="text-sm text-muted line-clamp-1">{a.instructions || 'Complete this mission to earn XP!'}</p>
              </div>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 w-full md:w-auto">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sunny/25 text-amber-warm font-display text-sm font-bold shadow-sm">
                +XP <span>⭐</span>
              </div>
              <button
                onClick={() => onOpen(a)}
                className="btn-push-coral px-5 py-2.5 rounded-full bg-coral text-white font-display text-sm font-bold flex items-center gap-1"
              >
                Start Mission 🚀
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function QuestModal({ assignment, token, onClose, onSubmitted }: {
  assignment: Assignment
  token: string
  onClose: () => void
  onSubmitted: (title: string) => void
}) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    try {
      await apiFetch(`/assignments/${assignment.id}/submit`, token, {
        method: 'POST',
        body: JSON.stringify({ text }),
      })
      onSubmitted(assignment.title)
    } catch {
      // Friendly message instead of raw API error JSON (issue #52).
      setErr('Something went wrong — please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-ink/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
        <button
          aria-label="Close"
          onClick={onClose}
          className="absolute top-5 right-5 w-10 h-10 rounded-full bg-warm hover:bg-border-soft text-muted hover:text-ink flex items-center justify-center transition-colors font-bold"
        >
          ✕
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-warm flex items-center justify-center text-3xl shadow-inner">🚀</div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-display font-bold px-2.5 py-0.5 rounded-full bg-sunny/25 text-amber-warm">Mission</span>
              <span className="text-xs text-muted">Due {formatDueAt(assignment.due_at)}</span>
            </div>
            <h3 className="font-display text-2xl font-bold">{assignment.title}</h3>
          </div>
        </div>
        {assignment.instructions && (
          <div className="bg-warm rounded-2xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-2 text-coral font-display font-bold">
              <span>💡</span> Teacher instructions:
            </div>
            <p className="leading-relaxed">{assignment.instructions}</p>
          </div>
        )}
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <label className="block font-display text-sm font-bold" htmlFor="answer">Your answer / explanation:</label>
            <textarea
              id="answer"
              required
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your answer here..."
              className="input-warm rounded-2xl p-4 w-full resize-none"
            />
          </div>
          {err && <p className="text-sm text-coral-deep">{err}</p>}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-amber-warm font-display text-sm">
              <span>🌟</span> Reward upon completion: <strong>+XP Bonus</strong>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="btn-push-coral w-full sm:w-auto px-8 py-3 rounded-full bg-coral text-white font-display font-bold disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
            >
              {busy ? 'Sending…' : 'Turn In 🚀'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkCodeSection({ token }: { token: string }) {
  const [code, setCode] = useState('—')
  useEffect(() => { apiFetch('/me/link-code', token).then((r) => setCode(r.code)).catch(() => {}) }, [token])
  return (
    <section className="mt-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold">Parent Connection Code 🏡</h2>
        <p className="text-sm text-muted">Share this code with your parents so they can follow your progress.</p>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <span className="font-mono bg-warm border border-border-soft px-4 py-2.5 rounded-xl tracking-widest">{code}</span>
        <button
          onClick={async () => setCode((await apiFetch('/me/link-code', token, { method: 'POST' })).code)}
          className="px-4 py-2.5 rounded-full border-2 border-border-soft bg-warm text-sm font-display font-bold hover:bg-white transition-colors"
        >
          Rotate
        </button>
      </div>
    </section>
  )
}
