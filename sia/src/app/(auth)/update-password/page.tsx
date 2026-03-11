"use client"
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // Supabase emits PASSWORD_RECOVERY when the user arrives via the reset link
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    // Also check if there's already a recovery session active
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }

    setSubmitting(true)
    const { error } = await supabase.auth.updateUser({ password })
    setSubmitting(false)

    if (error) {
      setError('Não foi possível atualizar a senha. Tente novamente ou solicite um novo link.')
      return
    }

    setDone(true)
    setTimeout(() => router.replace('/login'), 3000)
  }

  return (
    <div className="bg-background-dark font-display text-slate-100 flex items-center justify-center min-h-screen overflow-hidden">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="bg-blob blob-1" />
        <div className="bg-blob blob-2" />
      </div>

      <div className="relative z-10 w-full max-w-[420px] px-6">
        <div className="glass-card rounded-xl p-8 shadow-2xl">
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 bg-[#197fe6] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-[#197fe6]/30">
              <span suppressHydrationWarning className="material-symbols-outlined text-white text-3xl">hub</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Nova Senha</h1>
            <p className="text-slate-300 text-center text-sm leading-relaxed mb-8">
              Escolha uma nova senha segura para a sua conta.
            </p>
          </div>

          {done ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <span suppressHydrationWarning className="material-symbols-outlined text-emerald-400 text-3xl" style={{ fontVariationSettings: `"FILL" 1` }}>
                  check_circle
                </span>
              </div>
              <p className="text-white font-semibold">Senha atualizada!</p>
              <p className="text-slate-400 text-sm text-center">Redirecionando para o login...</p>
            </div>
          ) : !ready ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
              <p className="text-slate-400 text-sm">Verificando link de recuperação...</p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Nova Senha</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span suppressHydrationWarning className="material-symbols-outlined text-xl">
                      {showPwd ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">Confirmar Senha</label>
                <div className="relative">
                  <input
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repita a nova senha"
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <span suppressHydrationWarning className="material-symbols-outlined text-xl">
                      {showConfirm ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {error && (
                <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-primary to-accent-blue hover:opacity-90 disabled:opacity-60 text-white font-bold h-14 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2"
              >
                {submitting && (
                  <span suppressHydrationWarning className="material-symbols-outlined text-base animate-spin">progress_activity</span>
                )}
                <span>{submitting ? 'Salvando...' : 'Salvar nova senha'}</span>
              </button>
            </form>
          )}
        </div>

        <div className="mt-8 flex justify-center opacity-40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
              <div className="w-3 h-3 bg-background-dark rounded-full" />
            </div>
            <span className="font-bold tracking-tighter text-white">SETORIZAÇÃO</span>
          </div>
        </div>
      </div>
    </div>
  )
}
