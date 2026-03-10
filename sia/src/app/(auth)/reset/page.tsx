"use client"
import React, { useState } from 'react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    try {
      // Placeholder: integrate with Supabase / server action to send reset email
      console.log('Enviar instruções para', email)
      // simulate
      await new Promise((r) => setTimeout(r, 700))
    } finally {
      setSubmitting(false)
    }
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

            <div className="bg-primary/20 p-4 rounded-full mb-6">
              <span suppressHydrationWarning className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: `"FILL" 1` }}>lock</span>
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Recuperar Senha</h1>
            <p className="text-slate-300 text-center text-sm leading-relaxed mb-8">
              Insira o e-mail associado à sua conta para receber as instruções de recuperação.
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 px-1">E-mail</label>
              <div className="relative">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg h-14 px-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  placeholder="seuemail@exemplo.com"
                  type="email"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-primary to-accent-blue hover:opacity-90 text-white font-bold h-14 rounded-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center"
            >
              <span>{submitting ? 'Enviando...' : 'Enviar instruções'}</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-slate-300">
              Lembrou a senha?{' '}
              <Link href="/login" className="text-accent-blue font-semibold hover:underline decoration-accent-blue/50 underline-offset-4">Entrar</Link>
            </p>
          </div>
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
