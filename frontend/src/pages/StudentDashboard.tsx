import { useEffect, useState } from 'react'
import { useAuth } from 'react-oidc-context'
import { apiFetch } from './TeacherDashboard'

interface Assignment { id: number; class_id: number; title: string; instructions: string; due_at: string }

/** Student dashboard: join class, assignment list, submit/resubmit, XP + streak. */
export default function StudentDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const [joinCode, setJoinCode] = useState('')
  const [progress, setProgress] = useState<{ xp: number; streak: number } | null>(null)
  const [msg, setMsg] = useState('')

  const loadProgress = () => apiFetch('/me/progress', token).then(setProgress).catch(() => {})

  useEffect(() => { void loadProgress() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [token])

  const join = async () => {
    try {
      const r = await apiFetch('/classes/join', token, { method: 'POST', body: JSON.stringify({ join_code: joinCode }) })
      setMsg(`Berhasil masuk kelas: ${r.class_name}`)
      setJoinCode('')
    } catch (e) { setMsg(String(e)) }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Dashboard Siswa</h1>

      {progress && (
        <div className="flex gap-3 mb-6">
          <div className="border rounded-lg px-4 py-2"><b>{progress.xp}</b> XP</div>
          <div className="border rounded-lg px-4 py-2">🔥 Streak <b>{progress.streak}</b></div>
        </div>
      )}

      <section className="mb-8">
        <h2 className="font-semibold mb-2">Gabung kelas</h2>
        <div className="flex gap-2">
          <input value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                 maxLength={6} placeholder="KODE6" className="border rounded px-3 py-2 font-mono w-32" />
          <button onClick={join} className="bg-blue-600 text-white rounded px-4 py-2">Join</button>
        </div>
        {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      </section>

      <AssignmentList token={token} onSubmitted={() => void loadProgress()} />
      <LinkCodeSection token={token} />
    </main>
  )
}

function AssignmentList({ token, onSubmitted }: { token: string; onSubmitted: () => void }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [texts, setTexts] = useState<Record<number, string>>({})

  useEffect(() => {
    // MVP: student's assignments come from enrolled classes; endpoint in #7 student side
    // For now, list via teacher-class endpoint is restricted; use a lightweight "mine" fetch below.
    apiFetch('/student/assignments', token).then(setAssignments).catch(() => setAssignments([]))
  }, [token])

  const submit = async (a: Assignment) => {
    try {
      await apiFetch(`/assignments/${a.id}/submit`, token, { method: 'POST', body: JSON.stringify({ text: texts[a.id] ?? '' }) })
      onSubmitted()
    } catch (e) { alert(String(e)) }
  }

  return (
    <section className="mb-8">
      <h2 className="font-semibold mb-2">Tugas</h2>
      {assignments.length === 0 && <p className="text-gray-500 text-sm">Belum ada tugas.</p>}
      <ul className="space-y-3">
        {assignments.map((a) => (
          <li key={a.id} className="border rounded-lg p-4">
            <div className="flex justify-between">
              <span className="font-medium">{a.title}</span>
              <span className="text-sm text-gray-500">due {new Date(a.due_at).toLocaleString('id-ID')}</span>
            </div>
            <textarea value={texts[a.id] ?? ''} onChange={(e) => setTexts({ ...texts, [a.id]: e.target.value })}
                      placeholder="Jawaban…" className="border rounded w-full mt-2 p-2 text-sm" rows={2} />
            <button onClick={() => submit(a)} className="mt-2 bg-emerald-600 text-white rounded px-4 py-1.5 text-sm">
              Kumpulkan
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

function LinkCodeSection({ token }: { token: string }) {
  const [code, setCode] = useState('—')
  useEffect(() => { apiFetch('/me/link-code', token).then((r) => setCode(r.code)).catch(() => {}) }, [token])
  return (
    <section>
      <h2 className="font-semibold mb-2">Kode hubungkan orang tua</h2>
      <div className="flex gap-2 items-center">
        <span className="font-mono bg-gray-100 px-3 py-2 rounded">{code}</span>
        <button onClick={async () => setCode((await apiFetch('/me/link-code', token, { method: 'POST' })).code)}
                className="border rounded px-3 py-2 text-sm hover:bg-gray-50">
          Rotate
        </button>
      </div>
    </section>
  )
}
