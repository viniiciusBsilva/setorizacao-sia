import DashboardLayout from '@/components/DashboardLayout'

export default function RelatoriosPage() {
  return (
    <DashboardLayout title="Relatórios">
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-5rem)]">
        <div className="glass-card p-12 rounded-2xl text-center max-w-sm w-full">
          <span className="material-symbols-outlined text-[#197fe6]" style={{ fontSize: '3.5rem' }}>construction</span>
          <h3 className="text-2xl font-bold mt-4">Em Desenvolvimento</h3>
          <p className="text-slate-400 text-sm mt-2">Esta página estará disponível em breve.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
