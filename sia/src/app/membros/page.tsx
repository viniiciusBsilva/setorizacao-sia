'use client'

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import * as XLSX from 'xlsx'

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

type ImportStep = 'upload' | 'analyzing' | 'review' | 'importing' | 'done'

type ImportRow = {
  codigo_membro: string
  nome: string
  tipo_id: number
  telefone: string | null
  data_outorga: string | null
  chefe_familia: number | null
}

type ImportDuplicate = ImportRow & {
  existing_id: number
  nome_existente: string
}

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
          className="absolute left-0 top-full mt-2 z-50 min-w-[180px] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(15, 23, 31, 0.96)', backdropFilter: 'blur(20px)' }}
        >
          <div className="py-1">
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
          </div>
          <div
            className="overflow-y-auto pb-1"
            style={{
              maxHeight: '180px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#197fe6 transparent',
            }}
          >
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
        </div>
      )}
    </div>
  )
}

// ─── MultiSelectDropdown ─────────────────────────────────────────────────────

function MultiSelectDropdown({
  label,
  options,
  values,
  onChange,
  isOpen,
  onToggle,
}: {
  label: string
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
  isOpen: boolean
  onToggle: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (isOpen && ref.current && !ref.current.contains(e.target as Node)) onToggle()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen, onToggle])

  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt])
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={onToggle}
        className={`px-4 py-2 glass-card rounded-lg text-xs font-semibold hover:bg-white/10 transition-all flex items-center gap-1 ${
          values.length > 0 ? 'text-[#197fe6] border border-[#197fe6]/40' : ''
        }`}
      >
        {values.length > 0 ? `${label}: ${values.length} selecionado${values.length > 1 ? 's' : ''}` : label}
        <span className="material-symbols-outlined text-sm">{isOpen ? 'expand_less' : 'expand_more'}</span>
      </button>

      {isOpen && (
        <div
          className="absolute left-0 top-full mt-2 z-50 min-w-[200px] rounded-xl border border-white/10 shadow-2xl overflow-hidden"
          style={{ background: 'rgba(15, 23, 31, 0.96)', backdropFilter: 'blur(20px)' }}
        >
          <div className="py-1">
            <button
              onClick={() => { onChange([]); onToggle() }}
              className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/10 flex items-center gap-2 ${
                values.length === 0 ? 'text-[#197fe6]' : 'text-slate-400'
              }`}
            >
              <span className="material-symbols-outlined text-sm">
                {values.length === 0 ? 'radio_button_checked' : 'radio_button_unchecked'}
              </span>
              Todos
            </button>
            <div className="mx-3 my-1 h-px bg-white/5" />
          </div>
          <div
            className="overflow-y-auto pb-1"
            style={{ maxHeight: '180px', scrollbarWidth: 'thin', scrollbarColor: '#197fe6 transparent' }}
          >
            {options.map((opt) => {
              const selected = values.includes(opt)
              return (
                <button
                  key={opt}
                  onClick={() => toggle(opt)}
                  className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-white/10 flex items-center gap-2 ${
                    selected ? 'text-[#197fe6]' : 'text-slate-300'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {selected ? 'check_box' : 'check_box_outline_blank'}
                  </span>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SkeletonRow ──────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr>
      <td className="pl-5 pr-2 py-4 w-10">
        <div className="w-4 h-4 rounded bg-white/5 animate-pulse" />
      </td>
      {[120, 96, 80, 64, 56, 32].map((w, i) => (
        <td key={i} className="px-6 py-4">
          <div className="h-3 rounded-full bg-white/5 animate-pulse" style={{ width: w }} />
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

  // Modal excluir membro
  const [modalExcluir, setModalExcluir] = useState<{ id: number; nome: string } | null>(null)
  const [excluindo, setExcluindo] = useState(false)
  const [erroExcluir, setErroExcluir] = useState('')

  async function handleExcluirMembro() {
    if (!modalExcluir) return
    setExcluindo(true)
    setErroExcluir('')

    const { error: delDedError } = await supabase
      .from('dedicacao_membro')
      .delete()
      .eq('id_membro', modalExcluir.id)

    if (delDedError) {
      setErroExcluir('Erro ao remover dedicações do membro.')
      setExcluindo(false)
      return
    }

    const { error: delMembroError } = await supabase
      .from('membro')
      .delete()
      .eq('id', modalExcluir.id)

    if (delMembroError) {
      setErroExcluir('Erro ao excluir o membro.')
      setExcluindo(false)
      return
    }

    setModalExcluir(null)
    setExcluindo(false)
    fetchMembros()
  }

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
  const [membroDedicacoes, setMembroDedicacoes] = useState<Record<number, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [totalAtivos, setTotalAtivos] = useState(0)
  const [totalAfastados, setTotalAfastados] = useState(0)
  const [page, setPage] = useState(0)

  // Filters
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null)
  const [filtroSituacao, setFiltroSituacao] = useState<string | null>(null)
  const [filtroDedicacoes, setFiltroDedicacoes] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [openDropdown, setOpenDropdown] = useState<DropdownKey>(null)

  // Checkboxes
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Export dropdown
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  // Import modal
  const [importOpen, setImportOpen] = useState(false)
  const [importStep, setImportStep] = useState<ImportStep>('upload')
  const [importDragOver, setImportDragOver] = useState(false)
  const [importNewRows, setImportNewRows] = useState<ImportRow[]>([])
  const [importDuplicates, setImportDuplicates] = useState<ImportDuplicate[]>([])
  const [importSelectedToUpdate, setImportSelectedToUpdate] = useState<Set<string>>(new Set())
  const [importResult, setImportResult] = useState<{ inserted: number; updated: number } | null>(null)
  const [importError, setImportError] = useState('')
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (exportOpen && exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [exportOpen])

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

    let membroIdsFromDedicacao: number[] | null = null

    if (filtroDedicacoes.length > 0) {
      const { data: dedRows } = await supabase
        .from('dedicacao')
        .select('id')
        .in('nome', filtroDedicacoes)

      const dedIds = dedRows?.map((r) => r.id) ?? []

      if (dedIds.length > 0) {
        const { data: dmRows } = await supabase
          .from('dedicacao_membro')
          .select('id_membro')
          .in('id_dedicacao', dedIds)
        // Member must have ALL selected dedications (intersection)
        const countMap: Record<number, number> = {}
        for (const r of dmRows ?? []) {
          countMap[r.id_membro] = (countMap[r.id_membro] ?? 0) + 1
        }
        membroIdsFromDedicacao = Object.entries(countMap)
          .filter(([, c]) => c >= filtroDedicacoes.length)
          .map(([id]) => Number(id))
      } else {
        membroIdsFromDedicacao = []
      }
    }

    if (membroIdsFromDedicacao !== null && membroIdsFromDedicacao.length === 0) {
      setMembros([])
      setMembroDedicacoes({})
      setTotal(0)
      setLoading(false)
      return
    }

    let query = supabase
      .from('view_membro')
      .select('membro_id,nome_membro,tipo_membro,situacao_membro,situacao_id,data_de_nascimento,data_de_outorga,telefone,codigo_de_membro,nome_setor,responsavel_membro_booleano,coordenador_setor_booleano,assistente_ministro_booleano', { count: 'exact' })
      .order('nome_membro', { ascending: true })
      .range(page * dynamicPageSize, (page + 1) * dynamicPageSize - 1)

    if (filtroTipo) query = query.eq('tipo_membro', filtroTipo)
    if (filtroSituacao) query = query.eq('situacao_membro', filtroSituacao)
    if (membroIdsFromDedicacao !== null) query = query.in('membro_id', membroIdsFromDedicacao)
    if (busca.trim()) query = query.ilike('nome_membro', `%${busca.trim()}%`)

    const { data, count } = await query
    const membrosData = (data as ViewMembro[]) ?? []
    setMembros(membrosData)
    if (count !== null) setTotal(count)

    // Buscar dedicações reais de cada membro da página
    if (membrosData.length > 0) {
      const ids = membrosData.map((m) => m.membro_id)
      const { data: dmRows } = await supabase
        .from('dedicacao_membro')
        .select('id_membro, dedicacao(nome)')
        .in('id_membro', ids)

      const map: Record<number, string[]> = {}
      for (const row of dmRows ?? []) {
        const nome = (row.dedicacao as { nome: string } | null)?.nome
        if (!nome) continue
        if (!map[row.id_membro]) map[row.id_membro] = []
        map[row.id_membro].push(nome)
      }
      setMembroDedicacoes(map)
    } else {
      setMembroDedicacoes({})
    }

    setLoading(false)
  }, [filtroTipo, filtroSituacao, filtroDedicacoes, busca, page, dynamicPageSize])

  useEffect(() => {
    fetchMembros()
  }, [fetchMembros])

  // Reset to page 0 when filters or page size change
  useEffect(() => {
    setPage(0)
  }, [filtroTipo, filtroSituacao, filtroDedicacoes, busca, dynamicPageSize])

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
        .maybeSingle()

      let dedId: number | null = existing?.id ?? null

      if (!dedId) {
        const { data: newDed, error: dedError } = await supabase
          .from('dedicacao')
          .insert({ nome: nomeDedicacao })
          .select('id')
          .single()
        if (dedError) {
          console.error('Erro ao inserir dedicação:', dedError)
          setSaveError(`Erro ao salvar dedicação "${nomeDedicacao}": ${dedError.message}`)
          setSalvando(false)
          return
        }
        dedId = newDed?.id ?? null
      }

      if (dedId) {
        const { error: dmError } = await supabase.from('dedicacao_membro').insert({
          id_dedicacao: dedId,
          id_membro: membroId,
        })
        if (dmError) {
          console.error('Erro ao inserir dedicacao_membro:', dmError)
          setSaveError(`Erro ao vincular dedicação "${nomeDedicacao}": ${dmError.message}`)
          setSalvando(false)
          return
        }
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

  const hasFilter = !!(filtroTipo || filtroSituacao || filtroDedicacoes.length > 0 || busca)

  const selectedMembros = membros.filter((m) => selectedIds.has(m.membro_id))
  const allPageSelected = membros.length > 0 && membros.every((m) => selectedIds.has(m.membro_id))

  async function toggleSelectAll() {
    if (selectedIds.size > 0) {
      // Deselect all
      setSelectedIds(new Set())
      return
    }

    // Fetch all IDs matching current filters (no pagination)
    let membroIdsFromDedicacao: number[] | null = null
    if (filtroDedicacoes.length > 0) {
      const { data: dedRows } = await supabase.from('dedicacao').select('id').in('nome', filtroDedicacoes)
      const dedIds = dedRows?.map((r) => r.id) ?? []
      if (dedIds.length > 0) {
        const { data: dmRows } = await supabase.from('dedicacao_membro').select('id_membro').in('id_dedicacao', dedIds)
        const countMap: Record<number, number> = {}
        for (const r of dmRows ?? []) countMap[r.id_membro] = (countMap[r.id_membro] ?? 0) + 1
        membroIdsFromDedicacao = Object.entries(countMap)
          .filter(([, c]) => c >= filtroDedicacoes.length)
          .map(([id]) => Number(id))
      } else {
        membroIdsFromDedicacao = []
      }
    }

    if (membroIdsFromDedicacao !== null && membroIdsFromDedicacao.length === 0) {
      setSelectedIds(new Set())
      return
    }

    let query = supabase.from('view_membro').select('membro_id')
    if (filtroTipo) query = query.eq('tipo_membro', filtroTipo)
    if (filtroSituacao) query = query.eq('situacao_membro', filtroSituacao)
    if (membroIdsFromDedicacao !== null) query = query.in('membro_id', membroIdsFromDedicacao)
    if (busca.trim()) query = query.ilike('nome_membro', `%${busca.trim()}%`)

    const { data } = await query
    setSelectedIds(new Set((data ?? []).map((r) => r.membro_id)))
  }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function formatTelExport(tel: string | null) {
    if (!tel) return '—'
    const d = tel.replace(/\D/g, '')
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
    return tel
  }

  function exportExcel() {
    const rows = selectedMembros.map((m) => ({
      'Nome': m.nome_membro,
      'Tipo': m.tipo_membro,
      'Situação': m.situacao_membro === 'ATIVO' ? 'Ativo' : m.situacao_membro === 'INATIVO' ? 'Inativo' : 'Afastado',
      'Dedicações': (membroDedicacoes[m.membro_id] ?? []).join(', ') || '—',
      'Telefone': formatTelExport(m.telefone),
      'Código': m.codigo_de_membro ?? '—',
      'Nascimento': m.data_de_nascimento ? m.data_de_nascimento.split('-').reverse().join('/') : '—',
      'Outorga': m.data_de_outorga ? m.data_de_outorga.split('-').reverse().join('/') : '—',
      'Setor': m.nome_setor ?? '—',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [32, 14, 12, 28, 18, 14, 14, 14, 20].map((w) => ({ wch: w }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Membros')
    XLSX.writeFile(wb, `membros_${new Date().toISOString().slice(0, 10)}.xlsx`)
    setExportOpen(false)
  }

  function exportPDF() {
    const now = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const rows = selectedMembros.map((m) => {
      const sit = m.situacao_membro === 'ATIVO' ? { label: 'Ativo', color: '#10b981' }
        : m.situacao_membro === 'INATIVO' ? { label: 'Inativo', color: '#ef4444' }
        : { label: 'Afastado', color: '#f59e0b' }
      const deds = (membroDedicacoes[m.membro_id] ?? []).join(', ') || '—'
      return `
        <tr>
          <td>${m.nome_membro}</td>
          <td>${m.tipo_membro}</td>
          <td><span style="color:${sit.color};font-weight:700">${sit.label}</span></td>
          <td>${deds}</td>
          <td>${formatTelExport(m.telefone)}</td>
          <td>${m.codigo_de_membro ?? '—'}</td>
          <td>${m.data_de_nascimento ? m.data_de_nascimento.split('-').reverse().join('/') : '—'}</td>
          <td>${m.nome_setor ?? '—'}</td>
        </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">
<title>Relatório de Membros</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', sans-serif; background:#0a0f14; color:#e2e8f0; padding:40px; }
  .header { display:flex; align-items:center; justify-content:space-between; margin-bottom:32px; padding-bottom:20px; border-bottom:1px solid rgba(255,255,255,0.1); }
  .logo { display:flex; align-items:center; gap:12px; }
  .logo-icon { width:44px; height:44px; background:#197fe6; border-radius:10px; display:flex; align-items:center; justify-content:center; color:#fff; font-size:22px; font-weight:900; }
  .logo-text h1 { font-size:18px; font-weight:800; color:#fff; }
  .logo-text p { font-size:11px; color:#64748b; }
  .meta { text-align:right; }
  .meta p { font-size:11px; color:#64748b; }
  .meta span { font-size:13px; font-weight:700; color:#197fe6; }
  .title-section { margin-bottom:24px; }
  .title-section h2 { font-size:22px; font-weight:800; color:#fff; }
  .title-section p { font-size:12px; color:#64748b; margin-top:4px; }
  .badge { display:inline-block; padding:3px 10px; border-radius:99px; font-size:10px; font-weight:700; background:rgba(25,127,230,0.15); color:#197fe6; border:1px solid rgba(25,127,230,0.3); margin-left:8px; }
  table { width:100%; border-collapse:collapse; font-size:12px; }
  thead tr { background:rgba(25,127,230,0.1); border-bottom:1px solid rgba(25,127,230,0.3); }
  thead th { padding:12px 14px; text-align:left; font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:#94a3b8; }
  tbody tr { border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.15s; }
  tbody tr:nth-child(even) { background:rgba(255,255,255,0.02); }
  tbody td { padding:11px 14px; color:#475569; vertical-align:middle; }
  tbody td:first-child { color:#f1f5f9; font-weight:600; }
  .footer { margin-top:32px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; }
  .footer p { font-size:10px; color:#475569; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head><body>
<div class="header">
  <div class="logo">
    <div class="logo-icon">S</div>
    <div class="logo-text"><h1>Setorização</h1><p>Gestão Comunitária</p></div>
  </div>
  <div class="meta"><p>Gerado em</p><span>${now}</span></div>
</div>
<div class="title-section">
  <h2>Relatório de Membros <span class="badge">${selectedMembros.length} membro${selectedMembros.length !== 1 ? 's' : ''}</span></h2>
  <p>Lista exportada do sistema de gestão comunitária</p>
</div>
<table>
  <thead><tr>
    <th>Nome</th><th>Tipo</th><th>Situação</th><th>Dedicações</th><th>Telefone</th><th>Código</th><th>Nascimento</th><th>Setor</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="footer">
  <p>Sistema de Setorização — Relatório gerado automaticamente</p>
  <p>${selectedMembros.length} registro${selectedMembros.length !== 1 ? 's' : ''} exportado${selectedMembros.length !== 1 ? 's' : ''}</p>
</div>
</body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => { w.print() }, 400)
    setExportOpen(false)
  }

  // ─── Import helpers ────────────────────────────────────────────────────────

  function parseXlsxRows(workbook: XLSX.WorkBook): ImportRow[] {
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const raw = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 }) as unknown[][]
    const rows: ImportRow[] = []
    for (let i = 1; i < raw.length; i++) {
      const row = raw[i] as string[]
      if (!row || !row[1]) continue
      const codigo = String(row[0] ?? '').trim()
      const nome = String(row[1] ?? '').trim()
      if (!nome) continue
      const tipoStr = String(row[2] ?? '').trim()
      const tipo_id = TIPO_ID_MAP[tipoStr] ?? 3
      const telefoneRaw = String(row[15] ?? '').trim()
      const telefone = telefoneRaw || null
      const chefeFamiliaRaw = String(row[20] ?? '').trim()
      const chefe_familia = chefeFamiliaRaw.toLowerCase() === 'sim' ? 1 : null
      const ocorrenciaRaw = String(row[22] ?? '').trim()
      let data_outorga: string | null = null
      const matchDate = ocorrenciaRaw.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      if (matchDate) data_outorga = `${matchDate[3]}-${matchDate[2]}-${matchDate[1]}`
      rows.push({ codigo_membro: codigo, nome, tipo_id, telefone, data_outorga, chefe_familia })
    }
    return rows
  }

  async function handleAnalyzeImport(file: File) {
    setImportStep('analyzing')
    setImportError('')
    try {
      const buffer = await file.arrayBuffer()
      const workbook = XLSX.read(buffer, { type: 'array' })
      const rows = parseXlsxRows(workbook)
      if (rows.length === 0) {
        setImportError('Nenhuma linha válida encontrada no arquivo.')
        setImportStep('upload')
        return
      }
      const codigos = rows.map((r) => r.codigo_membro).filter(Boolean)
      const { data: existing } = await supabase
        .from('membro')
        .select('id, nome, codigo_membro')
        .in('codigo_membro', codigos)
      const existingMap = new Map<string, { id: number; nome: string }>()
      for (const e of existing ?? []) {
        if (e.codigo_membro) existingMap.set(e.codigo_membro, { id: e.id, nome: e.nome })
      }
      const newRows: ImportRow[] = []
      const duplicates: ImportDuplicate[] = []
      for (const row of rows) {
        const ex = row.codigo_membro ? existingMap.get(row.codigo_membro) : null
        if (ex) duplicates.push({ ...row, existing_id: ex.id, nome_existente: ex.nome })
        else newRows.push(row)
      }
      setImportNewRows(newRows)
      setImportDuplicates(duplicates)
      setImportSelectedToUpdate(new Set(duplicates.map((d) => d.codigo_membro)))
      setImportStep('review')
    } catch {
      setImportError('Erro ao processar o arquivo. Verifique se é um .xlsx válido.')
      setImportStep('upload')
    }
  }

  async function handleConfirmImport() {
    setImportStep('importing')
    setImportError('')
    let inserted = 0
    let updated = 0
    if (importNewRows.length > 0) {
      for (let i = 0; i < importNewRows.length; i += 100) {
        const chunk = importNewRows.slice(i, i + 100).map((r) => ({
          nome: r.nome,
          codigo_membro: r.codigo_membro || null,
          tipo_id: r.tipo_id,
          telefone: r.telefone,
          data_outorga: r.data_outorga,
          situacao: 1,
          unidade: userUnidade,
        }))
        const { error } = await supabase.from('membro').insert(chunk)
        if (error) {
          setImportError(`Erro ao inserir membros: ${error.message}`)
          setImportStep('review')
          return
        }
        inserted += chunk.length
      }
    }
    const toUpdate = importDuplicates.filter((d) => importSelectedToUpdate.has(d.codigo_membro))
    for (const d of toUpdate) {
      const { error } = await supabase
        .from('membro')
        .update({ nome: d.nome, tipo_id: d.tipo_id, telefone: d.telefone, data_outorga: d.data_outorga })
        .eq('id', d.existing_id)
      if (error) {
        setImportError(`Erro ao atualizar membro ${d.nome}: ${error.message}`)
        setImportStep('review')
        return
      }
      updated++
    }
    setImportResult({ inserted, updated })
    setImportStep('done')
    fetchMembros()
  }

  function closeImport() {
    setImportOpen(false)
    setImportStep('upload')
    setImportNewRows([])
    setImportDuplicates([])
    setImportSelectedToUpdate(new Set())
    setImportResult(null)
    setImportError('')
  }

  function toggleDuplicateSelect(codigo: string) {
    setImportSelectedToUpdate((prev) => {
      const next = new Set(prev)
      next.has(codigo) ? next.delete(codigo) : next.add(codigo)
      return next
    })
  }

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
              <MultiSelectDropdown
                label="Dedicação"
                options={dedicacaoOptions}
                values={filtroDedicacoes}
                onChange={setFiltroDedicacoes}
                isOpen={openDropdown === 'dedicacao'}
                onToggle={() => toggleDropdown('dedicacao')}
              />
              {hasFilter && (
                <button
                  onClick={() => { setFiltroTipo(null); setFiltroSituacao(null); setFiltroDedicacoes([]); setBusca('') }}
                  className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Limpar
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Export */}
            <div className="relative" ref={exportRef}>
              <button
                onClick={() => setExportOpen((v) => !v)}
                disabled={selectedIds.size === 0}
                className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 glass-card border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                title={selectedIds.size === 0 ? 'Selecione membros para exportar' : `Exportar ${selectedIds.size} membro${selectedIds.size > 1 ? 's' : ''}`}
              >
                <span className="material-symbols-outlined text-lg">download</span>
                {selectedIds.size > 0 && <span className="bg-[#197fe6] text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{selectedIds.size}</span>}
              </button>
              {exportOpen && (
                <div
                  className="absolute right-0 top-full mt-2 z-50 w-44 rounded-xl border border-white/10 shadow-2xl overflow-hidden py-1"
                  style={{ background: 'rgba(15, 23, 31, 0.97)', backdropFilter: 'blur(20px)' }}
                >
                  <div className="px-4 py-2 border-b border-white/5">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Exportar como</p>
                  </div>
                  <button
                    onClick={exportPDF}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-red-400">picture_as_pdf</span>
                    </span>
                    PDF
                  </button>
                  <button
                    onClick={exportExcel}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 transition-colors"
                  >
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-sm text-emerald-400">table_view</span>
                    </span>
                    Excel
                  </button>
                </div>
              )}
            </div>

            {/* Import */}
            <button
              onClick={() => setImportOpen(true)}
              className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 glass-card border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-all"
              title="Importar membros de planilha .xlsx"
            >
              <span className="material-symbols-outlined text-lg">upload_file</span>
              Importar
            </button>

            {/* Add member */}
            <button
              onClick={() => setModalOpen(true)}
              className="px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 bg-gradient-to-r from-[#1F4E79] to-[#2E74B5] text-white shadow-lg hover:scale-[1.02] transition-transform"
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Adicionar
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1 table-scroll" ref={tableContainerRef}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="pl-5 pr-2 py-4 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={() => { void toggleSelectAll() }}
                      className="w-4 h-4 rounded accent-[#197fe6] cursor-pointer"
                    />
                  </th>
                  {['Nome', 'Dedicação', 'Telefone / Código', 'Nasc / Outorga', 'Tipo', 'Situação'].map((col, i) => (
                    <th
                      key={col}
                      className={`px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-400${i === 3 ? ' text-center' : ''}`}
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
                    const dedicacoesRow = membroDedicacoes[m.membro_id] ?? []

                    const isSelected = selectedIds.has(m.membro_id)

                    return (
                      <tr
                        key={m.membro_id}
                        className={`transition-colors group cursor-pointer ${isSelected ? 'bg-[#197fe6]/5 hover:bg-[#197fe6]/10' : 'hover:bg-white/[0.05]'}`}
                        onClick={() => router.push(`/membros/${m.membro_id}`)}
                      >
                        <td className="pl-5 pr-2 py-4 w-10">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(m.membro_id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-[#197fe6] cursor-pointer"
                          />
                        </td>
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
                                <span key={d} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#197fe6]/20 text-[#197fe6]">
                                  {d}
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

      {/* Modal Importar */}
      {importOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-[600px] rounded-[2.5rem] shadow-2xl flex flex-col"
            style={{ background: 'rgba(15, 23, 31, 0.96)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
          >
            {/* Header */}
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-[#197fe6]" />
                  <h2 className="text-2xl font-black tracking-tight">Importar Membros</h2>
                </div>
                <p className="text-slate-400 text-sm">Importe membros a partir de uma planilha .xlsx</p>
              </div>
              {importStep !== 'importing' && (
                <button
                  onClick={closeImport}
                  className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-10 py-8">

              {/* Step: upload */}
              {importStep === 'upload' && (
                <div className="space-y-4">
                  <label
                    className={`flex flex-col items-center justify-center gap-4 w-full h-52 rounded-2xl border-2 border-dashed cursor-pointer transition-all ${
                      importDragOver
                        ? 'border-[#197fe6] bg-[#197fe6]/10'
                        : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setImportDragOver(true) }}
                    onDragLeave={() => setImportDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setImportDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) void handleAnalyzeImport(file)
                    }}
                  >
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) void handleAnalyzeImport(file)
                      }}
                    />
                    <span className="w-16 h-16 rounded-2xl bg-[#197fe6]/10 border border-[#197fe6]/20 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-[#197fe6]">upload_file</span>
                    </span>
                    <div className="text-center">
                      <p className="text-white font-semibold text-sm">Arraste o arquivo aqui</p>
                      <p className="text-slate-500 text-xs mt-1">ou clique para selecionar um arquivo <span className="text-[#197fe6]">.xlsx</span></p>
                    </div>
                  </label>
                  {importError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
                      <p className="text-red-400 text-xs font-medium">{importError}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Step: analyzing */}
              {importStep === 'analyzing' && (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="w-12 h-12 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-300 font-semibold text-sm">Analisando arquivo...</p>
                  <p className="text-slate-500 text-xs">Verificando duplicatas na base de dados</p>
                </div>
              )}

              {/* Step: review */}
              {importStep === 'review' && (
                <div className="space-y-5">
                  {/* Summary badges */}
                  <div className="flex gap-3">
                    <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-2.5">
                      <span className="material-symbols-outlined text-emerald-400 text-base">person_add</span>
                      <span className="text-emerald-400 font-bold text-sm">{importNewRows.length} novo{importNewRows.length !== 1 ? 's' : ''}</span>
                    </div>
                    {importDuplicates.length > 0 && (
                      <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5">
                        <span className="material-symbols-outlined text-amber-400 text-base">person_check</span>
                        <span className="text-amber-400 font-bold text-sm">{importDuplicates.length} duplicado{importDuplicates.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>

                  {importDuplicates.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-slate-300">Membros já existentes — selecione quais atualizar:</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setImportSelectedToUpdate(new Set(importDuplicates.map((d) => d.codigo_membro)))}
                            className="text-xs text-[#197fe6] hover:underline font-semibold"
                          >
                            Todos
                          </button>
                          <span className="text-slate-600">|</span>
                          <button
                            onClick={() => setImportSelectedToUpdate(new Set())}
                            className="text-xs text-slate-400 hover:underline font-semibold"
                          >
                            Nenhum
                          </button>
                        </div>
                      </div>
                      <div
                        className="rounded-xl border border-white/10 overflow-hidden overflow-y-auto"
                        style={{ maxHeight: '260px', scrollbarWidth: 'thin', scrollbarColor: '#197fe6 transparent' }}
                      >
                        {importDuplicates.map((d) => {
                          const selected = importSelectedToUpdate.has(d.codigo_membro)
                          return (
                            <label
                              key={d.codigo_membro}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-b border-white/5 last:border-0 ${
                                selected ? 'bg-[#197fe6]/5 hover:bg-[#197fe6]/10' : 'hover:bg-white/5'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleDuplicateSelect(d.codigo_membro)}
                                className="w-4 h-4 rounded accent-[#197fe6] cursor-pointer shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-200 truncate">{d.nome}</p>
                                <p className="text-xs text-slate-500">Cód: {d.codigo_membro}</p>
                              </div>
                              {selected && (
                                <span className="text-[10px] font-bold text-[#197fe6] bg-[#197fe6]/10 border border-[#197fe6]/20 px-2 py-0.5 rounded-full shrink-0">
                                  Atualizar
                                </span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {importError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                      <span className="material-symbols-outlined text-red-400 text-base shrink-0">error</span>
                      <p className="text-red-400 text-xs font-medium">{importError}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => void handleConfirmImport()}
                      className="flex-[2] py-4 rounded-2xl text-white text-sm font-black uppercase tracking-widest shadow-2xl bg-gradient-to-r from-[#197fe6] to-[#105bbd] hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-base">upload</span>
                      Importar {importNewRows.length + importSelectedToUpdate.size} membro{importNewRows.length + importSelectedToUpdate.size !== 1 ? 's' : ''}
                    </button>
                    <button
                      onClick={closeImport}
                      className="flex-1 py-4 rounded-2xl glass-card border border-white/10 hover:bg-white/10 text-slate-300 text-sm font-black uppercase tracking-widest transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Step: importing */}
              {importStep === 'importing' && (
                <div className="flex flex-col items-center justify-center gap-4 py-12">
                  <div className="w-12 h-12 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
                  <p className="text-slate-300 font-semibold text-sm">Importando membros...</p>
                  <p className="text-slate-500 text-xs">Aguarde, isso pode levar alguns segundos</p>
                </div>
              )}

              {/* Step: done */}
              {importStep === 'done' && importResult && (
                <div className="flex flex-col items-center gap-6 py-8">
                  <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-emerald-400">check_circle</span>
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-xl font-black text-white">Importação concluída!</h3>
                    <p className="text-slate-400 text-sm">Os membros foram processados com sucesso.</p>
                  </div>
                  <div className="flex gap-4">
                    {importResult.inserted > 0 && (
                      <div className="text-center px-6 py-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-3xl font-black text-emerald-400">{importResult.inserted}</p>
                        <p className="text-xs text-emerald-600 font-semibold mt-1">inserido{importResult.inserted !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                    {importResult.updated > 0 && (
                      <div className="text-center px-6 py-4 rounded-2xl bg-[#197fe6]/10 border border-[#197fe6]/20">
                        <p className="text-3xl font-black text-[#197fe6]">{importResult.updated}</p>
                        <p className="text-xs text-[#197fe6]/60 font-semibold mt-1">atualizado{importResult.updated !== 1 ? 's' : ''}</p>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={closeImport}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[#197fe6] to-[#105bbd] text-white font-black text-sm uppercase tracking-widest hover:brightness-110 transition-all"
                  >
                    Fechar
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Modal excluir membro */}
      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !excluindo && setModalExcluir(null)} />
          <div className="relative glass-card rounded-2xl p-8 w-full max-w-md shadow-2xl flex flex-col items-center gap-6">

            <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl text-red-400">delete_forever</span>
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold text-white">Excluir Membro</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Tem certeza que quer excluir o membro{' '}
                <span className="text-white font-semibold">{modalExcluir.nome}</span>?
                <br />
                <span className="text-red-400 text-xs">Esta ação não pode ser desfeita.</span>
              </p>
            </div>

            {erroExcluir && (
              <p className="text-red-400 text-sm text-center">{erroExcluir}</p>
            )}

            <div className="flex gap-3 w-full">
              <button
                onClick={() => setModalExcluir(null)}
                disabled={excluindo}
                className="flex-1 px-5 py-2.5 rounded-xl text-sm font-semibold glass-card hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Não
              </button>
              <button
                onClick={handleExcluirMembro}
                disabled={excluindo}
                className="flex-1 px-5 py-2.5 rounded-xl text-sm font-bold bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {excluindo ? (
                  <>
                    <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  'Sim, excluir'
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </DashboardLayout>
  )
}
