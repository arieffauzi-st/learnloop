import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'

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

/** Teacher dashboard: stat chips + class list. Class detail opens tabs. */
export default function TeacherDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
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
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Guru</h1>
      {error && <p className="text-red-600 mb-4">{error}</p>}

      <section className="mb-8">
        <h2 className="font-semibold mb-2">Kelas saya ({classes.length})</h2>
        <ul className="space-y-2">
          {classes.map((c) => (
            <li key={c.id} className="border rounded-lg p-4 flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">join: {c.join_code}</span>
              <button onClick={() => setSelected(c)} className="text-blue-600 hover:underline">Kelola →</button>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex gap-2">
          <input value={newClassName} onChange={(e) => setNewClassName(e.target.value)}
                 placeholder="Nama kelas baru" className="border rounded px-3 py-2 flex-1" />
          <button onClick={createClass} className="bg-blue-600 text-white rounded px-4 py-2">Buat kelas</button>
        </div>
      </section>

      {selected && <ClassDetail cls={selected} token={token} />}
    </main>
  )
}

function ClassDetail({ cls, token }: { cls: ClassInfo; token: string }) {
  const [tab, setTab] = useState<'assignments' | 'students'>('assignments')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [title, setTitle] = useState('')
  const [dueAt, setDueAt] = useState('')
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    apiFetch(`/classes/${cls.id}/assignments`, token).then(setAssignments)
  }, [cls.id, token])

  const createAssignment = async () => {
    try {
      const a = await apiFetch(`/classes/${cls.id}/assignments`, token, {
        method: 'POST',
        body: JSON.stringify({ title, instructions: '', due_at: new Date(dueAt).toISOString() }),
      })
      setAssignments((prev) => [...prev, a])
      setShowModal(false)
      setTitle('')
      setDueAt('')
    } catch (e) { alert(String(e)) }
  }

  return (
    <section className="border rounded-lg p-4">
      <h2 className="font-semibold mb-3">{cls.name}</h2>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('assignments')}
                className={tab === 'assignments' ? 'font-bold border-b-2 border-blue-600' : ''}>Tugas</button>
        <button onClick={() => setTab('students')}
                className={tab === 'students' ? 'font-bold border-b-2 border-blue-600' : ''}>Siswa</button>
      </div>

      {tab === 'assignments' && (
        <>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-gray-500"><th className="py-1">Judul</th><th>Deadline</th></tr></thead>
            <tbody>
              {assignments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="py-2">{a.title}</td>
                  <td>{new Date(a.due_at).toLocaleString('id-ID')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => setShowModal(true)} className="mt-3 bg-emerald-600 text-white rounded px-4 py-2">
            + Tugas baru
          </button>
          {showModal && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
              <div className="bg-white rounded-lg p-6 w-96">
                <h3 className="font-semibold mb-3">Tugas baru</h3>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Judul"
                       className="border rounded px-3 py-2 w-full mb-3" />
                <input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)}
                       className="border rounded px-3 py-2 w-full mb-4" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setShowModal(false)} className="border rounded px-4 py-2">Batal</button>
                  <button onClick={createAssignment} className="bg-emerald-600 text-white rounded px-4 py-2">Simpan</button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'students' && <RosterList token={token} assignments={assignments} />}
    </section>
  )
}

function RosterList({ token, assignments }: { token: string; assignments: Assignment[] }) {
  const [assignmentId, setAssignmentId] = useState<number | null>(assignments[0]?.id ?? null)
  const [roster, setRoster] = useState<RosterRow[]>([])

  useEffect(() => {
    if (assignmentId) apiFetch(`/assignments/${assignmentId}/submissions`, token).then(setRoster)
  }, [assignmentId, token])

  const badge = (s: string) =>
    s === 'submitted' ? 'bg-green-100 text-green-700'
      : s === 'late' ? 'bg-amber-100 text-amber-700'
        : 'bg-red-100 text-red-700'

  return (
    <div>
      <select onChange={(e) => setAssignmentId(Number(e.target.value))} value={assignmentId ?? ''}
              className="border rounded px-3 py-2 mb-3">
        {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
      </select>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-gray-500"><th className="py-1">Siswa</th><th>Status</th></tr></thead>
        <tbody>
          {roster.map((r) => (
            <tr key={r.student_id} className="border-t">
              <td className="py-2">{r.student_name}</td>
              <td><span className={`px-2 py-0.5 rounded text-xs ${badge(r.status)}`}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
