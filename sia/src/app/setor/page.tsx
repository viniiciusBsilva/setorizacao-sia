'use client'

import { useEffect, useState, useCallback, useRef, useLayoutEffect } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type Grupo = {
  id: string
  nome: string
  descricao: string | null
  status: boolean
}

type Setor = {
  id: number
  nome: string
  Status: boolean
  coordenador_id: number | null
  ass_ministro_id: number | null
  grupo_id: string | null
  coordenador_nome?: string | null
  _larCount?: number
}

type Lar = {
  id: number
  setor_id: number | null
  chefe_familia: number | null
  chefe_nome?: string | null
  logradouro?: string | null
  bairro?: string | null
}

type MembroOption = { id: number; nome: string }

type DeleteTarget = {
  type: 'grupo' | 'setor' | 'lar'
  id: string | number
  nome: string
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SetorPage() {
  const [grupos, setGrupos] = useState<Grupo[]>([])
  const [setores, setSetores] = useState<Setor[]>([])
  const [lares, setLares] = useState<Lar[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedGrupos, setExpandedGrupos] = useState<Set<string>>(new Set())
  const [expandedSetores, setExpandedSetores] = useState<Set<number>>(new Set())

  // ── Modal: Grupo (criar + editar) ──
  const [grupoModal, setGrupoModal] = useState(false)
  const [grupoEditId, setGrupoEditId] = useState<string | null>(null)
  const [grupoNome, setGrupoNome] = useState('')
  const [grupoDescricao, setGrupoDescricao] = useState('')
  const [grupoStatus, setGrupoStatus] = useState(true)
  const [grupoSaving, setGrupoSaving] = useState(false)
  const [grupoError, setGrupoError] = useState('')
  const [grupoNomeError, setGrupoNomeError] = useState('')

  // ── Modal: Setor (criar + editar) ──
  const [setorModal, setSetorModal] = useState(false)
  const [setorEditId, setSetorEditId] = useState<number | null>(null)
  const [setorGrupoId, setSetorGrupoId] = useState<string | null>(null)
  const [setorNome, setSetorNome] = useState('')
  const [setorStatus, setSetorStatus] = useState(true)
  const [setorCoordId, setSetorCoordId] = useState<number | null>(null)
  const [setorCoordNome, setSetorCoordNome] = useState('')
  const [setorCoordQuery, setSetorCoordQuery] = useState('')
  const [setorCoordResults, setSetorCoordResults] = useState<MembroOption[]>([])
  const [setorAssId, setSetorAssId] = useState<number | null>(null)
  const [setorAssNome, setSetorAssNome] = useState('')
  const [setorAssQuery, setSetorAssQuery] = useState('')
  const [setorAssResults, setSetorAssResults] = useState<MembroOption[]>([])
  const [setorSaving, setSetorSaving] = useState(false)
  const [setorError, setSetorError] = useState('')
  const [setorNomeError, setSetorNomeError] = useState('')

  // ── Modal: Lar (criar + editar) ──
  const [larModal, setLarModal] = useState(false)
  const [larEditId, setLarEditId] = useState<number | null>(null)
  const [larSetorId, setLarSetorId] = useState<number | null>(null)
  const [larChefeId, setLarChefeId] = useState<number | null>(null)
  const [larChefeNome, setLarChefeNome] = useState('')
  const [larChefeQuery, setLarChefeQuery] = useState('')
  const [larChefeResults, setLarChefeResults] = useState<MembroOption[]>([])
  const [larSaving, setLarSaving] = useState(false)
  const [larError, setLarError] = useState('')

  // ── View mode ──
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('list')

  // ── Modal: Confirmar exclusão ──
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // ── Load data ──
  const load = useCallback(async () => {
    const [{ data: gruposData }, { data: setoresData }, { data: laresData }] = await Promise.all([
      supabase.from('grupo_setorizacao').select('id, nome, descricao, status').order('nome'),
      supabase.from('setor').select('id, nome, Status, coordenador_id, ass_ministro_id, grupo_id').order('nome'),
      supabase.from('lar').select('id, setor_id, chefe_familia').order('id'),
    ])

    const setoresRaw = (setoresData ?? []) as Setor[]
    const laresRaw = (laresData ?? []) as Lar[]

    const larCountMap: Record<number, number> = {}
    for (const l of laresRaw) {
      if (l.setor_id) larCountMap[l.setor_id] = (larCountMap[l.setor_id] ?? 0) + 1
    }

    const coordIds = [...new Set(setoresRaw.map(s => s.coordenador_id).filter(Boolean))] as number[]
    const coordMap: Record<number, string> = {}
    if (coordIds.length > 0) {
      const { data: cd } = await supabase.from('membro').select('id, nome').in('id', coordIds)
      for (const c of cd ?? []) coordMap[c.id] = c.nome
    }

    const chefeIds = [...new Set(laresRaw.map(l => l.chefe_familia).filter(Boolean))] as number[]
    const chefeMap: Record<number, string> = {}
    if (chefeIds.length > 0) {
      const { data: cd } = await supabase.from('membro').select('id, nome').in('id', chefeIds)
      for (const c of cd ?? []) chefeMap[c.id] = c.nome
    }

    const { data: enderecos } = await supabase.from('endereco_lar').select('id, logradouro, bairro')
    const endMap: Record<number, { logradouro: string | null; bairro: string | null }> = {}
    for (const e of enderecos ?? []) endMap[e.id] = { logradouro: e.logradouro, bairro: e.bairro }

    const { data: larEndereco } = await supabase.from('lar').select('id, endereco_id')
    const larEndMap: Record<number, number> = {}
    for (const le of larEndereco ?? []) {
      if (le.endereco_id) larEndMap[le.id] = le.endereco_id
    }

    const enrichedSetores = setoresRaw.map(s => ({
      ...s,
      Status: (s as any).Status ?? true,
      grupo_id: (s as any).grupo_id ?? null,
      coordenador_nome: s.coordenador_id ? (coordMap[s.coordenador_id] ?? null) : null,
      _larCount: larCountMap[s.id] ?? 0,
    }))

    const enrichedLares = laresRaw.map(l => {
      const endId = larEndMap[l.id]
      const end = endId ? endMap[endId] : null
      return {
        ...l,
        chefe_nome: l.chefe_familia ? (chefeMap[l.chefe_familia] ?? null) : null,
        logradouro: end?.logradouro ?? null,
        bairro: end?.bairro ?? null,
      }
    })

    setGrupos(gruposData ?? [])
    setSetores(enrichedSetores)
    setLares(enrichedLares)
    setExpandedGrupos(prev => prev.size > 0 ? prev : new Set((gruposData ?? []).map(g => g.id)))
    setExpandedSetores(prev => prev.size > 0 ? prev : new Set(setoresRaw.map(s => s.id)))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── URL param: ?view=tree ──
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('view') === 'tree') setViewMode('tree')
  }, [])

  // ── Membro search ──
  async function searchMembro(q: string): Promise<MembroOption[]> {
    if (q.trim().length < 2) return []
    const { data } = await supabase
      .from('membro').select('id, nome').ilike('nome', `%${q.trim()}%`).order('nome').limit(8)
    return data ?? []
  }

  // ── Toggle ──
  function toggleGrupo(id: string) {
    setExpandedGrupos(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleSetor(id: number) {
    setExpandedSetores(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  // ── Open Grupo modal ──
  function openGrupoModal(grupo?: Grupo) {
    setGrupoEditId(grupo?.id ?? null)
    setGrupoNome(grupo?.nome ?? '')
    setGrupoDescricao(grupo?.descricao ?? '')
    setGrupoStatus(grupo?.status ?? true)
    setGrupoError(''); setGrupoNomeError('')
    setGrupoModal(true)
  }

  // ── Open Setor modal ──
  function openSetorModal(grupoId: string | null = null, setor?: Setor) {
    setSetorEditId(setor?.id ?? null)
    setSetorGrupoId(setor?.grupo_id ?? grupoId)
    setSetorNome(setor?.nome ?? '')
    setSetorStatus(setor?.Status ?? true)
    const coordNome = setor?.coordenador_nome ?? ''
    setSetorCoordId(setor?.coordenador_id ?? null)
    setSetorCoordNome(coordNome); setSetorCoordQuery(coordNome); setSetorCoordResults([])
    setSetorAssId(setor?.ass_ministro_id ?? null)
    setSetorAssNome(''); setSetorAssQuery(''); setSetorAssResults([])
    setSetorError(''); setSetorNomeError('')
    setSetorModal(true)
  }

  // ── Open Lar modal ──
  function openLarModal(setorId: number | null = null, lar?: Lar) {
    setLarEditId(lar?.id ?? null)
    setLarSetorId(lar?.setor_id ?? setorId)
    setLarChefeId(lar?.chefe_familia ?? null)
    const chefeNome = lar?.chefe_nome ?? ''
    setLarChefeNome(chefeNome); setLarChefeQuery(chefeNome); setLarChefeResults([])
    setLarError('')
    setLarModal(true)
  }

  // ── Save Grupo ──
  async function handleSalvarGrupo() {
    if (!grupoNome.trim()) { setGrupoNomeError('Nome é obrigatório.'); return }
    setGrupoNomeError(''); setGrupoSaving(true); setGrupoError('')
    const payload = { nome: grupoNome.trim(), descricao: grupoDescricao.trim() || null, status: grupoStatus }
    const { error } = grupoEditId
      ? await supabase.from('grupo_setorizacao').update(payload).eq('id', grupoEditId)
      : await supabase.from('grupo_setorizacao').insert(payload)
    setGrupoSaving(false)
    if (error) { setGrupoError('Erro ao salvar: ' + error.message); return }
    setGrupoModal(false)
    await load()
  }

  // ── Save Setor ──
  async function handleSalvarSetor() {
    if (!setorNome.trim()) { setSetorNomeError('Nome é obrigatório.'); return }
    setSetorNomeError(''); setSetorSaving(true); setSetorError('')
    const payload = {
      nome: setorNome.trim(), Status: setorStatus,
      grupo_id: setorGrupoId || null,
      coordenador_id: setorCoordId || null,
      ass_ministro_id: setorAssId || null,
    }
    const { error } = setorEditId
      ? await supabase.from('setor').update(payload).eq('id', setorEditId)
      : await supabase.from('setor').insert(payload)
    setSetorSaving(false)
    if (error) { setSetorError('Erro ao salvar: ' + error.message); return }
    setSetorModal(false)
    await load()
  }

  // ── Save Lar ──
  async function handleSalvarLar() {
    setLarSaving(true); setLarError('')
    const payload = { setor_id: larSetorId || null, chefe_familia: larChefeId || null }
    const { error } = larEditId
      ? await supabase.from('lar').update(payload).eq('id', larEditId)
      : await supabase.from('lar').insert(payload)
    setLarSaving(false)
    if (error) { setLarError('Erro ao salvar: ' + error.message); return }
    setLarModal(false)
    await load()
  }

  // ── Delete ──
  function confirmDelete(target: DeleteTarget) {
    setDeleteTarget(target); setDeleteError(''); setDeleting(false)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setDeleting(true); setDeleteError('')
    const tableMap = { grupo: 'grupo_setorizacao', setor: 'setor', lar: 'lar' }
    const { error } = await supabase
      .from(tableMap[deleteTarget.type])
      .delete()
      .eq('id', deleteTarget.id)
    setDeleting(false)
    if (error) { setDeleteError('Erro ao excluir: ' + error.message); return }
    setDeleteTarget(null)
    await load()
  }

  const setoresSemGrupo = setores.filter(s => !s.grupo_id)

  if (loading) {
    return (
      <DashboardLayout title="Setorização">
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-[#197fe6] border-t-transparent rounded-full animate-spin" />
            <p className="text-slate-400 text-sm">Carregando estrutura...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const viewToggle = (
    <div className="flex gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
      <button
        onClick={() => setViewMode('list')}
        title="Visualização em lista"
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'list' ? 'bg-[#197fe6] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
      >
        <span className="material-symbols-outlined text-base">format_list_bulleted</span>
      </button>
      <button
        onClick={() => setViewMode('tree')}
        title="Visualização em árvore"
        className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${viewMode === 'tree' ? 'bg-[#197fe6] text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
      >
        <span className="material-symbols-outlined text-base">account_tree</span>
      </button>
    </div>
  )

  return (
    <DashboardLayout title="Setorização">
      {viewMode === 'tree' ? (
        <TreeView
          grupos={grupos} setores={setores} lares={lares}
          viewToggle={viewToggle}
          onEditGrupo={openGrupoModal}
          onDeleteGrupo={g => confirmDelete({ type: 'grupo', id: g.id, nome: g.nome })}
          onAddSetor={openSetorModal}
          onEditSetor={s => openSetorModal(null, s)}
          onDeleteSetor={s => confirmDelete({ type: 'setor', id: s.id, nome: s.nome })}
          onAddLar={openLarModal}
          onEditLar={l => openLarModal(null, l)}
          onDeleteLar={l => confirmDelete({ type: 'lar', id: l.id, nome: l.chefe_nome ?? `Lar #${l.id}` })}
          onAddGrupo={() => openGrupoModal()}
        />
      ) : (
      <div className="flex-1 overflow-y-auto p-8 page-scroll">
        <div className="max-w-7xl mx-auto space-y-6 pb-16">

          <div className="flex items-center justify-between mb-2">
            <p className="text-slate-400 text-sm">
              {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {setores.length} setor{setores.length !== 1 ? 'es' : ''} · {lares.length} lar{lares.length !== 1 ? 'es' : ''}
            </p>
            {viewToggle}
          </div>

          {grupos.length === 0 && setoresSemGrupo.length === 0 ? (
            <div className="glass-card rounded-2xl p-16 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-slate-500">account_tree</span>
              </div>
              <p className="text-slate-400 font-semibold">Nenhuma estrutura cadastrada</p>
              <p className="text-slate-600 text-sm">Adicione um Grupo para começar.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {grupos.map(grupo => (
                <GrupoNode
                  key={grupo.id}
                  grupo={grupo}
                  setores={setores.filter(s => s.grupo_id === grupo.id)}
                  lares={lares}
                  isExpanded={expandedGrupos.has(grupo.id)}
                  expandedSetores={expandedSetores}
                  onToggleGrupo={() => toggleGrupo(grupo.id)}
                  onToggleSetor={toggleSetor}
                  onAddSetor={() => openSetorModal(grupo.id)}
                  onAddLar={openLarModal}
                  onEditGrupo={() => openGrupoModal(grupo)}
                  onDeleteGrupo={() => confirmDelete({ type: 'grupo', id: grupo.id, nome: grupo.nome })}
                  onEditSetor={s => openSetorModal(null, s)}
                  onDeleteSetor={s => confirmDelete({ type: 'setor', id: s.id, nome: s.nome })}
                  onEditLar={l => openLarModal(null, l)}
                  onDeleteLar={l => confirmDelete({ type: 'lar', id: l.id, nome: l.chefe_nome ?? `Lar #${l.id}` })}
                />
              ))}

              {setoresSemGrupo.length > 0 && (
                <div className="space-y-3">
                  {grupos.length > 0 && (
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider px-1">Setores sem grupo</p>
                  )}
                  {setoresSemGrupo.map(setor => (
                    <SetorNode
                      key={setor.id}
                      setor={setor}
                      lares={lares.filter(l => l.setor_id === setor.id)}
                      isExpanded={expandedSetores.has(setor.id)}
                      onToggle={() => toggleSetor(setor.id)}
                      onAddLar={() => openLarModal(setor.id)}
                      onEdit={() => openSetorModal(null, setor)}
                      onDelete={() => confirmDelete({ type: 'setor', id: setor.id, nome: setor.nome })}
                      onEditLar={l => openLarModal(null, l)}
                      onDeleteLar={l => confirmDelete({ type: 'lar', id: l.id, nome: l.chefe_nome ?? `Lar #${l.id}` })}
                      indent={false}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            onClick={() => openGrupoModal()}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-white/10 text-slate-500 hover:border-[#197fe6]/40 hover:text-[#197fe6] transition-all flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <span className="material-symbols-outlined">add</span>
            Adicionar Grupo
          </button>

        </div>
      </div>
      )}

      {/* ── Modal: Confirmar Exclusão ─────────────────────────────────────── */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget && !deleting) setDeleteTarget(null) }}
        >
          <div
            className="w-full max-w-[420px] rounded-[2rem] shadow-2xl flex flex-col"
            style={{ background: 'rgba(15, 23, 31, 0.97)', border: '1px solid rgba(239,68,68,0.2)', backdropFilter: 'blur(24px)' }}
          >
            <div className="px-8 py-7 flex flex-col items-center text-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-400 text-2xl">delete_forever</span>
              </div>
              <div>
                <h3 className="text-xl font-black tracking-tight">Confirmar exclusão</h3>
                <p className="text-slate-400 text-sm mt-1">
                  Tem certeza que deseja excluir{' '}
                  <span className="text-white font-semibold">
                    {deleteTarget.type === 'grupo' ? 'o grupo' : deleteTarget.type === 'setor' ? 'o setor' : 'o lar'}
                  </span>{' '}
                  <span className="text-red-400 font-bold">"{deleteTarget.nome}"</span>?
                </p>
                <p className="text-slate-600 text-xs mt-2">Esta ação não pode ser desfeita.</p>
              </div>
              {deleteError && <p className="text-xs text-red-400 w-full text-left">{deleteError}</p>}
            </div>
            <div className="px-8 pb-7 flex gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-sm font-black hover:bg-red-600 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {deleting && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Grupo ─────────────────────────────────────────────────── */}
      {grupoModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setGrupoModal(false) }}
        >
          <div
            className="w-full max-w-[520px] rounded-[2.5rem] shadow-2xl flex flex-col"
            style={{ background: 'rgba(15, 23, 31, 0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
          >
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-[#197fe6]" />
                  <h2 className="text-2xl font-black tracking-tight">{grupoEditId ? 'Editar Grupo' : 'Novo Grupo'}</h2>
                </div>
                <p className="text-slate-400 text-sm">{grupoEditId ? 'Atualize as informações do grupo' : 'Adicione um grupo de setorização'}</p>
              </div>
              <button onClick={() => setGrupoModal(false)} className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-10 py-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nome *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">corporate_fare</span>
                  <input
                    autoFocus
                    className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${grupoNomeError ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-[#197fe6] focus:border-transparent'}`}
                    placeholder="Nome do grupo"
                    value={grupoNome}
                    onChange={e => { setGrupoNome(e.target.value); setGrupoNomeError('') }}
                    onKeyDown={e => e.key === 'Enter' && handleSalvarGrupo()}
                  />
                </div>
                {grupoNomeError && <p className="text-xs text-red-400 ml-1">{grupoNomeError}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Descrição</label>
                <textarea
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-[#197fe6] focus:border-transparent resize-none transition-all"
                  placeholder="Descrição opcional"
                  rows={3}
                  value={grupoDescricao}
                  onChange={e => setGrupoDescricao(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Status</label>
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                  {[true, false].map(v => (
                    <button key={String(v)} type="button" onClick={() => setGrupoStatus(v)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${grupoStatus === v ? (v ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20') : 'text-slate-500 hover:bg-white/5'}`}>
                      {v ? 'Ativo' : 'Inativo'}
                    </button>
                  ))}
                </div>
              </div>

              {grupoError && <p className="text-xs text-red-400">{grupoError}</p>}
            </div>

            <div className="px-10 pb-8 flex gap-3 justify-end">
              <button onClick={() => setGrupoModal(false)} className="px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSalvarGrupo} disabled={grupoSaving}
                className="px-8 py-3 rounded-2xl bg-[#197fe6] text-white text-sm font-black hover:bg-[#1570cc] transition-colors disabled:opacity-60 flex items-center gap-2">
                {grupoSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {grupoEditId ? 'Salvar alterações' : 'Salvar Grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Setor ─────────────────────────────────────────────────── */}
      {setorModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setSetorModal(false) }}
        >
          <div
            className="w-full max-w-[560px] rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]"
            style={{ background: 'rgba(15, 23, 31, 0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
          >
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <h2 className="text-2xl font-black tracking-tight">{setorEditId ? 'Editar Setor' : 'Novo Setor'}</h2>
                </div>
                <p className="text-slate-400 text-sm">
                  {setorEditId ? 'Atualize as informações do setor' : (setorGrupoId ? `Grupo: ${grupos.find(g => g.id === setorGrupoId)?.nome ?? setorGrupoId}` : 'Setor sem grupo')}
                </p>
              </div>
              <button onClick={() => setSetorModal(false)} className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-10 py-8 space-y-6 overflow-y-auto modal-scroll">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Nome *</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">location_on</span>
                  <input
                    autoFocus
                    className={`w-full bg-white/5 border rounded-2xl pl-12 pr-4 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none transition-all ${setorNomeError ? 'border-red-500/50 focus:ring-2 focus:ring-red-500/30' : 'border-white/10 focus:ring-2 focus:ring-emerald-500/50 focus:border-transparent'}`}
                    placeholder="Nome do setor"
                    value={setorNome}
                    onChange={e => { setSetorNome(e.target.value); setSetorNomeError('') }}
                  />
                </div>
                {setorNomeError && <p className="text-xs text-red-400 ml-1">{setorNomeError}</p>}
              </div>

              <SelectField
                label="Grupo"
                icon="corporate_fare"
                value={setorGrupoId}
                onChange={setSetorGrupoId}
                placeholder="Sem grupo"
                options={grupos.map(g => ({ value: g.id, label: g.nome }))}
                accentColor="emerald"
              />

              <MembroSearch
                label="Coordenador" icon="manage_accounts"
                selectedId={setorCoordId} selectedNome={setorCoordNome}
                query={setorCoordQuery} results={setorCoordResults}
                onQueryChange={async q => { setSetorCoordQuery(q); if (!q) { setSetorCoordId(null); setSetorCoordNome('') } setSetorCoordResults(await searchMembro(q)) }}
                onSelect={(id, nome) => { setSetorCoordId(id); setSetorCoordNome(nome); setSetorCoordQuery(nome); setSetorCoordResults([]) }}
                onClear={() => { setSetorCoordId(null); setSetorCoordNome(''); setSetorCoordQuery(''); setSetorCoordResults([]) }}
                accentColor="emerald"
              />

              <MembroSearch
                label="Assistente Ministro" icon="supervisor_account"
                selectedId={setorAssId} selectedNome={setorAssNome}
                query={setorAssQuery} results={setorAssResults}
                onQueryChange={async q => { setSetorAssQuery(q); if (!q) { setSetorAssId(null); setSetorAssNome('') } setSetorAssResults(await searchMembro(q)) }}
                onSelect={(id, nome) => { setSetorAssId(id); setSetorAssNome(nome); setSetorAssQuery(nome); setSetorAssResults([]) }}
                onClear={() => { setSetorAssId(null); setSetorAssNome(''); setSetorAssQuery(''); setSetorAssResults([]) }}
                accentColor="emerald"
              />

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">Status</label>
                <div className="flex gap-2 bg-white/5 p-1.5 rounded-2xl border border-white/10">
                  {[true, false].map(v => (
                    <button key={String(v)} type="button" onClick={() => setSetorStatus(v)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${setorStatus === v ? (v ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-red-500 text-white shadow-lg shadow-red-500/20') : 'text-slate-500 hover:bg-white/5'}`}>
                      {v ? 'Ativo' : 'Inativo'}
                    </button>
                  ))}
                </div>
              </div>

              {setorError && <p className="text-xs text-red-400">{setorError}</p>}
            </div>

            <div className="px-10 pb-8 flex gap-3 justify-end">
              <button onClick={() => setSetorModal(false)} className="px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSalvarSetor} disabled={setorSaving}
                className="px-8 py-3 rounded-2xl bg-emerald-600 text-white text-sm font-black hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {setorSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {setorEditId ? 'Salvar alterações' : 'Salvar Setor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Lar ───────────────────────────────────────────────────── */}
      {larModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          onClick={e => { if (e.target === e.currentTarget) setLarModal(false) }}
        >
          <div
            className="w-full max-w-[520px] rounded-[2.5rem] shadow-2xl flex flex-col"
            style={{ background: 'rgba(15, 23, 31, 0.95)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(24px)' }}
          >
            <div className="px-10 py-8 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  <h2 className="text-2xl font-black tracking-tight">{larEditId ? 'Editar Lar' : 'Novo Lar'}</h2>
                </div>
                <p className="text-slate-400 text-sm">
                  {larEditId ? 'Atualize as informações do lar' : (larSetorId ? `Setor: ${setores.find(s => s.id === larSetorId)?.nome ?? larSetorId}` : 'Lar sem setor')}
                </p>
              </div>
              <button onClick={() => setLarModal(false)} className="w-12 h-12 rounded-2xl glass-card flex items-center justify-center hover:bg-white/10 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="px-10 py-8 space-y-6">
              <SelectField
                label="Setor"
                icon="location_on"
                value={larSetorId !== null ? String(larSetorId) : null}
                onChange={v => setLarSetorId(v ? Number(v) : null)}
                placeholder="Sem setor"
                options={setores.map(s => ({ value: String(s.id), label: s.nome }))}
                accentColor="amber"
              />

              <MembroSearch
                label="Chefe de Família / Titular" icon="home"
                selectedId={larChefeId} selectedNome={larChefeNome}
                query={larChefeQuery} results={larChefeResults}
                onQueryChange={async q => { setLarChefeQuery(q); if (!q) { setLarChefeId(null); setLarChefeNome('') } setLarChefeResults(await searchMembro(q)) }}
                onSelect={(id, nome) => { setLarChefeId(id); setLarChefeNome(nome); setLarChefeQuery(nome); setLarChefeResults([]) }}
                onClear={() => { setLarChefeId(null); setLarChefeNome(''); setLarChefeQuery(''); setLarChefeResults([]) }}
                accentColor="amber"
              />

              {larError && <p className="text-xs text-red-400">{larError}</p>}
            </div>

            <div className="px-10 pb-8 flex gap-3 justify-end">
              <button onClick={() => setLarModal(false)} className="px-6 py-3 rounded-2xl text-sm font-semibold text-slate-400 hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={handleSalvarLar} disabled={larSaving}
                className="px-8 py-3 rounded-2xl bg-amber-600 text-white text-sm font-black hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center gap-2">
                {larSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {larEditId ? 'Salvar alterações' : 'Salvar Lar'}
              </button>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}

// ─── SelectField ──────────────────────────────────────────────────────────────

function SelectField({
  label,
  icon,
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  accentColor = 'blue',
}: {
  label: string
  icon: string
  value: string | null
  onChange: (v: string | null) => void
  options: { value: string; label: string }[]
  placeholder?: string
  accentColor?: 'blue' | 'emerald' | 'amber'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (open && ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const selected = options.find(o => o.value === value)
  const ring = accentColor === 'emerald' ? 'ring-emerald-500/50' : accentColor === 'amber' ? 'ring-amber-500/50' : 'ring-[#197fe6]'
  const accent = accentColor === 'emerald' ? 'text-emerald-400' : accentColor === 'amber' ? 'text-amber-400' : 'text-[#197fe6]'

  return (
    <div className="space-y-2" ref={ref}>
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{label}</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm font-semibold text-left transition-all outline-none flex items-center ${open ? `ring-2 ${ring} border-transparent` : 'hover:border-white/20'} ${selected ? 'text-white' : 'text-slate-500'}`}
        >
          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">{icon}</span>
          <span className="flex-1 truncate">{selected ? selected.label : placeholder}</span>
          <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-lg transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            expand_more
          </span>
        </button>

        {open && (
          <div
            className="absolute top-full mt-1 w-full rounded-2xl shadow-2xl z-50 overflow-hidden"
            style={{ background: 'rgba(15, 23, 31, 0.98)', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(20px)' }}
          >
            <div
              className="overflow-y-auto py-1.5"
              style={{ maxHeight: '220px', scrollbarWidth: 'thin', scrollbarColor: '#197fe6 transparent' }}
            >
              <button
                type="button"
                onClick={() => { onChange(null); setOpen(false) }}
                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/5 flex items-center gap-3 ${!value ? accent : 'text-slate-500'}`}
              >
                <span className="material-symbols-outlined text-base">{!value ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                {placeholder}
              </button>
              <div className="mx-4 h-px bg-white/5" />
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false) }}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold transition-colors hover:bg-white/5 flex items-center gap-3 ${value === opt.value ? accent : 'text-slate-300'}`}
                >
                  <span className="material-symbols-outlined text-base">{value === opt.value ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── MembroSearch ─────────────────────────────────────────────────────────────

function MembroSearch({
  label, icon, selectedId, selectedNome, query, results,
  onQueryChange, onSelect, onClear, accentColor,
}: {
  label: string; icon: string
  selectedId: number | null; selectedNome: string
  query: string; results: MembroOption[]
  onQueryChange: (q: string) => void
  onSelect: (id: number, nome: string) => void
  onClear: () => void
  accentColor: 'emerald' | 'amber' | 'blue'
}) {
  const ring = accentColor === 'emerald' ? 'focus:ring-emerald-500/50' : accentColor === 'amber' ? 'focus:ring-amber-500/50' : 'focus:ring-[#197fe6]'
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1">{label}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-lg">{icon}</span>
        <input
          className={`w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-10 py-4 text-sm font-semibold text-white placeholder:text-slate-600 outline-none focus:ring-2 ${ring} focus:border-transparent transition-all`}
          placeholder="Buscar membro..."
          value={query}
          onChange={e => onQueryChange(e.target.value)}
        />
        {selectedId && (
          <button type="button" onClick={onClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
        {results.length > 0 && (
          <div className="absolute top-full mt-1 w-full rounded-2xl shadow-xl z-10 overflow-hidden"
            style={{ background: 'rgba(15,23,31,0.98)', border: '1px solid rgba(255,255,255,0.1)' }}>
            {results.map(m => (
              <button key={m.id} type="button" onClick={() => onSelect(m.id, m.nome)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors">
                <span className="material-symbols-outlined text-slate-500 text-base">person</span>
                <span className="text-sm font-semibold text-slate-200">{m.nome}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      {selectedId && selectedNome && (
        <p className="text-[11px] text-slate-400 ml-1">Selecionado: <span className="font-semibold text-slate-200">{selectedNome}</span></p>
      )}
    </div>
  )
}

// ─── GrupoNode ────────────────────────────────────────────────────────────────

function GrupoNode({
  grupo, setores, lares, isExpanded, expandedSetores,
  onToggleGrupo, onToggleSetor, onAddSetor, onAddLar,
  onEditGrupo, onDeleteGrupo, onEditSetor, onDeleteSetor, onEditLar, onDeleteLar,
}: {
  grupo: Grupo; setores: Setor[]; lares: Lar[]
  isExpanded: boolean; expandedSetores: Set<number>
  onToggleGrupo: () => void; onToggleSetor: (id: number) => void
  onAddSetor: () => void; onAddLar: (setorId: number) => void
  onEditGrupo: () => void; onDeleteGrupo: () => void
  onEditSetor: (s: Setor) => void; onDeleteSetor: (s: Setor) => void
  onEditLar: (l: Lar) => void; onDeleteLar: (l: Lar) => void
}) {
  return (
    <div className="glass-card rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#197fe6]/20 border border-[#197fe6]/30 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[#197fe6] text-xl">corporate_fare</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#197fe6] bg-[#197fe6]/10 px-2 py-0.5 rounded-full">Grupo</span>
              {!grupo.status && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Inativo</span>}
            </div>
            <h3 className="text-base font-bold mt-0.5">{grupo.nome}</h3>
            {grupo.descricao && <p className="text-xs text-slate-500 mt-0.5">{grupo.descricao}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-4 text-center mr-4">
            <div><p className="text-xs text-slate-500 font-semibold">Setores</p><p className="text-lg font-black">{setores.length}</p></div>
            <div><p className="text-xs text-slate-500 font-semibold">Lares</p><p className="text-lg font-black">{lares.filter(l => setores.some(s => s.id === l.setor_id)).length}</p></div>
          </div>
          <button title="Adicionar Setor" onClick={onAddSetor}
            className="w-8 h-8 rounded-lg bg-[#197fe6]/10 border border-[#197fe6]/20 text-[#197fe6] hover:bg-[#197fe6]/20 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
          <button title="Editar grupo" onClick={onEditGrupo}
            className="w-8 h-8 rounded-lg glass-card hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
          <button title="Excluir grupo" onClick={onDeleteGrupo}
            className="w-8 h-8 rounded-lg glass-card hover:bg-red-500/10 transition-colors flex items-center justify-center text-slate-400 hover:text-red-400">
            <span className="material-symbols-outlined text-base">delete</span>
          </button>
          <button onClick={onToggleGrupo}
            className="w-8 h-8 rounded-lg glass-card hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-lg">{isExpanded ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-6 py-5 space-y-3">
          {setores.length === 0 ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/5 text-slate-600 text-sm">
              <span className="material-symbols-outlined text-base">info</span>
              Nenhum setor vinculado a este grupo.
            </div>
          ) : (
            setores.map(setor => (
              <SetorNode
                key={setor.id}
                setor={setor}
                lares={lares.filter(l => l.setor_id === setor.id)}
                isExpanded={expandedSetores.has(setor.id)}
                onToggle={() => onToggleSetor(setor.id)}
                onAddLar={() => onAddLar(setor.id)}
                onEdit={() => onEditSetor(setor)}
                onDelete={() => onDeleteSetor(setor)}
                onEditLar={onEditLar}
                onDeleteLar={onDeleteLar}
                indent
              />
            ))
          )}
          <button onClick={onAddSetor}
            className="w-full py-3 rounded-xl border border-dashed border-white/10 text-slate-600 hover:border-[#197fe6]/30 hover:text-[#197fe6] transition-all flex items-center justify-center gap-2 text-xs font-semibold">
            <span className="material-symbols-outlined text-sm">add</span>
            Adicionar Setor
          </button>
        </div>
      )}
    </div>
  )
}

// ─── SetorNode ────────────────────────────────────────────────────────────────

function SetorNode({
  setor, lares, isExpanded, onToggle, onAddLar, onEdit, onDelete, onEditLar, onDeleteLar, indent,
}: {
  setor: Setor; lares: Lar[]
  isExpanded: boolean; onToggle: () => void
  onAddLar: () => void; onEdit: () => void; onDelete: () => void
  onEditLar: (l: Lar) => void; onDeleteLar: (l: Lar) => void
  indent: boolean
}) {
  return (
    <div className={`rounded-xl overflow-hidden ${indent ? 'border border-white/8' : 'glass-card'}`}
      style={indent ? { background: 'rgba(255,255,255,0.025)' } : undefined}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          {indent && <div className="w-4 border-b border-white/15 shrink-0" />}
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-emerald-400 text-base">location_on</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">Setor</span>
              {!setor.Status && <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Inativo</span>}
            </div>
            <h4 className="text-sm font-bold mt-0.5">{setor.nome}</h4>
            {setor.coordenador_nome && <p className="text-[10px] text-slate-500">Coord: {setor.coordenador_nome}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-center mr-2">
            <p className="text-[10px] text-slate-500 font-semibold">Lares</p>
            <p className="text-sm font-black">{lares.length}</p>
          </div>
          <button title="Adicionar Lar" onClick={onAddLar}
            className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-base">add</span>
          </button>
          <button title="Editar setor" onClick={onEdit}
            className="w-7 h-7 rounded-lg glass-card hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400 hover:text-white">
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button title="Excluir setor" onClick={onDelete}
            className="w-7 h-7 rounded-lg glass-card hover:bg-red-500/10 transition-colors flex items-center justify-center text-slate-400 hover:text-red-400">
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
          <button onClick={onToggle}
            className="w-7 h-7 rounded-lg glass-card hover:bg-white/10 transition-colors flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-base">{isExpanded ? 'expand_less' : 'expand_more'}</span>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-5 pb-4 space-y-2">
          {lares.length === 0 ? (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-white/[0.02] border border-white/5 text-slate-600 text-xs">
              <span className="material-symbols-outlined text-sm">info</span>
              Nenhum lar vinculado a este setor.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 ml-3">
              {lares.map(lar => (
                <LarNode key={lar.id} lar={lar} onEdit={() => onEditLar(lar)} onDelete={() => onDeleteLar(lar)} />
              ))}
            </div>
          )}
          <div className="ml-3">
            <button onClick={onAddLar}
              className="w-full py-2.5 rounded-lg border border-dashed border-white/10 text-slate-600 hover:border-emerald-500/30 hover:text-emerald-400 transition-all flex items-center justify-center gap-1.5 text-xs font-semibold">
              <span className="material-symbols-outlined text-sm">add</span>
              Adicionar Lar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── LarNode ──────────────────────────────────────────────────────────────────

function LarNode({ lar, onEdit, onDelete }: { lar: Lar; onEdit: () => void; onDelete: () => void }) {
  const endereco = [lar.logradouro, lar.bairro].filter(Boolean).join(', ')
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/8 hover:bg-white/[0.06] transition-colors group">
      <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
        <span className="material-symbols-outlined text-amber-400 text-sm">home</span>
      </div>
      <div className="flex-1 min-w-0">
        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">Lar #{lar.id}</span>
        {lar.chefe_nome
          ? <p className="text-xs font-semibold text-slate-200 truncate mt-0.5">{lar.chefe_nome}</p>
          : <p className="text-xs text-slate-600 italic mt-0.5">Sem titular</p>
        }
        {endereco && <p className="text-[10px] text-slate-500 truncate mt-0.5">{endereco}</p>}
      </div>
      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onEdit} title="Editar"
          className="w-6 h-6 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
          <span className="material-symbols-outlined text-xs">edit</span>
        </button>
        <button onClick={onDelete} title="Excluir"
          className="w-6 h-6 rounded-md hover:bg-red-500/10 flex items-center justify-center text-slate-500 hover:text-red-400 transition-colors">
          <span className="material-symbols-outlined text-xs">delete</span>
        </button>
      </div>
    </div>
  )
}

// ─── TreeView ─────────────────────────────────────────────────────────────────

type PanelNode =
  | { type: 'grupo'; data: Grupo }
  | { type: 'setor'; data: Setor }
  | { type: 'lar'; data: Lar }

function TreeView({
  grupos, setores, lares, viewToggle,
  onEditGrupo, onDeleteGrupo,
  onAddSetor, onEditSetor, onDeleteSetor,
  onAddLar, onEditLar, onDeleteLar, onAddGrupo,
}: {
  grupos: Grupo[]; setores: Setor[]; lares: Lar[]
  viewToggle: React.ReactNode
  onEditGrupo: (g: Grupo) => void; onDeleteGrupo: (g: Grupo) => void
  onAddSetor: (grupoId: string | null) => void
  onEditSetor: (s: Setor) => void; onDeleteSetor: (s: Setor) => void
  onAddLar: (setorId: number | null, lar?: Lar) => void
  onEditLar: (l: Lar) => void; onDeleteLar: (l: Lar) => void
  onAddGrupo: () => void
}) {
  const [activeGrupoId, setActiveGrupoId] = useState<string | null>(grupos[0]?.id ?? null)
  const [activeSetorId, setActiveSetorId] = useState<number | null>(null)
  const [panel, setPanel] = useState<PanelNode | null>(null)

  const canvasRef = useRef<HTMLDivElement>(null)
  const grupoEls = useRef<Map<string, HTMLDivElement>>(new Map())
  const setorEls = useRef<Map<number, HTMLDivElement>>(new Map())
  const larEls = useRef<Map<number, HTMLDivElement>>(new Map())
  const [paths, setPaths] = useState<{ d: string; color: string }[]>([])
  const [svgSize, setSvgSize] = useState({ w: 2000, h: 2000 })

  // ── Drag to scroll ──
  const dragState = useRef<{ startX: number; startY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  function onMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, input, select, a')) return
    const canvas = canvasRef.current
    if (!canvas) return
    dragState.current = { startX: e.clientX, startY: e.clientY, scrollLeft: canvas.scrollLeft, scrollTop: canvas.scrollTop }
    setIsDragging(true)
  }

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!dragState.current) return
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    canvas.scrollLeft = dragState.current.scrollLeft - dx
    canvas.scrollTop = dragState.current.scrollTop - dy
  }

  function onMouseUp() {
    dragState.current = null
    setIsDragging(false)
  }

  const activeSetores = setores.filter(s => s.grupo_id === activeGrupoId)
  const activeLares = lares.filter(l => l.setor_id === activeSetorId)

  function computePaths() {
    const canvas = canvasRef.current
    if (!canvas) return
    const cr = canvas.getBoundingClientRect()
    const sl = canvas.scrollLeft
    const st = canvas.scrollTop

    function btm(el: HTMLDivElement | undefined) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - cr.left + sl, y: r.bottom - cr.top + st }
    }
    function top(el: HTMLDivElement | undefined) {
      if (!el) return null
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - cr.left + sl, y: r.top - cr.top + st }
    }

    const ps: { d: string; color: string }[] = []

    if (activeGrupoId) {
      const from = btm(grupoEls.current.get(activeGrupoId))
      if (from) {
        for (const s of activeSetores) {
          const to = top(setorEls.current.get(s.id))
          if (to) {
            const my = (from.y + to.y) / 2
            ps.push({ d: `M${from.x},${from.y} C${from.x},${my} ${to.x},${my} ${to.x},${to.y}`, color: 'rgba(25,127,230,0.4)' })
          }
        }
      }
    }

    if (activeSetorId) {
      const from = btm(setorEls.current.get(activeSetorId))
      if (from) {
        for (const l of activeLares) {
          const to = top(larEls.current.get(l.id))
          if (to) {
            const my = (from.y + to.y) / 2
            ps.push({ d: `M${from.x},${from.y} C${from.x},${my} ${to.x},${my} ${to.x},${to.y}`, color: 'rgba(16,185,129,0.4)' })
          }
        }
      }
    }

    setPaths(ps)
    setSvgSize({ w: canvas.scrollWidth, h: canvas.scrollHeight })
  }

  useLayoutEffect(() => {
    const id = requestAnimationFrame(computePaths)
    return () => cancelAnimationFrame(id)
  })

  function selectGrupo(id: string) {
    setActiveGrupoId(id)
    setActiveSetorId(null)
    setPanel({ type: 'grupo', data: grupos.find(g => g.id === id)! })
  }

  function selectSetor(s: Setor) {
    setActiveSetorId(prev => prev === s.id ? null : s.id)
    setPanel({ type: 'setor', data: s })
  }

  const activeGrupo = grupos.find(g => g.id === activeGrupoId)

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-auto page-scroll relative"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onScroll={() => requestAnimationFrame(computePaths)}
      >
        {/* SVG overlay */}
        <svg
          className="absolute top-0 left-0 pointer-events-none"
          width={svgSize.w}
          height={svgSize.h}
        >
          {paths.map((p, i) => (
            <path key={i} d={p.d} stroke={p.color} strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
          ))}
        </svg>

        {/* Content */}
        <div className="flex flex-col items-center gap-20 py-12 px-16 min-w-max">

          {/* Top bar */}
          <div className="flex items-center justify-between w-full">
            <p className="text-slate-500 text-sm">
              {grupos.length} grupo{grupos.length !== 1 ? 's' : ''} · {setores.length} setores · {lares.length} lares
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={onAddGrupo}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#197fe6] text-white text-xs font-black hover:bg-[#1570cc] transition-colors shadow-lg shadow-[#197fe6]/20"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Novo Grupo
              </button>
              {viewToggle}
            </div>
          </div>

          {/* ── Level 0: Grupos ── */}
          <div className="flex gap-6 flex-wrap justify-center">
            {grupos.map(grupo => {
              const gSetores = setores.filter(s => s.grupo_id === grupo.id)
              const gLares = lares.filter(l => gSetores.some(s => s.id === l.setor_id))
              const active = activeGrupoId === grupo.id
              return (
                <div
                  key={grupo.id}
                  ref={el => { el ? grupoEls.current.set(grupo.id, el) : grupoEls.current.delete(grupo.id) }}
                  onClick={() => selectGrupo(grupo.id)}
                  className={`w-64 p-5 rounded-2xl border cursor-pointer transition-all select-none ${active ? 'border-[#197fe6]/60 shadow-lg shadow-[#197fe6]/10' : 'border-white/10 hover:border-white/20'}`}
                  style={{ background: active ? 'rgba(25,127,230,0.08)' : 'rgba(255,255,255,0.03)' }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${active ? 'bg-[#197fe6]/20 border border-[#197fe6]/30' : 'bg-white/5 border border-white/10'}`}>
                      <span className="material-symbols-outlined text-[#197fe6] text-xl">corporate_fare</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-[#197fe6]">Grupo</span>
                      <h3 className="text-sm font-bold leading-tight truncate">{grupo.nome}</h3>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3">
                    <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-slate-400">{gSetores.length} setores</span>
                    <span className="px-2 py-1 bg-white/5 rounded-lg text-[10px] text-slate-400">{gLares.length} lares</span>
                  </div>
                  {active && (
                    <div className="flex gap-1.5 pt-2 border-t border-white/5">
                      <button onClick={e => { e.stopPropagation(); onAddSetor(grupo.id) }}
                        className="flex-1 py-1.5 rounded-lg bg-[#197fe6]/10 text-[#197fe6] text-[10px] font-bold hover:bg-[#197fe6]/20 transition-colors flex items-center justify-center gap-1">
                        <span className="material-symbols-outlined text-sm">add</span>Setor
                      </button>
                      <button onClick={e => { e.stopPropagation(); onEditGrupo(grupo) }}
                        className="w-7 h-7 rounded-lg glass-card hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                      <button onClick={e => { e.stopPropagation(); onDeleteGrupo(grupo) }}
                        className="w-7 h-7 rounded-lg glass-card hover:bg-red-500/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* ── Level 1: Setores do grupo ativo ── */}
          {activeGrupoId && (
            <div className="flex flex-col items-center gap-4 w-full">
              {activeSetores.length === 0 ? (
                <div className="flex items-center gap-3 px-6 py-4 rounded-xl border border-dashed border-white/10 text-slate-600 text-sm">
                  <span className="material-symbols-outlined text-base">info</span>
                  Nenhum setor em <span className="font-semibold text-slate-400 ml-1">{activeGrupo?.nome}</span>
                  <button onClick={() => onAddSetor(activeGrupoId)}
                    className="ml-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">add</span>Adicionar
                  </button>
                </div>
              ) : (
                <div className="flex gap-4 flex-wrap justify-center">
                  {activeSetores.map(setor => {
                    const sLares = lares.filter(l => l.setor_id === setor.id)
                    const sActive = activeSetorId === setor.id
                    const pct = activeSetores.length > 0 ? Math.round((sLares.length / Math.max(1, lares.filter(l => activeSetores.some(s => s.id === l.setor_id)).length)) * 100) : 0
                    return (
                      <div
                        key={setor.id}
                        ref={el => { el ? setorEls.current.set(setor.id, el) : setorEls.current.delete(setor.id) }}
                        onClick={() => selectSetor(setor)}
                        className={`w-52 p-4 rounded-xl border cursor-pointer transition-all select-none ${sActive ? 'border-emerald-500/40 shadow-lg shadow-emerald-500/10' : 'border-white/10 hover:border-white/20'}`}
                        style={{ background: sActive ? 'rgba(16,185,129,0.07)' : 'rgba(255,255,255,0.025)' }}
                      >
                        <div className="flex items-center gap-2.5 mb-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${sActive ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-emerald-500/10 border border-emerald-500/15'}`}>
                            <span className="material-symbols-outlined text-emerald-400 text-base">location_on</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">Setor</span>
                            <h4 className="text-xs font-bold leading-tight truncate">{setor.nome}</h4>
                          </div>
                        </div>
                        {setor.coordenador_nome && (
                          <p className="text-[10px] text-slate-500 mb-2 truncate">Coord: {setor.coordenador_nome}</p>
                        )}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-slate-500">{sLares.length} lares</span>
                          <span className="text-[10px] text-emerald-400 font-bold">{pct}%</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                        {sActive && (
                          <div className="flex gap-1.5 pt-2 mt-2 border-t border-white/5">
                            <button onClick={e => { e.stopPropagation(); onAddLar(setor.id) }}
                              className="flex-1 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-sm">add</span>Lar
                            </button>
                            <button onClick={e => { e.stopPropagation(); onEditSetor(setor) }}
                              className="w-7 h-7 rounded-lg glass-card hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>
                            <button onClick={e => { e.stopPropagation(); onDeleteSetor(setor) }}
                              className="w-7 h-7 rounded-lg glass-card hover:bg-red-500/10 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Level 2: Lares do setor ativo ── */}
          {activeSetorId && (
            <div className="flex flex-col items-center gap-4 w-full">
              {activeLares.length === 0 ? (
                <div className="flex items-center gap-3 px-6 py-4 rounded-xl border border-dashed border-white/10 text-slate-600 text-sm">
                  <span className="material-symbols-outlined text-base">info</span>
                  Nenhum lar neste setor
                  <button onClick={() => onAddLar(activeSetorId)}
                    className="ml-3 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">add</span>Adicionar
                  </button>
                </div>
              ) : (
                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', width: '100%', maxWidth: '900px' }}>
                  {activeLares.map(lar => (
                    <div
                      key={lar.id}
                      ref={el => { el ? larEls.current.set(lar.id, el) : larEls.current.delete(lar.id) }}
                      onClick={() => setPanel({ type: 'lar', data: lar })}
                      className="group p-3 rounded-xl border border-amber-500/10 hover:border-amber-500/30 transition-all cursor-pointer flex items-center gap-2.5"
                      style={{ background: panel?.type === 'lar' && (panel.data as Lar).id === lar.id ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.025)' }}
                    >
                      <span className="material-symbols-outlined text-amber-400 text-base shrink-0">home</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-amber-400">Lar #{lar.id}</p>
                        <p className="text-[11px] font-semibold text-slate-300 truncate">{lar.chefe_nome ?? 'Sem titular'}</p>
                        {lar.logradouro && <p className="text-[9px] text-slate-600 truncate mt-0.5">{lar.logradouro}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Detail Side Panel ── */}
      {panel && (
        <aside
          className="w-72 shrink-0 border-l border-white/5 flex flex-col overflow-y-auto page-scroll"
          style={{ background: 'rgba(10,15,20,0.85)', backdropFilter: 'blur(20px)' }}
        >
          <div className="p-5 flex items-center justify-between border-b border-white/5">
            <div className="flex items-center gap-2">
              {panel.type === 'grupo' && <span className="material-symbols-outlined text-[#197fe6] text-lg">corporate_fare</span>}
              {panel.type === 'setor' && <span className="material-symbols-outlined text-emerald-400 text-lg">location_on</span>}
              {panel.type === 'lar' && <span className="material-symbols-outlined text-amber-400 text-lg">home</span>}
              <h3 className="font-bold text-sm capitalize">{panel.type === 'grupo' ? 'Grupo' : panel.type === 'setor' ? 'Setor' : 'Lar'}</h3>
            </div>
            <button onClick={() => setPanel(null)} className="w-8 h-8 rounded-lg glass-card flex items-center justify-center text-slate-400 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          <div className="p-5 flex-1 space-y-5">
            {panel.type === 'grupo' && (() => {
              const g = panel.data as Grupo
              const gSetores = setores.filter(s => s.grupo_id === g.id)
              const gLares = lares.filter(l => gSetores.some(s => s.id === l.setor_id))
              return (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Nome</label>
                    <p className="text-sm font-bold">{g.nome}</p>
                  </div>
                  {g.descricao && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Descrição</label>
                      <p className="text-sm text-slate-300">{g.descricao}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass-card rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{gSetores.length}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Setores</p>
                    </div>
                    <div className="glass-card rounded-xl p-3 text-center">
                      <p className="text-xl font-black">{gLares.length}</p>
                      <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Lares</p>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${g.status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{g.status ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </>
              )
            })()}

            {panel.type === 'setor' && (() => {
              const s = panel.data as Setor
              const sLares = lares.filter(l => l.setor_id === s.id)
              return (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Nome</label>
                    <p className="text-sm font-bold">{s.nome}</p>
                  </div>
                  {s.coordenador_nome && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Coordenador</label>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-400">
                          {s.coordenador_nome.slice(0, 2).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold">{s.coordenador_nome}</p>
                      </div>
                    </div>
                  )}
                  <div className="glass-card rounded-xl p-3 text-center">
                    <p className="text-2xl font-black">{sLares.length}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider mt-0.5">Lares</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Status</label>
                    <span className={`text-xs font-bold px-2 py-1 rounded-lg ${s.Status ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{s.Status ? 'Ativo' : 'Inativo'}</span>
                  </div>
                </>
              )
            })()}

            {panel.type === 'lar' && (() => {
              const l = panel.data as Lar
              return (
                <>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Identificação</label>
                    <p className="text-sm font-bold text-amber-400">Lar #{l.id}</p>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Titular</label>
                    <p className="text-sm font-semibold">{l.chefe_nome ?? <span className="text-slate-500 italic">Sem titular</span>}</p>
                  </div>
                  {(l.logradouro || l.bairro) && (
                    <div>
                      <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Endereço</label>
                      <p className="text-sm text-slate-300">{[l.logradouro, l.bairro].filter(Boolean).join(', ')}</p>
                    </div>
                  )}
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest block mb-1">Setor</label>
                    <p className="text-sm font-semibold">{setores.find(s => s.id === l.setor_id)?.nome ?? <span className="text-slate-500 italic">Sem setor</span>}</p>
                  </div>
                </>
              )
            })()}
          </div>

          {/* Panel actions */}
          <div className="p-5 border-t border-white/5 space-y-2">
            {panel.type === 'grupo' && (
              <>
                <button onClick={() => { onEditGrupo(panel.data as Grupo); setPanel(null) }}
                  className="w-full glass-card py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base text-[#197fe6]">edit</span>Editar Grupo
                </button>
                <button onClick={() => onDeleteGrupo(panel.data as Grupo)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base">delete</span>Excluir Grupo
                </button>
              </>
            )}
            {panel.type === 'setor' && (
              <>
                <button onClick={() => { onEditSetor(panel.data as Setor); setPanel(null) }}
                  className="w-full glass-card py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base text-emerald-400">edit</span>Editar Setor
                </button>
                <button onClick={() => onDeleteSetor(panel.data as Setor)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base">delete</span>Excluir Setor
                </button>
              </>
            )}
            {panel.type === 'lar' && (
              <>
                <button onClick={() => { onEditLar(panel.data as Lar); setPanel(null) }}
                  className="w-full glass-card py-2.5 rounded-xl text-sm font-semibold hover:bg-white/5 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base text-amber-400">edit</span>Editar Lar
                </button>
                <button onClick={() => onDeleteLar(panel.data as Lar)}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 flex items-center justify-center gap-2 transition-colors">
                  <span className="material-symbols-outlined text-base">delete</span>Excluir Lar
                </button>
              </>
            )}
          </div>
        </aside>
      )}
    </div>
  )
}
