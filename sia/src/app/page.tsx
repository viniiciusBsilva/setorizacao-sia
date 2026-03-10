import DashboardLayout from '@/components/DashboardLayout'

export default function Dashboard() {
  const setores = [
    { dot: 'bg-[#197fe6]', nome: 'Setor Norte', resp: 'João Silva', membros: 450, status: 'Ativo', sBg: 'bg-emerald-400/10', sText: 'text-emerald-400' },
    { dot: 'bg-amber-500', nome: 'Setor Sul', resp: 'Maria Santos', membros: 380, status: 'Ativo', sBg: 'bg-emerald-400/10', sText: 'text-emerald-400' },
    { dot: 'bg-purple-500', nome: 'Setor Leste', resp: 'Pedro Souza', membros: 420, status: 'Alerta', sBg: 'bg-amber-400/10', sText: 'text-amber-400' },
    { dot: 'bg-emerald-500', nome: 'Setor Oeste', resp: 'Clara Oliveira', membros: 210, status: 'Ativo', sBg: 'bg-emerald-400/10', sText: 'text-emerald-400' },
  ]

  const statCards = [
    { icon: 'group', iconClass: 'w-12 h-12 rounded-xl bg-[#197fe6]/20 text-[#197fe6] flex items-center justify-center', label: 'Total de Membros', value: '1.250', badge: '+5.2%' },
    { icon: 'person_check', iconClass: 'w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-500 flex items-center justify-center', label: 'Ativos', value: '1.180', badge: '+3.1%' },
    { icon: 'location_city', iconClass: 'w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center', label: 'Lar / Unidades', value: '42', badge: '+2.0%' },
    { icon: 'celebration', iconClass: 'w-12 h-12 rounded-xl bg-purple-500/20 text-purple-500 flex items-center justify-center', label: 'Eventos (Mês)', value: '12', badge: '+15%' },
  ]

  const eventos = [
    { mes: 'Jan', dia: '24', titulo: 'Encontro Geral de Líderes', hora: '19:30 - Auditório Principal', dateBg: 'bg-[#197fe6]', textMes: 'text-blue-200', textDia: 'text-white', plus: '+12' },
    { mes: 'Jan', dia: '28', titulo: 'Ação Comunitária: Setor Sul', hora: '09:00 - Praça Central', dateBg: 'bg-white/10 border border-white/5', textMes: 'text-slate-500', textDia: 'text-slate-300', plus: '+45' },
    { mes: 'Fev', dia: '02', titulo: 'Workshop de Capacitação', hora: '14:00 - Online (Zoom)', dateBg: 'bg-white/10 border border-white/5', textMes: 'text-slate-500', textDia: 'text-slate-300', plus: '+8' },
  ]

  return (
    <DashboardLayout title="Dashboard Overview">
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto overflow-y-auto flex-1">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statCards.map((card) => (
              <div key={card.label} className="glass-card p-6 rounded-2xl flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div className={card.iconClass}>
                    <span className="material-symbols-outlined">{card.icon}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full">
                    {card.badge}
                  </span>
                </div>
                <div>
                  <p className="text-slate-400 text-sm font-medium">{card.label}</p>
                  <h3 className="text-3xl font-bold mt-1">{card.value}</h3>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Sectorization Table */}
            <div className="lg:col-span-3 glass-card rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex items-center justify-between">
                <h4 className="font-bold text-lg">Visão da Setorização</h4>
                <button className="text-[#197fe6] text-sm font-semibold hover:underline">Ver Mapa Completo</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="px-6 py-4 font-semibold">Setor / Região</th>
                      <th className="px-6 py-4 font-semibold">Responsável</th>
                      <th className="px-6 py-4 font-semibold">Membros</th>
                      <th className="px-6 py-4 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {setores.map((row) => (
                      <tr key={row.nome} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={row.dot + ' w-2 h-2 rounded-full'} />
                            <span className="text-sm font-medium">{row.nome}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-400">{row.resp}</td>
                        <td className="px-6 py-4 text-sm font-semibold">{row.membros}</td>
                        <td className="px-6 py-4">
                          <span className={row.sBg + ' ' + row.sText + ' px-3 py-1 text-xs font-bold rounded-full'}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Events */}
            <div className="lg:col-span-2 glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h4 className="font-bold text-lg">Eventos Recentes</h4>
                <span className="material-symbols-outlined text-slate-500 cursor-pointer">more_horiz</span>
              </div>
              <div className="space-y-6">
                {eventos.map((ev) => (
                  <div key={ev.titulo} className="flex gap-4">
                    <div className={ev.dateBg + ' w-12 h-12 flex flex-col items-center justify-center rounded-xl shrink-0'}>
                      <span className={ev.textMes + ' text-[10px] font-bold uppercase leading-none'}>{ev.mes}</span>
                      <span className={ev.textDia + ' text-lg font-bold leading-none mt-1'}>{ev.dia}</span>
                    </div>
                    <div className="flex-1">
                      <h5 className="text-sm font-bold">{ev.titulo}</h5>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span> {ev.hora}
                      </p>
                      <div className="flex -space-x-2 mt-2">
                        <div className="w-6 h-6 rounded-full border border-[#0a0f14] bg-slate-600 flex items-center justify-center text-[10px] font-bold text-white">
                          A
                        </div>
                        <div className="w-6 h-6 rounded-full border border-[#0a0f14] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                          {ev.plus}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors mt-4">
                  Ver Todos os Eventos
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Feature Card */}
          <div className="glass-card p-8 rounded-2xl flex items-center justify-between gap-8 bg-gradient-to-r from-[#197fe6]/10 to-transparent">
            <div className="space-y-2">
              <h4 className="text-xl font-bold">Nova atualização de Setorização disponível</h4>
              <p className="text-slate-400 text-sm max-w-lg">
                Melhoramos o algoritmo de distribuição geográfica para facilitar a gestão de novos membros. Clique abaixo para ver o que mudou.
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
