import React from 'react'

type Props = {
  status: 'ativo' | 'inativo' | 'afastado'
}

export default function StatusBadge({ status }: Props) {
  const map = {
    ativo: 'bg-green-100 text-green-700',
    inativo: 'bg-red-100 text-red-700',
    afastado: 'bg-yellow-100 text-yellow-700',
  }

  const label = status === 'ativo' ? 'Ativo' : status === 'inativo' ? 'Inativo' : 'Afastado'

  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${map[status]}`}>
      {label}
    </span>
  )
}
