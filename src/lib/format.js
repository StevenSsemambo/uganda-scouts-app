export function formatUGX(amount) {
  const n = Number(amount) || 0
  return 'UGX ' + n.toLocaleString('en-UG', { maximumFractionDigits: 0 })
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
