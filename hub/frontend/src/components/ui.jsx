import React, { useEffect } from 'react'
import { X } from 'lucide-react'

export function PageHead({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  )
}

export function Kpi({ icon: Icon, label, value, hint, tone }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{Icon && <Icon size={14} />}{label}</div>
      <div className="kpi-value" style={tone ? { color: `var(--${tone})` } : undefined}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          className={value === o.value ? 'on' : ''} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  )
}

export function Rank({ rows, format = (x) => x, metric = 'visitors', empty = 'Sem dados no período' }) {
  if (!rows?.length) return <div className="empty">{empty}</div>
  const max = Math.max(1, ...rows.map((r) => r[metric]))
  return (
    <div className="rank">
      {rows.map((r) => (
        <div className="rank-row" key={r.label}>
          <div className="bar" style={{ width: `${(r[metric] / max) * 100}%` }} />
          <span className="label" title={r.label}>{format(r.label)}</span>
          <span className="value">{Number(r[metric]).toLocaleString('pt-BR')}</span>
        </div>
      ))}
    </div>
  )
}

export function Meter({ value, tone }) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const color = tone || (v >= 90 ? 'var(--bad)' : v >= 75 ? 'var(--warn)' : 'var(--accent)')
  return <div className="meter"><div style={{ width: `${v}%`, background: color }} /></div>
}

export function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>{title}</h3>
          <button className="btn btn-ghost" onClick={onClose} aria-label="Fechar"><X size={18} /></button>
        </div>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return <div className="field"><label>{label}</label>{children}</div>
}

export function StatusBadge({ ok, children }) {
  if (ok == null) return <span className="badge"><span className="dot" />Sem dados</span>
  return <span className={`badge ${ok ? 'ok' : 'bad'}`}><span className="dot" />{children || (ok ? 'No ar' : 'Fora do ar')}</span>
}

export function Loading({ label = 'Carregando...' }) {
  return <div className="empty">{label}</div>
}
