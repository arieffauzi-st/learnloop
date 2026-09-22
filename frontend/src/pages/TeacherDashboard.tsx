import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { formatDueAt, dueDayHint } from '../utils/datetime'

const API = import.meta.env.VITE_API_URL ?? '/api/v1'

export async function apiFetch(path: string, token: string, init?: RequestInit) {
  const resp = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...init?.headers },
  })
  if (!resp.ok) throw new Error(`${resp.status} ${await resp.text()}`)
  return resp.json()
}

export interface ClassInfo { id: number; name: string; join_code: string }
export interface Assignment { id: number; title: string; instructions: string; due_at: string }
export interface RosterRow { student_id: number; student_name: string; status: string; is_late: boolean | null }

const CLASS_EMOJI = ['📚', '🧪', '🗺️', '🎼', '🧮', '🌍', '🤖', '🎭']

/** Teacher ops dashboard (Stitch design: design/stitch/teacher-dashboard).
 *  High-density record view: class cards, missions table, submission roster. */
export default function TeacherDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const name = (auth.user?.profile.preferred_username as string) ?? 'Teacher'
  const [classes, setClasses] = useState<ClassInfo[]>([])
  const [selected, setSelected] = useState<ClassInfo | null>(null)
  const [newClassName, setNewClassName] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    apiFetch('/classes', token).then(setClasses).catch((e) => setError(String(e)))
  }, [token])

  const createClass = async () => {
    try {
      const c = await apiFetch('/classes', token, { method: 'POST', body: JSON.stringify({ name: newClassName }) })
      setClasses((prev) => [...prev, c])
      setNewClassName('')
    } catch (e) { setError(String(e)) }
  }

  return (
    <main className="min-h-screen bg-cream font-body text-ink">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        {/* Header banner */}
        <section className="relative overflow-hidden bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-coral/15 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-coral/10 text-coral-deep font-display text-xs font-bold mb-1">
              <span>👩‍🏫</span> Teacher Ops
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Hello, {name}!</h1>
            <p className="text-muted mt-1">Manage your classes, missions, and student progress in one place.</p>
          </div>
          <button
            onClick={() => void auth.signoutRedirect()}
            className="relative z-10 self-start md:self-center px-4 py-2 rounded-full border-2 border-border-soft bg-warm text-sm font-display font-bold hover:bg-white transition-colors"
          >
            Sign out
          </button>
        </section>

        {error && <p className="text-coral-deep text-sm">{error}</p>}

        {/* My classes */}
        <div>
          <h2 className="font-display text-2xl font-bold flex items-center gap-2 mb-1">
            My Classes <span className="text-2xl">🎒</span>
          </h2>
          <p className="text-muted text-sm mb-4">Share a join code so students can hop into your class.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {classes.map((c, i) => (
              <div
                key={c.id}
                className={`group relative rounded-3xl p-5 bg-white border border-border-soft shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between ${
                  selected?.id === c.id ? 'ring-2 ring-coral' : ''
                }`}
              >
                {selected?.id === c.id && (
                  <div className="absolute -top-2.5 right-4 bg-sunny text-ink px-3 py-0.5 rounded-full font-display text-xs font-bold shadow-sm">
                    Current Class
                  </div>
                )}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center text-2xl shadow-inner">
                      {CLASS_EMOJI[i % CLASS_EMOJI.length]}
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-teal/15 text-teal-dark font-display text-xs font-bold font-mono">
                      {c.join_code}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold group-hover:text-coral transition-colors">{c.name}</h3>
                </div>
                <button
                  onClick={() => setSelected(c)}
                  className="btn-push-teal mt-4 h-10 rounded-full bg-teal text-white font-display text-sm font-bold"
                >
                  Manage →
                </button>
              </div>
            ))}

            {/* Create class card */}
            <div className="rounded-3xl p-5 border-2 border-dashed border-border-soft bg-warm/40 flex flex-col justify-center gap-3">
              <span className="text-3xl">➕</span>
              <label className="font-display text-sm font-bold" htmlFor="new-class">New class</label>
              <input
                id="new-class"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Class name"
                className="input-warm rounded-xl px-4 py-2.5 w-full"
              />
              <button
                onClick={createClass}
                disabled={!newClassName}
                className="btn-push-coral h-10 rounded-full bg-coral text-white font-display text-sm font-bold disabled:opacity-40 disabled:shadow-none"
              >
                Create class
              </button>
            </div>
          </div>
        </div>

        {selected && <ClassDetail cls={selected} token={token} />}
      </div>
    </main>
  )
}

