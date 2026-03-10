'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

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
  responsavel_membro_booleano: boolean
  coordenador_setor_booleano: boolean
  assistente_ministro_booleano: boolean
}

type DropdownKey = 'tipo' | 'situacao' | 'dedicacao' | null

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  if (!iso) return '-'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function formatYear(iso: string | null) {
  if (!iso) return '-'
  return iso.split('-')[0]
}

const TIPO_STYLE: Record<string, string> = {
  Daikomyo: 'bg-purple-500/20 text-purple-400 border border-purple-500/30',
  Komyo: 'bg-[#197fe6]/20 text-[#197fe6] border border-[#197fe6]/30',
  Ohikari: 'bg-slate-100 text-slate-900',
  Shoko: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Frequentador: 'bg-amber-500/20 text-amber-400 border border-amber-500/30',
}

const SITUACAO_CONFIG: Record<string, { dot: string; glow: string; label: string }> = {
  ATIVO: { dot: 'bg-emerald-500', glow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]', label: 'Ativo' },
  INATIVO: { dot: 'bg-red-500', glow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]', label: 'Inativo' },
  AFASTADO: { dot: 'bg-amber-500', glow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]', label: 'Afastado' },
}

const tipoOptions = ['Daikomyo', 'Komyo', 'Ohikari', 'Shoko', 'Frequentador']
const situacaoOptions = ['ATIVO', 'INATIVO', 'AFASTADO']
const dedicacaoFilterOptions = ['Resp. Membro', 'Coord. Setor', 'Assist. Ministro']

const TIPO_ID_MAP: Record<string, number> = {
  Daikomyo: 1,
  Komyo: 2,
  Ohikari: 3,
  Shoko: 4,
  Frequentador: 5,
}

const SITUACAO_ID_MAP: Record<string, number> = {
  ATIVO: 1,
  INATIVO: 2,
  AFASTADO: 3,
}

const ROW_HEIGHT = 65  // approximate px per table row
const THEAD_HEIGHT = 49 // approximate thead height

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

function isValidDate(display: string): boolean {
  if (display.length !== 10) return false
  const [d, m, y] = display.split('/').map(Number)
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900) return false
  const date = new Date(y, m - 1, d)
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d
}

// ─── FilterDropdown ───────────────────────────────────────────────────────────

