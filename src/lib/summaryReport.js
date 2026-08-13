import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { formatUGX } from './format'

const PURPLE = [62, 26, 91]
const CANVAS = [246, 243, 249]
const INK = [23, 19, 27]
const EMBER = [200, 16, 46]
const MUTED = [90, 82, 95]

// Builds a clean, printable one-shot PDF summary — totals, plus a
// members + verified-income breakdown by category and by district.
// This is what a board or district meeting would actually hand out,
// unlike a raw CSV export.
export function generateSummaryReportPDF({ stats, byCategory, byDistrict, generatedByName }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 40

  // Header band
  doc.setFillColor(...PURPLE)
  doc.rect(0, 0, pageWidth, 86, 'F')
  doc.setTextColor(...CANVAS)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.text('Uganda Scouts Association', marginX, 36)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text('Membership & Financial Summary Report', marginX, 56)
  doc.setFontSize(9)
  const generatedLine = `Generated ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` +
    (generatedByName ? `  \u00b7  by ${generatedByName}` : '')
  doc.text(generatedLine, marginX, 72)

  let y = 116

  // Key totals
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Key Totals', marginX, y)
  y += 10
  doc.setDrawColor(...EMBER)
  doc.setLineWidth(1)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  const totals = [
    ['Registered Members', String(stats.memberCount)],
    ['Districts Represented', String(stats.districtCount)],
    ['Total Verified Income', formatUGX(stats.totalVerified)],
    ['Payments Awaiting Verification', String(stats.pendingCount)],
  ]
  doc.setFontSize(10.5)
  totals.forEach(([label, value], i) => {
    const col = i % 2
    const row = Math.floor(i / 2)
    const x = marginX + col * 270
    const rowY = y + row * 26
    doc.setFont('helvetica', 'normal')
    doc.text(label + ':', x, rowY)
    doc.setFont('helvetica', 'bold')
    doc.text(value, x + 170, rowY)
  })
  y += Math.ceil(totals.length / 2) * 26 + 20

  // Category breakdown table
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Members & Verified Income by Category', marginX, y)
  y += 8

  autoTable(doc, {
    startY: y + 8,
    margin: { left: marginX, right: marginX },
    head: [['Category', 'Members', 'Verified Income']],
    body: byCategory.map(r => [r.category, String(r.count), formatUGX(r.verifiedTotal)]),
    headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold' },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
    alternateRowStyles: { fillColor: [237, 228, 243] },
  })

  y = doc.lastAutoTable.finalY + 30

  // District breakdown table (own page if it won't fit cleanly)
  if (y > doc.internal.pageSize.getHeight() - 150) {
    doc.addPage()
    y = 40
  }
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...INK)
  doc.text('Members & Verified Income by District', marginX, y)
  y += 8

  autoTable(doc, {
    startY: y + 8,
    margin: { left: marginX, right: marginX },
    head: [['District', 'Members', 'Verified Income']],
    body: byDistrict.map(r => [r.district, String(r.count), formatUGX(r.verifiedTotal)]),
    headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold' },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
    alternateRowStyles: { fillColor: [237, 228, 243] },
  })

  // Footer page numbers
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth - marginX,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' }
    )
  }

  doc.save(`USA_Summary_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
}
