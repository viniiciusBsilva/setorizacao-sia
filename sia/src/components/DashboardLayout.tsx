'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { icon: 'dashboard', label: 'Dashboard', href: '/' },
  { icon: 'group', label: 'Membros', href: '/membros' },
  { icon: 'home_work', label: 'Lar', href: '/lar' },
  { icon: 'calendar_month', label: 'Eventos', href: '/eventos' },
  { icon: 'bar_chart', label: 'Relatórios', href: '/relatorios' },
  { icon: 'settings', label: 'Configurações', href: '/configuracoes' },
]

type UserInfo = {
  nome: string
  perfil: string
  iniciais: string
}

export default function DashboardLayout({
  children,
  title,
}: {
  children: React.ReactNode
  title: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace('/login')
        return
      }

      // Buscar pessoa vinculada ao usuário
      const { data: pessoaData } = await supabase
        .from('PessoaUserUnidadeIgrejaView')
        .select('pessoa_id, pessoa_nome')
        .eq('usuario_id', session.user.id)
        .limit(1)
        .single()

      if (!pessoaData) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      // Buscar perfil autorizado
      const { data: perfilData } = await supabase
        .from('Pessoa_Perfil_View')
        .select('nome_perfil')
        .eq('idpessoa', pessoaData.pessoa_id)
        .in('nome_perfil', ['Administrador', 'Setorizacao'])
        .eq('perfil_ativo_para_pessoa', true)
        .eq('perfil_ativo', true)
        .limit(1)
        .single()

      if (!perfilData) {
        await supabase.auth.signOut()
        router.replace('/login')
        return
      }

      const nome: string = pessoaData.pessoa_nome || session.user.email || 'Usuário'
      const parts = nome.trim().split(/\s+/)
      const iniciais = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : nome.slice(0, 2).toUpperCase()

      setUserInfo({ nome, perfil: perfilData.nome_perfil, iniciais })
      setChecking(false)
    }

    loadUser()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (checking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0f14]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Verificando acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-100">
      <div className="glow-blob" style={{ top: '-100px', left: '-100px' }} />
      <div className="glow-blob" style={{ bottom: '-200px', right: '-100px' }} />

      {/* Sidebar */}
      <aside className="w-64 glass-sidebar flex flex-col shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#197fe6] rounded-lg flex items-center justify-center text-white">
            <span className="material-symbols-outlined">hub</span>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">Setorização</h1>
            <p className="text-xs text-slate-400 font-medium">Gestão Comunitária</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href
            return (
              <Link
                key={item.label}
                href={item.href}
                className={
                  active
                    ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-[#197fe6]/10 text-[#197fe6] border border-[#197fe6]/20'
                    : 'flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-slate-400 transition-colors'
                }
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                <span className={active ? 'text-sm font-semibold' : 'text-sm font-medium'}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* User + Logout */}
        <div className="p-4 mt-auto border-t border-white/5 space-y-2">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5">
            <div className="w-10 h-10 rounded-full border border-[#197fe6]/30 bg-slate-700 flex items-center justify-center text-slate-200 font-bold text-sm shrink-0">
              {userInfo?.iniciais}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{userInfo?.nome}</p>
              <p className="text-xs text-slate-500 truncate">{userInfo?.perfil}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        <header className="h-20 flex items-center justify-between px-8 border-b border-white/5 sticky top-0 bg-[#0a0f14]/50 backdrop-blur-md z-10">
          <h2 className="text-xl font-bold tracking-tight">{title}</h2>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xl">
                search
              </span>
              <input
                className="bg-white/5 border-none rounded-xl pl-10 pr-4 py-2 w-64 text-sm outline-none text-slate-100 placeholder:text-slate-500"
                placeholder="Buscar membros, setores..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-3">
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 relative hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#197fe6] rounded-full ring-2 ring-[#0a0f14]" />
              </button>
              <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-slate-400 hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
