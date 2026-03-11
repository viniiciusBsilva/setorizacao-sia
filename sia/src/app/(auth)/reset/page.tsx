"use client"
import React, { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    })

    setSubmitting(false)

    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
      return
    }

    setSent(true)
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
            <div className="w-full flex justify-start mb-4">
              <Link href="/login" className="text-slate-100/70 hover:text-white transition-colors">
                <span suppressHydrationWarning className="material-symbols-outlined text-2xl">arrow_back</span>
              </Link>
            </div>

            <div className="w-14 h-14 bg-[#197fe6] rounded-xl flex items-center justify-center mb-6 shadow-lg shadow-[#197fe6]/30">
              <span suppressHydrationWarning className="material-symbols-outlined text-white text-3xl">hub</span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
            <p className="text-slate-300 text-center text-sm leading-relaxed mb-8">
              Insira o e-mail associado à sua conta para receber as instruções de recuperação.
            </p>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center">
                <span suppressHydrationWarning className="material-symbols-outlined text-emerald-400 text-3xl" style={{ fontVariationSettings: `"FILL" 1` }}>
                  mark_email_read
                </span>
              </div>
              <p className="text-white font-semibold text-center">E-mail enviado!</p>
              <p className="text-slate-400 text-sm text-center leading-relaxed">
                Verifique sua caixa de entrada em <span className="text-white font-medium">{email}</span> e siga as instruções para redefinir sua senha.
              </p>
              <Link
                href="/login"
                className="mt-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold h-12 rounded-lg transition-all flex items-center justify-center text-sm"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">E-mail</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="seuemail@exemplo.com"
                  type="email"
                  required
                />
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
                <span>{submitting ? 'Enviando...' : 'Enviar instruções'}</span>
              </button>
            </form>
          )}

          {!sent && (
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-300">
                Lembrou a senha?{' '}
                <Link href="/login" className="text-accent-blue font-semibold hover:underline decoration-accent-blue/50 underline-offset-4">
                  Entrar
                </Link>
              </p>
            </div>
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
