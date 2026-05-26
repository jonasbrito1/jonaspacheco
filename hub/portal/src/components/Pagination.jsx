import React from 'react'
import { getPaginationWindow } from '../utils/blog'

export default function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null

  return (
    <div style={wrap}>
      <button onClick={() => onPageChange(pagination.page - 1)} disabled={!pagination.hasPrevPage} style={btn}>
        Anterior
      </button>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {getPaginationWindow(pagination.page, pagination.totalPages).map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            style={{ ...btn, ...(page === pagination.page ? activeBtn : {}) }}
          >
            {page}
          </button>
        ))}
      </div>
      <button onClick={() => onPageChange(pagination.page + 1)} disabled={!pagination.hasNextPage} style={btn}>
        Proxima
      </button>
    </div>
  )
}

const wrap = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }
const btn = { padding: '10px 14px', background: '#081526', border: '1px solid #1a3a5c', borderRadius: 12, color: '#8BAFC8', minWidth: 46 }
const activeBtn = { color: '#00d4ff', borderColor: '#00d4ff66', background: '#00d4ff14' }
