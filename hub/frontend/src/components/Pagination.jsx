import React from 'react'

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null

  const pages = []
  const start = Math.max(1, pagination.page - 2)
  const end = Math.min(pagination.totalPages, pagination.page + 2)
  for (let current = start; current <= end; current += 1) pages.push(current)

  return (
    <div style={wrap}>
      <button onClick={() => onPageChange(pagination.page - 1)} disabled={!pagination.hasPrevPage} style={btn}>
        Anterior
      </button>
      {pages.map(page => (
        <button
          key={page}
          onClick={() => onPageChange(page)}
          style={{ ...btn, ...(page === pagination.page ? activeBtn : {}) }}
        >
          {page}
        </button>
      ))}
      <button onClick={() => onPageChange(pagination.page + 1)} disabled={!pagination.hasNextPage} style={btn}>
        Proxima
      </button>
    </div>
  )
}

const wrap = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }
const btn = { padding: '9px 12px', background: '#06101e', border: '1px solid #1a3a5c', borderRadius: 10, color: '#8BAFC8', minWidth: 42 }
const activeBtn = { color: '#00d4ff', borderColor: '#00d4ff66', background: '#00d4ff14' }
