import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const PURPLE = [62, 26, 91]
const CANVAS = [246, 243, 249]
const INK = [23, 19, 27]
const MUTED = [90, 82, 95]

// Generic branded table export — replaces the plain CSV downloads across
// Members, Verify Payments, and the reference-data modules. Takes an
// array of row objects (same shape the CSV export used) and renders a
// clean, printable PDF with the association's header band instead of a
// raw comma-separated file.
export function downloadTablePDF({ title, subtitle, filename, rows }) {
  if (!rows || rows.length === 0) {
    alert('There is no data to export yet.')
    return
  }

  const columns = Object.keys(rows[0])
  // "reference_number" -> "Reference Number" -- keeps the same column
  // keys the CSV export already used, just formatted for a human to read.
  const headerLabel = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: columns.length > 6 ? 'landscape' : 'portrait' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 32

  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageWidth, 70, 'F')
  doc.setTextColor(...CANVAS)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('Uganda Scouts Association', marginX, 30)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10.5)
  doc.text(title, marginX, 48)
  if (subtitle) {
    doc.setFontSize(9)
    doc.text(subtitle, marginX, 62)
  }

  autoTable(doc, {
    startY: 90,
    margin: { left: marginX, right: marginX },
    head: [columns.map(headerLabel)],
    body: rows.map(row => columns.map(c => {
      const val = row[c]
      return val === null || val === undefined || val === '' ? '—' : String(val)
    })),
    headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8, textColor: INK, cellPadding: 5, overflow: 'linebreak' },
    alternateRowStyles: { fillColor: [237, 228, 243] },
  })

  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(
      `Generated ${new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' })}  \u00b7  Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      pageHeight - 16,
      { align: 'right' }
    )
  }

  doc.save(filename)
}
