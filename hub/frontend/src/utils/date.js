export function formatDateBR(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTimeBR(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function normalizeDateInput(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}

export function isoToDateInput(value) {
  if (!value) return ''
  const raw = String(value)
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) {
    const [, year, month, day] = match
    return `${day}/${month}/${year}`
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return formatDateBR(date)
}

export function parseDateInputToIso(value, { endOfDay = false } = {}) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  const hours = endOfDay ? '23' : '00'
  const minutes = endOfDay ? '59' : '00'
  const seconds = endOfDay ? '59' : '00'
  const iso = new Date(`${year}-${month}-${day}T${hours}:${minutes}:${seconds}`)
  return Number.isNaN(iso.getTime()) ? null : iso.toISOString()
}

export function parseDateInputToYmd(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, day, month, year] = match
  return `${year}-${month}-${day}`
}

export function todayDateInput() {
  return formatDateBR(new Date())
}
