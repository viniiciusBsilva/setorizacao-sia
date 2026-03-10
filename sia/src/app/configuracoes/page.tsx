'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { useRouter } from 'next/navigation'

export default function ConfiguracoesPage() {
  const router = useRouter()
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
                  Perfil Ativo
                </span>
              </div>

              {/* Avatar + Name */}
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full border-4 border-white/10 ring-4 ring-[#197fe6]/20 bg-slate-700 flex items-center justify-center text-4xl font-bold text-slate-200 shadow-xl">
                    RM
                  </div>
                  <button className="absolute bottom-1 right-1 w-10 h-10 bg-[#197fe6] rounded-full flex items-center justify-center text-white border-4 border-[#0a0f14] shadow-lg hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
                <div className="text-center md:text-left space-y-2">
                  <h4 className="text-3xl font-bold">Ricardo Mendes</h4>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#197fe6] animate-pulse" />
                      <span className="text-slate-200 text-sm font-medium">Admin Geral</span>
                    </div>
                    <p className="text-slate-400 text-sm">Desde Janeiro 2024</p>
                  </div>
                </div>
              </div>

              {/* Form */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Nome Completo</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#197fe6]/50 focus:border-[#197fe6] transition-all"
                    type="text"
                    defaultValue="Ricardo Mendes"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">E-mail Corporativo</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#197fe6]/50 focus:border-[#197fe6] transition-all"
                    type="email"
                    defaultValue="ricardo.mendes@comunidade.org"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Telefone</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#197fe6]/50 focus:border-[#197fe6] transition-all"
                    type="text"
                    defaultValue="(11) 98765-4321"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-300 ml-1">Setor Designado</label>
                  <div className="relative">
                    <select className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-[#197fe6]/50 focus:border-[#197fe6] transition-all">
                      <option className="bg-slate-900">Setor Norte</option>
                      <option className="bg-slate-900">Setor Sul</option>
                      <option className="bg-slate-900">Setor Leste</option>
                      <option className="bg-slate-900">Setor Oeste</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                      expand_more
                    </span>
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

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6">
                <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-slate-300 font-semibold hover:text-white transition-colors">
                  Cancelar
                </button>
                <button className="w-full sm:w-auto px-10 py-3.5 rounded-xl bg-gradient-to-r from-[#197fe6] to-[#2E74B5] text-white font-bold shadow-lg shadow-[#197fe6]/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  Salvar Alterações
                </button>
              </div>

            </div>
          </div>

          {/* Logout */}
          <div className="mt-8 mb-12 flex justify-center">
            <button
              onClick={() => router.push('/login')}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors group"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              <span>Sair</span>
            </button>
          </div>

        </div>
      </div>
    </DashboardLayout>
  )
}
