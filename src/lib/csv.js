// Turns an array of row objects into a downloadable CSV file — used for
// the admin "download the details" requirement across every module.
export function downloadCSV(filename, rows) {
  if (!rows || rows.length === 0) {
    alert('There is no data to export yet.')
    return
  }
  const headers = Object.keys(rows[0])
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const csv = [
    headers.join(','),
    ...rows.map(row => headers.map(h => escape(row[h])).join(',')),
  ].join('\n')

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
