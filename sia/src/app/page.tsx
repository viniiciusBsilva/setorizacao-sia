'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

type MonthData = { label: string; count: number }
type GrupoLarData = { nome: string; count: number }
type SetorLarData = { nome: string; count: number }
type SetorRow = {
  id: number
  nome: string
  Status: boolean
  coordenador_nome: string | null
  larCount: number
}

// ─── Chart helpers ────────────────────────────────────────────────────────────

const CHART_COLORS = ['#197fe6', '#10b981', '#f59e0b', '#a855f7', '#ef4444', '#06b6d4', '#f97316', '#84cc16']

function GrowthChart({ data }: { data: MonthData[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [clipW, setClipW] = useState(0)

  // Track actual container width
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => setContainerWidth(el.getBoundingClientRect().width)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const H = 200
  const padLeft = 48, padRight = 24, padTop = 28, padBottom = 40
  const chartW = Math.max((containerWidth || 600) - padLeft - padRight, 100)
  const chartH = H - padTop - padBottom

  // Animate clip from left to right whenever data or size changes
  useEffect(() => {
    if (data.length === 0 || !containerWidth) return
    setClipW(0)
    const duration = 1400
    const start = performance.now()
    let raf: number
    function frame(now: number) {
      const t = Math.min((now - start) / duration, 1)
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
      setClipW(chartW * ease)
      if (t < 1) raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [data, containerWidth, chartW])

  if (data.length === 0) {
    return (
      <div ref={containerRef} className="flex items-center justify-center h-40 text-slate-500 text-sm">
        Sem dados de crescimento
      </div>
    )
  }

  const max = Math.max(...data.map(d => d.count), 1)
  const steps = 4
  const gridVals = Array.from({ length: steps + 1 }, (_, i) => Math.round((max / steps) * i))

  const xs = data.map((_, i) =>
    padLeft + (data.length === 1 ? chartW / 2 : (i / (data.length - 1)) * chartW)
  )
  const ys = data.map(d => padTop + (1 - d.count / max) * chartH)

  function smoothPath(pts: number[][]): string {
    if (pts.length < 2) return `M${pts[0][0]},${pts[0][1]}`
    let p = `M${pts[0][0]},${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) {
      const cpX = (pts[i - 1][0] + pts[i][0]) / 2
      p += ` C${cpX},${pts[i - 1][1]} ${cpX},${pts[i][1]} ${pts[i][0]},${pts[i][1]}`
    }
    return p
  }

  const pts = xs.map((x, i) => [x, ys[i]])
  const linePath = smoothPath(pts)
  const areaPath = `${linePath} L${xs[xs.length - 1]},${padTop + chartH} L${xs[0]},${padTop + chartH} Z`
  const progress = chartW > 0 ? clipW / chartW : 0

  return (
    <div ref={containerRef} className="w-full">
      {containerWidth > 0 && (
        <svg width={containerWidth} height={H}>
          <defs>
            <linearGradient id="growthGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#197fe6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#197fe6" stopOpacity="0.02" />
            </linearGradient>
            <clipPath id="growthClip">
              <rect x={padLeft} y={0} width={clipW} height={H} />
            </clipPath>
          </defs>

          {/* Grid lines */}
          {gridVals.map((v, i) => {
            const gy = padTop + (1 - v / max) * chartH
            return (
              <g key={i}>
                <line x1={padLeft} y1={gy} x2={padLeft + chartW} y2={gy}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                <text x={padLeft - 8} y={gy + 4} textAnchor="end" fontSize="10" fill="#475569">{v}</text>
              </g>
            )
          })}

          {/* Area + line animated via clipPath */}
          <g clipPath="url(#growthClip)">
            <path d={areaPath} fill="url(#growthGrad)" />
            <path d={linePath} fill="none" stroke="#197fe6" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Dots — appear as the line reaches each point */}
          {pts.map(([x, y], i) => {
            const dotPct = data.length === 1 ? 0.5 : i / (data.length - 1)
            const visible = progress >= dotPct - 0.04
            return (
              <circle key={i} cx={x} cy={y} r="4.5"
                fill="#0a0f14" stroke="#197fe6" strokeWidth="2"
                opacity={visible ? 1 : 0}
                style={{ transition: 'opacity 0.2s ease' }} />
            )
          })}

          {/* Value labels — appear with dot */}
          {data.map((d, i) => {
            const dotPct = data.length === 1 ? 0.5 : i / (data.length - 1)
            const visible = progress >= dotPct - 0.04
            return (
              <text key={i} x={xs[i]} y={ys[i] - 10} textAnchor="middle"
                fontSize="11" fontWeight="600" fill="#94a3b8"
                opacity={visible ? 1 : 0} style={{ transition: 'opacity 0.3s ease' }}>
                {d.count}
              </text>
            )
          })}

          {/* Month labels */}
          {data.map((d, i) => (
            <text key={i} x={xs[i]} y={H - 6} textAnchor="middle" fontSize="11" fill="#64748b">
              {d.label}
            </text>
          ))}
        </svg>
      )}
    </div>
  )
}

function DonutChart({ data }: { data: GrupoLarData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-sm">
        <span className="material-symbols-outlined text-3xl">pie_chart</span>
        Sem dados
      </div>
    )
  }
  const r = 52, cx = 70, cy = 70, circ = 2 * Math.PI * r
  let offset = 0
  const segments = data.map((d, i) => {
    const pct = d.count / total
    const dash = pct * circ
    const seg = { ...d, dash, offset, color: CHART_COLORS[i % CHART_COLORS.length] }
    offset += dash
    return seg
  })

  return (
    <div className="flex gap-6 items-center">
      <svg viewBox="0 0 140 140" className="w-36 h-36 shrink-0 -rotate-90">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="20" />
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth="20"
            strokeDasharray={`${seg.dash} ${circ - seg.dash}`}
            strokeDashoffset={-seg.offset}
          />
        ))}
      </svg>
      <div className="flex flex-col gap-1.5 min-w-0">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
            <span className="text-xs text-slate-300 truncate">{seg.nome}</span>
            <span className="text-xs text-slate-500 ml-auto shrink-0">{seg.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function BarChart({ data }: { data: SetorLarData[] }) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2 text-slate-500 text-sm">
        <span className="material-symbols-outlined text-3xl">bar_chart</span>
        Sem dados
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.count / total) * 100) : 0
        return (
          <div key={i} className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-36 shrink-0">{d.nome}</span>
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: CHART_COLORS[i % CHART_COLORS.length] }}
              />
            </div>
            <span className="text-xs text-slate-500 w-8 text-right shrink-0">{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter()

  const [totalMembros, setTotalMembros] = useState(0)
  const [ativos, setAtivos] = useState(0)
  const [totalLares, setTotalLares] = useState(0)
  const [totalSetores, setTotalSetores] = useState(0)
  const [growthData, setGrowthData] = useState<MonthData[]>([])
  const [grupoLarData, setGrupoLarData] = useState<GrupoLarData[]>([])
  const [setorLarData, setSetorLarData] = useState<SetorLarData[]>([])
  const [setorRows, setSetorRows] = useState<SetorRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // ── Stat counts ──
      const [
        { count: cMembros },
        { count: cAtivos },
        { count: cLares },
        { count: cSetores },
      ] = await Promise.all([
        supabase.from('membro').select('*', { count: 'exact', head: true }),
        supabase.from('membro').select('*', { count: 'exact', head: true }).eq('situacao', 1),
        supabase.from('lar').select('*', { count: 'exact', head: true }),
        supabase.from('setor').select('*', { count: 'exact', head: true }),
      ])
      setTotalMembros(cMembros ?? 0)
      setAtivos(cAtivos ?? 0)
      setTotalLares(cLares ?? 0)
      setTotalSetores(cSetores ?? 0)

      // ── Growth: membros cadastrados por mês (últimos 6 meses) ──
      const months: MonthData[] = []
      const now = new Date()
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('pt-BR', { month: 'short' })
        const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
        const nextD = new Date(d.getFullYear(), d.getMonth() + 1, 1)
        const end = `${nextD.getFullYear()}-${String(nextD.getMonth() + 1).padStart(2, '0')}-01`
        const { count } = await supabase
          .from('membro')
          .select('*', { count: 'exact', head: true })
          .gte('data_outorga', start)
          .lt('data_outorga', end)
        months.push({ label, count: count ?? 0 })
      }
      setGrowthData(months)

      // ── Shared data for lares ──
      const [{ data: grupos }, { data: setoresAll }, { data: laresAll }] = await Promise.all([
        supabase.from('grupo_setorizacao').select('id, nome'),
        supabase.from('setor').select('id, nome, Status, coordenador_id, grupo_id'),
        supabase.from('lar').select('id, setor_id'),
      ])

      // ── Lares per setor (map) ──
      const setorCountMap: Record<number, number> = {}
      for (const l of laresAll ?? []) {
        if (l.setor_id) setorCountMap[l.setor_id] = (setorCountMap[l.setor_id] ?? 0) + 1
      }

      // ── Lares por grupo ──
      const setorToGrupo: Record<number, string> = {}
      for (const s of setoresAll ?? []) {
        if (s.grupo_id) setorToGrupo[s.id] = s.grupo_id
      }
      const grupoCountMap: Record<string, number> = {}
      for (const l of laresAll ?? []) {
        if (l.setor_id) {
          const gid = setorToGrupo[l.setor_id]
          if (gid) grupoCountMap[gid] = (grupoCountMap[gid] ?? 0) + 1
        }
      }
      const gld: GrupoLarData[] = (grupos ?? [])
        .map(g => ({ nome: g.nome, count: grupoCountMap[g.id] ?? 0 }))
        .filter(g => g.count > 0)
        .sort((a, b) => b.count - a.count)
      setGrupoLarData(gld)

      // ── Lares por setor (top 8) ──
      const sld: SetorLarData[] = (setoresAll ?? [])
        .map(s => ({ nome: s.nome, count: setorCountMap[s.id] ?? 0 }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
      setSetorLarData(sld)

      // ── Coordenadores ──
      const coordIds = [...new Set((setoresAll ?? []).map(s => s.coordenador_id).filter(Boolean))] as number[]
      const coordMap: Record<number, string> = {}
      if (coordIds.length > 0) {
        const { data: coords } = await supabase.from('membro').select('id, nome').in('id', coordIds)
        for (const c of coords ?? []) coordMap[c.id] = c.nome
      }

      // ── Setor table rows ──
      const rows: SetorRow[] = (setoresAll ?? []).map(s => ({
        id: s.id,
        nome: s.nome,
        Status: s.Status,
        coordenador_nome: s.coordenador_id ? (coordMap[s.coordenador_id] ?? null) : null,
        larCount: setorCountMap[s.id] ?? 0,
      }))
      setSetorRows(rows)

      setLoading(false)
    }
    load()
  }, [])

  const statCards = [
    {
      icon: 'group',
      iconClass: 'w-12 h-12 rounded-xl bg-[#197fe6]/20 text-[#197fe6] flex items-center justify-center',
      label: 'Total de Membros',
      value: loading ? '—' : totalMembros.toLocaleString('pt-BR'),
    },
    {
      icon: 'person_check',
      iconClass: 'w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center',
      label: 'Membros Ativos',
      value: loading ? '—' : ativos.toLocaleString('pt-BR'),
    },
    {
      icon: 'home',
      iconClass: 'w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center',
      label: 'Total de Lares',
      value: loading ? '—' : totalLares.toLocaleString('pt-BR'),
    },
    {
      icon: 'location_city',
      iconClass: 'w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center',
      label: 'Total de Setores',
      value: loading ? '—' : totalSetores.toLocaleString('pt-BR'),
    },
  ]

  return (
    <DashboardLayout title="Dashboard Overview">
      <div className="p-8 space-y-8 page-scroll overflow-y-auto flex-1 w-full">

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((card) => (
            <div key={card.label} className="glass-card p-6 rounded-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className={card.iconClass}>
                  <span className="material-symbols-outlined">{card.icon}</span>
                </div>
              </div>
              <div>
                <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                <h3 className="text-3xl font-bold mt-1">{card.value}</h3>
              </div>
            </div>
          ))}
        </div>

        {/* Growth Chart */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="font-bold text-lg">Crescimento de Membros</h4>
              <p className="text-slate-500 text-xs mt-0.5">Novos membros por mês (últimos 6 meses)</p>
            </div>
            <span className="material-symbols-outlined text-[#197fe6]">trending_up</span>
          </div>
          <GrowthChart data={growthData} />
        </div>

        {/* Donut + Bar charts */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Donut: Lares por Grupo */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-lg">Distribuição de Lares</h4>
                <p className="text-slate-500 text-xs mt-0.5">Lares por grupo</p>
              </div>
              <span className="material-symbols-outlined text-amber-400">donut_large</span>
            </div>
            <DonutChart data={grupoLarData} />
          </div>

          {/* Bar: Lares por Setor */}
          <div className="lg:col-span-3 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h4 className="font-bold text-lg">Engajamento por Setor</h4>
                <p className="text-slate-500 text-xs mt-0.5">Quantidade de lares por setor (% do total)</p>
              </div>
              <span className="material-symbols-outlined text-purple-400">bar_chart</span>
            </div>
            <BarChart data={setorLarData} />
          </div>
        </div>

        {/* Setor table + Events */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Setor Table */}
          <div className="lg:col-span-3 glass-card rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h4 className="font-bold text-lg">Visão da Setorização</h4>
              <button
                onClick={() => router.push('/setor?view=tree')}
                className="text-[#197fe6] text-sm font-semibold hover:underline"
              >
                Ver Mapa Completo
              </button>
            </div>
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-left">
                <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Setor</th>
                    <th className="px-6 py-4 font-semibold">Responsável</th>
                    <th className="px-6 py-4 font-semibold">Lares</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-slate-500 text-sm">
                        Carregando...
                      </td>
                    </tr>
                  ) : setorRows.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-14 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-3xl text-slate-500">map</span>
                          </div>
                          <p className="text-slate-400 text-sm font-semibold">Nenhum setor cadastrado</p>
                          <p className="text-slate-600 text-xs max-w-xs">
                            Os setores aparecerão aqui assim que forem configurados no sistema.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    setorRows.map((row) => (
                      <tr key={row.id} className="border-t border-white/5 hover:bg-white/3 transition-colors">
                        <td className="px-6 py-4 text-sm font-semibold">{row.nome}</td>
                        <td className="px-6 py-4 text-sm text-slate-400">
                          {row.coordenador_nome ?? <span className="text-slate-600 italic">—</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-300">{row.larCount}</td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                            row.Status
                              ? 'bg-emerald-500/15 text-emerald-400'
                              : 'bg-slate-500/15 text-slate-400'
                          }`}>
                            {row.Status ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Events — empty state */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-bold text-lg">Eventos Recentes</h4>
              <span className="material-symbols-outlined text-slate-500">more_horiz</span>
            </div>
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl text-slate-500">event</span>
              </div>
              <p className="text-slate-400 text-sm font-semibold">Nenhum evento agendado</p>
              <p className="text-slate-600 text-xs text-center max-w-[200px]">
                Os próximos eventos aparecerão aqui quando cadastrados.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Feature Card */}
        <div className="glass-card p-8 rounded-2xl flex items-center justify-between gap-8 bg-gradient-to-r from-[#197fe6]/10 to-transparent">
          <div className="space-y-2">
            <h4 className="text-xl font-bold">Nova atualização de Setorização disponível</h4>
            <p className="text-slate-400 text-sm max-w-lg">
              Melhoramos o algoritmo de distribuição geográfica para facilitar a gestão de novos membros.
              Clique abaixo para ver o que mudou.
            </p>
            <button className="bg-[#197fe6] text-white px-6 py-2.5 rounded-xl font-bold text-sm mt-4 hover:bg-[#1570cc] transition-all">
              Ver Novidades
            </button>
          </div>
          <div className="hidden md:block w-48 h-32 bg-[#197fe6]/20 rounded-2xl relative overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="material-symbols-outlined text-[#197fe6]" style={{ fontSize: '4rem' }}>map</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  )
}