function ClassDetail({ cls, token }: { cls: ClassInfo; token: string }) {
  const [tab, setTab] = useState<'assignments' | 'students'>('assignments')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [title, setTitle] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [formError, setFormError] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    apiFetch(`/classes/${cls.id}/assignments`, token).then(setAssignments)
  }, [cls.id, token])

  const createAssignment = async () => {
    // Inline validation instead of relying only on native `required` (issue #52).
    if (!title.trim() || !dueAt || !instructions.trim()) {
      setFormError('Please fill in the title, instructions, and deadline.')
      return
    }
    try {
      const a = await apiFetch(`/classes/${cls.id}/assignments`, token, {
        method: 'POST',
        body: JSON.stringify({ title: title.trim(), instructions: instructions.trim(), due_at: new Date(dueAt).toISOString() }),
      })
      setAssignments((prev) => [...prev, a])
      setShowModal(false)
      setTitle('')
      setInstructions('')
      setDueAt('')
      setFormError('')
    } catch {
      setFormError('Could not save the mission — please try again.')
    }
  }

  return (
    <section className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-border-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-warm flex items-center justify-center text-2xl shadow-inner">📘</div>
          <div>
            <h3 className="font-display text-2xl font-bold">{cls.name}</h3>
            <p className="text-sm text-muted">Assign homework missions and track who has turned them in.</p>
          </div>
        </div>
        {/* Tabs */}
        <div className="flex bg-warm p-1 rounded-full border border-border-soft self-start">
          {(['assignments', 'students'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full font-display text-sm font-bold transition-all ${
                tab === t ? 'bg-white text-coral shadow-sm' : 'text-muted hover:text-ink'
              }`}
            >
              {t === 'assignments' ? 'Missions' : 'Students'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'assignments' && (
        <>
          <div className="overflow-hidden rounded-2xl border border-border-soft">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left bg-warm/60">
                  <th className="py-3 px-4 font-display font-bold">Mission</th>
                  <th className="py-3 px-4 font-display font-bold">Deadline</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => (
                  <tr key={a.id} className={i % 2 === 0 ? 'bg-white' : 'bg-warm/20'}>
                    <td className="py-3 px-4 border-t border-border-soft/60 font-medium">{a.title}</td>
                    <td className="py-3 px-4 border-t border-border-soft/60 text-muted">
                      {/* due_at is naive UTC from the API — format in browser tz, no double shift (issue #74). */}
                      {formatDueAt(a.due_at)}
                      {dueDayHint(a.due_at) && (
                        <span className="ml-2 text-xs font-display font-bold text-teal-dark">({dueDayHint(a.due_at)})</span>
                      )}
                    </td>
                  </tr>
                ))}
                {assignments.length === 0 && (
                  <tr><td colSpan={2} className="py-6 px-4 text-center text-muted">No missions yet — create your first one!</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn-push-coral mt-5 h-11 px-6 rounded-full bg-coral text-white font-display text-sm font-bold"
          >
            + New mission
          </button>
        </>
      )}

      {tab === 'students' && <RosterList token={token} assignments={assignments} />}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
            <h3 className="font-display text-xl font-bold mb-1">New mission</h3>
            <p className="text-sm text-muted mb-5">Students will see this as a quest in their dashboard.</p>
            <label className="block font-display text-sm font-bold mb-1.5" htmlFor="m-title">Title</label>
            <input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fraction Pizza Party"
                   className="input-warm rounded-xl px-4 py-2.5 w-full mb-4" />
            <label className="block font-display text-sm font-bold mb-1.5" htmlFor="m-instructions">Instructions</label>
            <textarea id="m-instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={3}
                      placeholder="What should students do in this mission?"
                      className="input-warm rounded-2xl p-4 w-full resize-none mb-4" />
            <label className="block font-display text-sm font-bold mb-1.5" htmlFor="m-due">Deadline</label>
            <input id="m-due" type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                   className="input-warm rounded-xl px-4 py-2.5 w-full mb-4" />
            {formError && <p className="text-sm text-coral-deep font-semibold mb-4">{formError}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowModal(false)}
                      className="px-5 py-2.5 rounded-full border-2 border-border-soft bg-warm font-display text-sm font-bold hover:bg-white transition-colors">
                Cancel
              </button>
              {/* Inline validation on click — the error message explains what's missing (issue #52). */}
              <button onClick={createAssignment}
                      className="btn-push-coral px-6 py-2.5 rounded-full bg-coral text-white font-display text-sm font-bold disabled:opacity-40 disabled:shadow-none">
                Save 🚀
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

function RosterList({ token, assignments }: { token: string; assignments: Assignment[] }) {
  const [assignmentId, setAssignmentId] = useState<number | null>(assignments[0]?.id ?? null)
  const [roster, setRoster] = useState<RosterRow[]>([])

  useEffect(() => {
    if (assignmentId) apiFetch(`/assignments/${assignmentId}/submissions`, token).then(setRoster)
  }, [assignmentId, token])

  if (assignments.length === 0) {
    return <p className="text-muted py-6 text-center">Create a mission first to see the submission roster.</p>
  }

  const chip = (s: string) => {
    if (s === 'submitted') return { icon: '✅', cls: 'bg-lime/15 text-lime' }
    if (s === 'late') return { icon: '⏳', cls: 'bg-amber-warm/15 text-amber-warm' }
    return { icon: '⚠️', cls: 'bg-coral-deep/10 text-coral-deep' }
  }

  return (
    <div>
      <label className="block font-display text-sm font-bold mb-1.5" htmlFor="m-select">Mission</label>
      <select
        id="m-select"
        onChange={(e) => setAssignmentId(Number(e.target.value))}
        value={assignmentId ?? ''}
        className="input-warm rounded-xl px-4 py-2.5 mb-4"
      >
        {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
      <div className="overflow-hidden rounded-2xl border border-border-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-warm/60">
              <th className="py-3 px-4 font-display font-bold">Student</th>
              <th className="py-3 px-4 font-display font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((r, i) => {
              const c = chip(r.status)
              return (
                <tr key={r.student_id} className={i % 2 === 0 ? 'bg-white' : 'bg-warm/20'}>
                  <td className="py-3 px-4 border-t border-border-soft/60 font-medium">{r.student_name}</td>
                  <td className="py-3 px-4 border-t border-border-soft/60">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-display text-xs font-bold ${c.cls}`}>
                      {c.icon} {r.status}
                    </span>
                  </td>
                </tr>
              )
            })}
            {roster.length === 0 && (
              <tr><td colSpan={2} className="py-6 px-4 text-center text-muted">No students in this class yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
