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

const chip = (s: string) =>
  s === 'on_time' ? 'bg-green-100 text-green-700'
    : s === 'late' ? 'bg-amber-100 text-amber-700'
      : 'bg-red-100 text-red-700'

/** Parent dashboard: child selector, summary card, per-class XP bars, status chips. */
export default function ParentDashboard() {
  const auth = useAuth()
  const token = auth.user?.access_token ?? ''
  const [children, setChildren] = useState<Child[]>([])
  const [selected, setSelected] = useState<Child | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [linkCode, setLinkCode] = useState('')
  const [msg, setMsg] = useState('')

  const loadChildren = () => apiFetch('/parent/children', token)
    .then((r: Child[]) => { setChildren(r); setSelected(r[0] ?? null) })
    .catch(() => setChildren([]))

  useEffect(() => { void loadChildren() /* eslint-disable-line react-hooks/exhaustive-deps */ }, [token])

  useEffect(() => {
    if (selected) apiFetch(`/parent/children/${selected.child_id}/summary`, token).then(setSummary).catch(() => setSummary(null))
    else setSummary(null)
  }, [selected, token])

  const link = async () => {
    try {
      const r = await apiFetch('/parent/link', token, { method: 'POST', body: JSON.stringify({ link_code: linkCode }) })
      setMsg(`Terhubung: ${r.child_name}`)
      setLinkCode('')
      void loadChildren()
    } catch (e) { setMsg(String(e)) }
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard Orang Tua</h1>

      <section className="mb-6">
        <h2 className="font-semibold mb-2">Hubungkan anak (kode dari dashboard siswa)</h2>
        <div className="flex gap-2">
          <input value={linkCode} onChange={(e) => setLinkCode(e.target.value.toUpperCase())}
                 maxLength={8} placeholder="KODE8" className="border rounded px-3 py-2 font-mono w-36" />
          <button onClick={link} className="bg-blue-600 text-white rounded px-4 py-2">Hubungkan</button>
        </div>
        {msg && <p className="text-sm text-gray-600 mt-2">{msg}</p>}
      </section>

      {children.length === 0 ? (
        <div className="border-2 border-dashed rounded-xl p-10 text-center text-gray-500">
          Belum ada anak terhubung. Masukkan kode 8 karakter dari dashboard siswa untuk mulai memantau. 🌱
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-4">
            {children.map((c) => (
              <button key={c.child_id} onClick={() => setSelected(c)}
                      className={`rounded-lg px-4 py-2 border-2 ${selected?.child_id === c.child_id ? 'border-blue-600 bg-blue-50 font-semibold' : 'border-gray-200'}`}>
                {c.child_name}
              </button>
            ))}
          </div>

          {summary && (
            <>
              <div className="flex gap-3 mb-6">
                <div className="border rounded-lg px-4 py-2">Level <b>{summary.level}</b></div>
                <div className="border rounded-lg px-4 py-2"><b>{summary.xp}</b> XP</div>
                <div className="border rounded-lg px-4 py-2">🔥 Streak <b>{summary.streak}</b></div>
                <div className="border rounded-lg px-4 py-2">✅ {summary.on_time} · ⏰ {summary.late}</div>
              </div>

              <section className="mb-6">
                <h2 className="font-semibold mb-2">XP per kelas</h2>
                {summary.per_class.length === 0 && <p className="text-gray-500 text-sm">Belum ada data.</p>}
                {summary.per_class.map((pc) => (
                  <div key={pc.class_id} className="mb-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span>{pc.class_name}</span><span>{pc.xp} XP · {pc.total} tugas</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full">
                      <div className="h-3 bg-blue-500 rounded-full"
                           style={{ width: `${Math.min(100, pc.xp * 5)}%` }} />
                    </div>
                  </div>
                ))}
              </section>

              <section>
                <h2 className="font-semibold mb-2">Aktivitas terakhir</h2>
                <ul className="space-y-2">
                  {summary.recent_submissions.map((r, i) => (
                    <li key={i} className="border rounded-lg p-3 flex justify-between items-center">
                      <span>{r.assignment_title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${chip(r.status)}`}>
                        {r.status === 'on_time' ? 'tepat waktu' : r.status === 'late' ? 'terlambat' : 'belum'}
                      </span>
                    </li>
                  ))}
                  {summary.missing.map((r, i) => (
                    <li key={`m${i}`} className="border rounded-lg p-3 flex justify-between items-center">
                      <span>{r.assignment_title}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${chip('missing')}`}>belum kumpul</span>
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </>
      )}
    </main>
  )
}