function FilterDropdown({
  label,
  options,
  value,
  onChange,
  isOpen,
  onToggle,
  dotColors,
  displayMap,
}: {
  label: string
  options: string[]
  value: string | null
  onChange: (v: string | null) => void
  isOpen: boolean
  onToggle: () => void
  dotColors?: Record<string, string>
  displayMap?: Record<string, string>
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isOpen && ref.current && !ref.current.contains(e.target as Node)) {
        onToggle()
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onToggle])

  const displayLabel = value ? (displayMap?.[value] ?? value) : null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={`px-4 py-2 glass-card rounded-lg text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-1 ${
          value ? 'text-[#197fe6] border border-[#197fe6]/40' : ''
        }`}
      >
        {displayLabel ? `${label}: ${displayLabel}` : label}
        <span className="material-symbols-outlined text-sm">
          {isOpen ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-50 min-w-[180px] rounded-xl border border-white/10 shadow-2xl py-1 overflow-hidden"
          style={{ background: 'rgba(15, 23, 31, 0.96)', backdropFilter: 'blur(20px)' }}
        >
          <button
            onClick={() => { onChange(null); onToggle() }}
            className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/10 flex items-center gap-2 ${
              value === null ? 'text-[#197fe6]' : 'text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {value === null ? 'radio_button_checked' : 'radio_button_unchecked'}
            </span>
            Todos
          </button>
          <div className="mx-3 my-1 h-px bg-white/5" />
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); onToggle() }}
              className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/10 flex items-center gap-2 ${
                value === opt ? 'text-[#197fe6]' : 'text-slate-300'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {value === opt ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              {dotColors && (
                <span className={`w-2 h-2 rounded-full ${dotColors[opt] ?? 'bg-slate-400'}`} />
              )}
              {displayMap?.[opt] ?? opt}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ActionMenu ──────────────────────────────────────────────────────────────

function ActionMenu({ membroId }: { membroId: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-white/10"
      >
        <span className="material-symbols-outlined">more_vert</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 w-36 rounded-xl border border-white/10 shadow-2xl overflow-hidden py-1"
          style={{ background: 'rgba(15, 23, 31, 0.96)', backdropFilter: 'blur(20px)' }}
        >
          <button
            onClick={() => { setOpen(false); router.push(`/membros/${membroId}/editar`) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-[#197fe6]">edit</span>
            Editar
          </button>
          <div className="mx-3 h-px bg-white/5" />
          <button
            onClick={() => { setOpen(false) }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <span className="material-symbols-outlined text-base">delete</span>
            Excluir
          </button>
        </div>
      )}
    </div>
  )
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      {[40, 120, 96, 80, 64, 56, 32].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div className={`h-3 rounded-full bg-white/5 animate-pulse`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MembrosPage() {
  const router = useRouter()
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const [dynamicPageSize, setDynamicPageSize] = useState(20)

  // Compute page size from table container height
  useLayoutEffect(() => {
    const el = tableContainerRef.current
    if (!el) return
    const compute = () => {
      const rows = Math.max(5, Math.floor((el.clientHeight - THEAD_HEIGHT) / ROW_HEIGHT))
      setDynamicPageSize(rows)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [dedicacoes, setDedicacoes] = useState<string[]>([])
  const [tipo, setTipo] = useState('Ohikari')
  const [situacao, setSituacao] = useState('ATIVO')
  const [dedicacaoOptions, setDedicacaoOptions] = useState<string[]>([])
  const [novaDedicacao, setNovaDedicacao] = useState('')
  const [adicionandoDedicacao, setAdicionandoDedicacao] = useState(false)
  // Modal form fields
  const [nomeModal, setNomeModal] = useState('')
  const [telefoneModal, setTelefoneModal] = useState('')
  const [codigoMembroModal, setCodigoMembroModal] = useState('')
  const [dataNascModal, setDataNascModal] = useState('')
  const [dataOutorgaModal, setDataOutorgaModal] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [modalFieldErrors, setModalFieldErrors] = useState<Record<string, string>>({})
  const [userUnidade, setUserUnidade] = useState<string | null>(null)

  // Table data
  const [membros, setMembros] = useState<ViewMembro[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalAfastados, setTotalAfastados] = useState(0)
  const [page, setPage] = useState(0)

  // Filters
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState<string | null>(null)
  const [filtroDedicacao, setFiltroDedicacao] = useState<string | null>(null)
  const [busca, setBusca] = useState('')
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null)

  function toggleDropdown(key: DropdownKey) {
    setOpenDropdown((prev) => (prev === key ? null : key))
  }

  // Fetch stat counts once
  useEffect(() => {
    async function fetchStats() {
      const [{ count: tot }, { count: ativos }, { count: afastados }] = await Promise.all([
        supabase.from('view_membro').select('membro_id', { count: 'exact', head: true }),
        supabase.from('view_membro').select('membro_id', { count: 'exact', head: true }).eq('situacao_id', 1),
        supabase.from('view_membro').select('membro_id', { count: 'exact', head: true }).in('situacao_id', [2, 3]),
      ])
      setTotal(tot ?? 0)
      setTotalAtivos(ativos ?? 0)
      setTotalAfastados(afastados ?? 0)
    }
    fetchStats()
  }, [])

  // Fetch members with filters + pagination
  const fetchMembros = useCallback(async () => {
    setLoading(true)

    let query = supabase
      .from('view_membro')
      .select('membro_id,nome_membro,tipo_membro,situacao_membro,situacao_id,data_de_nascimento,data_de_outorga,telefone,codigo_de_membro,nome_setor,responsavel_membro_booleano,coordenador_setor_booleano,assistente_ministro_booleano', { count: 'exact' })
      .order('nome_membro', { ascending: true })
      .range(page * dynamicPageSize, (page + 1) * dynamicPageSize - 1)

    if (filtroTipo) query = query.eq('tipo_membro', filtroTipo)
    if (filtroSituacao) query = query.eq('situacao_membro', filtroSituacao)
    if (filtroDedicacao === 'Resp. Membro') query = query.eq('responsavel_membro_booleano', true)
    if (filtroDedicacao === 'Coord. Setor') query = query.eq('coordenador_setor_booleano', true)
    if (filtroDedicacao === 'Assist. Ministro') query = query.eq('assistente_ministro_booleano', true)
    if (busca.trim()) query = query.ilike('nome_membro', `%${busca.trim()}%`)

    const { data, count } = await query
    setMembros((data as ViewMembro[]) ?? [])
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [filtroTipo, filtroSituacao, filtroDedicacao, busca, page, dynamicPageSize])

  useEffect(() => {
    fetchMembros()
  }, [fetchMembros])

  // Reset to page 0 when filters or page size change
  useEffect(() => {
    setPage(0)
  }, [filtroTipo, filtroSituacao, filtroDedicacao, busca, dynamicPageSize])

  const totalPages = Math.ceil(total / dynamicPageSize)

  // Fetch current user's unidade once
  useEffect(() => {
    async function fetchUnidade() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const { data } = await supabase
        .from('PessoaUserUnidadeIgrejaView')
        .select('unidade_id')
        .eq('usuario_id', session.user.id)
        .limit(1)
        .single()
      if (data?.unidade_id) setUserUnidade(data.unidade_id)
    }
    fetchUnidade()
  }, [])

  // Fetch dedication options from DB
  async function fetchDedicacaoOptions() {
    const { data } = await supabase.from('dedicacao').select('nome').order('nome', { ascending: true })
    setDedicacaoOptions(data?.map((d) => d.nome) ?? [])
  }

  useEffect(() => {
    fetchDedicacaoOptions()
  }, [])

  async function handleSalvarMembro() {
    const errors: Record<string, string> = {}
    if (!nomeModal.trim()) errors.nome = 'Nome é obrigatório.'
    if (telefoneModal && telefoneModal.replace(/\D/g, '').length < 10) errors.telefone = 'Telefone inválido.'
    if (dataNascModal && !isValidDate(dataNascModal)) errors.dataNasc = 'Data inválida.'
    if (dataOutorgaModal && !isValidDate(dataOutorgaModal)) errors.dataOutorga = 'Data inválida.'
    if (Object.keys(errors).length > 0) {
      setModalFieldErrors(errors)
      return
    }
    setModalFieldErrors({})
    setSalvando(true)
    setSaveError('')

    const dbDataNasc = dataNascModal ? displayToDbDate(dataNascModal) : null
    const dbDataOutorga = dataOutorgaModal ? displayToDbDate(dataOutorgaModal) : null

    // 1. Insert membro
    const { data: novoMembro, error: insertError } = await supabase
      .from('membro')
      .insert({
        nome: nomeModal.trim(),
        telefone: telefoneModal.trim() || null,
        codigo_membro: codigoMembroModal.trim() || null,
        data_nascimento: dbDataNasc || null,
        data_outorga: dbDataOutorga || null,
        situacao: SITUACAO_ID_MAP[situacao],
        tipo_id: TIPO_ID_MAP[tipo],
        unidade: userUnidade,
        chefe_familia: null,
      })
      .select('id')
      .single()

    if (insertError || !novoMembro) {
      setSaveError('Erro ao salvar membro. Verifique os dados e tente novamente.')
      setSalvando(false)
      return
    }

    const membroId = novoMembro.id

    // 2. Handle dedicações
    for (const nomeDedicacao of dedicacoes) {
      // Find or create dedicacao record
      const { data: existing } = await supabase
        .from('dedicacao')
        .select('id')
        .eq('nome', nomeDedicacao)
        .limit(1)
        .single()

      let dedId: number | null = existing?.id ?? null

      if (!dedId) {
        const { data: newDed } = await supabase
          .from('dedicacao')
          .insert({ nome: nomeDedicacao })
          .select('id')
          .single()
        dedId = newDed?.id ?? null
      }

      if (dedId) {
        await supabase.from('dedicacao_membro').insert({
          id_dedicacao: dedId,
          id_membro: membroId,
        })
      }
    }

    setSalvando(false)
    handleClose()
    fetchMembros()
    fetchDedicacaoOptions()
  }

  function handleClose() {
    setModalOpen(false)
    setDedicacoes([])
    setTipo('Ohikari')
    setSituacao('ATIVO')
    fetchDedicacaoOptions()
    setNovaDedicacao('')
    setAdicionandoDedicacao(false)
    setNomeModal('')
    setTelefoneModal('')
    setCodigoMembroModal('')
    setDataNascModal('')
    setDataOutorgaModal('')
    setSalvando(false)
    setSaveError('')
    setModalFieldErrors({})
  }

  function toggleDedicacao(opt: string) {
    setDedicacoes((prev) =>
      prev.includes(opt) ? prev.filter((d) => d !== opt) : [...prev, opt]
    )
  }

  function adicionarDedicacao() {
    const val = novaDedicacao.trim()
    if (val && !dedicacaoOptions.includes(val)) {
      setDedicacaoOptions((prev) => [...prev, val])
      setDedicacoes((prev) => [...prev, val])
    }
    setNovaDedicacao('')
    setAdicionandoDedicacao(false)
  }

  const hasFilter = !!(filtroTipo || filtroSituacao || filtroDedicacao || busca)

  return (
    <DashboardLayout title="Gestão de Membros">
      <div className="flex flex-col flex-1 min-h-0 p-8 gap-6 overflow-hidden">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
          <div className="glass-card p-6 rounded-xl flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Total de Membros</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{total.toLocaleString('pt-BR')}</span>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Membros Ativos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{totalAtivos.toLocaleString('pt-BR')}</span>
              <span className="text-xs text-emerald-400 font-semibold">
                {total > 0 ? ((totalAtivos / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
          <div className="glass-card p-6 rounded-xl flex flex-col gap-1">
            <span className="text-slate-400 text-sm font-medium">Afastados / Inativos</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">{totalAfastados.toLocaleString('pt-BR')}</span>
              <span className="text-xs text-amber-400 font-semibold">
                {total > 0 ? ((totalAfastados / total) * 100).toFixed(1) : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Filters + Add */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">search</span>
              <input
                className="glass-card bg-white/5 rounded-lg pl-10 pr-4 py-2 text-sm w-72 text-slate-100 placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-[#197fe6]/50"
                placeholder="Filtrar por nome..."
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <FilterDropdown
                label="Tipo"
                options={tipoOptions}
                value={filtroTipo}
                onChange={setFiltroTipo}
                isOpen={openDropdown === 'tipo'}
                onToggle={() => toggleDropdown('tipo')}
              />
              <FilterDropdown
                label="Situação"
                options={situacaoOptions}
                value={filtroSituacao}
                onChange={setFiltroSituacao}
                isOpen={openDropdown === 'situacao'}
                onToggle={() => toggleDropdown('situacao')}
                dotColors={{
                  ATIVO: 'bg-emerald-500',
                  INATIVO: 'bg-red-500',
                  AFASTADO: 'bg-amber-500',
                }}
                displayMap={{ ATIVO: 'Ativo', INATIVO: 'Inativo', AFASTADO: 'Afastado' }}
              />
              <FilterDropdown
                label="Dedicação"
                options={dedicacaoFilterOptions}
                value={filtroDedicacao}
                onChange={setFiltroDedicacao}
                isOpen={openDropdown === 'dedicacao'}
                onToggle={() => toggleDropdown('dedicacao')}
              />
              {hasFilter && (
                <button
                  onClick={() => { setFiltroTipo(null); setFiltroSituacao(null); setFiltroDedicacao(null); setBusca('') }}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Limpar
                </button>
              )}
            </div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="px-6 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#1F4E79] to-[#2E74B5] text-white shadow-lg hover:scale-[1.02] transition-transform"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Adicionar Membro
          </button>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1 table-scroll" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  {['Nome', 'Dedicação', 'Telefone / Código', 'Nasc / Outorga', 'Tipo', 'Situação', 'Ações'].map((col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400${i === 3 ? ' text-center' : i === 6 ? ' text-right' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading
                  ? Array.from({ length: dynamicPageSize }).map((_, i) => <SkeletonRow key={i} />)
                  : membros.length === 0
                  ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-500 text-sm">
                        <span className="material-symbols-outlined text-4xl block mb-2 opacity-30">search_off</span>
                        Nenhum membro encontrado com os filtros selecionados
                      </td>
                    </tr>
                  )
                  : membros.map((m) => {
                    const av = getAvatarColor(m.nome_membro)
                    const iniciais = getInitials(m.nome_membro)
                    const tipoStyle = TIPO_STYLE[m.tipo_membro] ?? 'bg-slate-100 text-slate-900'
                    const sit = SITUACAO_CONFIG[m.situacao_membro] ?? SITUACAO_CONFIG.ATIVO
                    const dedicacoesRow: { label: string; style: string }[] = [
                      m.responsavel_membro_booleano && { label: 'Resp. Membro', style: 'bg-[#197fe6]/20 text-[#197fe6]' },
                      m.coordenador_setor_booleano && { label: 'Coord. Setor', style: 'bg-purple-500/20 text-purple-400' },
                      m.assistente_ministro_booleano && { label: 'Assist. Ministro', style: 'bg-amber-500/20 text-amber-400' },
                    ].filter(Boolean) as { label: string; style: string }[]

                    return (
                      <tr
                        key={m.membro_id}
                        className="hover:bg-white/[0.05] transition-colors group cursor-pointer"
                        onClick={() => router.push(`/membros/${m.membro_id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full ${av.bg} flex items-center justify-center font-bold text-xs ${av.text} shrink-0`}>
                              {iniciais}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100 text-sm">{m.nome_membro}</div>
                              {m.nome_setor && (
                                <div className="text-[10px] text-slate-500">{m.nome_setor}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-wrap gap-1">
                            {dedicacoesRow.length > 0
                              ? dedicacoesRow.map((d) => (
                                <span key={d.label} className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.style}`}>
                                  {d.label}
                                </span>
                              ))
                              : <span className="text-xs text-slate-600">—</span>
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-slate-200">{m.telefone ?? '—'}</div>
                          <div className="text-xs text-slate-500">Cód: {m.codigo_de_membro ?? '—'}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="text-sm text-slate-200">{formatDate(m.data_de_nascimento)}</div>
                          <div className="text-xs text-slate-400">Out: {formatYear(m.data_de_outorga)}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${tipoStyle}`}>
                            {m.tipo_membro}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${sit.dot} ${sit.glow}`} />
                            <span className="text-sm">{sit.label}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ActionMenu membroId={m.membro_id} />
                        </td>
                      </tr>
                    )
                  })
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between shrink-0">
            <span className="text-sm text-slate-400">
              Exibindo {membros.length > 0 ? page * dynamicPageSize + 1 : 0}–{Math.min((page + 1) * dynamicPageSize, total)} de{' '}
              <span className="text-white font-semibold">{total.toLocaleString('pt-BR')}</span> membros
              {hasFilter && <span className="ml-1 text-[#197fe6]">(filtrado)</span>}
            </span>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0 || loading}
                className="p-2 glass-card rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const pageNum = totalPages <= 5
                    ? i
                    : page < 3 ? i
                    : page > totalPages - 4 ? totalPages - 5 + i
                    : page - 2 + i
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                        pageNum === page ? 'bg-[#197fe6] text-white' : 'glass-card hover:bg-white/10'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  )
                })}
                {totalPages > 5 && page < totalPages - 3 && (
                  <>
                    <span className="text-slate-500 px-1">...</span>
                    <button
                      onClick={() => setPage(totalPages - 1)}
                      className="w-8 h-8 rounded-lg glass-card text-xs font-bold hover:bg-white/10"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1 || loading}
                className="p-2 glass-card rounded-lg text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
        >
          <div className="w-full max-w-[720px] rounded-[2.5rem] shadow-2xl flex flex-col my-auto"
            style={{ background: 'rgba(15, 23, 31, 0.92)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
          >
            {/* Modal Header */}
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-[#197fe6]" />
                  <h2 className="text-2xl font-black tracking-tight">Adicionar Membro</h2>
                </div>
                <p className="text-slate-400 text-sm">Preencha as informações cadastrais do novo membro</p>
              </div>
              <button
                onClick={handleClose}
                className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-10 py-8 space-y-7 max-h-[65vh] overflow-y-auto modal-scroll">
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">

                {/* Nome */}
                <div className="col-span-2 space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nome Completo</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">person</span>
                    <input
                      className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${modalFieldErrors.nome ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent'}`}
                      placeholder="Digite o nome completo"
                      type="text"
                      value={nomeModal}
                      onChange={(e) => { setNomeModal(e.target.value); setModalFieldErrors((p) => ({ ...p, nome: '' })) }}
                    />
                  </div>
                  {modalFieldErrors.nome && <p className="text-xs text-red-400 ml-1">{modalFieldErrors.nome}</p>}
                </div>

                {/* Dedicação */}
                <div className="col-span-2 space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Dedicação</label>
                  <div className="flex flex-wrap gap-2 items-center">
                    {dedicacaoOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => toggleDedicacao(opt)}
                        className={`px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all border ${
                          dedicacoes.includes(opt)
                            ? 'bg-[#197fe6]/20 text-[#197fe6] border-[#197fe6]/30'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                    {adicionandoDedicacao ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white outline-none focus:ring-2 focus:ring-[#197fe6]/50 w-32 placeholder:text-slate-600"
                          placeholder="NOVA..."
                          value={novaDedicacao}
                          onChange={(e) => setNovaDedicacao(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') adicionarDedicacao()
                            if (e.key === 'Escape') { setAdicionandoDedicacao(false); setNovaDedicacao('') }
                          }}
                        />
                        <button type="button" onClick={adicionarDedicacao}
                          className="w-8 h-8 rounded-lg bg-[#197fe6]/20 text-[#197fe6] hover:bg-[#197fe6]/30 flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-sm">check</span>
                        </button>
                        <button type="button" onClick={() => { setAdicionandoDedicacao(false); setNovaDedicacao('') }}
                          className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setAdicionandoDedicacao(true)}
                        className="w-9 h-9 rounded-xl border border-dashed border-white/20 text-slate-500 hover:text-white hover:border-white/40 flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-lg">add</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Telefone</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">call</span>
                    <input
                      className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${modalFieldErrors.telefone ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent'}`}
                      placeholder="(00) 00000-0000"
                      type="text"
                      value={telefoneModal}
                      onChange={(e) => { setTelefoneModal(maskPhone(e.target.value)); setModalFieldErrors((p) => ({ ...p, telefone: '' })) }}
                    />
                  </div>
                  {modalFieldErrors.telefone && <p className="text-xs text-red-400 ml-1">{modalFieldErrors.telefone}</p>}
                </div>

                {/* Código do membro */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Código do Membro</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">tag</span>
                    <input
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent outline-none transition-all"
                      placeholder="Ex: 1234567"
                      type="text"
                      value={codigoMembroModal}
                      onChange={(e) => setCodigoMembroModal(e.target.value)}
                    />
                  </div>
                </div>

                {/* Data de Nascimento */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Data de Nascimento</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">calendar_today</span>
                    <input
                      className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${modalFieldErrors.dataNasc ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent'}`}
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={dataNascModal}
                      onChange={(e) => { setDataNascModal(maskDate(e.target.value)); setModalFieldErrors((p) => ({ ...p, dataNasc: '' })) }}
                    />
                  </div>
                  {modalFieldErrors.dataNasc && <p className="text-xs text-red-400 ml-1">{modalFieldErrors.dataNasc}</p>}
                </div>

                {/* Data de Outorga */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Data de Outorga</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">verified</span>
                    <input
                      className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${modalFieldErrors.dataOutorga ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent'}`}
                      type="text"
                      placeholder="DD/MM/AAAA"
                      value={dataOutorgaModal}
                      onChange={(e) => { setDataOutorgaModal(maskDate(e.target.value)); setModalFieldErrors((p) => ({ ...p, dataOutorga: '' })) }}
                    />
                  </div>
                  {modalFieldErrors.dataOutorga && <p className="text-xs text-red-400 ml-1">{modalFieldErrors.dataOutorga}</p>}
                </div>

                {/* Tipo */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Tipo</label>
                  <div className="grid grid-cols-3 gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    {tipoOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setTipo(opt)}
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                          tipo === opt
                            ? 'bg-[#197fe6] text-white shadow-lg'
                            : 'text-slate-500 hover:bg-white/5'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Situação */}
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Situação</label>
                  <div className="bg-white/5 p-1.5 rounded-2xl border border-white/10">
                    <div className="flex gap-1">
                      {situacaoOptions.map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setSituacao(opt)}
                          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            situacao === opt
                              ? opt === 'ATIVO'
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20'
                                : opt === 'INATIVO'
                                ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                : 'bg-amber-500 text-white shadow-lg shadow-amber-500/20'
                              : 'text-slate-500 hover:bg-white/5'
                          }`}
                        >
                          {opt === 'ATIVO' ? 'Ativo' : opt === 'INATIVO' ? 'Inativo' : 'Afastado'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-10 py-8 border-t border-white/10 bg-white/5 rounded-b-[2.5rem] space-y-4">
              {saveError && (
                <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
                  <p className="text-red-400 text-xs font-medium">{saveError}</p>
                </div>
              )}
              <div className="flex gap-4">
                <button
                  onClick={handleSalvarMembro}
                  disabled={salvando}
                  className="flex-[2] py-5 rounded-2xl text-white text-sm font-black uppercase tracking-widest shadow-2xl bg-gradient-to-r from-[#197fe6] to-[#105bbd] hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {salvando ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Confirmar Cadastro'
                  )}
                </button>
                <button
                  onClick={handleClose}
                  disabled={salvando}
                  className="flex-1 py-5 rounded-2xl glass-card border border-white/10 hover:bg-white/10 text-slate-300 text-sm font-black uppercase tracking-widest transition-all disabled:opacity-60"
                >
                  Descartar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
