'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMembro = {
  membro_id: number
  nome_membro: string
  tipo_membro: string
  situacao_membro: string
  situacao_id: number
  data_de_nascimento: string | null
  data_de_outorga: string | null
  telefone: string | null
  codigo_de_membro: string | null
  nome_setor: string | null
  setor_id: number | null
  nome_resp_setor: string | null
  nome_chefe_familia: string | null
  nome_resp_membro: string | null
  endereco_completo: string | null
  logradouro: string | null
  bairro: string | null
  responsavel_membro_booleano: boolean
  coordenador_setor_booleano: boolean
  assistente_ministro_booleano: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  { bg: 'bg-[#1F4E79]', text: 'text-white' },
  { bg: 'bg-slate-700', text: 'text-slate-300' },
  { bg: 'bg-emerald-700/50', text: 'text-emerald-200' },
  { bg: 'bg-amber-700/50', text: 'text-amber-200' },
  { bg: 'bg-purple-700/50', text: 'text-purple-200' },
  { bg: 'bg-rose-700/50', text: 'text-rose-200' },
]

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function getAvatarColor(name: string) {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatDateLong(iso: string | null) {
  if (!iso) return '—'
  const date = new Date(iso + 'T00:00:00')
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function calcularIdade(iso: string | null): string {
  if (!iso) return ''
  const nasc = new Date(iso + 'T00:00:00')
  const hoje = new Date()
  let idade = hoje.getFullYear() - nasc.getFullYear()
  if (
    hoje.getMonth() < nasc.getMonth() ||
    (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())
  ) {
    idade--
  }
  return `${idade} anos`
}

function formatTelefone(tel: string | null) {
  if (!tel) return '—'
  const digits = tel.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return tel
}

const TIPO_STYLE: Record<string, string> = {
  Daikomyo: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
  Komyo: 'bg-[#197fe6]/20 text-[#197fe6] border border-[#197fe6]/30',
  Ohikari: 'bg-slate-100/10 text-slate-200 border border-white/20',
  Shoko: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  Frequentador: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
}

const SITUACAO_CONFIG: Record<string, { dot: string; glow: string; label: string; badge: string }> = {
  ATIVO: { dot: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]', label: 'Ativo', badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  INATIVO: { dot: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]', label: 'Inativo', badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  AFASTADO: { dot: 'bg-amber-500', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]', label: 'Afastado', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembroDetalhesPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [membro, setMembro] = useState<ViewMembro | null>(null)
  const [dedicacoes, setDedicacoes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      const { data, error } = await supabase
        .from('view_membro')
        .select('*')
        .eq('membro_id', id)
        .single()

      if (error || !data) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setMembro(data as ViewMembro)

      // Fetch dedicações from dedicated tables
      const { data: memDeds } = await supabase
        .from('dedicacao_membro')
        .select('id_dedicacao')
        .eq('id_membro', id)

      if (memDeds && memDeds.length > 0) {
        const dedIds = memDeds.map((d) => d.id_dedicacao)
        const { data: deds } = await supabase
          .from('dedicacao')
          .select('nome')
          .in('id', dedIds)
        setDedicacoes(deds?.map((d) => d.nome) ?? [])
      }

      setLoading(false)
    }

    load()
  }, [id])

  if (loading) {
    return (
      <DashboardLayout title="Detalhes do Membro">
        <div className="flex-1 p-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* Skeleton */}
          <div className="glass-card rounded-2xl p-8 flex gap-8 animate-pulse">
            <div className="w-32 h-32 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-3 pt-4">
              <div className="h-8 bg-white/10 rounded-full w-64" />
              <div className="h-4 bg-white/5 rounded-full w-48" />
              <div className="flex gap-2 mt-4">
                <div className="h-6 bg-white/10 rounded-lg w-24" />
                <div className="h-6 bg-white/10 rounded-lg w-20" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-card rounded-2xl h-64 animate-pulse" />
            <div className="glass-card rounded-2xl h-64 animate-pulse" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound || !membro) {
    return (
      <DashboardLayout title="Detalhes do Membro">
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-600 block">person_off</span>
            <p className="text-slate-400 text-lg font-semibold">Membro não encontrado</p>
            <button onClick={() => router.back()} className="px-6 py-2.5 glass-card rounded-lg text-sm font-semibold hover:bg-white/10 transition-colors">
              Voltar
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const av = getAvatarColor(membro.nome_membro)
  const iniciais = getInitials(membro.nome_membro)
  const sit = SITUACAO_CONFIG[membro.situacao_membro] ?? SITUACAO_CONFIG.ATIVO
  const tipoStyle = TIPO_STYLE[membro.tipo_membro] ?? TIPO_STYLE.Ohikari

  return (
    <DashboardLayout title="Detalhes do Membro">
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto w-full">

        {/* Breadcrumb / Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Voltar para Membros
          </button>
          <button
            onClick={() => router.push(`/membros/${membro.membro_id}/editar`)}
            className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#1F4E79] to-[#2E74B5] text-white shadow-lg hover:brightness-110 transition-all"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            Editar Membro
          </button>
        </div>

        {/* Profile Header */}
        <section className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className={`w-32 h-32 rounded-full ${av.bg} flex items-center justify-center font-black text-4xl ${av.text} border-4 border-white/10`}>
              {iniciais}
            </div>
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-[#0a0f14] ${sit.dot} ${sit.glow}`} />
          </div>

          {/* Info */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                {membro.nome_membro}
              </h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${sit.badge}`}>
                {sit.label}
              </span>
            </div>

            {membro.data_de_outorga && (
              <p className="text-slate-400 mt-2 flex items-center justify-center md:justify-start gap-2 text-sm">
                <span className="material-symbols-outlined text-base">calendar_month</span>
                Membro desde {formatDateLong(membro.data_de_outorga)}
              </p>
            )}

            <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
              {dedicacoes.map((d) => (
                <span
                  key={d}
                  className="px-3 py-1 rounded-lg text-xs font-semibold text-[#197fe6]"
                  style={{ background: 'rgba(25,127,230,0.15)', border: '1px solid rgba(25,127,230,0.3)' }}
                >
                  {d}
                </span>
              ))}
              {membro.nome_setor && (
                <span className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 bg-white/5 border border-white/10">
                  {membro.nome_setor}
                </span>
              )}
              {membro.codigo_de_membro && (
                <span className="px-3 py-1 rounded-lg text-xs font-mono text-slate-400 bg-white/5 border border-white/10">
                  #{membro.codigo_de_membro}
                </span>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">

            {/* Informações Gerais */}
            <section className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#197fe6]">info</span>
                <h3 className="font-bold text-lg">Informações Gerais</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Telefone</p>
                  <p className="text-white font-medium">{formatTelefone(membro.telefone)}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Código do Membro</p>
                  <p className="text-white font-mono font-medium">{membro.codigo_de_membro ?? '—'}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Data de Nascimento</p>
                  <p className="text-white font-medium">
                    {formatDate(membro.data_de_nascimento)}
                    {membro.data_de_nascimento && (
                      <span className="text-slate-400 text-xs ml-2">({calcularIdade(membro.data_de_nascimento)})</span>
                    )}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Data de Outorga</p>
                  <p className="text-white font-medium">{formatDate(membro.data_de_outorga)}</p>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Tipo de Membro</p>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${tipoStyle}`}>
                    {membro.tipo_membro}
                  </span>
                </div>

                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Situação</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sit.dot} ${sit.glow}`} />
                    <span className="text-white text-sm font-medium">{sit.label}</span>
                  </div>
                </div>

                {membro.nome_chefe_familia && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Chefe de Família</p>
                    <p className="text-white font-medium">{membro.nome_chefe_familia}</p>
                  </div>
                )}

                {membro.nome_resp_membro && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Responsável Membro</p>
                    <p className="text-white font-medium">{membro.nome_resp_membro}</p>
                  </div>
                )}

              </div>
            </section>

            {/* Histórico de Atividades */}
            <section className="glass-card rounded-2xl overflow-hidden">
              <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#197fe6]">history</span>
                  <h3 className="font-bold text-lg">Histórico de Atividades</h3>
                </div>
                <button className="text-xs text-[#197fe6] font-bold hover:underline">Ver completo</button>
              </div>
              <div className="divide-y divide-white/5">
                {[
                  { icon: 'event_available', color: 'text-blue-400 bg-blue-500/10', titulo: 'Conferência Regional de Líderes', data: '24 Março, 2024 • Participante' },
                  { icon: 'volunteer_activism', color: 'text-purple-400 bg-purple-500/10', titulo: 'Ação Comunitária — Setor', data: '12 Fevereiro, 2024 • Apoio' },
                  { icon: 'school', color: 'text-emerald-400 bg-emerald-500/10', titulo: 'Workshop de Boas Vindas', data: '05 Janeiro, 2024 • Participante' },
                ].map((ev) => (
                  <div key={ev.titulo} className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors group">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ev.color} group-hover:scale-110 transition-transform shrink-0`}>
                      <span className="material-symbols-outlined">{ev.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{ev.titulo}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{ev.data}</p>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Finalizado</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Classificação */}
            <section className="glass-card rounded-2xl p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Classificação</h4>
              <div className="space-y-4">

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Dedicação</p>
                  {dedicacoes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {dedicacoes.map((d) => (
                        <span
                          key={d}
                          className="px-3 py-1 rounded text-[11px] font-semibold text-[#197fe6]"
                          style={{ background: 'rgba(25,127,230,0.15)', border: '1px solid rgba(25,127,230,0.3)' }}
                        >
                          {d.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-600">Sem dedicação registrada</span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Tipo</p>
                  <span className={`px-3 py-1 rounded text-[11px] font-bold uppercase tracking-wider ${tipoStyle}`}>
                    {membro.tipo_membro}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Situação</p>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${sit.dot} animate-pulse`} />
                    <span className="text-white text-sm font-medium">{sit.label}</span>
                  </div>
                </div>

              </div>
            </section>

            {/* Setor / Endereço */}
            <section className="glass-card rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#197fe6] text-base">location_on</span>
                <h4 className="text-sm font-bold">Setor / Localização</h4>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Setor Designado</p>
                  <p className="text-white font-semibold">{membro.nome_setor ?? '—'}</p>
                </div>
                {membro.nome_resp_setor && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Responsável do Setor</p>
                    <p className="text-slate-300 text-sm">{membro.nome_resp_setor}</p>
                  </div>
                )}
                {membro.bairro && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Bairro</p>
                    <p className="text-slate-300 text-sm">{membro.bairro}</p>
                  </div>
                )}
                {membro.endereco_completo && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-slate-500 font-bold mb-1">Endereço</p>
                    <p className="text-slate-400 text-xs leading-relaxed">{membro.endereco_completo}</p>
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
