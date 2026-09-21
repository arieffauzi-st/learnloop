import { useEffect, useState } from 'react'

const API = import.meta.env.VITE_API_URL ?? '/api/v1'

const FEATURES = [
  { emoji: '🎯', title: 'Tugas terstruktur', desc: 'Guru buat tugas, siswa kumpulkan, status jelas.' },
  { emoji: '⚡', title: 'XP & streak', desc: 'Motivasi harian dengan XP dan streak belajar.' },
  { emoji: '👨‍👩‍👧', title: 'Orang tua terhubung', desc: 'Pantau progres anak real-time tanpa repot.' },
]

/** Public landing page (mockup-spec §1): hero, features, trial form. No auth. */
export default function Landing() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [age, setAge] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { /* fire-on-mount for logged-out visibility */ }, [])

  const submit = async () => {
    setError('')
    try {
      const r = await fetch(`${API}/enrollment/trial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_name: name, email, child_age: Number(age) }),
      })
      if (!r.ok) throw new Error(`${r.status}`)
      setDone(true)
    } catch { setError('Gagal mengirim. Coba lagi sebentar lagi.') }
  }

  return (
    <main className="min-h-screen">
      {/* hero */}
      <section className="text-center py-20 px-6 bg-gradient-to-b from-blue-50 to-white">
        <h1 className="text-5xl font-bold mb-4">Belajar jadi petualangan 🚀</h1>
        <p className="text-xl text-gray-600 max-w-xl mx-auto">
          LearnLoop menghubungkan guru, siswa, dan orang tua dalam satu loop belajar yang seru.
        </p>
        <a href="#trial" className="inline-block mt-8 rounded-lg bg-blue-600 px-8 py-3 text-white text-lg font-semibold hover:bg-blue-700">
          Coba kelas gratis
        </a>
      </section>

      {/* features */}
      <section className="max-w-4xl mx-auto grid grid-cols-3 gap-6 px-6 py-16">
        {FEATURES.map((f) => (
          <div key={f.title} className="border rounded-xl p-6 text-center">
            <div className="text-4xl mb-3">{f.emoji}</div>
            <h3 className="font-semibold mb-1">{f.title}</h3>
            <p className="text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>

      {/* trial form */}
      <section id="trial" className="max-w-md mx-auto px-6 pb-20">
        <div className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Book a trial class</h2>
          {done ? (
            <p className="text-green-700 font-medium">🎉 Terima kasih! Kami akan menghubungi kamu segera.</p>
          ) : (
            <>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama orang tua"
                     className="border rounded px-3 py-2 w-full mb-3" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                     className="border rounded px-3 py-2 w-full mb-3" />
              <input type="number" min={3} max={18} value={age} onChange={(e) => setAge(e.target.value)}
                     placeholder="Usia anak" className="border rounded px-3 py-2 w-full mb-4" />
              <button onClick={submit} disabled={!name || !email || !age}
                      className="w-full rounded-lg bg-emerald-600 px-8 py-3 text-white font-semibold disabled:opacity-40">
                Kirim
              </button>
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </>
          )}
        </div>
      </section>
    </main>
  )
}
