'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

// ─── Constants ────────────────────────────────────────────────────────────────

const tipoOptions = ['Daikomyo', 'Komyo', 'Ohikari', 'Shoko', 'Frequentador']
const situacaoOptions = ['ATIVO', 'INATIVO', 'AFASTADO']

const TIPO_ID_MAP: Record<string, number> = {
  Daikomyo: 1, Komyo: 2, Ohikari: 3, Shoko: 4, Frequentador: 5,
}
const TIPO_NAME_MAP: Record<number, string> = {
  1: 'Daikomyo', 2: 'Komyo', 3: 'Ohikari', 4: 'Shoko', 5: 'Frequentador',
}
const SITUACAO_ID_MAP: Record<string, number> = {
  ATIVO: 1, INATIVO: 2, AFASTADO: 3,
}
const SITUACAO_NAME_MAP: Record<number, string> = {
  1: 'ATIVO', 2: 'INATIVO', 3: 'AFASTADO',
}

const SITUACAO_CONFIG: Record<string, { dot: string; label: string; badge: string }> = {
  ATIVO:    { dot: 'bg-emerald-500', label: 'Ativo',    badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
  INATIVO:  { dot: 'bg-red-500',     label: 'Inativo',  badge: 'bg-red-500/10 text-red-400 border border-red-500/20' },
  AFASTADO: { dot: 'bg-amber-500',   label: 'Afastado', badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
}

const AVATAR_COLORS = [
  { bg: 'bg-[#1F4E79]',      text: 'text-white' },
  { bg: 'bg-slate-700',      text: 'text-slate-300' },
  { bg: 'bg-emerald-700/50', text: 'text-emerald-200' },
  { bg: 'bg-amber-700/50',   text: 'text-amber-200' },
  { bg: 'bg-purple-700/50',  text: 'text-purple-200' },
  { bg: 'bg-rose-700/50',    text: 'text-rose-200' },
]

function getAvatarColor(name: string) {
  let hash = 0
  for (const ch of name) hash = ch.charCodeAt(0) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// ─── Mask utilities ────────────────────────────────────────────────────────────

function maskPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

function displayToDbDate(display: string): string {
  const [d, m, y] = display.split('/')
  if (!d || !m || !y || y.length < 4) return ''
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
}

function dbToDisplayDate(db: string): string {
  if (!db) return ''
  const [y, m, d] = db.split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function isValidDate(display: string): boolean {
  if (display.length !== 10) return false
  const [d, m, y] = display.split('/').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EditarMembroPage() {
  const params = useParams()
  const router = useRouter()
  const id = Number(params.id)

  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form fields
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [codigoMembro, setCodigoMembro] = useState('')
  const [dataNasc, setDataNasc] = useState('')
  const [dataOutorga, setDataOutorga] = useState('')
  const [tipo, setTipo] = useState('Ohikari')
  const [situacao, setSituacao] = useState('ATIVO')

  // Dedicações
  const [dedicacoes, setDedicacoes] = useState<string[]>([])
  const [allDedicacoes, setAllDedicacoes] = useState<string[]>([])
  const [novaDedicacao, setNovaDedicacao] = useState('')
  const [adicionandoDedicacao, setAdicionandoDedicacao] = useState(false)

  useEffect(() => {
    if (!id) return

    async function load() {
      const { data: m, error } = await supabase
        .from('membro')
        .select('id, nome, telefone, codigo_membro, data_nascimento, data_outorga, tipo_id, situacao')
        .eq('id', id)
        .single()

      if (error || !m) {
        setNotFound(true)
        setLoading(false)
        return
      }

      setNome(m.nome ?? '')
      setTelefone(maskPhone(m.telefone ?? ''))
      setCodigoMembro(m.codigo_membro ?? '')
      setDataNasc(dbToDisplayDate(m.data_nascimento ?? ''))
      setDataOutorga(dbToDisplayDate(m.data_outorga ?? ''))
      setTipo(TIPO_NAME_MAP[m.tipo_id] ?? 'Ohikari')
      setSituacao(SITUACAO_NAME_MAP[m.situacao] ?? 'ATIVO')

      // Current dedicações
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

      // All available dedicações
      const { data: allDeds } = await supabase
        .from('dedicacao')
        .select('nome')
        .order('nome', { ascending: true })
      setAllDedicacoes(allDeds?.map((d) => d.nome) ?? [])

      setLoading(false)
    }

    load()
  }, [id])

  function removeDedicacao(d: string) {
    setDedicacoes((prev) => prev.filter((x) => x !== d))
  }

  function addDedicacaoExisting(d: string) {
    if (!dedicacoes.includes(d)) setDedicacoes((prev) => [...prev, d])
    setAdicionandoDedicacao(false)
  }

  async function adicionarNovaDedicacao() {
    const val = novaDedicacao.trim()
    if (!val) return
    if (!allDedicacoes.includes(val)) setAllDedicacoes((prev) => [...prev, val].sort())
    if (!dedicacoes.includes(val)) setDedicacoes((prev) => [...prev, val])
    setNovaDedicacao('')
    setAdicionandoDedicacao(false)
  }

  async function handleSalvar() {
    const errors: Record<string, string> = {}
    if (!nome.trim()) errors.nome = 'Nome é obrigatório.'
    if (telefone && telefone.replace(/\D/g, '').length < 10) errors.telefone = 'Telefone inválido.'
    if (dataNasc && !isValidDate(dataNasc)) errors.dataNasc = 'Data inválida.'
    if (dataOutorga && !isValidDate(dataOutorga)) errors.dataOutorga = 'Data inválida.'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }
    setFieldErrors({})
    setSalvando(true)
    setSaveError('')

    const dbDataNasc = dataNasc ? displayToDbDate(dataNasc) : null
    const dbDataOutorga = dataOutorga ? displayToDbDate(dataOutorga) : null

    // 1. Update membro
    const { error: updateError } = await supabase
      .from('membro')
      .update({
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        codigo_membro: codigoMembro.trim() || null,
        data_nascimento: dbDataNasc || null,
        data_outorga: dbDataOutorga || null,
        tipo_id: TIPO_ID_MAP[tipo],
        situacao: SITUACAO_ID_MAP[situacao],
      })
      .eq('id', id)

    if (updateError) {
      setSaveError('Erro ao salvar alterações. Tente novamente.')
      setSalvando(false)
      return
    }

    // 2. Sync dedicações: delete all + re-insert
    await supabase.from('dedicacao_membro').delete().eq('id_membro', id)

    for (const nomeDed of dedicacoes) {
      const { data: existing } = await supabase
        .from('dedicacao')
        .select('id')
        .eq('nome', nomeDed)
        .limit(1)
        .single()

      let dedId: number | null = existing?.id ?? null

      if (!dedId) {
        const { data: newDed } = await supabase
          .from('dedicacao')
          .insert({ nome: nomeDed })
          .select('id')
          .single()
        dedId = newDed?.id ?? null
      }

      if (dedId) {
        await supabase.from('dedicacao_membro').insert({ id_dedicacao: dedId, id_membro: id })
      }
    }

    setSalvando(false)
    router.push(`/membros/${id}`)
  }

  const sit = SITUACAO_CONFIG[situacao] ?? SITUACAO_CONFIG.ATIVO
  const av = nome ? getAvatarColor(nome) : { bg: 'bg-slate-700', text: 'text-slate-300' }
  const iniciais = nome ? getInitials(nome) : '?'
  const availableToAdd = allDedicacoes.filter((d) => !dedicacoes.includes(d))

  if (loading) {
    return (
      <DashboardLayout title="Editar Membro">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Carregando...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (notFound) {
    return (
      <DashboardLayout title="Editar Membro">
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

  return (
    <DashboardLayout title="Editar Membro">
      <div className="flex-1 overflow-y-auto p-8 space-y-6 max-w-6xl mx-auto w-full">

        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <span className="material-symbols-outlined text-xl">arrow_back</span>
            Voltar para Detalhes
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              disabled={salvando}
              className="px-5 py-2.5 glass-card rounded-xl text-sm font-semibold border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvando}
              className="px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#1F4E79] to-[#2E74B5] text-white shadow-lg hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {salvando ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">save</span>
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {saveError && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
            <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
            <p className="text-red-400 text-sm font-medium">{saveError}</p>
          </div>
        )}

        {/* Profile Header */}
        <section className="glass-card rounded-2xl p-8 flex flex-col md:flex-row items-center gap-8">
          <div className="relative shrink-0">
            <div className={`w-32 h-32 rounded-full ${av.bg} flex items-center justify-center font-black text-4xl ${av.text} border-4 border-white/10`}>
              {iniciais}
            </div>
            <div className={`absolute bottom-1 right-1 w-6 h-6 rounded-full border-4 border-[#0a0f14] ${sit.dot}`} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-bold text-white tracking-tight">{nome || 'Nome do Membro'}</h1>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase ${sit.badge}`}>
                {sit.label}
              </span>
            </div>
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
              <span className="px-3 py-1 rounded-lg text-xs font-medium text-slate-300 bg-white/5 border border-white/10">
                {tipo}
              </span>
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
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Nome Completo</label>
                  <input
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 ${fieldErrors.nome ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:border-[#197fe6]/50 focus:ring-[#197fe6]/30'}`}
                    type="text"
                    value={nome}
                    onChange={(e) => { setNome(e.target.value); setFieldErrors((p) => ({ ...p, nome: '' })) }}
                    placeholder="Nome completo do membro"
                  />
                  {fieldErrors.nome && <p className="mt-1 text-xs text-red-400">{fieldErrors.nome}</p>}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Telefone</label>
                  <input
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 ${fieldErrors.telefone ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:border-[#197fe6]/50 focus:ring-[#197fe6]/30'}`}
                    type="text"
                    value={telefone}
                    onChange={(e) => { setTelefone(maskPhone(e.target.value)); setFieldErrors((p) => ({ ...p, telefone: '' })) }}
                    placeholder="(00) 00000-0000"
                  />
                  {fieldErrors.telefone && <p className="mt-1 text-xs text-red-400">{fieldErrors.telefone}</p>}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Código do Membro</label>
                  <input
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#197fe6]/50 focus:ring-1 focus:ring-[#197fe6]/30 transition-all placeholder:text-slate-600"
                    type="text"
                    value={codigoMembro}
                    onChange={(e) => setCodigoMembro(e.target.value)}
                    placeholder="Ex: 1234567"
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Data de Nascimento</label>
                  <input
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 ${fieldErrors.dataNasc ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:border-[#197fe6]/50 focus:ring-[#197fe6]/30'}`}
                    type="text"
                    value={dataNasc}
                    onChange={(e) => { setDataNasc(maskDate(e.target.value)); setFieldErrors((p) => ({ ...p, dataNasc: '' })) }}
                    placeholder="DD/MM/AAAA"
                  />
                  {fieldErrors.dataNasc && <p className="mt-1 text-xs text-red-400">{fieldErrors.dataNasc}</p>}
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mb-1.5">Data de Outorga</label>
                  <input
                    className={`w-full bg-white/5 border rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-1 transition-all placeholder:text-slate-600 ${fieldErrors.dataOutorga ? 'border-red-500/50 focus:ring-red-500/30' : 'border-white/10 focus:border-[#197fe6]/50 focus:ring-[#197fe6]/30'}`}
                    type="text"
                    value={dataOutorga}
                    onChange={(e) => { setDataOutorga(maskDate(e.target.value)); setFieldErrors((p) => ({ ...p, dataOutorga: '' })) }}
                    placeholder="DD/MM/AAAA"
                  />
                  {fieldErrors.dataOutorga && <p className="mt-1 text-xs text-red-400">{fieldErrors.dataOutorga}</p>}
                </div>

              </div>
            </section>

          </div>

          {/* Right column */}
          <div className="space-y-6">

            {/* Classificação */}
            <section className="glass-card rounded-2xl p-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Classificação</h4>
              <div className="space-y-4">

                {/* Dedicação */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Dedicação</p>
                  <div className="flex flex-wrap gap-2">
                    {dedicacoes.map((d) => (
                      <span
                        key={d}
                        className="flex items-center gap-1 px-2 py-1 rounded text-[10px] font-semibold text-[#197fe6]"
                        style={{ background: 'rgba(25,127,230,0.15)', border: '1px solid rgba(25,127,230,0.3)' }}
                      >
                        {d.toUpperCase()}
                        <button type="button" onClick={() => removeDedicacao(d)} className="hover:text-white transition-colors ml-0.5">
                          <span className="material-symbols-outlined text-[12px]">close</span>
                        </button>
                      </span>
                    ))}

                    {adicionandoDedicacao ? (
                      <div className="flex flex-col gap-2 w-full mt-1">
                        {availableToAdd.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {availableToAdd.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => addDedicacaoExisting(d)}
                                className="px-2 py-1 rounded text-[10px] font-bold bg-white/10 text-slate-300 hover:bg-[#197fe6]/20 hover:text-[#197fe6] transition-all border border-white/10"
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <input
                            autoFocus
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[11px] font-bold uppercase text-white outline-none focus:ring-1 focus:ring-[#197fe6]/50 placeholder:text-slate-600"
                            placeholder="NOVA DEDICAÇÃO..."
                            value={novaDedicacao}
                            onChange={(e) => setNovaDedicacao(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') adicionarNovaDedicacao()
                              if (e.key === 'Escape') { setAdicionandoDedicacao(false); setNovaDedicacao('') }
                            }}
                          />
                          <button type="button" onClick={adicionarNovaDedicacao}
                            className="w-7 h-7 rounded-lg bg-[#197fe6]/20 text-[#197fe6] hover:bg-[#197fe6]/30 flex items-center justify-center transition-all shrink-0">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </button>
                          <button type="button" onClick={() => { setAdicionandoDedicacao(false); setNovaDedicacao('') }}
                            className="w-7 h-7 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all shrink-0">
                            <span className="material-symbols-outlined text-sm">close</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAdicionandoDedicacao(true)}
                        className="w-7 h-7 rounded-full border border-dashed border-white/20 text-slate-500 hover:text-white hover:border-white/40 flex items-center justify-center transition-all"
                      >
                        <span className="material-symbols-outlined text-xs">add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tipo */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Tipo</p>
                  <div className="flex flex-wrap gap-1">
                    {tipoOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTipo(opt)}
                        className={`px-2.5 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                          tipo === opt
                            ? 'bg-[#197fe6]/20 text-[#197fe6] border border-[#197fe6]/30'
                            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Situação */}
                <div className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase mb-2">Situação</p>
                  <div className="flex flex-wrap gap-1">
                    {situacaoOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setSituacao(opt)}
                        className={`px-2.5 py-1.5 rounded text-[9px] font-bold uppercase transition-all ${
                          situacao === opt
                            ? opt === 'ATIVO'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : opt === 'INATIVO'
                              ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/5 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        {opt === 'ATIVO' ? 'Ativo' : opt === 'INATIVO' ? 'Inativo' : 'Afastado'}
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </section>

          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
