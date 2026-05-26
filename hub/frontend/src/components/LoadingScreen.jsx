import React from 'react'

export default function LoadingScreen({ label = 'Carregando modulo...' }) {
  return (
    <div style={wrap}>
      <div style={orb} />
      <p style={text}>{label}</p>
    </div>
  )
}

const wrap = {
  minHeight: '40vh',
  display: 'grid',
  placeItems: 'center',
  gap: 14,
}

const orb = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: '3px solid rgba(0,212,255,0.18)',
  borderTopColor: '#00d4ff',
  animation: 'spin 1s linear infinite',
  boxShadow: '0 0 24px rgba(0,212,255,0.2)',
}

const text = {
  color: '#8BAFC8',
  fontSize: 14,
  letterSpacing: 0.3,
}
