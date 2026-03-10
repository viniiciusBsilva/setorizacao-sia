import React from 'react'

type Props = {
  open: boolean
  title?: string
  description?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({ open, title = 'Confirmar', description, onConfirm, onCancel }: Props) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onCancel} />
      <div className="bg-white rounded-lg shadow-lg p-6 z-10 w-full max-w-md">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-600 mt-2">{description}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button className="px-4 py-2 rounded-md border" onClick={onCancel}>Cancelar</button>
          <button className="px-4 py-2 rounded-md bg-red-600 text-white" onClick={onConfirm}>Excluir</button>
        </div>
      </div>
    </div>
  )
}
