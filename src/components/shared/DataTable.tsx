import React from 'react'

type Props = {
  children: React.ReactNode
}

export default function DataTable({ children }: Props) {
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-sm">{children}</table>
    </div>
  )
}
