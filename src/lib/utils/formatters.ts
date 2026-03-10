export function formatarData(data?: string | null): string {
  if (!data) return '—'
  return new Date(data).toLocaleDateString('pt-BR')
}

export function formatarTelefone(telefone?: string | null): string {
  if (!telefone) return '—'
  return telefone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
}

export function gerarCodigoMembro(id: number): string {
  return `MBR-${String(id).padStart(6, '0')}`
}
