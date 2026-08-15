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
export function generateSummaryReportPDF({ stats, byCategory, byDistrict, scopeLabel, generatedByName }) {
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
  doc.text(`Membership & Financial Summary Report${scopeLabel ? ' — ' + scopeLabel : ''}`, marginX, 56)
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
    head: [['Category', 'Members', 'Paid', 'Verified Income']],
    body: byCategory.map(r => [r.category, String(r.count), String(r.paidCount ?? 0), formatUGX(r.verifiedTotal)]),
    headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold' },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
    alternateRowStyles: { fillColor: [237, 228, 243] },
  })

  y = doc.lastAutoTable.finalY + 30

  // District breakdown table — only for the full admin's all-districts
  // report; a District Admin's report is already scoped to one district,
  // so repeating it as a one-row table adds nothing.
  if (byDistrict) {
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
  }

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

// Full admin only. One PDF, one section per district -- a cover page with
// association-wide totals, then each district gets its own heading and
// its own category/member/verified-income table, so the main admin can
// print or share just District X's pages without the numbers from every
// other district mixed into the same table.
export function generatePerDistrictReportPDF({ stats, byDistrictSections, generatedByName }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const marginX = 40

  function header(subtitle) {
    doc.setFillColor(...PURPLE)
    doc.rect(0, 0, pageWidth, 86, 'F')
    doc.setTextColor(...CANVAS)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    doc.text('Uganda Scouts Association', marginX, 36)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(11)
    doc.text(subtitle, marginX, 56)
    doc.setFontSize(9)
    const generatedLine = `Generated ${new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}` +
      (generatedByName ? `  \u00b7  by ${generatedByName}` : '')
    doc.text(generatedLine, marginX, 72)
  }

  // Cover page: association-wide totals + a table of contents so it's easy
  // to find one district in a long printout.
  header('Per-District Report — All Districts')
  let y = 116
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Association-Wide Totals', marginX, y)
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
  y += Math.ceil(totals.length / 2) * 26 + 30

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Districts in This Report', marginX, y)
  y += 8
  autoTable(doc, {
    startY: y + 8,
    margin: { left: marginX, right: marginX },
    head: [['District', 'Members', 'Verified Income']],
    body: byDistrictSections.map(d => [d.district, String(d.count), formatUGX(d.verifiedTotal)]),
    headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold' },
    styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
    alternateRowStyles: { fillColor: [237, 228, 243] },
  })

  // One section per district, each starting on its own page so it can be
  // printed or extracted independently.
  for (const section of byDistrictSections) {
    doc.addPage()
    header(`District Report — ${section.district}`)
    y = 116

    doc.setTextColor(...INK)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text(`${section.district} — Totals`, marginX, y)
    y += 10
    doc.setDrawColor(...EMBER)
    doc.setLineWidth(1)
    doc.line(marginX, y, pageWidth - marginX, y)
    y += 24

    doc.setFontSize(10.5)
    doc.setFont('helvetica', 'normal')
    doc.text('Members:', marginX, y)
    doc.setFont('helvetica', 'bold')
    doc.text(String(section.count), marginX + 170, y)
    doc.setFont('helvetica', 'normal')
    doc.text('Verified Income:', marginX + 270, y)
    doc.setFont('helvetica', 'bold')
    doc.text(formatUGX(section.verifiedTotal), marginX + 440, y)
    y += 34

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(12)
    doc.text('Members & Verified Income by Category', marginX, y)
    y += 8

    if (section.categories.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text('No members registered in this district yet.', marginX, y + 20)
    } else {
      autoTable(doc, {
        startY: y + 8,
        margin: { left: marginX, right: marginX },
        head: [['Category', 'Members', 'Paid', 'Verified Income']],
        body: section.categories.map(c => [c.category, String(c.count), String(c.paidCount), formatUGX(c.verifiedTotal)]),
        headStyles: { fillColor: PURPLE, textColor: CANVAS, fontStyle: 'bold' },
        styles: { fontSize: 9.5, textColor: INK, cellPadding: 6 },
        alternateRowStyles: { fillColor: [237, 228, 243] },
      })
    }
  }

  // Footer page numbers across every page
  const pageCount = doc.internal.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - marginX, pageHeight - 20, { align: 'right' })
  }

  doc.save(`USA_Per_District_Report_${new Date().toISOString().slice(0, 10)}.pdf`)
}
