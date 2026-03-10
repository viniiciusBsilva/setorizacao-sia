"use client"
import React, { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Placeholder: replace with Supabase Auth logic
    console.log('login', { email, password })
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center bg-background-dark font-display text-slate-100">
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#1F4E79] rounded-full blur-[120px] opacity-60 z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#2E74B5] rounded-full blur-[100px] opacity-40 z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-grid z-0" />

      <main className="relative z-10 w-full max-w-[420px] px-6">
        <div className="glass-card rounded-xl p-8 flex flex-col items-center shadow-2xl">
            <div className="w-16 h-16 bg-primary/20 rounded-xl flex items-center justify-center mb-6 border border-primary/30">
            <span suppressHydrationWarning className="material-symbols-outlined text-primary text-4xl">corporate_fare</span>
          </div>

          <h1 className="text-white text-[28px] font-bold leading-tight tracking-tight mb-2">Setorização</h1>
          <p className="text-slate-400 text-sm font-normal text-center mb-8">Corporate religious management platform</p>

          <form className="w-full space-y-5" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-2">
              <label className="text-slate-200 text-sm font-medium ml-1">Email</label>
              <div className="relative">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="glass-input w-full h-14 rounded-xl px-4 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border-none"
                  placeholder="seu@email.com"
                  type="email"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-slate-200 text-sm font-medium ml-1">Senha</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input w-full h-14 rounded-xl px-4 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all border-none"
                  placeholder="••••••••"
                  type={show ? 'text' : 'password'}
                  required
                />
                <button
                  type="button"
                  aria-label="toggle password visibility"
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                >
                  <span suppressHydrationWarning className="material-symbols-outlined">{show ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-400 hover:text-slate-200 transition-colors">
                <input className="rounded bg-white/10 border-white/20 text-primary focus:ring-primary" type="checkbox" />
                Lembrar-me
              </label>
              <Link className="text-primary font-medium hover:underline" href="/reset">Esqueceu a senha?</Link>
            </div>

            <button className="w-full h-14 bg-gradient-to-r from-[#1F4E79] to-[#2E74B5] rounded-xl text-white font-semibold shadow-lg hover:shadow-primary/20 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4" type="submit">
              <span>Entrar</span>
              <span suppressHydrationWarning className="material-symbols-outlined text-[20px]">login</span>
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-400 text-sm">
              Não tem uma conta? <a className="text-primary font-semibold hover:underline" href="#">Solicite acesso</a>
            </p>
          </div>
        </div>

        <footer className="mt-8 text-center">
          <p className="text-slate-500 text-[11px] uppercase tracking-widest">© 2026 SETORIZAÇÃO • SISTEMA DE setorização</p>
        </footer>
      </main>

          <div className="absolute top-10 right-10 hidden lg:block opacity-20 pointer-events-none">
        <div className="w-32 h-32 glass-card rounded-full flex items-center justify-center">
          <span suppressHydrationWarning className="material-symbols-outlined text-white text-5xl">language</span>
        </div>
      </div>
    </div>
  )
}
