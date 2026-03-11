'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

type UserInfo = {
  nome: string
  email: string
  perfil: string
  iniciais: string
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function ConfiguracoesPage() {
  const router = useRouter()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/login'); return }

      const { data: pessoaData } = await supabase
        .from('PessoaUserUnidadeIgrejaView')
        .select('pessoa_id, pessoa_nome')
        .eq('usuario_id', session.user.id)
        .limit(1)
        .single()

      const { data: perfilData } = await supabase
        .from('Pessoa_Perfil_View')
        .select('nome_perfil')
        .eq('idpessoa', pessoaData?.pessoa_id)
        .in('nome_perfil', ['Administrador', 'Setorizacao'])
        .eq('perfil_ativo_para_pessoa', true)
        .eq('perfil_ativo', true)
        .limit(1)
        .single()

      const nome = pessoaData?.pessoa_nome || session.user.email || 'Usuário'
      setUserInfo({
        nome,
        email: session.user.email ?? '',
        perfil: perfilData?.nome_perfil ?? '—',
        iniciais: getInitials(nome),
      })
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <DashboardLayout title="Configurações de Perfil">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Carregando perfil...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout title="Configurações de Perfil">
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        <div className="w-full max-w-[900px]">

          {/* Main Card */}
          <div className="glass-card rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col gap-10">

              {/* Card Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-6">
                <h3 className="text-2xl font-bold tracking-tight">Meu Perfil</h3>
                <span className="px-3 py-1 rounded-full bg-[#197fe6]/20 border border-[#197fe6]/30 text-[#197fe6] text-xs font-bold uppercase tracking-wider">
                  {userInfo?.perfil}
                </span>
              </div>

              {/* Avatar + Name */}
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-full border-4 border-white/10 ring-4 ring-[#197fe6]/20 bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-200 shadow-xl">
                  {userInfo?.iniciais}
                </div>
                <div className="text-center md:text-left space-y-2">
                  <h4 className="text-3xl font-bold">{userInfo?.nome}</h4>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#197fe6] animate-pulse" />
                      <span className="text-slate-200 text-sm font-medium">{userInfo?.perfil}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Nome Completo</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-slate-300 text-sm">
                    {userInfo?.nome}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">E-mail</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-slate-300 text-sm">
                    {userInfo?.email}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Perfil de Acesso</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-slate-300 text-sm">
                    {userInfo?.perfil}
                  </div>
                </div>
              </div>

              {/* Security */}
              <div className="pt-6 border-t border-white/10">
                <h5 className="text-lg font-bold mb-6">Segurança e Acesso</h5>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shrink-0">
                    <span className="material-symbols-outlined text-[#197fe6]">lock_reset</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">Redefinição de Senha</p>
                    <p className="text-xs text-slate-400 mt-0.5">Atualize sua senha periodicamente para manter a segurança.</p>
                  </div>
                  <button className="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors shrink-0">
                    Redefinir
                  </button>
                </div>
              </div>

            </div>
          </div>

          {/* Logout */}
          <div className="mt-8 mb-12 flex justify-center">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium px-5 py-2.5 rounded-xl"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              Sair
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
